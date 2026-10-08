"""Deterministic XSXB-Band score. No waveform synthesis and no sample redistribution."""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[2]
MOTIFS = json.loads((ROOT / 'music/source-motifs.json').read_text())['motifs']


def track(id, name, instrument, volume, pan, reverb, articulation=None):
    t = dict(id=id, name=name, instrumentId=instrument, color='#647B72', volume=volume,
             pan=pan, reverb=reverb, humanize=.25, release=.22, muted=False, solo=False, notes=[])
    if articulation:
        t['articulation'] = articulation
    return t


def note(t, start, duration, pitch, velocity=.6):
    if not (0 <= start < 128):
        return
    duration = min(duration, 128 - start)
    if duration < .0625:
        return
    t['notes'].append(dict(id=f"{t['id']}-{len(t['notes']):04d}", start=round(start, 5),
                          duration=round(duration, 5), midi=pitch, velocity=round(velocity, 4)))


def melody(t, motif, at, transpose=-1, gain=1, fold=False):
    ns = MOTIFS[motif]
    for i, (s, d, p) in enumerate(ns):
        p += transpose
        # The source's final high register is deliberately brought down as a whole phrase.
        if fold:
            p -= 12
        gap = ns[i+1][0] - s if i+1 < len(ns) else 32-s
        # Avoid stacked monophonic notes and give the wind player a breath at phrase ends.
        length = max(.08, min(d, gap) - (.15 if (s+d) % 4 < .1 else .055))
        velocity = (.65 + .055 * math.sin((s % 16) / 16 * math.pi)) * gain
        note(t, at+s, length, p, velocity)


def compose():
    piano = track('piano', '立式钢琴 · 近景与回应', 'piano', 1.0, -.14, .22)
    flute = track('flute', '长笛 · 灵梦主题', 'flute', .38, .12, .30, 'sustain-nv')
    harp = track('harp', '竖琴 · 廊下流动', 'harp', .15, -.26, .30, 'pluck')
    strings = track('strings', '小提琴组 · 远处暖光', 'strings', .50, .26, .40, 'sustain')
    cello = track('cello', '大提琴组 · 和声基底', 'cello-section', .10, -.08, .24, 'sustain')
    tracks = [piano, flute, harp, strings, cello]
    # 4 bars threshold, 8 bars flute theme, 8 bars piano answer,
    # 8 bars flute variation, 4 bars return. 32 bars / 80 BPM = 96 seconds.
    melody(piano, 'intro', 0, gain=1.28)
    melody(flute, 'theme', 16)
    melody(piano, 'theme', 48, gain=1.30)
    melody(flute, 'answer', 80, gain=.91, fold=True)
    for s, d, p in MOTIFS['intro']:
        if s < 12:
            note(piano, 112+s, min(d, .74), p-1, .74)
    note(piano, 124, 2.7, 69, .72)
    note(piano, 127, .65, 72, .65)
    # New chamber harmony, no copied accompaniment or drum tracks.
    harmony = [
        (46, [58, 62, 65, 69]), (48, [60, 64, 67, 72]),
        (50, [57, 62, 65, 69]), (50, [57, 60, 62, 65]),
    ]
    theme_harmony = [
        (50, [57, 60, 62, 65]), (43, [55, 58, 62, 65]),
        (46, [57, 58, 62, 65]), (48, [55, 60, 65, 70]),
    ]
    for bar in range(32):
        if bar < 4:
            root, chord = harmony[bar]
        elif bar >= 28:
            root, chord = harmony[bar-28]
        else:
            root, chord = theme_harmony[(bar-4) % 4]
        envelope = .75 if bar < 4 or bar >= 28 else 1.0
        if 12 <= bar < 20:
            envelope *= .83
        # Two gentle bowed gestures instead of a static pad; no unattainable looped sustain.
        note(cello, bar*4, 1.82, root, .57*envelope)
        note(cello, bar*4+2, 1.75, root + (7 if bar % 4 == 3 else 0), .48*envelope)
        if 6 <= bar < 28:
            for pitch in chord[1:3]:
                note(strings, bar*4+.06, 1.77, pitch, .44*envelope)
                note(strings, bar*4+2.08, 1.65, pitch, .40*envelope)
        # Harp leaves beat 3 open on alternating measures, so the theme can breathe.
        pattern = [(0, 0), (.75, 2), (1.5, 3), (2.5, 1), (3.25, 2)]
        if bar < 4 or bar >= 28 or bar % 2:
            pattern = [(0, 0), (1.5, 2), (3, 3)]
        for i, (beat, idx) in enumerate(pattern):
            note(harp, bar*4+beat+.025, .85, chord[idx]+12, (.45 if i else .53)*envelope)
        if 4 <= bar < 12 or 20 <= bar < 28:
            for pitch in [chord[0], chord[2]]:
                note(piano, bar*4+.02, 1.65, pitch, .41*envelope)
            if bar % 2 == 0:
                note(piano, bar*4+2.5, .82, chord[1], .36*envelope)
    score = dict(schemaVersion=1, id='atlas-hakurei-dusk', title='博丽神社 · 暮色绮想',
                 bpm=80, key='D minor', bars=32, timeSignature=[4, 4],
                 updatedAt='2026-10-08T00:00:00.000Z', tracks=tracks)
    out = ROOT/'music/scores/hakurei-dusk.json'
    out.write_text(json.dumps(score, ensure_ascii=False, indent=2)+'\n')
    print(out, sum(len(t['notes']) for t in tracks), 'notes, 96 seconds')


if __name__ == '__main__':
    compose()
