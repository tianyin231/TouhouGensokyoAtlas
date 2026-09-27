"""保留 v0.16 基线，将地底模块内嵌成可直接打开的单 HTML。"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / '幻想乡大地图_v0.16_无缘塚与玄武涧.html'
OUTPUT = ROOT / '幻想乡大地图_v0.17_旧地狱全域.html'


def main():
    html = BASE.read_text(encoding='utf-8')
    geometry = (ROOT / 'src/old-hell.js').read_text(encoding='utf-8')
    renderer = (ROOT / 'src/old-hell-renderer.js').read_text(encoding='utf-8')
    # Worker 和主线程的数学、模型注册表必须使用同一份实现。
    match = re.search(r'(<script id="world-builder"[^>]*>)(.*?)(</script>)', html, re.S)
    original = match.group(2)
    assert html.count(original) == 2, '基线的 Worker 与主线程脚本不一致'
    html = html.replace(original, original + '\n' + geometry)
    html = html.replace('<script>/* Map annotations', '<script>\n' + renderer + '\n</script><script>/* Map annotations', 1)
    replacements = {
        '<title>幻想乡 · 立体风物志 / v0.16</title>': '<title>幻想乡 · 立体风物志 / v0.17 旧地狱全域</title>',
        "const DEFAULTS=G.REGION_DEFAULTS={": "const DEFAULTS=G.REGION_DEFAULTS={oldhell:'hellOverview',",
        "version:'0.16.0'": "version:'0.17.0'",
        "sourceBaseline:'0.15.0',forestOrigin": "sourceBaseline:'0.16.0',undergroundModule:'0.17.0',forestOrigin",
        "THREE.JS r185 · v0.16": "THREE.JS r185 · v0.17",
        'gensokyo-v016': 'gensokyo-v017',
        "state.space=p.space||'surface';": "state.space=p.space||'surface';state.hellSection=!!p.section;",
        "animate&&oldSpace===state.space&&oldMode===state.displayMode": "animate&&oldSpace===state.space&&oldMode===state.displayMode&&state.space!=='oldhell'",
        "state.labels=state.displayMode==='atlas'||id==='continuous';": "state.labels=state.displayMode==='atlas'||id==='continuous'||state.hellSection;",
        "characters?.update();": "updateHellLabels();characters?.update();",
        "function initLabels(){": """const hellLabelEls=[];
 function updateHellLabels(){if(!rig)return;for(const h of hellLabelEls){const p=rig.project(h.p);h.el.hidden=!(state.space==='oldhell'&&state.hellSection&&state.labels&&!state.uiHidden&&p.visible);if(!h.el.hidden){h.el.style.left=p.x*innerWidth+'px';h.el.style.top=p.y*innerHeight+'px';}}}
 function initLabels(){
 for(const [text,view,p]of [['旧都','hellStreet',[0,-268,480]],['地灵殿','hellPalace',[0,-211,-100]],['灼热地狱','hellBlazing',[195,-573,-365]],['旧血池','hellBlood',[-338,-750,-725]]]){const el=newLabel(text,view,'');el.onclick=()=>setView(view,true);el.hidden=true;hellLabelEls.push({el,p});}
""",
        "function formatTitle(id,p){": """function formatTitle(id,p){
 const isHell=state.space==='oldhell';document.body.classList.toggle('in-oldhell',isHell);$('hell-nav').hidden=!isHell;
 $('btn-hell').classList.toggle('active',isHell);
 if(isHell){$('scene-index').textContent='地底风物志 / '+(id==='hellOverview'?'全域剖览':id.startsWith('hellH')||id==='hellGallery'?'地灵殿':'旧地狱');
 $('scene-title').textContent=({hellReactor:'核聚变炉',hellOverview:'旧地狱 · 地底全域',hellBlazing:'灼热地狱遗址',hellDescent:'地灵殿下 · 深渊'})[id]||p.label;$('scene-subtitle').textContent=({hellOverview:'灯火旧都之下，宫殿与地火层叠。',hellStreet:'青瓦连檐，灯笼照见石板长街。',hellRoofs:'街巷、水渠与背院，共处深远洞窟。',hellPalace:'蔷薇前庭与西洋洋馆，地火隐在石阶之下。',hellHall:'拱廊深处，彩绘地砖与灯火相映。',hellGallery:'细柱、回廊与彩窗，通往寂静的大堂。',hellSpa:'泉水沿石池流淌，蒸汽漫过木廊。',hellBridge:'风穴深处，跨越幽谷，向旧都而行。',hellDescent:'循维护栈道下行，地灵殿下的热光渐近。',hellBlazing:'岩壳破裂，熔流在遗址间缓缓涌动。',hellReactor:'星形栈桥环绕地底太阳。',hellBlood:'更深处，幽暗油海映着岸边微光。'})[id]||'';
 $('mode-note').textContent='旧地狱 · 几何与路线为本作补完 · 可自由旋转及飞行';return;}
""",
        "function setupUI(){": """function setupUI(){
 $('btn-hell').onclick=()=>setView('hellOverview',false);
 $('hell-home').onclick=()=>setView('hellOverview',true);$('hell-return').onclick=()=>setView('diorama',false);
 document.querySelectorAll('[data-hell-view]').forEach(b=>b.onclick=()=>setView(b.dataset.hellView,true));
 $('hell-roof').onclick=()=>{state.ceiling=!state.ceiling;$('hell-roof').textContent=state.ceiling?'隐藏顶盖':'恢复顶盖';wake();};
""",
        "if(G.WEST_INFO?.[id])": "if(G.HELL_NOTES?.[id])$('detail-design').textContent=G.HELL_NOTES[id];if(G.WEST_INFO?.[id])",
    }
    for old, new in replacements.items():
        assert old in html, f'未找到接入位置: {old[:70]}'
        html = html.replace(old,new)
    html = html.replace('<button id="btn-layers"', '<button id="btn-hell" class="tool">◈ <span>地底全域</span></button><button id="btn-layers"', 1)
    html = html.replace('<nav class="dock', '<nav id="hell-nav" class="space-nav glass ui" hidden><button id="hell-home">全域</button><button data-hell-view="hellStreet">旧都</button><button data-hell-view="hellPalace">地灵殿</button><button data-hell-view="hellBlazing">灼热地狱</button><button id="hell-roof">隐藏顶盖</button><button id="hell-return">返回地表</button></nav><nav class="dock', 1)
    html = html.replace('</style>', '.in-oldhell .lighting-switch button,.in-oldhell .weather-switch{display:none}.in-oldhell .caption{max-width:430px}.in-oldhell .caption h1{font-size:30px;letter-spacing:3px;line-height:1.4}.in-oldhell #scene-index{color:#d9b990}.in-oldhell #build-status{color:#c4c3c6}.in-oldhell .view-buttons{max-width:min(850px,60vw)}@media(max-width:900px){.in-oldhell .view-buttons{max-width:calc(100vw - 190px)}}@media(max-width:520px){.in-oldhell .caption{max-width:290px}.in-oldhell .caption h1{font-size:23px;letter-spacing:1px}}\n</style>', 1)
    # 源资料保留原状，仅更新已建区域的状态和本轮参考，不改原作事实。
    match = re.search(r'(<script id="atlas-data"[^>]*>)(.*?)(</script>)',html,re.S)
    data = json.loads(match.group(2))
    new_sources = [
        ('H1701','旧都／地灵殿三面与 ZUN 交叉评论','https://thbwiki.cc/旧都'),
        ('H1702','地灵殿／原作大堂与官方出版物索引','https://thbwiki.cc/地灵殿（场景）'),
        ('H1703','核聚变炉／非想天则能源中心','https://thbwiki.cc/核聚变炉'),
        ('H1704','旧血池地狱／刚欲异闻','https://thbwiki.cc/旧血池地狱'),
        ('H1705','地狱的深道','https://thbwiki.cc/地狱的深道'),
    ]
    data['sources'].extend({'id':sid,'title':title,'url':url,'type':'C','note':'v0.17 场景依据；具体几何与布局由本作补完。'} for sid,title,url in new_sources)
    for loc in data['locations']:
        if loc['group']=='旧地狱':
            loc['status']='v0.17 已建立可浏览三维场景'
            loc['coordinate_status']='P：独立地底坐标；宫殿高于灼热遗址，精确高程为设计值'
            sid={'chireiden':'H1702','reactor':'H1703','blood_old':'H1704','deep_road':'H1705','parsee_bridge':'H1705'}.get(loc['id'],'H1701')
            loc['source_ids']=list(dict.fromkeys(loc['source_ids']+[sid]))
    html=html[:match.start(2)]+json.dumps(data,ensure_ascii=False,indent=2)+html[match.end(2):]
    OUTPUT.write_text(html,encoding='utf-8')
    print(f'{OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes')


if __name__=='__main__':
    main()
