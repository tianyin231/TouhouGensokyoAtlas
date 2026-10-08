"""Scene-specific chamber arrangements from attributed melodic reference material."""
from pathlib import Path
import json
import math
from compose import track, note

ROOT = Path(__file__).resolve().parents[2]
SOURCE = json.loads((ROOT/'music/scene-motifs.json').read_text())
TITLES = {
    'forest-dolls': '魔法森林 · 木偶与苔径',
    'mountain-stream': '妖怪之山 · 溪光行旅',
    'bamboo-moon': '永远亭 · 竹间月影',
    'scarlet-evening': '红魔馆 · 绯色回廊',
    'nether-sakura': '白玉楼 · 封樱余雪',
    'hell-lullaby': '旧地狱 · 遗落的摇篮',
    'flower-concert': '花田演奏会 · 幽灵三重奏',
}


def arrange(s):
    id = s['id']
    concert = id == 'flower-concert'
    sparse = id in ['hell-lullaby', 'bamboo-moon']
    plucked = id in ['forest-dolls', 'scarlet-evening', 'flower-concert']
    piano = track('piano', '立式钢琴 · 主题与回应', 'piano', 1, -.18, .26)
    lead_id = 'trumpet' if concert else 'flute'
    lead = track('lead', '小号 · 演奏会主题' if concert else '长笛 · 主题', lead_id,
                 .32 if concert else .40, .10, .26 if concert else .36,
                 'sustain' if concert else 'sustain-nv')
    strings = track('strings', '小提琴组 · 内声与对答', 'strings', .57, .25, .32,
                    'pizzicato' if plucked else 'sustain')
    cello = track('cello', '大提琴组 · 地面脉动', 'cello-section', .13 if plucked else .085,
                  -.12, .24, 'pizzicato' if plucked else 'sustain')
    harp = track('harp', '竖琴 · 空间与流动', 'harp', .11 if sparse else .14, -.30, .38, 'pluck')
    if id == 'nether-sakura':
        lead = track('lead', '小提琴组 · 封樱主题', 'strings', .35, .08, .40, 'sustain')
        strings['volume'] = .36
    if id == 'forest-dolls':
        piano['volume']=.85
        lead['volume']=.60
    if id == 'mountain-stream':
        lead['volume']=.28
    if concert:
        lead['volume']=.22
    tracks = [piano, lead, strings, cello, harp]
    # 24 bars, A/B/A'. Source lengths are phrased in beats, never interpreted as seconds.
    length = s['sourceLengthBeats']
    for cycle in range(math.ceil(96/length)):
        for i, (start, duration, pitch) in enumerate(s['melody']):
            at = start + cycle*length
            if at >= 96:
                continue
            p = pitch+s['melodyTranspose']
            dest = lead
            if id in ['forest-dolls', 'scarlet-evening']:
                dest = piano
            elif 32 <= at < 64:
                dest = piano
            if id == 'forest-dolls' and 64 <= at < 96:
                dest = lead
            if dest is lead and lead_id == 'flute' and p < 60:
                dest = piano
            next_at = s['melody'][i+1][0] if i+1 < len(s['melody']) else length
            gate = max(.07, min(duration, next_at-start, 96-at)-.055)
            # Shortening sustained phrase endings leaves room for the next breath.
            if gate > 1.8:
                gate -= .12
            vel = (.94 if dest is piano and id in ['mountain-stream','nether-sakura'] else .86 if dest is piano else .65)+.025*math.sin(start*.37)
            if at >= 80:
                vel *= .90
            note(dest, at, gate, p, vel)
    for bar in range(24):
        refbar = bar % (length//4)
        root = (s['roots'][refbar]+s['harmonyTranspose'])%12+36
        if root < 42:
            root += 12
        # New open voicings keep the source's chromatic/modal shifts audible.
        # Bass inversions are retained; no global major/minor assumption overrides them.
        chord = [root+12, root+19, root+24]
        while chord[0] > 61:
            chord = [n-12 for n in chord]
        active = [n for n in s['melody'] if refbar*4 <= n[0] < refbar*4+4]
        if active:
            color = (active[0][2]+s['melodyTranspose'])%12+60
            chord.append(color if color >= chord[0] else color+12)
        else:
            chord.append(chord[0]+12)
        shade = .87 if 32 <= bar*4 < 64 else 1
        if bar >= 20:
            shade *= .85
        if plucked:
            for beat, offset, velocity in [(0, 0, .60), (1.5, 7, .48), (2.5, 0, .53), (3.5, 7, .44)]:
                note(cello, bar*4+beat, .42, root+offset, velocity*shade)
        else:
            note(cello, bar*4, 2.0 if sparse else 1.82, root, .52*shade)
            if not sparse or bar%2==0:
                note(cello, bar*4+2.15, 1.50, root, .44*shade)
        # Each location has a different accompaniment density and articulation.
        if concert:
            pattern=[(.5,0),(1,2),(1.5,1),(2.5,2),(3,0),(3.5,3)]
        elif id=='mountain-stream':
            pattern=[(0,0),(.5,1),(1,2),(1.5,3),(2.5,2),(3,1)]
        elif sparse:
            pattern=[(.5,1),(2.5,3)] if bar%2==0 else [(1.5,2)]
        else:
            pattern=[(0,0),(1.5,2),(2.5,3),(3.25,1)]
        for beat, index in pattern:
            note(harp, bar*4+beat+.018, .8, chord[index]+(12 if sparse else 0), .44*shade)
        if bar%4!=3 or concert:
            for p in chord[:2]:
                if plucked:
                    for beat in ([1,3] if concert else [1.5]):
                        note(strings, bar*4+beat, .34, max(55,p), .46*shade)
                elif not sparse or bar%2==0:
                    note(strings, bar*4+.10, 2.6 if sparse else 1.8, max(55,p), .40*shade)
        if id not in ['forest-dolls','scarlet-evening'] and not (32 <= bar*4 < 64):
            for p in chord[:2]:
                note(piano, bar*4+.035, 1.4 if not concert else .48, p, .49*shade)
    score=dict(schemaVersion=1,id='atlas-'+id,title=TITLES[id],bpm=s['bpm'],
               key='Source modal harmony / chamber revoicing',bars=24,timeSignature=[4,4],
               updatedAt='2026-10-08T00:00:00.000Z',tracks=tracks)
    # Bound every note to the shorter scene score, including lingering phrase notes.
    for t in tracks:
        t['notes']=[n for n in t['notes'] if n['start']<96]
        for n in t['notes']:
            n['duration']=round(min(n['duration'],96-n['start']),5)
    return score


def save(id, score):
    (ROOT/f'music/scores/{id}.json').write_text(json.dumps(score,ensure_ascii=False,indent=2)+'\n')
    print(id, score['bpm'], round(score['bars']*240/score['bpm'],2), sum(len(t['notes']) for t in score['tracks']))


for source in SOURCE['themes']:
    save(source['id'],arrange(source))

night=json.loads((ROOT/'music/scores/hakurei-dusk.json').read_text())
night.update(id='atlas-hakurei-night',title='博丽神社 · 月下绮想',bpm=66)
for t in night['tracks']:
    t['reverb']=min(.48,t['reverb']+.08)
    if t['id']=='flute':
        t.update(instrumentId='piano',name='钢琴 · 月下主题',volume=1,release=.55)
        t.pop('articulation',None)
        for n in t['notes']:
            n['velocity']=min(.92,n['velocity']*1.30)
    elif t['id']=='harp':
        t['volume']*=.78
    elif t['id']=='cello':
        t['volume']*=.70
    elif t['id']=='strings':
        t['volume']*=.8
save('hakurei-night',night)

bloom=json.loads((ROOT/'music/scores/nether-sakura.json').read_text())
bloom.update(id='atlas-nether-bloom',title='西行妖 · 花苞之兆',bpm=100)
for t in bloom['tracks']:
    if t['id']=='strings':
        t.update(articulation='spiccato',volume=.18,release=.08)
        t['notes']=[]
        for bar in range(24):
            source=next(s for s in SOURCE['themes'] if s['id']=='nether-sakura')
            root=source['roots'][bar%8]%12+60
            for beat in [0,.5,1.5,2,2.5,3.5]:
                note(t,bar*4+beat,.27,root,.62 if beat in [0,2] else .48)
    if t['id']=='cello':
        t['volume']=.12
    if t['id']=='lead':
        t['volume']=.38
save('nether-bloom',bloom)
