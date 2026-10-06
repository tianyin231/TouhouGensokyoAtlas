# 无缘塚剩余普通林冠候选

基于 `b303ddc6cd4580a9cfe5c78bd6a6006af6c66951`；随后主线只有文档更新，运行基线仍为已交付的 208 输入 / `c5327ca02eb542ea4f5816e445d4e1720628626bab01f39e9558cbefedc5286a`。本候选不含任何拒收的命莲寺或玄武涧实现。

## 范围与真实基线

2026-10-06 用原 `muenzukaOverview` 相机拍摄当前成品：eye `[-1533,221,789]`、target `[-1710,79,565]`、FOV 49、1280×720 / DPR1、balanced、12.5 晴天、AO 开，其余动态与标签关闭。协议 `d5c83cb4…` 的浏览器执行段与原 `666a3f01…` 逐字节相同；旧 `ce843` 图仅作选景参考。

当前基线实际可见三项问题：南、东侧普通冠叶仍呈平顶盘；北东交界与已验收西弧厚冠突然换形；南端棚屋周边林冠体积薄、围合缺少层次。基线 CLI0，稳定帧 275 全通道 calls / 546620 三角 / 12950352 属性字节 / 163 geometry / 11 texture。只有 favicon 404，无 JS / context 错误；未测硬件 FPS。

仅更换原生普通树余下 10 条叶记录、37 株，树根范围 x `[-1758.285,-1628.908]`、z `[493.762,661.757]`。冷总览为独立身份，替换原 I7 / I9 剩余的 10 / 11 株。原西弧 25 株和冷层西弧 10 株保持原记录、原数组。所有 62 株普通树的身份、矩阵、颜色和原木，3 株紫樱、道路、棚屋、碑石、供台、花地、地形及导航保持。

## 实现与固定预算

新增 `src/muenzuka-woodland.js`，在已验收 Flower 模块后登记；原生只包装 muenzuka 的构造返回，公共层只处理两条已经完成旧西弧拆分的原记录。两处都直接复用 `MUENZUKA_EDGE.prototype(variant)`，近档 1152 / 远档 180 叶三角，不复制实例矩阵，不增加批次。旧 `muenzuka-edge.js` 不修改。

新增 `src/muenzuka-woodland-renderer.js` 仅将 10 条新增原生目标和 2 条冷层目标交给已验收的 `MUENZUKA_EDGE_CULLING.envelope`，覆盖两档和完整风相位。原 center、radius、LOD 条件及旧 renderer 不改；缓存仍为弱键，没有新增 GPU 强引用或 typed 数组。

固定门槛：同条件净增不超过 4 全通道 calls、4000 提交三角、0.6 MiB 唯一常驻新增源 backing、0 新纹理。候选不会把未测 FPS 或 V8 快照 slab 计数当作实测性能改善。

## 首图前有限检查

作者 `author-preflight.json` 6/6 / CLI0，1.791 秒：真实原生旧快照 fce019 经旧 applyDetail 精确复现主线 c0f2；原西弧字节及全部身份受保护；两个 LOD 全风包络和原 wanted 包络均包含新冠；近远凸包投影未缩冠。原生与冷层窄链实际均复用已暖缓存，新增 typed backing 为 0。

冷层仅执行 raw decode 后旧 E.prepare → 新 prepare，并把目标原数组逐项对照既有完整 b9ff / 2156 记录快照；这不是新执行全部生产前驱。V8 只证明值与身份，不证明反序列化数组与活动缓存共用对象。完整生产链共享及 Worker 生命周期留后续独立验证。

另用原生与实际公共道路 834 个三角面，对 37 株两档完整风动冠包围做保守垂直净空核对：0.539 秒 / CLI0，最小 7.688 米。此下限用相交 XZ 包围框中的最高道路点与最低冠点计算，不把中心线采样当作全宽净空。

首稿冻结：builder `0fbef3bef0b1641e5d542c5b924e95c939762b3d78014f90867138e8e7be12cd`，renderer `679b6d1d0f0702ad113baf9735ed10a14a3d4f90253448f14cadeb4417a60e26`，project `73ce158eea969afddb42b53424180b30b9782609dcf46797f3f8fc2953c3bf4d`；210 输入成品 `e2956858b9b588ee787ead21eec4cfd79ef63a5c0fbe6d472621a44823a92d45`。

## 首张真实全景

上述有限检查之后，唯一同机位候选 overview 已完成：CLI0 / 26.925 秒，210 输入与 HTML 前后均不变，无 JS / context 错误，只有 favicon 404。PNG `5fc54593184b9504d0a767d1dfa68ac3dd647f81df6fd05cf367873b19151664`；当前基线 PNG `d6996022734954334f22adcbad6f18bc9f7997ab01640e2d3344910d19f47145`。

作者与根代理分别实际逐对审图，均允许进入后续视觉检查：南、东、北侧旧平盘变成有厚度的枝冠，北东接西弧的轮廓连续，南端冠层围住棚屋但未遮断入口；紫樱和中央花径仍可辨。此为限定全景门槛，不是最终验收。根代理独立判定见[原报告](evidence/muenzuka-woodland-v1/root-art-review-v1.json)。

稳定帧为 275 全通道 calls / 545288 三角 / 12903696 属性字节 / 161 geometry / 11 texture；相对当前基线为 0 calls、−1332 三角、−46656 属性字节、−2 geometry、0 texture。首帧阴影刷新数据另列原报告，不能混作稳定帧。未测硬件 FPS，也不比较这两次墙钟时间。

首图检查点时，近景、背面及其余验收尚未运行；以下为后续进度，原报告不覆盖。本范围不宣称林下、空地、远坡树群或整区精修完成。

本评审检查点收录[当前基线原图](evidence/muenzuka-woodland-v1/baseline/muenzukaOverview.png)、[候选原图](evidence/muenzuka-woodland-v1/v1/muenzukaOverview.png)、准确脚本、210 输入绑定、原始有限检查及双方图审。[证据清单](evidence/muenzuka-woodland-v1/evidence-manifest.json)绑定各文件 SHA；无 dist / V8。绝不把此检查点直接作为最终发布。

首图时预声明的后续机位是南东 `[-1621,110,693]→[-1710,82,618]`、北背 `[-1715,105,453]→[-1718,81,551]`；下节记录已执行结果。原西弧被遮挡的近景不替代本范围验收。

## 新近景与背面 A

上述两机位均已按新冻结协议 `fceec6e2…` / spec `535d8637…` 实际配对取图，208 基线与 210 候选各独立一会话，同 overview 热身、南东、北背顺序；双方 CLI0，源与制品不变。作者逐对打开四张原图，限定近背冠层门通过：厚冠与原枝干相接，北东与南端均有可读体量，原紫樱、根、路和棚屋保持。原协议的 `onBeforeRender` 仅观测，证实两产物同样提交新增目标近档 8 批 / 26 株、8 批 / 29 株，没有强制近档。

两视角调用数均无增加，提交三角分别 −28528 / −31666，纹理不增。但南东候选属性驻留 +6852944B、geometry +99：两边 uploads 均1284，基线 evictions1147 / 候选987，少释放160个旧对象；到北背两边 evictions均1202、residentObjects均122，候选属性 −529200B、geometry −4。此为完整保留的真实观测，尚待有界对象/回收时点归属，不直接称泄漏或改善，不把源码新增预算与瞬时驻留混为一谈。

根代理也逐对查看 A 四原图并通过限定门槛，独立报告 SHA `9b7e53d3…`，驻留差仍未归属。已有源码/首图评审提交 `d8f692dfcee0030ecec7c102afb61f7d5cc89d99`，普通推送远端独立分支，未合 main。

## 独立完整源链及 B 视图

Sol 的 `independent-production-source.json` 实际 10/10 / CLI0（39.217 秒），49 定义 / 21 个真正执行的公共 hook / 两次真实无缘塚 native 构造。2156 个原公共记录、原25冠和冷西10、原生全部身份及非目标源受保护；仅既有 `trailUpgrade.prepareMs` 计时遥测从持久 manifest 比较中排除。主线程与 Worker 都实测复用暖缓存、新增唯一 typed backing 为 0；native 摘要由 c0f2 变为 `7e24a87d60bc286337bf9adb447656d39c858fc6e41208535afa4872aa4066a2`，字节 5006504→4477304，63 条记录不变。报告 SHA `ce41b7d8…`，未自动改 fixture，尚未完整 Node。

B 已按新冻结 `8e174da5…` 协议 / `558bcf00…` spec 真正配对拍完：新会话冷 atlas（零 native cache）→南东 low→北背 night。当前 208 基线与 210 候选分别 CLI0，输入/成品前后不变；实际冷层 I7 / I9 21 株提交、low 新冠 far、night 新冠 near 均有观测记录。

作者与根代理分别逐对查看六原图，通过限定 B 门：冷层冠形统一，低档保留体积与枝端轮廓，夜间未见新增异常。根代理原报告 SHA `0c5f37e0…`。冷层原31代理的稀疏分布、夜间原有整体偏暗均保留，不写成全域完成或夜景精调。

冷 / 低 / 夜调用与纹理均不增加，提交三角分别 −756 / −1332 / −22252。属性驻留分别 −46656 / −93312 / +1253084B，geometry −2 / −4 / +26；夜间的正增量与 A 南东差一起保留，待生产生命周期做对象归属，不能称 GPU 释放已验收。

第二检查点收录 [A/B 与独立源证据清单](evidence/muenzuka-woodland-validation/evidence-manifest.json)、四份完整原始取图报告、双方原始评审、准确协议及 [独立 10/10 原报告](evidence/muenzuka-woodland-validation/independent-production-source.json)。仓库保留的本阶段原图共六张：首检查点 overview 两张，本次 [南东基线](evidence/muenzuka-woodland-validation/baseline-A/southEast.png) / [候选](evidence/muenzuka-woodland-validation/v1-A/southEast.png) 和 [冷总览基线](evidence/muenzuka-woodland-validation/baseline-B/cold.png) / [候选](evidence/muenzuka-woodland-validation/v1-B/cold.png)。其余北背、低档及夜间原图只在本地保留，清单列出实际路径、字节数和 SHA；无 dist 或 V8 入库。

A/B 原会话没有逐对象完整库存，因此后续受控生命周期即使通过，也不能回溯认定原先所有正驻留差的对象。原数值、报告和未决状态保持；LRU 时点仍只是待测假说。该分支为候选检查点，未合 main；当前全景、近背和冷低夜局部门槛通过，不等于最终交付或整个无缘塚已完成。

连续 LOD、生产交互/卸载重入、完整 Node 及 CI / 部署仍未运行。源、renderer、project、210 输入 HTML 在上述所有画面与独立检查中保持冻结。
