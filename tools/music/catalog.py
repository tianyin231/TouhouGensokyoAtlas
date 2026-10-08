"""Package only rendered music, provenance and editable scores for the atlas."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[2]
META={
 'hakurei-dusk':('少女綺想曲 ～ Dream Battle','東方永夜抄 (2004) · 博丽灵梦主题 / 音乐室09','Imperishable_Night','Hisaraito','神社日间／黄昏','原曲下降半音，钢琴与长笛轮换，弦乐和竖琴重新配写'),
 'hakurei-night':('少女綺想曲 ～ Dream Battle','東方永夜抄 (2004) · 博丽灵梦主题 / 音乐室09','Imperishable_Night','Hisaraito','神社夜间','66 BPM，双钢琴声部与更稀疏的低音，延长空间尾音'),
 'forest-dolls':('人形裁判 ～ 人の形弄びし少女','東方妖々夢 (2003) · 爱丽丝主题 / 音乐室07','Perfect_Cherry_Blossom','hisaraito (Version 2)','魔法森林／爱丽丝宅','降低高音动机音区，以钢琴、真实拨弦弦乐与长笛回应组织轻巧的室内乐'),
 'mountain-stream':('神々が恋した幻想郷','東方風神録 (2007) · 第三面道中 / 音乐室06','Mountain_of_Faith','rongns_2','山川／玄武涧／全岛巡游','长笛长句、流动竖琴、开放和声；钢琴中段形成呼吸'),
 'bamboo-moon':('竹取飛翔 ～ Lunatic Princess','東方永夜抄 (2004) · 蓬莱山辉夜主题 / 音乐室15','Imperishable_Night','Hisaraito','竹林／永远亭','72 BPM，竹间长笛、稀疏高音竖琴和轻声弦乐，保留主题细分节奏'),
 'scarlet-evening':('亡き王女の為のセプテット','東方紅魔郷 (2002) · 蕾米莉亚主题 / 音乐室13','Embodiment_of_Scarlet_Devil','rongns_2','红魔馆','低音区钢琴旋律、拨奏大提琴与错拍弦乐，营造室内回廊的节制脉动'),
 'nether-sakura':('幽雅に咲かせ、墨染の桜 ～ Border of Life','東方妖々夢 (2003) · 西行寺幽幽子主题 / 音乐室13','Perfect_Cherry_Blossom','sweetmusic','冥界／白玉楼／封樱','76 BPM，弓弦旋律与钢琴中段，保留较疏的和声底座'),
 'nether-bloom':('幽雅に咲かせ、墨染の桜 ～ Border of Life','東方妖々夢 (2003) · 西行寺幽幽子主题 / 音乐室13','Perfect_Cherry_Blossom','sweetmusic','西行妖花苞事件','100 BPM，新增真实跳弓脉冲；事件结束交叉淡回封樱版'),
 'hell-lullaby':('廃獄ララバイ','東方地霊殿 (2008) · 第五面道中 / 音乐室10','Subterranean_Animism','akira','旧地狱','68 BPM，长笛独句、低弦与稀疏竖琴，体现废弃旧地狱的寂寥'),
 'flower-concert':('幽霊楽団 ～ Phantom Ensemble','東方妖々夢 (2003) · 普莉兹姆利巴三姐妹主题 / 音乐室09','Perfect_Cherry_Blossom','sweetmusic','太阳花田夏季演奏会事件','112 BPM，小号、钢琴与拨弦弦乐交接，演出事件使用更清楚的节奏'),
}


def build_catalog():
    cues=[]
    for id,(original,work,wiki,transcriber,scene,arrangement) in META.items():
        score=json.loads((ROOT/f'music/scores/{id}.json').read_text())
        report=json.loads((ROOT/f'music/reports/{id}.json').read_text())
        file=f'assets/music/{id}.mp3'
        assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==report['assets']['mp3']['sha256']
        assert hashlib.sha256((ROOT/f'music/scores/{id}.json').read_bytes()).hexdigest()==report['scoreSha256']
        cues.append(dict(id=id,title=score['title'],original=original,work=work,composer='ZUN / 上海アリス幻樂団',
                         sourceUrl='https://en.touhouwiki.net/wiki/'+wiki+'/Music',transcriber=transcriber,
                         scene=scene,arrangement=arrangement,bpm=score['bpm'],seconds=report['seconds'],
                         file=file,sha256=report['assets']['mp3']['sha256'],loopFrames=report['frames'],sampleRate=report['sampleRate'],
                         midi=f'music/midi/{id}.mid',score=f'music/scores/{id}.json'))
    catalog=dict(schemaVersion=1,credits='Touhou Project fan arrangements; real recorded instrument samples, not a live recording session',
                 auditionStatus='Human listening review pending',
                 transcriptionRightsStatus='Collection maintainer permits attributed modification, but original transcriber authorization chain is unverified. Reposted files and generic MIDI copyright text are not full permission. Before distribution, confirm original authors permission or use independent transcriptions.',
                 releaseStatus='Audition branch only; no merge, release or deployment without user instruction',cues=cues)
    (ROOT/'music/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    print(len(cues),'cues',round(sum(c['seconds'] for c in cues),2),'seconds')


if __name__=='__main__':
    build_catalog()
