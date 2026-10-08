"""Turn an XSXB-Band render into an exact-length loop, preserving its reverb tail.

Requires numpy and ffmpeg. This only edits/mixes rendered PCM; it generates no instruments.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read(p):
    with wave.open(str(p)) as f:
        assert f.getnchannels() == 2 and f.getsampwidth() == 2
        return f.getframerate(), np.frombuffer(f.readframes(f.getnframes()), '<i2').reshape(-1, 2).astype(float)/32768


def write(p, sr, x):
    with wave.open(str(p), 'wb') as f:
        f.setparams((2, 2, sr, 0, 'NONE', 'not compressed'))
        f.writeframes(np.rint(np.clip(x, -1, 32767/32768)*32768).astype('<i2').tobytes())


def measure(p):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(p), '-af', 'ebur128=peak=true',
                        '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])


def master(render, slug, target):
    report = json.loads((render/'report.json').read_text())
    score = json.loads((render/'project.json').read_text())
    sr, pcm = read(render/'mix.wav')
    frames = round(score['bars']*4*60/score['bpm']*sr)
    loop = pcm[:frames].copy()
    tail = pcm[frames:]
    # Fold only the naturally decaying tail into the beginning, with no beat removed.
    for offset in range(0, len(tail), frames):
        chunk = tail[offset:offset+frames]
        loop[:len(chunk)] += chunk
    # A 5 ms edge ramp removes a residual sample discontinuity without shifting the bar grid.
    # This is a click guard, not evidence that the harmonic transition sounds seamless.
    ramp_frames = round(sr*.005)
    ramp = np.sin(np.linspace(0, np.pi/2, ramp_frames))**2
    loop[:ramp_frames] *= ramp[:, None]
    loop[-ramp_frames:] *= ramp[::-1, None]
    intermediate = render/'loop-unmastered.wav'
    write(intermediate, sr, loop)
    loudness, peak = measure(intermediate)
    gain_db = min(target-loudness, -2-peak)
    gain = 10**(gain_db/20)
    loop *= gain
    assert np.max(np.abs(loop)) < 1, 'Loop sum clips before encoding'
    loop_path = render/'loop.wav'
    write(loop_path, sr, loop)
    write(render/'listen.wav', sr, pcm*gain)
    # Two uninterrupted loops let a listener judge the actual bar-aligned boundary.
    write(render/'loop-twice.wav', sr, np.tile(loop, (2, 1)))
    assets = ROOT/'assets/music'
    assets.mkdir(parents=True, exist_ok=True)
    midi = ROOT/'music/midi'
    midi.mkdir(parents=True, exist_ok=True)
    for ext, opts in [('ogg', ['-c:a', 'libvorbis', '-q:a', '5']), ('mp3', ['-c:a', 'libmp3lame', '-q:a', '2'])]:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(loop_path), *opts,
                        '-metadata', f'title={score["title"]}', '-metadata', 'artist=ZUN / Touhou fan arrangement',
                        str(assets/f'{slug}.{ext}')], check=True)
    shutil.copyfile(render/'score.mid', midi/f'{slug}.mid')
    stats = dict(id=slug, renderer='XSXB-Band', engineCommit='ff39f88e6c28fefa2f7b1bebe2eee41a00b761ee',
                 recordingType='Arrangement rendered with CC0 recordings of real instruments; not a live ensemble session',
                 bpm=score['bpm'], seconds=frames/sr, sampleRate=sr, frames=frames,
                 linearGainDb=round(gain_db, 3), loudnessLUFS=measure(loop_path)[0],
                 truePeakDbFS=measure(loop_path)[1], saturatedFrames=int(np.count_nonzero(np.max(abs(loop), axis=1)>=1)),
                 boundaryStep=float(np.max(np.abs(loop[0]-loop[-1]))), edgeRampMs=5,
                 rawRenderPeakDbFS=report['mix']['peakDbFS'],
                 stems=[{k:s[k] for k in ['id','instrumentId','peakDbFS','scoreRmsDbFS','saturatedFrames']} for s in report['stems']],
                 runtimeErrors=report['runtimeErrors'], sampleResponsesOK=all(s['status']==200 for s in report['sampleResponses']),
                 scoreSha256=digest(ROOT/f'music/scores/{slug}.json'),
                 assets={ext:dict(bytes=(assets/f'{slug}.{ext}').stat().st_size,sha256=digest(assets/f'{slug}.{ext}')) for ext in ['ogg','mp3']},
                 listeningStatus='Human audition pending; numerical checks are not an aesthetic verdict')
    out=ROOT/'music/reports';out.mkdir(exist_ok=True)
    (out/f'{slug}.json').write_text(json.dumps(stats, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k:v for k,v in stats.items() if k not in ['stems','assets']}, ensure_ascii=False))


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('render',type=Path);p.add_argument('slug');p.add_argument('--target',type=float,default=-21)
    a=p.parse_args();master(a.render,a.slug,a.target)
