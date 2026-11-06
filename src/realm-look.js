/* 独立空间的二次元画风（2026-11-06）。
 * 把 2026-11-05 用户定稿的画风延伸到连续地表之外：每个空间一套色板，
 * 共用绘画滤镜、彩色轮廓线和分层光影；天空换成手绘天穹，地面加大色块与颜料斑，
 * 低模树冠外加一层绒叶卡片，并按空间飘不同的微粒。
 * 跨空间切换时用隙间盖住瞬切；被墙面挡住的机位在 CAMERA_FIXES 里修正。
 * 只在运行时叠加，不改动各空间的模型数据、路线和人物；神社等地表内容不受影响。 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const C=hex=>{const n=parseInt(hex.slice(1),16),f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};return[f(n>>16&255),f(n>>8&255),f(n&255)];};
const GROUND=/(soil|sand|earth|turf|grass|rock|moss|gravel|mud|ash|slag|ground|snow|basalt|^cave)$/i;
const CROWN=/(leaf|blossom|canopy|foliage)$/i;
const OCCUPIED=/(Paving|Road|Water|Path|Stair|Step)/;
const SKIES=['netherSky','heavenSky','higanSky','lunarSky','makaiSky','backdoorSky','kasenSky','animalSky','jigokuSky'];

// 色板。tone：暗部染色、暗部抬升、亮部染色、轮廓线、饱和度（立面／地面）。
const tone=(shade,lift,high,ink,sat=[1.14,1.06])=>({shade,lift,high,ink,sat});
const NEUTRAL=tone([.72,.78,1.08],[.012,.016,.04],[1.05,1.02,.95],[.42,.44,.60]);
const sky=o=>({top:'#16204f',mid:'#3f5aa0',low:'#a9c4dd',floor:null,bright:'#ffffff',shade:'#8ea3cf',cover:.60,soft:.026,stars:0,sil:0,sil2:0,silA:'#55607a',silB:'#7c88a0',sun:null,vault:0,vaultC:'#0d1016',streak:1,...o});
const R={
 // 冥界：TH07 春樱与幽雾，比现世更淡、更冷，地平线泛樱粉。
 netherworld:{sky:sky({top:'#47569e',mid:'#a4a6dc',low:'#fbdfe4',floor:'#dbcbe2',bright:'#fff7f4',shade:'#c3b4e0',cover:.56,soft:.05,sil:.55,sil2:.3,silA:'#a39cc8',silB:'#cdbfdc',sun:'#fff0dc'}),
  haze:'#dccde6',ap:[80,.00105],tone:tone([.70,.68,1.12],[.024,.014,.06],[1.05,1.0,.97],[.46,.38,.62]),light:{sun:1.3,hemi:.72},gain:1,glow:.20,bloomAt:.92,shaft:.10,
  ground:{lo:[.84,.90,.96],hi:[1.06,1.04,.94],dab:'#efb7ca',dabP:[.56,.70,74,.62],rock:[.80,.80,.94]},cover:{shape:0,perArea:.09,max:42000,reach:170,size:[.7,1.3],colors:['#7e9a73','#93ad80','#a7ba8c','#c9b7c6'],far:280},motes:{shape:1,n:700,box:[90,34,90],vel:[1.4,-1.5,.7],sway:2.4,size:60,max:9,tint:'#ffc6d8',tint2:'#fff0f4',opaque:.9,alpha:.9}},
 // 白玉楼雪庭：同一地图的春雪选景。
 netherworldWinter:{sky:sky({top:'#3c4f80',mid:'#8ea0c8',low:'#e6ecf4',floor:'#dfe6f0',bright:'#f6f9ff',shade:'#a9b5d0',cover:.56,sil:.5,sil2:.28,silA:'#94a2bf',silB:'#bcc7dc'}),
  haze:'#dde4ef',ap:[80,.0011],tone:tone([.70,.76,1.12],[.02,.02,.05],[1.02,1.02,1.0],[.40,.44,.62]),light:{sun:1.2,hemi:.8},gain:1,glow:.14,bloomAt:1,shaft:.06,
  ground:{lo:[.92,.94,.98],hi:[1.03,1.03,1.02],dab:'#ffffff',dabP:[.5,.7,90,.2],rock:[.84,.86,.96]},motes:{shape:0,n:900,box:[80,40,80],vel:[.8,-3.2,.5],sway:1.6,size:44,max:6,tint:'#ffffff',tint2:'#dfe9ff',opaque:.8,alpha:.9}},
 // 有顶天：TH10.5 高天，蓝得最纯，云海在脚下。
 heaven:{sky:sky({top:'#0c2a86',mid:'#2f7ae0',low:'#cdeafc',floor:'#f3fbff',bright:'#ffffff',shade:'#9ec0ea',cover:.56,sil:.5,sil2:.26,silA:'#7fa6cf',silB:'#b7d3ea',sun:'#fff3d8'}),
  haze:'#cfe6f8',ap:[140,.00052],tone:tone([.68,.78,1.14],[.012,.02,.05],[1.07,1.03,.93],[.38,.46,.66],[1.2,1.1]),light:{sun:1.5,hemi:.68},gain:1,glow:.2,bloomAt:.95,shaft:.13,
  ground:{lo:[.80,.92,.76],hi:[1.14,1.08,.82],dab:'#f6e9a8',dabP:[.60,.74,48,.55],rock:[.82,.84,.96]},cover:{shape:2,perArea:.14,max:42000,reach:170,size:[.7,1.2],colors:['#9fc46a','#b6d079','#a7ca70','#c4d884','#d6dc92'],far:280},motes:{shape:1,n:420,box:[90,30,90],vel:[1.2,-.8,.5],sway:2.2,size:44,max:7,tint:'#ffd3df',tint2:'#fff3c8',opaque:.85,alpha:.8}},
 heaven155:{sky:sky({top:'#0b0d3a',mid:'#3b3a8c',low:'#c8a6c8',floor:'#54527a',bright:'#d9d4ee',shade:'#6d6aa2',cover:.6,stars:.5,sil:.5,sil2:.3,silA:'#3d3a68',silB:'#6a6596'}),
  haze:'#7d7aa8',ap:[120,.0008],tone:tone([.66,.68,1.14],[.012,.012,.05],[1.05,1.0,.96],[.34,.34,.58]),light:{sun:1.3,hemi:.7},gain:1,glow:.22,bloomAt:.9,shaft:0,
  ground:{lo:[.84,.84,.92],hi:[1.08,1.02,.92],dab:'#8f7f9c',dabP:[.56,.72,60,.3],rock:[.78,.78,.92]},motes:{shape:0,n:300,box:[100,40,100],vel:[.4,.5,.2],sway:3,size:40,max:5,tint:'#c7e0ff',tint2:'#f0d0ff',opaque:0,alpha:.7}},
 // 玄云海：厚重墨云，紫电在云里闪。
 genkumoumi:{sky:sky({top:'#2a304c',mid:'#585f7e',low:'#a7acbf',floor:'#6d7288',bright:'#c9ccd8',shade:'#3c425e',cover:.47,soft:.05,flash:1,sil:.42,sil2:.24,silA:'#6c7290',silB:'#9499ae'}),
  haze:'#8f94a8',ap:[60,.0011],tone:tone([.64,.68,1.12],[.012,.012,.05],[1.03,1.02,1.0],[.30,.32,.5]),light:{sun:1.1,hemi:.82},gain:1,glow:.16,bloomAt:.9,shaft:0,
  ground:{lo:[.84,.86,.94],hi:[1.05,1.05,1.04],dab:'#5d6488',dabP:[.56,.72,56,.3],rock:[.72,.74,.9]},motes:{shape:0,n:260,box:[100,40,100],vel:[3,.2,1],sway:1.8,size:36,max:4,tint:'#b9c4ff',tint2:'#ffffff',opaque:0,alpha:.55}},
 genkumoumiScarlet:{sky:sky({top:'#2a0d24',mid:'#8a2a3e',low:'#ffb48c',floor:'#a84e50',bright:'#ffd2b4',shade:'#6e2038',cover:.47,soft:.05,sil:.42,sil2:.24,silA:'#4b1830',silB:'#a04848'}),
  haze:'#d98a7a',ap:[60,.001],tone:tone([.74,.60,.92],[.03,.008,.03],[1.08,.98,.86],[.40,.22,.36]),light:{sun:1.2,hemi:.8},gain:1,glow:.2,bloomAt:.9,shaft:0,
  ground:{lo:[.92,.8,.82],hi:[1.1,.98,.86],dab:'#a84848',dabP:[.56,.72,56,.3],rock:[.84,.68,.76]},motes:{shape:2,n:300,box:[100,40,100],vel:[3,.8,1],sway:2,size:36,max:4,tint:'#ffb37a',tint2:'#ff6a5a',opaque:0,alpha:.7}},
 // 中有之道到三途河：浓雾、静水、苔石，日光被滤成灰青。
 shigan:{sky:sky({top:'#4a5f73',mid:'#7c95a2',low:'#d9e0da',floor:'#c2cec9',bright:'#e9eeea',shade:'#93a7ad',cover:.5,soft:.09,sil:.38,sil2:.2,silA:'#7c939a',silB:'#a9bcbb'}),
  haze:'#cdd8d3',ap:[46,.00235],tone:tone([.72,.82,1.02],[.016,.03,.04],[1.02,1.02,.96],[.34,.42,.48],[1.04,1.0]),light:{sun:.72,hemi:.98},gain:.97,glow:.12,bloomAt:1,shaft:0,
  ground:{lo:[.78,.86,.80],hi:[1.04,1.04,.92],dab:'#4f7a62',dabP:[.58,.74,38,.5],rock:[.74,.82,.82]},cover:{shape:0,perArea:.06,max:26000,reach:150,size:[.6,1.1],colors:['#5f8068','#7a9a7a','#94aa88'],far:220},motes:{shape:0,n:360,box:[90,24,90],vel:[.4,.25,.2],sway:3.4,size:80,max:12,tint:'#dff5ea',tint2:'#ffffff',opaque:0,alpha:.42}},
 // 彼岸：无昼夜的柔光，红花铺到天边。
 higan:{sky:sky({top:'#8e6c8e',mid:'#dfa58c',low:'#ffe6c2',floor:'#f1b9a0',bright:'#fff3e0',shade:'#e0a58e',cover:.5,soft:.08,sil:.3,sil2:.16,silA:'#b58a86',silB:'#e3b49e',sun:'#ffe6be'}),
  haze:'#f7cfb4',ap:[70,.0016],tone:tone([.78,.62,.86],[.03,.01,.03],[1.06,1.0,.90],[.44,.20,.30],[1.28,1.12]),light:{sun:1.0,hemi:.9},gain:1,glow:.2,bloomAt:.92,shaft:.08,
  ground:{lo:[.62,.60,.50],hi:[.86,.74,.54],dab:'#a8151c',dabP:[.20,.44,67,.96],rock:[.8,.72,.8]},cover:{shape:1,perArea:.16,max:60000,reach:230,size:[1.9,3.3],colors:['#e01c22','#c81620','#f03a30','#b01420'],far:520},motes:{shape:1,n:520,box:[90,26,90],vel:[.7,.65,.4],sway:2.6,size:40,max:7,tint:'#e8282c',tint2:'#ff9a78',opaque:.85,alpha:.85}},
 // 月都：黑天、星、蓝色地球，地面被冷光照成银白；不是白昼。
 lunar:{sky:sky({top:'#02040e',mid:'#070f26',low:'#1a2c4e',floor:'#3d5a82',cover:1,stars:1.2,sil:.34,sil2:.18,silA:'#1b2a48',silB:'#3a5478'}),
  haze:'#2c4468',ap:[260,.00062],tone:tone([.60,.72,1.18],[.003,.006,.020],[.98,1.02,1.06],[.28,.34,.56],[1.16,1.06]),light:{sun:1.1,hemi:.62},gain:.95,glow:.24,bloomAt:.86,shaft:0,
  ground:{lo:[.70,.74,.86],hi:[.92,.94,1.0],dab:'#7f8fa6',dabP:[.54,.70,64,.45],rock:[.74,.78,.94]},motes:{shape:0,n:260,box:[110,40,110],vel:[.2,.35,.1],sway:3,size:34,max:4,tint:'#bfe0ff',tint2:'#ffffff',opaque:0,alpha:.6}},
 lunarSealed:{sky:sky({top:'#04081a',mid:'#101f42',low:'#6f93c2',floor:'#9ab6da',cover:1,stars:1,sil:.34,sil2:.18,silA:'#2e4468',silB:'#6d8ab0'}),
  haze:'#92aed0',ap:[200,.0008],tone:tone([.58,.72,1.22],[.005,.009,.028],[.96,1.03,1.12],[.26,.34,.6]),light:{sun:1,hemi:.7},gain:1,glow:.18,bloomAt:.92,shaft:0,
  ground:{lo:[.84,.90,1.04],hi:[.98,1.02,1.1],dab:'#c7dcf5',dabP:[.5,.7,80,.4],rock:[.8,.86,1.02]},motes:{shape:0,n:500,box:[100,40,100],vel:[0,-.4,0],sway:1,size:34,max:4,tint:'#dff0ff',tint2:'#ffffff',opaque:.5,alpha:.7}},
 lunarsea:{sky:sky({top:'#02040e',mid:'#081434',low:'#3a68a8',floor:'#28486e',cover:1,stars:1.3,sil:.2,sil2:.1,silA:'#16233f',silB:'#2d4a74'}),
  haze:'#3a6296',ap:[200,.0006],tone:tone([.56,.72,1.22],[.003,.007,.024],[.96,1.03,1.08],[.26,.36,.6],[1.2,1.08]),light:{sun:1.1,hemi:.6},gain:.97,glow:.24,bloomAt:.84,shaft:0,
  ground:{lo:[.70,.74,.86],hi:[.92,.94,1.02],dab:'#8ea2bd',dabP:[.5,.68,50,.4],rock:[.72,.78,.96]},motes:{shape:0,n:220,box:[110,30,110],vel:[.15,.2,.08],sway:3,size:34,max:4,tint:'#a9d6ff',tint2:'#ffffff',opaque:0,alpha:.5}},
 // 虹龙洞全貌：结构图视角，给足照明。
 mineSection:{sky:sky({top:'#05080e',mid:'#080e18',low:'#121c28',floor:'#0a1018',cover:1}),
  haze:'#0c141e',ap:[1600,.0001],tone:tone([.62,.68,1.12],[.003,.004,.012],[1.08,1.02,.92],[.28,.32,.5],[1.18,1.06]),light:{sun:1.3,hemi:1.6},clearFog:true,gain:1.25,glow:.22,bloomAt:.8,shaft:0,
  ground:{lo:[.86,.88,.96],hi:[1.1,1.04,1],dab:'#30384e',dabP:[.56,.72,48,.3],rock:[.74,.78,.96]},motes:null},
 // 表月：无水荒原，黑天下的灰土；没有蓝雾。
 lunarOuter:{sky:sky({top:'#010205',mid:'#03060e',low:'#0e1422',floor:'#1a1e2a',cover:1,stars:1.5,sil:.2,sil2:.1,silA:'#0a0c14',silB:'#1a1e2c'}),
  haze:'#22262f',ap:[300,.0005],tone:tone([.62,.66,.96],[.003,.004,.012],[1.02,1.02,1.0],[.26,.28,.4],[.9,.86]),light:{sun:1.25,hemi:.5},gain:1,glow:.12,bloomAt:1,shaft:0,
  ground:{lo:[.72,.72,.76],hi:[1.02,1.0,.98],dab:'#585a64',dabP:[.54,.70,64,.4],rock:[.72,.72,.8]},motes:null},
 // 第四槐安通道：TH15 的梦，靛蓝加粉紫。
 dream:{sky:sky({top:'#0a0a38',mid:'#2a2384',low:'#5c3a9c',floor:'#3e2a86',bright:'#ffd0f0',shade:'#7a4ac0',cover:1,soft:.04,stars:1.2}),
  haze:'#3a2a80',ap:[160,.0009],tone:tone([.66,.60,1.2],[.010,.006,.036],[1.04,.98,1.06],[.34,.28,.66],[1.24,1.12]),light:{sun:1,hemi:.9},gain:1.02,glow:.3,bloomAt:.8,shaft:0,
  ground:{lo:[.9,.9,1],hi:[1.05,1.02,1.05],dab:'#9a7ad8',dabP:[.56,.7,60,.3],rock:[.8,.8,1]},motes:{shape:0,n:420,box:[100,50,100],vel:[.5,.5,.3],sway:4,size:48,max:6,tint:'#ffc4f0',tint2:'#9fd4ff',opaque:0,alpha:.75}},
 // 魔界：TH12 法界的封印红与黑土。
 makai12:{sky:sky({top:'#0c0416',mid:'#3a0a30',low:'#e84a4a',floor:'#2a0818',bright:'#d84a5e',shade:'#2a0a2e',cover:.56,soft:.05,stars:.5,sil:.34,sil2:.16,silA:'#1a0820',silB:'#5a1432'}),
  haze:'#7a1c3a',ap:[140,.0011],tone:tone([.72,.56,.96],[.012,.003,.014],[1.08,.98,.92],[.42,.18,.36],[1.26,1.1]),light:{sun:1.2,hemi:.7},gain:1.08,glow:.26,bloomAt:.82,shaft:0,
  ground:{lo:[.84,.72,.82],hi:[1.14,.92,.96],dab:'#57263a',dabP:[.56,.72,70,.4],rock:[.8,.66,.82]},motes:{shape:2,n:420,box:[110,44,110],vel:[.4,1.1,.2],sway:2.6,size:40,max:5,tint:'#ff5a70',tint2:'#ffb07a',opaque:0,alpha:.8}},
 // 魔界：TH05 的紫雾与彩窗城。
 makai05:{sky:sky({top:'#0e0a2e',mid:'#472a86',low:'#e88ac0',floor:'#2c1a54',bright:'#f6b6dc',shade:'#5a3296',cover:.56,soft:.04,stars:.7,sil:.48,sil2:.26,silA:'#2a1a56',silB:'#7a4aa0'}),
  haze:'#8a5cae',ap:[160,.00095],tone:tone([.66,.58,1.16],[.010,.005,.026],[1.06,1.0,1.02],[.36,.26,.62],[1.26,1.12]),light:{sun:1.25,hemi:.74},gain:1.1,glow:.26,bloomAt:.84,shaft:0,
  ground:{lo:[.84,.80,.96],hi:[1.14,1.0,1.08],dab:'#5a3a8c',dabP:[.56,.72,64,.34],rock:[.76,.70,.96]},motes:{shape:0,n:420,box:[110,44,110],vel:[.3,.8,.2],sway:3.4,size:44,max:5,tint:'#d7a6ff',tint2:'#ffc0e8',opaque:0,alpha:.8}},
 makai01:{sky:sky({top:'#10082a',mid:'#55286e',low:'#f09a90',floor:'#34184e',bright:'#ffc0a8',shade:'#6a2a72',cover:.56,soft:.05,stars:.4,sil:.46,sil2:.24,silA:'#2e1650',silB:'#8a4a80'}),
  haze:'#a0627e',ap:[160,.00095],tone:tone([.72,.58,1.06],[.012,.005,.022],[1.08,1,.94],[.4,.26,.52],[1.22,1.1]),light:{sun:1.3,hemi:.72},gain:1.1,glow:.22,bloomAt:.86,shaft:0,
  ground:{lo:[.88,.8,.9],hi:[1.14,.98,.96],dab:'#6a3a72',dabP:[.56,.72,64,.3],rock:[.8,.7,.9]},motes:{shape:0,n:320,box:[110,44,110],vel:[.3,.5,.2],sway:3,size:40,max:5,tint:'#ffb0a0',tint2:'#d8a0ff',opaque:0,alpha:.65}},
 // 旧地狱：冷蓝的岩穹对暖色灯笼；不是到处熔岩。
 oldhell:{sky:sky({top:'#04060c',mid:'#070c16',low:'#0f1828',floor:'#070c16',cover:1,sil:.6,sil2:.34,silA:'#060a12',silB:'#0c1420',vault:.34,vaultC:'#04070d'}),
  haze:'#0e1626',ap:[150,.00125],tone:tone([.56,.66,1.22],[.002,.003,.010],[1.12,1.0,.84],[.26,.30,.54],[1.22,1.1]),light:{sun:1.05,hemi:1},gain:1.2,glow:.34,bloomAt:.72,shaft:0,
  ground:{lo:[.84,.86,.96],hi:[1.1,1.04,1],dab:'#30384e',dabP:[.56,.72,48,.3],rock:[.72,.76,.94]},motes:{shape:2,n:320,box:[80,36,80],vel:[.3,1.5,.2],sway:2.2,size:34,max:4,tint:'#ffb066',tint2:'#ff7a3a',opaque:0,alpha:.8}},
 oldhellHot:{sky:sky({top:'#0a0406',mid:'#1c0a0a',low:'#50200e',floor:'#1a0806',cover:1,sil:.6,sil2:.34,silA:'#1c0a08',silB:'#3a160c',vault:.34,vaultC:'#100606'}),
  haze:'#6a2a14',ap:[120,.0012],tone:tone([.74,.54,.82],[.006,.002,.004],[1.1,.98,.8],[.42,.2,.24],[1.3,1.14]),light:{sun:1.1,hemi:1},gain:1.1,glow:.4,bloomAt:.78,shaft:0,
  ground:{lo:[.86,.78,.8],hi:[1.14,.98,.88],dab:'#40201c',dabP:[.56,.72,48,.3],rock:[.84,.68,.72]},motes:{shape:2,n:520,box:[80,40,80],vel:[.4,2.4,.3],sway:2.2,size:38,max:4,tint:'#ffb84e',tint2:'#ff5a22',opaque:0,alpha:.95}},
 // 旧地狱剖览：看的是整段地下的结构图，背景只给一点深度。
 oldhellSection:{sky:sky({top:'#04060c',mid:'#070c16',low:'#141c2c',floor:'#0a0f1a',cover:1}),
  haze:'#0c1220',ap:[1200,.0002],tone:tone([.60,.66,1.14],[.002,.003,.010],[1.1,1,.86],[.26,.3,.5],[1.2,1.08]),light:{sun:1,hemi:1},clearFog:true,gain:1.3,glow:.3,bloomAt:.74,shaft:0,
  ground:{lo:[.84,.86,.96],hi:[1.1,1.04,1],dab:'#30384e',dabP:[.56,.72,48,.3],rock:[.72,.76,.94]},motes:null},
 // 旧血池：油海。暗中要读得出紫黑的液面。
 oldhellOil:{sky:sky({top:'#04030a',mid:'#0e0a1c',low:'#241a3a',floor:'#0c0816',cover:1,sil:.6,sil2:.34,silA:'#0a0812',silB:'#181228',vault:.34,vaultC:'#08060e'}),
  haze:'#2a1f42',ap:[180,.0009],tone:tone([.66,.56,1.16],[.006,.003,.016],[1.06,.96,1.02],[.3,.22,.52],[1.24,1.1]),light:{sun:1.6,hemi:1.8},gain:1.65,glow:.34,bloomAt:.7,shaft:0,
  ground:{lo:[.9,.86,.98],hi:[1.1,1.02,1.06],dab:'#32284a',dabP:[.56,.72,48,.3],rock:[.78,.72,.94]},motes:{shape:0,n:200,box:[80,30,80],vel:[.1,.3,.1],sway:3,size:40,max:5,tint:'#b48cff',tint2:'#ff8ec0',opaque:0,alpha:.6}},
 // 地灵殿大堂：彩色玻璃的暖光。
 oldhellHall:{sky:sky({top:'#050810',mid:'#0a1220',low:'#1b2a40',floor:'#0a1220',cover:1}),
  haze:'#2a2030',ap:[120,.0006],tone:tone([.66,.60,1.1],[.008,.006,.018],[1.08,1.0,.9],[.34,.26,.42],[1.24,1.1]),light:{sun:1,hemi:1},gain:1.05,glow:.3,bloomAt:.8,shaft:0,
  ground:null,motes:{shape:0,n:200,box:[60,30,60],vel:[.1,.2,.1],sway:2,size:30,max:4,tint:'#ffd9a0',tint2:'#ffc0e0',opaque:0,alpha:.5}},
 // 现行地狱：TH17 四面的猩红业风。
 hell_present:{sky:sky({top:'#2a0612',mid:'#8e1626',low:'#e4604c',floor:'#7a1c20',bright:'#ffb08a',shade:'#5c0f22',cover:.52,soft:.06,streak:3.2,sil:.4,sil2:.2,silA:'#3c0a18',silB:'#8a2a30'}),
  haze:'#a83838',ap:[110,.00105],tone:tone([.76,.56,.84],[.012,.003,.008],[1.1,1,.84],[.42,.16,.24],[1.28,1.1]),light:{sun:1.3,hemi:.72},gain:1,glow:.2,bloomAt:.92,shaft:0,
  ground:{lo:[.84,.74,.74],hi:[1.14,.94,.84],dab:'#5a1414',dabP:[.56,.72,80,.4],rock:[.82,.64,.7]},motes:{shape:0,n:520,box:[120,30,120],vel:[9,.4,3],sway:1.4,size:30,max:4,tint:'#ffb49a',tint2:'#ffe6c8',opaque:.4,alpha:.6}},
 // 无间：什么都没有，灰烬一直落。
 hell_avici:{sky:sky({top:'#0a0a14',mid:'#22222e',low:'#6a6470',floor:'#262430',cover:.56,soft:.1,bright:'#7a7482',shade:'#2c2a38',sil:.2,sil2:.12,silA:'#16161e',silB:'#3a3844'}),
  haze:'#5c5864',ap:[100,.0011],tone:tone([.74,.72,1.04],[.008,.007,.014],[1.02,1,.96],[.3,.28,.4],[1,1]),light:{sun:1.5,hemi:1.1},gain:1.5,glow:.1,bloomAt:1,shaft:0,
  ground:{lo:[.84,.84,.9],hi:[1.14,1.1,1.1],dab:'#3a3844',dabP:[.56,.72,70,.3],rock:[.8,.8,.92]},motes:{shape:0,n:640,box:[100,40,100],vel:[.3,-1.2,.2],sway:1,size:34,max:4,tint:'#cfc8d0',tint2:'#8a8690',opaque:.7,alpha:.7}},
 // 畜生界：TH17 高楼与暮色。
 animal:{sky:sky({top:'#181438',mid:'#4c2a68',low:'#e87a68',floor:'#3a2a4a',bright:'#ffb6a0',shade:'#5a2e66',cover:.58,soft:.04,sil:.42,sil2:.22,silA:'#2a2144',silB:'#7a4a70'}),
  haze:'#5e4470',ap:[220,.00068],tone:tone([.62,.62,1.12],[.007,.005,.022],[1.1,1,.88],[.3,.26,.46],[1.24,1.1]),light:{sun:1.5,hemi:.68},gain:1.05,glow:.22,bloomAt:.86,shaft:.06,
  ground:{lo:[.86,.84,.92],hi:[1.08,1.02,.96],dab:'#3a3448',dabP:[.56,.72,70,.3],rock:[.78,.76,.92]},motes:{shape:0,n:220,box:[110,44,110],vel:[.8,.4,.3],sway:2.6,size:32,max:4,tint:'#ffb09a',tint2:'#d0a0ff',opaque:0,alpha:.5}},
 primate_core:{sky:sky({top:'#04100e',mid:'#0a2420',low:'#1c4a40',floor:'#0a1a18',cover:1}),
  haze:'#1c4a44',ap:[60,.0014],tone:tone([.58,.76,1.0],[.003,.009,.014],[1.0,1.06,.96],[.2,.34,.34],[1.18,1.08]),light:{sun:1,hemi:1},gain:1.08,glow:.3,bloomAt:.8,shaft:0,
  ground:null,motes:{shape:0,n:220,box:[60,26,60],vel:[.1,.3,.1],sway:2,size:30,max:4,tint:'#7affc8',tint2:'#a8e8ff',opaque:0,alpha:.6}},
 // 后户之国：TH16 的门与暗幕。
 backdoor:{sky:sky({top:'#0a0612',mid:'#1c0a2a',low:'#4c1c48',floor:'#1a0a1e',bright:'#c85a8a',shade:'#2a0e3a',cover:1,soft:.05,stars:1,sil:0}),
  haze:'#2a1030',ap:[220,.00085],tone:tone([.66,.56,1.14],[.010,.004,.022],[1.08,1.02,.92],[.34,.2,.46],[1.26,1.12]),light:{sun:1.1,hemi:.86},gain:1.08,glow:.3,bloomAt:.8,shaft:0,
  ground:null,motes:{shape:0,n:360,box:[110,50,110],vel:[.2,.4,.2],sway:3,size:40,max:5,tint:'#ffd98a',tint2:'#ff9ac8',opaque:0,alpha:.8}},
 // 华扇仙界：青绿山水的淡彩，近水楼台。
 senkai_kasen:{sky:sky({top:'#3a7ea8',mid:'#8fc3c8',low:'#f5eed8',floor:'#d9e6cf',bright:'#fffdf2',shade:'#b4cfc6',cover:.56,soft:.05,sil:.74,sil2:.42,silA:'#6f9c94',silB:'#b5cdb9',sun:'#fff3d6'}),
  haze:'#e4eeda',ap:[120,.00105],tone:tone([.66,.84,1.04],[.012,.03,.04],[1.05,1.03,.92],[.28,.42,.44],[1.2,1.08]),light:{sun:1.45,hemi:.7},gain:1,glow:.18,bloomAt:.96,shaft:.1,
  ground:{lo:[.72,.86,.74],hi:[1.16,1.1,.82],dab:'#cdbf6c',dabP:[.60,.74,44,.42],rock:[.72,.84,.86]},cover:{shape:0,perArea:.12,max:40000,reach:150,size:[.7,1.3],colors:['#86b070','#9dbf78','#b6cc80','#d7cf88'],far:280},motes:{shape:1,n:300,box:[90,30,90],vel:[1,-.8,.4],sway:2.4,size:38,max:6,tint:'#ffd3df',tint2:'#fff8d8',opaque:.8,alpha:.7}},
 senkai_kasenNight:{sky:sky({top:'#040a20',mid:'#10234a',low:'#3a5a7c',floor:'#142a44',cover:.62,bright:'#6a86ae',shade:'#1d3254',stars:1.1,sil:.74,sil2:.42,silA:'#0f2238',silB:'#2a4660'}),
  haze:'#2a4664',ap:[120,.001],tone:tone([.56,.72,1.2],[.002,.005,.018],[1.04,1.02,1],[.2,.3,.5]),light:{sun:1,hemi:1},gain:1.1,glow:.3,bloomAt:.78,shaft:0,
  ground:{lo:[.8,.88,.92],hi:[1,1.02,1],dab:'#3a5a66',dabP:[.6,.74,44,.2],rock:[.74,.82,.92]},motes:{shape:0,n:300,box:[90,26,90],vel:[.2,.2,.1],sway:3,size:40,max:5,tint:'#d8ffa8',tint2:'#ffe9a8',opaque:0,alpha:.9}},
 // 神灵庙的仙界：同一笔法，色调偏青白。
 senkai:{sky:sky({top:'#2f6f9c',mid:'#86bcc8',low:'#f2efe0',floor:'#dfe8dc',bright:'#fffdf4',shade:'#afcac8',cover:.57,soft:.05,sil:.8,sil2:.46,silA:'#6f9aa0',silB:'#b7cfc8',sun:'#fff3d6'}),
  haze:'#e6eee2',ap:[140,.00085],tone:tone([.66,.82,1.06],[.012,.028,.045],[1.05,1.03,.93],[.28,.40,.46],[1.2,1.08]),light:{sun:1.4,hemi:.74},gain:1,glow:.18,bloomAt:.96,shaft:.1,
  ground:{lo:[.70,.84,.74],hi:[1.04,1.06,.92],dab:'#a8c28c',dabP:[.56,.72,56,.6],rock:[.72,.84,.88]},motes:{shape:0,n:280,box:[90,30,90],vel:[.3,.4,.2],sway:3,size:40,max:5,tint:'#fff7cf',tint2:'#d6fff2',opaque:0,alpha:.7}},
 // 梦殿大祀庙：地底水廊，青蓝幽光衬朱柱和灯。
 mausoleum:{sky:sky({top:'#040a14',mid:'#0a1a2a',low:'#123044',floor:'#0a1826',cover:1,sil:.5,sil2:.3,silA:'#081420',silB:'#11293a',vault:.34,vaultC:'#060d16'}),
  haze:'#143448',ap:[70,.00135],tone:tone([.58,.76,1.14],[.002,.006,.016],[1.1,1.0,.86],[.2,.32,.46],[1.24,1.1]),light:{sun:1,hemi:1},gain:1.08,glow:.3,bloomAt:.76,shaft:0,
  ground:{lo:[.82,.88,.96],hi:[1.06,1.06,1],dab:'#26485a',dabP:[.56,.72,40,.3],rock:[.72,.82,.94]},motes:{shape:0,n:240,box:[70,26,70],vel:[.1,.4,.1],sway:2.4,size:34,max:4,tint:'#a8e8ff',tint2:'#ffe3a8',opaque:0,alpha:.65}},
 // 虹龙洞：暗中闪彩虹矿尘。
 mountain_mine:{sky:sky({top:'#060a14',mid:'#080e18',low:'#101a26',floor:'#0c1420',cover:1,sil:.5,sil2:.3,silA:'#0a1220',silB:'#152436',vault:.34,vaultC:'#080c14'}),
  haze:'#101a26',ap:[80,.0013],tone:tone([.60,.70,1.14],[.004,.006,.020],[1.08,1.02,.92],[.26,.3,.48],[1.28,1.12]),light:{sun:1,hemi:1},gain:1.02,glow:.24,bloomAt:.82,shaft:0,
  ground:{lo:[.84,.86,.94],hi:[1.1,1.06,1.02],dab:'#3a4660',dabP:[.56,.72,40,.3],rock:[.74,.78,.94]},motes:{shape:3,n:320,box:[60,26,60],vel:[.1,.2,.1],sway:2,size:34,max:5,tint:'#ffffff',tint2:'#ffffff',opaque:0,alpha:.85}},
 // 风穴、瀑后洞、地下中心、浅间地下：洞穴类的通用底，色相各有偏向。
 cave:{sky:sky({top:'#090c10',mid:'#121820',low:'#2a3438',floor:'#10151a',cover:1}),
  haze:'#28343a',ap:[46,.0021],tone:tone([.62,.74,1.08],[.004,.006,.012],[1.08,1.02,.88],[.28,.32,.4],[1.2,1.08]),light:{sun:1,hemi:1},gain:.96,glow:.2,bloomAt:.86,shaft:0,
  ground:{lo:[.82,.86,.9],hi:[1.1,1.06,.96],dab:'#3c4644',dabP:[.56,.72,30,.3],rock:[.76,.8,.9]},motes:{shape:0,n:200,box:[46,22,46],vel:[.2,.1,.1],sway:2,size:30,max:4,tint:'#ffe7c0',tint2:'#d0e8ff',opaque:0,alpha:.45}},
 lab:{sky:sky({top:'#040808',mid:'#0a1414',low:'#1a2c28',floor:'#0a1212',cover:1}),
  haze:'#1c3028',ap:[50,.0018],tone:tone([.60,.78,1],[.003,.008,.009],[1.04,1.06,.92],[.22,.32,.3],[1.18,1.06]),light:{sun:1,hemi:1},gain:1.02,glow:.3,bloomAt:.8,shaft:0,
  ground:null,motes:{shape:0,n:160,box:[46,22,46],vel:[.1,.3,.1],sway:1.6,size:28,max:3,tint:'#a0ffc8',tint2:'#ffffff',opaque:0,alpha:.4}},
 section:{sky:sky({top:'#5d7f94',mid:'#9db7c0',low:'#dfe5de',floor:'#c8d0ca',cover:.6}),
  haze:'#d3dad5',ap:[900,.0002],tone:NEUTRAL,light:{sun:1,hemi:1},gain:1,glow:0,bloomAt:1.25,shaft:0,ground:null,motes:null},
};
// 灵体层：幽灵、怨灵、神灵。按《求闻史纪》《地灵殿》《神灵庙》《鬼形兽》的形象分别设定。
const SPIRITS={
 netherworld:{shape:4,n:44,box:[210,34,210],vel:[.8,.15,.5],sway:9,size:2200,max:72,tint:'#ffffff',tint2:'#dceaff',opaque:.25,alpha:.9},
 shigan:{shape:4,n:30,box:[210,30,210],vel:[.5,.1,.3],sway:9,size:1800,max:60,tint:'#eafff4',tint2:'#ffffff',opaque:.2,alpha:.75},
 higan:{shape:4,n:54,box:[220,30,220],vel:[.3,.2,.2],sway:7,size:1800,max:60,tint:'#ffffff',tint2:'#ffe9d0',opaque:.2,alpha:.8},
 senkai:{shape:5,n:34,box:[190,44,190],vel:[.2,.9,.1],sway:7,size:1300,max:44,tint:'#8fd6ff',tint2:'#ffb6e6',opaque:0,alpha:.95},
 mausoleum:{shape:5,n:44,box:[150,36,150],vel:[.2,.8,.1],sway:6,size:1200,max:42,tint:'#7fd8ff',tint2:'#ffc070',opaque:0,alpha:.95},
 oldhell:{shape:4,n:30,box:[190,34,190],vel:[.4,.2,.3],sway:8,size:1500,max:52,tint:'#7ff0d8',tint2:'#a8c8ff',opaque:0,alpha:.7},
 animal:{shape:5,n:26,box:[200,60,200],vel:[.6,.5,.2],sway:10,size:1200,max:40,tint:'#ff9ad0',tint2:'#8fe0ff',opaque:0,alpha:.8},
 hell_present:{shape:4,n:22,box:[220,34,220],vel:[3,.2,1],sway:7,size:1500,max:50,tint:'#ffb09a',tint2:'#ffe6d0',opaque:0,alpha:.55},
};
Object.assign(R,{wind_grotto:R.cave,falls_cave:R.cave,asama:R.cave,geyser_center_inside:R.lab});
for(const p of Object.values(R)){
 const s=p.sky;p.skyLin={top:C(s.top),mid:C(s.mid),low:C(s.low),floor:C(s.floor||s.low),bright:C(s.bright),shade:C(s.shade),silA:C(s.silA),silB:C(s.silB),sun:s.sun?C(s.sun):[0,0,0],vaultC:C(s.vaultC)};
 p.hazeLin=C(p.haze);
 if(p.ground)p.groundLin={lo:p.ground.lo,hi:p.ground.hi,dab:C(p.ground.dab),rock:p.ground.rock};
 if(p.cover)p.cover.colorsLin=p.cover.colors.map(C);
 // 地平线以下用雾色，地形末端才能融进天空，不露出一圈边。
 p.skyLin.floor=p.hazeLin;
}
// 同一空间内的事件／区段，按状态选用不同色板。
function pick(o,rig){
 const s=o.space||'surface';
 if(s==='atlas'||s==='surface')return null; // 开窗展陈和局部剖切都还是地表地图，不算异界。
 if(s==='netherworld')return o.netherWinter?R.netherworldWinter:R.netherworld;
 if(s==='heaven')return o.heavenEdition==='th155'?R.heaven155:R.heaven;
 if(s==='genkumoumi')return o.heavenScarlet?R.genkumoumiScarlet:R.genkumoumi;
 if(s==='lunar')return o.lunarSealed?R.lunarSealed:R.lunar;
 if(s==='lunarsea')return o.lunarFace==='outer'?R.lunarOuter:R.lunarsea;
 if(s==='senkai_kasen')return o.kasenNight||o.view==='kasenNight'?R.senkai_kasenNight:R.senkai_kasen;
 if(s==='mountain_mine'&&o.view==='mineOverview')return R.mineSection;
 if(s==='oldhell'){if(o.view==='hellOverview')return R.oldhellSection;if(o.view==='hellHall'||o.view==='hellGallery')return R.oldhellHall;if(o.view==='hellBlood')return R.oldhellOil;return rig.target[1]<-440?R.oldhellHot:R.oldhell;}
 return R[s]||R.section;
}

const skyFragment=`precision highp float;varying vec3 vD;uniform sampler2D uPaper;uniform float uTime,uCover,uSoft,uStars,uSil,uSil2,uVault,uStreak,uFlash;
uniform vec3 uTop,uMid,uLow,uFloor,uBright,uShade,uSilA,uSilB,uSunC,uSunDir,uVaultC;
float hash3(vec3 p){return fract(sin(dot(p,vec3(31.47,74.27,13.17)))*43758.5453);}
float ridge(float a,float k,float o){float n=texture2D(uPaper,vec2(a*k,o),5.).r*.80+texture2D(uPaper,vec2(a*k*2.,o+.31),4.).g*.17+texture2D(uPaper,vec2(a*k*5.,o+.63),3.).b*.03;return clamp((n-.34)/.34,0.,1.);}
void main(){
 vec3 d=normalize(vD);float h=max(d.y,0.),a=atan(d.x,d.z)/6.28318;
 vec3 c=mix(uLow,uMid,smoothstep(0.,.24,h));c=mix(c,uTop,smoothstep(.16,.82,h));
 if(d.y<0.)c=mix(uLow,uFloor,smoothstep(0.,.03,-d.y));
 if(uStars>0.){vec3 q=floor(d*260.);float s=hash3(q),b=step(.9968,s)*(.2+.8*hash3(q+3.));
  vec3 f=fract(d*260.)-.5;c+=mix(vec3(.62,.76,1.),vec3(1.,.9,.74),hash3(q+7.))*b*uStars*(1.-smoothstep(.1,.5,length(f)))*smoothstep(.0,.22,d.y)*1.6;
  vec3 q2=floor(d*90.);float s2=hash3(q2+11.);vec3 f2=fract(d*90.)-.5;c+=vec3(.8,.88,1.)*step(.9985,s2)*(1.-smoothstep(.06,.34,length(f2)))*uStars*smoothstep(.02,.3,d.y)*2.4;}
 if(uCover<1.){
  vec2 w=vec2(uTime*.0028,uTime*.0010),p=d.xz/(abs(d.y)+.20);p*=vec2(1./uStreak,1.);
  p+=(texture2D(uPaper,p*.045+w).rg-.5)*.85;
  float n=texture2D(uPaper,p*.055+w).r*.72+texture2D(uPaper,p*.17+w*1.6).g*.28;
  vec2 s=normalize(uSunDir.xz+.001)*.20;
  float n2=texture2D(uPaper,(p+s)*.055+w).r*.72+texture2D(uPaper,(p+s)*.17+w*1.6).g*.28;
  n+=(texture2D(uPaper,p*.62+w*3.).r-.5)*.055;
  float cover=smoothstep(uCover,uCover+uSoft,n)*smoothstep(.015,.12,abs(d.y));
  c=mix(c,mix(uBright,uShade,smoothstep(-.012,.045,n2-n)),cover);
 }
 c+=uSunC*pow(max(dot(d,uSunDir),0.),620.)*1.6;c+=uSunC*pow(max(dot(d,uSunDir),0.),8.)*.16;
 if(uFlash>0.){float k=floor(uTime*.7),on=step(.86,fract(sin(k*12.9898)*43758.5453))*(1.-fract(uTime*.7)*2.2),az=fract(sin(k*4.1)*43758.5)-.5;on=max(on,0.);c+=vec3(.62,.66,1.)*on*uFlash*exp(-pow((a-az)*9.,2.))*smoothstep(.0,.3,h)*1.6;}
 if(uSil>0.){
  float r2=uSil*(.10+.90*ridge(a,1.,.17))*.26,r1=uSil2*(.08+.92*ridge(a,2.,.61))*.20;
  float m2=1.-smoothstep(r2-.0035,r2+.0005,d.y),m1=1.-smoothstep(r1-.0030,r1+.0005,d.y);
  vec3 b2=mix(mix(uSilB,uLow,.55),uSilB,smoothstep(0.,max(r2,.01),d.y)),b1=mix(mix(uSilA,uLow,.30),uSilA,smoothstep(0.,max(r1,.01),d.y));
  c=mix(c,b2,m2);c=mix(c,b1,m1);
 }
 if(uVault>0.){
  float e=uVault*(.56+.60*ridge(a,3.,.42)+.26*sin(a*6.28318*2.+1.7));
  float v=smoothstep(e-.006,e+.006,d.y-(texture2D(uPaper,vec2(a*7.,.81)).g-.5)*.10);
  c=mix(c,uVaultC*(1.+.9*texture2D(uPaper,d.xz*1.3).g),v);
 }
 gl_FragColor=vec4(c,1.);
}`;

// 按空间取色板时不依赖视图，地被在详情包挂载时就要决定。
const SPACE_PROFILE=s=>R[s];
const CAMERA_FIXES={
 makaiStreet:{eye:[60,62,260],target:[-60,28,40]},
 makaiShops:{eye:[-170,44,100],target:[-60,27,70]},
 hakugyokuVeranda:{eye:[-24,103,-118],target:[40,98,-70]},
 pandemoniumGallery:{target:[30,90,-650]},
 mineVein:{eye:[-2,5,-204],target:[23,4,-231]},
 asamaDepth:{eye:[20,10,40],target:[0,4,-40]},
 seikiPath:{eye:[-1380,149,-949]},
 shrineDioramaSide:{eye:[1430,232,300],target:[1590,182,172]},
 genbuColumns:{eye:[-962,49,-565]},
 mountainTrail:{eye:[-440,300,-1000],target:[-480,275,-1060]}
};

class RealmRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  this.realmProfile=null;this.coverKind={value:0};this.cardFar={value:300};this.occupiedCache=new Map();
  const U={uPaper:this.lookNoise,uTime:this.timeUniform,uCover:{value:1},uSoft:{value:.03},uStars:{value:0},uSil:{value:0},uSil2:{value:0},uVault:{value:0},uStreak:{value:1},uFlash:{value:0},uSunDir:{value:new T.Vector3(0,1,0)}};
  for(const k of ['uTop','uMid','uLow','uFloor','uBright','uShade','uSilA','uSilB','uSunC','uVaultC'])U[k]={value:new T.Vector3()};
  this.realmSkyU=U;
  this.realmSky=new T.Mesh(new T.SphereGeometry(8800,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:U,vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:skyFragment}));
  this.realmSky.frustumCulled=false;this.realmSky.renderOrder=-100;this.realmSky.visible=false;this.scene.add(this.realmSky);
  for(const[k,v]of Object.entries(CAMERA_FIXES))if(G.PRESETS?.[k])Object.assign(G.PRESETS[k],v);
  this.makeRealmMotes();this.makeGap();this.makeCardMaterial();this.makeCoverMaterial();
 }
 realmTone(o,u){
  const p=this.realmProfile;if(!p)return null;
  const t=p.tone;u.shadeTint.value.fromArray(t.shade);u.shadeLift.value.fromArray(t.lift);u.highTint.value.fromArray(t.high);u.inkTint.value.fromArray(t.ink);u.satGain.value.fromArray(t.sat);
  const far=G.length(G.sub(o.lookEye||[0,0,0],o.lookTarget||[0,0,0]));
  u.realmHaze.value.setRGB(...p.hazeLin);u.realmApStart.value=Math.max(p.ap[0],far*.92);u.realmApDensity.value=p.ap[1]/(1+far/520);u.realmGain.value=p.gain;
  // 地形尽头淡进雾色，不露出整张图的边。
  // 月面的地球是远处的实体模型，不能跟着地形一起淡掉。
  const edge=/^lunar/.test(o.space||'')?1e6:Math.max(1500,far*1.25);u.realmFade.value.set(edge,edge*1.65);
  u.realmShaft.value=this.quality==='low'?0:p.shaft;u.realmShaftColor.value.setRGB(...p.skyLin.bright);
  return p;
 }
 applySky(p,rig){
  const u=this.realmSkyU,s=p.skyLin,d=p.sky;
  for(const k of SKIES)if(this[k])this[k].visible=false;
  this.scene.background.setRGB(...s.low);
  const put=(n,v)=>u[n].value.fromArray(v);
  put('uTop',s.top);put('uMid',s.mid);put('uLow',s.low);put('uFloor',s.floor);put('uBright',s.bright);put('uShade',s.shade);put('uSilA',s.silA);put('uSilB',s.silB);put('uSunC',s.sun);put('uVaultC',s.vaultC);
  u.uCover.value=d.cover;u.uSoft.value=d.soft;u.uStars.value=d.stars;u.uSil.value=d.sil;u.uSil2.value=d.sil2;u.uVault.value=d.vault;u.uStreak.value=d.streak;u.uFlash.value=d.flash||0;
  u.uSunDir.value.fromArray(this.weatherSunOffset||[-430,760,320]).normalize();
  this.realmSky.position.fromArray(rig.eye);this.realmSky.visible=true;
 }
 applyGround(p){
  const r=this.realmU,g=p.groundLin;
  r.paint.value=g?1:0;if(!g)return;
  const c=p.cover;if(c){this.coverKind.value=c.shape;this.cardFar.value=c.far;}
  r.lo.value.fromArray(g.lo);r.hi.value.fromArray(g.hi);r.dab.value.fromArray(g.dab);r.rock.value.fromArray(g.rock);r.dabP.value.set(...p.ground.dabP);
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  const surface=(opts.space||'surface')==='surface'&&!opts.cutaway,p=surface?null:pick(opts,rig);
  this.realmProfile=p;this.realmSky.visible=false;
  if(!p){this.realmU.paint.value=0;return;}
  this.applySky(p,rig);this.applyGround(p);
  this.scene.fog.color.setRGB(...p.hazeLin);
  this.sun.intensity*=p.light.sun;this.hemisphere.intensity*=p.light.hemi;
  if(p.clearFog){this.scene.fog.near=1e4;this.scene.fog.far=2e4;}
 }
 material(m){
  const mat=super.material(m);
  if(mat.isShaderMaterial||(m.space||'surface')==='surface')return mat;
  const name=m.material||'';
  // 与地表共用的材质（仙界的 ground、foliage）已在地表分支打过补丁，由 uRealmPaint 切换。
  if(this.lookPatched.has(mat))return mat;
  if(name==='gold'&&m.space==='senkai')return this.lookPatch(mat,'realmRoof');
  if(name==='netherSpirit'){this.netherBlob=mat;mat.visible=this.quality==='low';return mat;}
  if(GROUND.test(name))return this.lookPatch(mat,'realmGround');
  if(CROWN.test(name)&&m.group==='vegetation')return this.lookPatch(mat,'realmLeaf');
  return mat;
 }
 // 绒叶卡片：把低模树冠的表面采样成一批朝向镜头的软边小片，树冠才有蓬松的轮廓。
 makeCardMaterial(){
  const T=this.T,m=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,side:T.DoubleSide});m.name='realm-crown-card';
  this.lookPatch(m,'realmCard');
  const prior=m.onBeforeCompile;
  m.onBeforeCompile=(s,r)=>{
   prior.call(m,s,r);
   s.uniforms.uCardTime=this.timeUniform;
   s.vertexShader='attribute vec3 aCard;uniform float uCardTime;varying vec3 vCard;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
    float cardSeed=fract(sin(dot(transformed.xz,vec2(12.9898,78.233)))*43758.5453),cardA=cardSeed*6.283+sin(uCardTime*.7+transformed.x*.08+transformed.z*.06)*.16;
    float cardC=cos(cardA),cardS=sin(cardA);vec2 cardP=mat2(cardC,-cardS,cardS,cardC)*aCard.xy*aCard.z;
    mvPosition.xy+=cardP;mvPosition.y+=sin(uCardTime*.9+transformed.x*.13)*.05;
    gl_Position=projectionMatrix*mvPosition;vCard=vec3(aCard.xy,cardSeed);`);
   s.vertexShader=s.vertexShader.replace('vLookWorld=(modelMatrix*lookP).xyz;','vLookWorld=(modelMatrix*lookP).xyz+vec3(cardP.x,cardP.y,0.);');
   s.fragmentShader='varying vec3 vCard;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 cardQ=vCard.xy;float cardN=texture2D(uLookNoise,cardQ*.11+vCard.z*7.).b*.52+texture2D(uLookNoise,cardQ*.27+vCard.z*3.).a*.48;
    float cardR=length(cardQ);if(cardR+(cardN-.5)*1.7>.80)discard;
    diffuseColor.rgb*=1.0+.36*(cardN-.3)+.12*(1.-cardR);`);
  };
  m.customProgramCacheKey=()=> 'realm-crown-card-1';
  this.cardMaterial=m;
 }
 cardGeometry(a,index){
  const T=this.T,tris=index?index.length/3:a.length/27,step=tris>40000?4:tris>4000?2:1,cards=Math.floor(tris/step);
  const pos=new Float32Array(cards*12),nor=new Float32Array(cards*12),col=new Float32Array(cards*12),card=new Float32Array(cards*12),idx=new Uint32Array(cards*6);
  const corner=[[-1,-1],[1,-1],[1,1],[-1,1]];
  let n=0;
  for(let t=0;t+step<=tris;t+=step){
   const i0=index?index[t*3]:t*3,i1=index?index[t*3+1]:t*3+1,i2=index?index[t*3+2]:t*3+2;
   const A=i0*9,B=i1*9,D=i2*9;
   const ux=a[B]-a[A],uy=a[B+1]-a[A+1],uz=a[B+2]-a[A+2],vx=a[D]-a[A],vy=a[D+1]-a[A+1],vz=a[D+2]-a[A+2];
   const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,area=.5*Math.sqrt(cx*cx+cy*cy+cz*cz);
   if(area<=1e-6)continue;
   const radius=Math.min(2.1,Math.max(.34,Math.sqrt(area*step/Math.PI)*1.3));
   const nx=a[A+3],ny=a[A+4],nz=a[A+5];
   const x=(a[A]+a[B]+a[D])/3+nx*radius*.3,y=(a[A+1]+a[B+1]+a[D+1])/3+ny*radius*.3,z=(a[A+2]+a[B+2]+a[D+2])/3+nz*radius*.3;
   for(let k=0;k<4;k++){const o=n*12+k*3;
    pos[o]=x;pos[o+1]=y;pos[o+2]=z;nor[o]=nx;nor[o+1]=ny;nor[o+2]=nz;
    col[o]=a[A+6];col[o+1]=a[A+7];col[o+2]=a[A+8];card[o]=corner[k][0];card[o+1]=corner[k][1];card[o+2]=radius;}
   const v=n*4,w=n*6;idx[w]=v;idx[w+1]=v+1;idx[w+2]=v+2;idx[w+3]=v;idx[w+4]=v+2;idx[w+5]=v+3;n++;
  }
  if(!n)return null;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('color',new T.BufferAttribute(col,3));g.setAttribute('aCard',new T.BufferAttribute(card,3));
  g.setIndex(new T.BufferAttribute(idx,1));g.setDrawRange(0,n*6);g.computeBoundingSphere();g.boundingSphere.radius+=3;
  return g;
 }
 // 占地栅格：道路、水面和建筑的水平面不长地被，否则花草会穿出地板和路面。
 occupiedCells(owner){
  let cells=this.occupiedCache.get(owner);if(cells)return cells;
  cells=new Set();this.occupiedCache.set(owner,cells);
  const size=2.5,key=(x,z)=>Math.round(x/size)*100003+Math.round(z/size);
  for(const rec of this.records){
   const q=rec.data;if(q.owner!==owner||q.overview||q.instances||q.group==='vegetation')continue;
   const mat=q.material||'',road=OCCUPIED.test(mat),arch=q.group==='architecture';
   if(!road&&!arch&&q.group!=='water')continue;
   const a=q.vertices,index=this.indexByArray.get(a),tris=index?index.length/3:a.length/27;
   for(let t=0;t<tris;t++){
    const A=(index?index[t*3]:t*3)*9,B=(index?index[t*3+1]:t*3+1)*9,D=(index?index[t*3+2]:t*3+2)*9;
    if(!road&&Math.abs(a[A+4])<.6)continue;
    const x0=a[A],z0=a[A+2],x1=a[B],z1=a[B+2],x2=a[D],z2=a[D+2],den=(z1-z2)*(x0-x2)+(x2-x1)*(z0-z2);
    if(Math.abs(den)<1e-5)continue;
    const minX=Math.min(x0,x1,x2)-size,maxX=Math.max(x0,x1,x2)+size,minZ=Math.min(z0,z1,z2)-size,maxZ=Math.max(z0,z1,z2)+size;
    if((maxX-minX)*(maxZ-minZ)>640000)continue;
    for(let x=minX;x<=maxX;x+=size)for(let z=minZ;z<=maxZ;z+=size){
     const u=((z1-z2)*(x-x2)+(x2-x1)*(z-z2))/den,v=((z2-z0)*(x-x2)+(x0-x2)*(z-z2))/den,w=1-u-v;
     if(u>-.12&&v>-.12&&w>-.12)cells.add(key(x,z));
    }
   }
  }
  return cells;
 }
 coverGeometry(m,c){
  const T=this.T,a=m.vertices,index=this.indexByArray.get(a),tris=index?index.length/3:a.length/27,rng=G.rng(Math.round(Math.abs(m.center[0]*3+m.center[2]*7))+tris);
  const occupied=this.occupiedCells(m.owner),size=2.5,key=(x,z)=>Math.round(x/size)*100003+Math.round(z/size);
  // 这张地形可能有几平方公里，卡片数有限：按本空间机位的关注点集中，别处只留稀疏的一层。
  const focus=[];for(const v of Object.values(G.PRESETS||{}))if(v.space===m.space&&v.eye&&v.target)focus.push(v.target[0],v.target[2],(v.eye[0]+v.target[0])*.5,(v.eye[2]+v.target[2])*.5);
  const near=(x,z)=>{let d=1e18;for(let i=0;i<focus.length;i+=2){const dx=x-focus[i],dz=z-focus[i+1],e=dx*dx+dz*dz;if(e<d)d=e;}return .05+.95*Math.exp(-d/(c.reach*c.reach));};
  let total=0;const cum=new Float32Array(tris);
  for(let t=0;t<tris;t++){
   const A=(index?index[t*3]:t*3)*9,B=(index?index[t*3+1]:t*3+1)*9,D=(index?index[t*3+2]:t*3+2)*9;
   const ux=a[B]-a[A],uy=a[B+1]-a[A+1],uz=a[B+2]-a[A+2],vx=a[D]-a[A],vy=a[D+1]-a[A+1],vz=a[D+2]-a[A+2];
   const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,area=.5*Math.sqrt(cx*cx+cy*cy+cz*cz);
   // 陡坡不长地被。
   if(area>1e-5&&Math.abs(cy)/(2*area)>.72)total+=area*near((a[A]+a[B]+a[D])/3,(a[A+2]+a[B+2]+a[D+2])/3);
   cum[t]=total;
  }
  const count=Math.min(c.max,Math.round(total*c.perArea));if(count<8)return null;
  const pos=new Float32Array(count*12),nor=new Float32Array(count*12),col=new Float32Array(count*12),card=new Float32Array(count*12),idx=new Uint32Array(count*6);
  const corner=[[-1,0],[1,0],[1,1],[-1,1]],colors=c.colorsLin,color=new T.Color();let n=0;
  for(let i=0;i<count*1.4&&n<count;i++){
   const f=rng()*total;let lo=0,hi=tris-1;while(lo<hi){const mid=(lo+hi)>>1;if(cum[mid]<f)lo=mid+1;else hi=mid;}
   const A=(index?index[lo*3]:lo*3)*9,B=(index?index[lo*3+1]:lo*3+1)*9,D=(index?index[lo*3+2]:lo*3+2)*9;
   let u=rng(),v=rng();if(u+v>1){u=1-u;v=1-v;}
   const x=a[A]+(a[B]-a[A])*u+(a[D]-a[A])*v,y=a[A+1]+(a[B+1]-a[A+1])*u+(a[D+1]-a[A+1])*v,z=a[A+2]+(a[B+2]-a[A+2])*u+(a[D+2]-a[A+2])*v;
   if(occupied.has(key(x,z)))continue;
   const h=c.size[0]+(c.size[1]-c.size[0])*rng(),tint=colors[Math.floor(rng()*colors.length)],l=.86+.28*rng();
   for(let k=0;k<4;k++){const o=n*12+k*3;
    pos[o]=x;pos[o+1]=y-.05;pos[o+2]=z;nor[o+1]=1;col[o]=tint[0]*l;col[o+1]=tint[1]*l;col[o+2]=tint[2]*l;card[o]=corner[k][0];card[o+1]=corner[k][1];card[o+2]=h;}
   const q=n*4,w=n*6;idx[w]=q;idx[w+1]=q+1;idx[w+2]=q+2;idx[w+3]=q;idx[w+4]=q+2;idx[w+5]=q+3;n++;
  }
  if(!n)return null;
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('color',new T.BufferAttribute(col,3));g.setAttribute('aCard',new T.BufferAttribute(card,3));
  g.setIndex(new T.BufferAttribute(idx,1));g.setDrawRange(0,n*6);g.computeBoundingSphere();g.boundingSphere.radius+=4;
  return g;
 }
 makeCoverMaterial(){
  const T=this.T,m=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,side:T.DoubleSide});m.name='realm-cover-card';
  this.lookPatch(m,'realmCard');
  const prior=m.onBeforeCompile;
  m.onBeforeCompile=(s,r)=>{
   prior.call(m,s,r);
   s.uniforms.uCardTime=this.timeUniform;s.uniforms.uCoverKind=this.coverKind;s.uniforms.uCardFar=this.cardFar;
   s.vertexShader='attribute vec3 aCard;uniform float uCardTime,uCardFar;varying vec3 vCard;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);
    float cardSeed=fract(sin(dot(transformed.xz,vec2(12.9898,78.233)))*43758.5453);
    float cardFade=1.-smoothstep(uCardFar*.68,uCardFar,-mvPosition.z);
    vec3 cardUp=normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz),cardRight=normalize(cross(cardUp,vec3(0.,0.,1.)));
    float cardWind=sin(uCardTime*1.15+transformed.x*.21+transformed.z*.17+cardSeed*2.)*.16*aCard.y*aCard.y;
    mvPosition.xyz+=(cardRight*(aCard.x*.72+cardWind)+cardUp*aCard.y)*aCard.z*cardFade;
    gl_Position=projectionMatrix*mvPosition;vCard=vec3(aCard.xy,cardSeed);`);
   s.vertexShader=s.vertexShader.replace('vLookWorld=(modelMatrix*lookP).xyz;','vLookWorld=(modelMatrix*lookP).xyz+vec3(aCard.x*aCard.z*.72,aCard.y*aCard.z,0.);');
   s.fragmentShader='varying vec3 vCard;uniform float uCoverKind;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    {float cx=vCard.x,cy=vCard.y,sd=vCard.z;
     if(uCoverKind>.5&&uCoverKind<1.5){
      // 彼岸花：一张卡三株，细茎顶着反卷的放射状花瓣。
      float u=(cx+1.)*1.5,id=floor(u),fx=fract(u)-.5;float h=fract(sin((id+1.)*(sd*91.7+3.1))*4375.5453);
      float top=.58+.32*h;vec2 q=vec2(fx*1.75,(cy-top)*4.6);float rq=length(q),aq=atan(q.y,q.x)+h*2.;
      float petal=.16+.72*pow(abs(cos(aq*3.)),9.);
      float stamen=.92*pow(abs(cos(aq*4.5+1.)),40.)*step(-.1,q.y);
      bool flower=rq<petal;bool thread=rq<stamen&&rq>.22;bool stem=abs(fx-(h-.5)*.06)<.030&&cy<top;
      if(!flower&&!thread&&!stem)discard;
      if(stem&&!flower&&!thread)diffuseColor.rgb=vec3(.085,.15,.060);
      else if(thread&&!flower)diffuseColor.rgb*=1.5;
      else diffuseColor.rgb*=.86+.62*smoothstep(.08,.62,rq);
     }else{
      // 草丛：参差的草尖，根部压暗；花草地在尖端点缀花色。
      float blades=texture2D(uLookNoise,vec2(cx*.9+sd*7.,.37)).a*.72+texture2D(uLookNoise,vec2(cx*.31+sd*3.,.71)).b*.28;
      float top=(.10+1.5*pow(blades,1.6))*(1.-cx*cx*cx*cx);if(cy>top)discard;
      diffuseColor.rgb*=mix(.56,1.16,clamp(cy/top,0.,1.));
      if(uCoverKind>1.5&&sd>.62&&cy>top*.72){vec3 fl=mix(vec3(.96,.82,.30),vec3(.98,.62,.72),step(.82,sd));diffuseColor.rgb=fl;}
     }}`);
  };
  m.customProgramCacheKey=()=> 'realm-cover-card-2';
  this.coverMaterial=m;
 }
 // 地形法线改成焊接后的平滑法线：低模折面在赛璐璐分层下特别刺眼。
 smoothTerrain(mesh,a){
  const g=mesh.geometry;if(g.userData.realmSmooth)return;g.userData.realmSmooth=true;
  const n=a.length/9,map=new Map(),sum=new Float32Array(n*3),id=new Int32Array(n);
  let groups=0;
  for(let i=0;i<n;i++){const o=i*9,k=Math.round(a[o]*8)+','+Math.round(a[o+1]*8)+','+Math.round(a[o+2]*8);let e=map.get(k);if(e===undefined){e=groups++;map.set(k,e);}id[i]=e;sum[e*3]+=a[o+3];sum[e*3+1]+=a[o+4];sum[e*3+2]+=a[o+5];}
  const out=new Float32Array(n*3);
  for(let i=0;i<n;i++){const e=id[i],x=sum[e*3],y=sum[e*3+1],z=sum[e*3+2],l=Math.hypot(x,y,z)||1;out[i*3]=x/l;out[i*3+1]=y/l;out[i*3+2]=z/l;}
  g.setAttribute('normal',new this.T.BufferAttribute(out,3));
  const ref=this.geometryRefs.get(a);if(ref){ref.bytes+=out.byteLength;this.residentBytes+=out.byteLength;}
 }
 // 找出只被一个三角形使用的边，把周长不大的闭合环封成小尖顶。
 capHoles(mesh,a,index){
  const T=this.T,tris=index?index.length/3:a.length/27,ids=new Map(),pts=[],id=v=>{const o=v*9,k=Math.round(a[o]*8)+','+Math.round(a[o+1]*8)+','+Math.round(a[o+2]*8);let e=ids.get(k);if(e===undefined){e=pts.length;ids.set(k,e);pts.push(o);}return e;};
  const edge=new Map(),key=(p,q)=>p<q?p*4194304+q:q*4194304+p;
  for(let t=0;t<tris;t++){const v=[0,1,2].map(k=>id(index?index[t*3+k]:t*3+k));if(v[0]===v[1]||v[1]===v[2]||v[0]===v[2])continue;for(let k=0;k<3;k++){const c=key(v[k],v[(k+1)%3]),e=edge.get(c);if(e)e[2]++;else edge.set(c,[v[k],v[(k+1)%3],1]);}}
  const next=new Map();for(const e of edge.values())if(e[2]===1){for(const[p,q]of[[e[0],e[1]],[e[1],e[0]]]){let l=next.get(p);if(!l)next.set(p,l=[]);l.push(q);}}
  const pos=[],col=[],seen=new Set();
  for(const start of next.keys()){if(seen.has(start))continue;const loop=[start];seen.add(start);let cur=start,prev=-1;for(;;){const n=next.get(cur).find(q=>q!==prev&&(!seen.has(q)||q===start&&loop.length>2));if(n===undefined||n===start)break;seen.add(n);loop.push(n);prev=cur;cur=n;}
   if(loop.length<3||loop.length>24)continue;let len=0,cx=0,cy=0,cz=0,lo=1e9,hi=-1e9;
   for(let i=0;i<loop.length;i++){const o=pts[loop[i]],q=pts[loop[(i+1)%loop.length]];len+=Math.hypot(a[o]-a[q],a[o+2]-a[q+2]);cx+=a[o];cy+=a[o+1];cz+=a[o+2];lo=Math.min(lo,a[o+1]);hi=Math.max(hi,a[o+1]);}
   if(len>34||hi-lo>1.5)continue;cx/=loop.length;cy/=loop.length;cz/=loop.length;const top=cy+len/9;
   for(let i=0;i<loop.length;i++){const o=pts[loop[i]],q=pts[loop[(i+1)%loop.length]];pos.push(a[o],a[o+1],a[o+2],a[q],a[q+1],a[q+2],cx,top,cz);for(const v of[o,q,o])col.push(a[v+6],a[v+7],a[v+8]);}}
  if(!pos.length)return null;
  const g=new T.BufferGeometry(),P=new Float32Array(pos),n=new Float32Array(P.length);for(let i=1;i<n.length;i+=3)n[i]=1;
  g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(col),3));g.computeBoundingSphere();
  const m=new T.Mesh(g,mesh.material);m.name=mesh.name+':caps';m.receiveShadow=true;m.castShadow=false;m.frustumCulled=false;mesh.add(m);return m;
 }
 // 瀑侧登山道的 5 根东侧岩肋里，靠瀑布的两根正压在路面上。世界建模的散列被历史验收证据锁定，这里在显示层拿掉，
 // 近景和总览各处理一次。岩肋是近景网格最后写入的 5 段，每段 131 个三角形；总览已合批，按连通块找回这两根。
 clearTrailRibs(m){
  if(m.trailRibsCleared)return;m.trailRibsCleared=true;
  const v=m.vertices,idx=m.index;
  if(m.id==='mountain:cliff-and-river-rock'&&!idx){
   const rib=131*27,from=v.length-5*rib;if(from<0||Math.abs(v[from]+475)>14||Math.abs(v[from+2]+1050)>16)return;
   for(let i=from;i<from+2*rib;i+=9){v[i]=-470;v[i+1]=250;v[i+2]=-1050;}
  }else if(idx){
   const up=new Int32Array(v.length/9).map((_,i)=>i),find=a=>{while(up[a]!==a)a=up[a]=up[up[a]];return a;};
   for(let t=0;t<idx.length;t+=3){const a=find(idx[t]);up[find(idx[t+1])]=a;up[find(idx[t+2])]=find(a);}
   const box=new Map();for(let t=0;t<idx.length;t++){const o=idx[t]*9,k=find(idx[t]);let b=box.get(k);if(!b)box.set(k,b=[1e9,-1e9,1e9,-1e9,-1e9]);b[0]=Math.min(b[0],v[o]);b[1]=Math.max(b[1],v[o]);b[2]=Math.min(b[2],v[o+2]);b[3]=Math.max(b[3],v[o+2]);b[4]=Math.max(b[4],v[o+1]);}
   for(let t=0;t<idx.length;t+=3){const b=box.get(find(idx[t])),c=(b[0]+b[1])/2;if(c<-458.5&&c>-481&&b[3]-b[2]<34&&b[1]-b[0]<28&&(b[2]+b[3])/2<-1040&&(b[2]+b[3])/2>-1060&&b[4]>380)idx[t+1]=idx[t+2]=idx[t];}
  }
 }
 ensure(r,level){
  if(r.data.id==='mountain:cliff-and-river-rock'||r.data.id==='overview:mountain:hlod:architecture:mountain:-2:-5:matte')this.clearTrailRibs(r.data);
  const mesh=super.ensure(r,level),m=r.data;
  const realmRecord=(m.space||'surface')!=='surface'&&!m.instances;
  if(realmRecord&&(m.group==='terrain'||m.material==='cave')&&GROUND.test(m.material||'')&&r.array&&r.array.length<1800000)this.smoothTerrain(mesh,r.array);
  if(realmRecord&&m.material==='cave'&&r.array&&!r.capsTried){r.capsTried=true;const c=this.capHoles(mesh,r.array,this.indexByArray.get(m.vertices));if(c)r.caps=c;}
  const cover=realmRecord&&m.group==='terrain'&&!m.overview&&!r.cardsTried&&this.quality!=='low'&&GROUND.test(m.material||'')?SPACE_PROFILE(m.space)?.cover:null;
  if(cover){
   r.cardsTried=true;
   const g=this.coverGeometry(m,cover);
   if(g){const c=new this.T.Mesh(g,this.coverMaterial);c.name=m.id+':cover';c.receiveShadow=true;c.castShadow=false;mesh.add(c);r.cards=c;const bytes=g.attributes.position.array.byteLength*4+g.index.array.byteLength;r.cardBytes=bytes;this.residentBytes+=bytes;}
  }
  if(!r.cardsTried&&!m.instances&&(m.space||'surface')!=='surface'&&m.group==='vegetation'&&CROWN.test(m.material||'')&&this.quality!=='low'){
   r.cardsTried=true;
   const g=this.cardGeometry(m.vertices,this.indexByArray.get(m.vertices));
   if(g){const c=new this.T.Mesh(g,this.cardMaterial);c.name=m.id+':cards';c.receiveShadow=true;c.castShadow=false;mesh.add(c);r.cards=c;const bytes=g.attributes.position.array.byteLength*4+g.index.array.byteLength;r.cardBytes=bytes;this.residentBytes+=bytes;}
  }
  return mesh;
 }
 evict(r){
  r.cardsTried=false;r.capsTried=false;
  if(r.caps){r.caps.removeFromParent();r.caps.geometry.dispose();r.caps=null;}
  if(r.cards){r.cards.removeFromParent();r.cards.geometry.dispose();r.cards=null;this.residentBytes-=r.cardBytes||0;r.cardBytes=0;}
  super.evict(r);
 }
 dropPack(id){this.occupiedCache.delete(id);super.dropPack(id);}
 setQuality(q){
  super.setQuality(q);
  if(this.netherBlob)this.netherBlob.visible=q==='low';
  if(this.records)for(const r of this.records){r.cardsTried=false;if(q==='low'&&r.cards){r.cards.removeFromParent();r.cards.geometry.dispose();r.cards=null;this.residentBytes-=r.cardBytes||0;r.cardBytes=0;}}
 }
 makeRealmMotes(){
  const T=this.T,n=1000,pos=new Float32Array(n*3),seed=new Float32Array(n),r=G.rng(5521);
  for(let i=0;i<n;i++){pos[i*3]=r();pos[i*3+1]=r();pos[i*3+2]=r();seed[i]=r();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aSeed',new T.BufferAttribute(seed,1));
  const u={uTime:this.timeUniform,uEye:{value:new T.Vector3()},uBox:{value:new T.Vector3(90,30,90)},uVel:{value:new T.Vector3()},uSway:{value:2},uPixel:{value:1},uSize:{value:40},uMax:{value:6},uShape:{value:0},uTint:{value:new T.Color()},uTint2:{value:new T.Color()},uOpaque:{value:0},uAlpha:{value:1},uDepth:{value:this.sceneTarget.depthTexture},uRes:{value:new T.Vector2(1,1)}};
  const m=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:u,
   blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,
   vertexShader:`attribute float aSeed;uniform float uTime,uSway,uPixel,uSize,uMax;uniform vec3 uEye,uBox,uVel;varying float vA,vSeed,vRot;
    void main(){float t=uTime;vec3 q=position*uBox+uVel*t*(.7+.6*aSeed)+vec3(sin(t*.31+aSeed*40.),sin(t*.23+aSeed*19.)*.5,cos(t*.27+aSeed*27.))*uSway;
    vec3 rel=mod(q-uEye,uBox)-uBox*.5;vec4 mv=viewMatrix*vec4(uEye+rel,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(uSize*(.6+.8*aSeed)*uPixel/max(-mv.z,1.),2.,uMax*uPixel);vA=1.-smoothstep(.30,.50,length(rel/uBox));vSeed=aSeed;vRot=t*(.5+aSeed)+aSeed*20.;}`,
   fragmentShader:`precision highp float;uniform float uTime,uShape,uOpaque,uAlpha;uniform vec3 uTint,uTint2;uniform sampler2D uDepth;uniform vec2 uRes;varying float vA,vSeed,vRot;
    void main(){if(texture2D(uDepth,gl_FragCoord.xy/uRes).r<gl_FragCoord.z)discard;
    vec2 p=gl_PointCoord-.5;float a=0.;vec3 col=mix(uTint,uTint2,vSeed);
    if(uShape>.5&&uShape<1.5){float c=cos(vRot),s=sin(vRot);p=mat2(c,-s,s,c)*p;a=1.-smoothstep(.70,1.,length(p*vec2(2.1,3.6)));}
    else if(uShape>1.5&&uShape<2.5){float d=length(p)*2.;a=smoothstep(1.,.1,d);col=mix(col,vec3(1.,.95,.75),smoothstep(.5,.0,d));a*=.6+.4*sin(uTime*5.+vSeed*40.);}
    else if(uShape>4.5){float d=length(p)*2.;a=smoothstep(1.,.05,d);a=a*a*.55+smoothstep(.34,.10,d);col=mix(col,vec3(1.),smoothstep(.40,.0,d));a*=.72+.28*sin(uTime*1.1+vSeed*30.);}
    else if(uShape>3.5){vec2 q=p*vec2(2.3,2.3)+vec2(0.,-.26);float tail=sin(q.y*3.2+uTime*1.8+vSeed*30.)*.13*smoothstep(-.1,.8,q.y);
     float head=length(q+vec2(0.,.34));float body=length(vec2(q.x+tail,max(q.y+.34,0.)*.42));a=smoothstep(.40,.16,min(head,body+.05))*(1.-smoothstep(.3,.9,q.y));
     a+=smoothstep(.95,.1,length(p)*2.)*.18;col=mix(col,vec3(1.),smoothstep(.3,.05,head));}
    else if(uShape>2.5){float d=length(p)*2.;a=smoothstep(1.,.2,d)*(.35+.65*pow(abs(sin(uTime*2.+vSeed*50.)),6.));float h=fract(vSeed*7.+uTime*.05)*6.28318;col=.62+.38*cos(h+vec3(0.,2.09,4.19));}
    else{float d=length(p)*2.;a=smoothstep(1.,.15,d)*(.65+.35*sin(uTime*1.3+vSeed*50.));}
    a*=vA*uAlpha;if(a<.01)discard;gl_FragColor=vec4(col*a,a*uOpaque);}`});
  this.realmMotes=new T.Points(g,m);this.realmMotes.frustumCulled=false;this.realmMotes.visible=false;this.realmMoteScene=new T.Scene();this.realmMoteScene.add(this.realmMotes);
 }
 // 隙间转场。跨空间本来是瞬切：先在旧画面上撕开隙间吞掉它，等新场景的模型备好，再沿斜线裂开露出新世界。
 // 新场景在幕后照常绘制，所以不会看到模型逐块弹出。
 makeGap(){
  const T=this.T;
  const m=new T.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,toneMapped:false,uniforms:{uOpen:{value:0},uClosing:{value:0},uTime:{value:0},uAspect:{value:16/9},uFrame:{value:null}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`varying vec2 vUv;uniform float uOpen,uClosing,uTime,uAspect;uniform sampler2D uFrame;
    float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float eyes(vec2 p,out vec3 col){
     vec2 g=p*vec2(5.2,9.);g.x+=floor(g.y)*.5;vec2 id=floor(g),f=fract(g)-.5;float r=n(id);col=vec3(0.);
     f+=(vec2(n(id+3.),n(id+7.))-.5)*.34;f/=.42+.34*r;
     float blink=.58*smoothstep(.0,.08,abs(fract(uTime*.5+r*7.)-.5));
     float lid=abs(f.y)-blink*(1.-f.x*f.x*3.2);if(lid>0.||r<.32)return 0.;
     vec2 q=f+vec2((n(id+11.)-.5)*.2,0.);float iris=length(q);
     col=mix(vec3(.93,.90,.86),mix(vec3(.05,.0,.02),vec3(.72,.05,.10),smoothstep(.09,.15,iris)),smoothstep(.34,.30,iris));
     return smoothstep(.0,-.05,lid);
    }
    // 隙间两端系着红缎带。
    float bow(vec2 t){t=abs(t);return step(t.y,.011+t.x*.62)*step(t.x,.058)*step(.006,t.x+t.y*.2);}
    void main(){
     vec2 p=(vUv-.5)*vec2(uAspect,1.);float c=.82,sn=.57;vec2 q=vec2(p.x*c+p.y*sn,-p.x*sn+p.y*c);
     float e=uOpen,L=.30+e*2.6,w=e*e*2.6+e*.02,u=q.x/L,wave=sin(q.x*7.+uTime*2.)*.012*(1.-e);
     float half_=w*pow(max(1.-u*u,0.),1.2),d=abs(q.y+wave)-half_;bool inside=d<0.&&abs(u)<1.;
     vec3 vc=mix(vec3(.05,.0,.09),vec3(.20,.02,.20),smoothstep(-.6,.6,q.y+q.x*.4)),ec;float a=eyes(p+vec2(uTime*.012,0.),ec);vc=mix(vc,ec,a*.9);
     float rim=smoothstep(.022,.0,abs(d))*step(abs(u),1.);vec3 rc=vec3(.96,.20,.46);
     float tips=max(bow(q-vec2(L,-wave)),bow(q+vec2(L,wave)));
     vec3 col;
     if(uClosing>.5){col=inside?vc:texture2D(uFrame,vUv).rgb;col=mix(col,rc,rim);col=mix(col,vec3(.86,.06,.16),tips);gl_FragColor=vec4(col,1.);}
     else{if(inside&&rim<.01&&tips<.5)discard;col=mix(mix(vc,rc,rim),vec3(.86,.06,.16),tips);gl_FragColor=vec4(col,1.);}
    }`});
  this.gapMesh=new T.Mesh(new T.PlaneGeometry(2,2),m);this.gapMesh.frustumCulled=false;this.gapScene=new T.Scene();this.gapScene.add(this.gapMesh);this.gapCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.gapSpace=null;this.gapPhase=null;this.gapAt=0;this.gapFrame=null;this.gapTimes={close:.42,hold:.14,wait:2.4,open:.95};
  this.gapStill=globalThis.navigator?.webdriver===true||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 }
 // 切换后的第一帧：sceneTarget 里还是旧场景，趁 super.render 之前把最后一帧留下来。
 gapBegin(opts){
  const space=opts.space||'surface',first=this.gapSpace===null,changed=!first&&space!==this.gapSpace;this.gapSpace=space;
  if(!changed||opts.motion===false||this.gapStill||this.quality==='low'||this.contextLost||this.planOnly)return;
  if(this.gapPhase){this.gapPhase='hold';this.gapAt=performance.now()/1000;return;}
  const e=this.engine,t=this.sceneTarget,T=this.T;
  if(!t||!this.outputMat){this.gapPhase='hold';this.gapAt=performance.now()/1000;return;}
  if(!this.gapFrame||this.gapFrame.width!==t.width||this.gapFrame.height!==t.height){this.gapFrame?.dispose();this.gapFrame=new T.WebGLRenderTarget(t.width,t.height,{depthBuffer:false,type:T.UnsignedByteType});}
  this.quad.material=this.outputMat;e.setRenderTarget(this.gapFrame);e.render(this.postScene,this.postCamera);e.setRenderTarget(null);
  this.gapPhase='close';this.gapAt=performance.now()/1000;
 }
 drawGap(){
  if(!this.gapPhase)return;
  if(this.contextLost){this.gapPhase=null;return;}
  const now=performance.now()/1000,T=this.gapTimes;let t=now-this.gapAt,open=1,closing=0;
  if(this.gapPhase==='close'){const k=Math.min(t/T.close,1);open=k*k*(3-2*k);closing=1;if(k>=1){this.gapPhase='hold';this.gapAt=now;}}
  else if(this.gapPhase==='hold'){open=0;const st=globalThis.ATLAS?.stream;if(t>=T.wait||t>=T.hold&&!(st&&(st.pending||st.preparing))){this.gapPhase='open';this.gapAt=now;globalThis.dispatchEvent?.(new CustomEvent('atlas-gap-open',{detail:{space:this.gapSpace}}));}}
  else{const k=Math.min(t/T.open,1);open=1-(1-k)*(1-k)*(1-k);if(k>=1){this.gapPhase=null;this.gapFrame?.dispose();this.gapFrame=null;return;}}
  const u=this.gapMesh.material.uniforms,e=this.engine,keep=e.autoClear;u.uOpen.value=open;u.uClosing.value=closing;u.uTime.value=now%1000;u.uFrame.value=this.gapFrame?.texture||null;u.uAspect.value=this.sceneTarget.width/this.sceneTarget.height;
  e.autoClear=false;e.setRenderTarget(null);e.render(this.gapScene,this.gapCamera);e.autoClear=keep;this.hasVisibleAnimation=true;
 }
 render(rig,opts={}){
  this.gapBegin(opts);
  super.render(rig,opts);
  this.drawRealmMotes(rig,opts);
  this.drawGap();
 }
 drawRealmMotes(rig,opts){
  const p=this.realmProfile,live=!!p&&this.quality!=='low'&&!this.planOnly&&opts.motion!==false&&!this.contextLost&&!opts.lunarSealed&&opts.displayMode!=='atlas'&&G.length(G.sub(rig.eye,rig.target))<900;
  const o=live?p.motes:null,ghost=live?SPIRITS[opts.space]:null;
  this.realmMotes.visible=!!(o||ghost);if(!o&&!ghost)return;
  const e=this.engine,keep=e.autoClear;e.autoClear=false;e.setRenderTarget(null);
  if(o)this.drawMotes(o,rig);if(ghost)this.drawMotes(ghost,rig);
  e.autoClear=keep;this.hasVisibleAnimation=true;
 }
 drawMotes(o,rig){
  const m=this.realmMotes,u=m.material.uniforms,e=this.engine;
  u.uEye.value.fromArray(rig.eye);u.uBox.value.fromArray(o.box);u.uVel.value.fromArray(o.vel);u.uSway.value=o.sway;u.uSize.value=o.size;u.uMax.value=o.max;u.uShape.value=o.shape;u.uOpaque.value=o.opaque;u.uAlpha.value=o.alpha;
  u.uTint.value.setRGB(...(o.tintLin??=C(o.tint)));u.uTint2.value.setRGB(...(o.tint2Lin??=C(o.tint2)));
  u.uPixel.value=e.getPixelRatio();u.uDepth.value=this.sceneTarget.depthTexture;u.uRes.value.set(this.sceneTarget.width,this.sceneTarget.height);
  m.geometry.setDrawRange(0,Math.min(o.n,1000));
  e.render(this.realmMoteScene,this.camera);
 }
 dispose(){
  for(const r of this.records){if(r.cards){r.cards.geometry.dispose();r.cards=null;}if(r.caps){r.caps.geometry.dispose();r.caps=null;}}
  this.gapMesh.geometry.dispose();this.gapMesh.material.dispose();this.gapFrame?.dispose();
  this.scene.remove(this.realmSky);this.realmSky.geometry.dispose();this.realmSky.material.dispose();this.realmMotes.geometry.dispose();this.realmMotes.material.dispose();this.cardMaterial.dispose();this.coverMaterial.dispose();super.dispose();
 }
}
G.DioramaRenderer=RealmRenderer;
})(globalThis.GA);
