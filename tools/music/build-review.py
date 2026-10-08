"""Build a downloadable offline audition page and a compact source/audio package."""
from pathlib import Path
import base64
import html
import json
import zipfile

ROOT=Path(__file__).resolve().parents[2]
catalog=json.loads((ROOT/'music/catalog.json').read_text())
out=ROOT/'dist';out.mkdir(exist_ok=True)
rows=[]
for cue in catalog['cues']:
    encoded=base64.b64encode((ROOT/cue['file']).read_bytes()).decode()
    rows.append('<article><h2>'+html.escape(cue['title'])+'</h2><p>'+html.escape(cue['original']+' · '+cue['work'])+'</p><p>'+html.escape(cue['arrangement'])+'</p>'
                +f'<audio controls loop preload="none" src="data:audio/mpeg;base64,{encoded}"></audio>'
                +'<p>'+str(cue['bpm'])+' BPM · '+str(round(cue['seconds'],2))+' 秒 · 记谱参考 '+html.escape(cue['transcriber'])+'</p></article>')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>幻想乡 · 配乐试听</title>
<style>body{font:16px/1.7 system-ui;background:#f3f1eb;color:#263d35;max-width:820px;margin:40px auto;padding:0 24px}h1{font-size:30px}h2{font-size:21px}article{padding:24px 0;border-top:1px solid #bcc7bf}audio{width:100%}p{margin:8px 0}</style>
<h1>幻想乡 · 配乐试听</h1><p>十段场景／事件配乐。原作曲：ZUN／上海アリス幻樂団。由 XSXB-Band 使用真实乐器录音采样渲染，并非真人合奏录音。</p>
<p>默认循环，点击后播放。试听时请检查旋律辨识、场景气氛、声部层次、刺耳感、长时间疲劳及循环接缝。音乐听辨待验收；首曲中段 24 小节共用四小节和声循环，须重点听重复疲劳。</p>
<p>记谱参考合集注明转载。维护者允许修改署名，不等于原记谱者授权链已核实；泛化版权文本不构成完整许可。保留原作者署名与固定来源，发行前需核对许可或替换为独立记谱。当前为试听稿。</p>'''+''.join(rows)+'''<script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()})));</script></html>'''
(out/'music-listening.html').write_text(page)
with zipfile.ZipFile(out/'touhou-music-review.zip','w',zipfile.ZIP_DEFLATED) as z:
    for cue in catalog['cues']:
        for file in [cue['file'],cue['midi'],cue['score'],f'music/reports/{cue["id"]}.json']:
            z.write(ROOT/file,file)
    for file in ['music/catalog.json','music/source-motifs.json','music/scene-motifs.json','music/sample-provenance.json','music/validation.json','docs/music.md']:
        z.write(ROOT/file,file)
print('Audition HTML:',(out/'music-listening.html').stat().st_size,'bytes')
print('Review ZIP:',(out/'touhou-music-review.zip').stat().st_size,'bytes')
