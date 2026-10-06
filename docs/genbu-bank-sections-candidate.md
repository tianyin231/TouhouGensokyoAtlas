# 玄武涧分段岸床 V1（拒收候选）

本树基于 5f30bca；新主线 59aa2e8 仅文档，208 个运行输入仍为已验收 b9ff4a3／c532。旧 Gaussian 地面 V2 已独立拒收归档为 b9fdb693，不合并。此方法直接以岸肩、湿边及床底的显式横截面构造面，启动约定及补充见 [契约](genbu-bank-sections-contract.md)。

V1 源 `803b575f7522fd2927b7d7453c9f4903a3f1b990138cc495e0b79b01c59aff93`，project `fc4a4914d2017d43b72f862580226f11b8d1c001845c5fe717f247cfb0084c7b`；209 输入 HTML `c82f56c2d821b656b493104d11bc808f9b84ba7aaed068772610c8d74bdeccaa`。完整输入／原始证据散列见 [manifest](genbu-bank-sections-v1-evidence/manifest.json)。此分支祖先不得直接合入 main。

新控制面 x[-1008,-928], z[-544,-484]，原桥及 39 树保持；37 native／14 cold 终柱按已核身份降高。核心 near/far 同形，外带各回旧 LOD；新旧真实 indexed 面分别查询，保留旧 query/near 偏移。四个 patch 各自沿用原父块 center/radius，法线先跨 tile 累计。没有新增纹理、草石或树身份。

[同机位原图](genbu-bank-sections-v1-evidence/before.png) → [V1 原图](genbu-bank-sections-v1-evidence/after.png)。Astra 与 root 均实际审阅并拒收：柱口和桥路开放、南岸平顺有收益；水尾仍呈长蓝片，岸肩与浅床厚度未读出。[Astra 美术判定](genbu-bank-sections-v1-evidence/art-review.json)及[root 独立拒收](genbu-bank-sections-v1-evidence/root-art-review.json)与技术结果分开。仅允许本方法一次 V2 短宽浅盆修正；若仍平片／缺岸脚则停止共同地形任务，交诊断，不扩山区。

## 已测与原失败

- 138 个旧桥／树根支撑面与新域内部无重叠，唯一离线核对 0.361 秒。
- 作者01 CLI1 为已知裁交点误用三角含点判定；原协议／源码／失败完整保留。改为已知平面求值，实际 contact 命中断言未放宽。
- 作者02 9/9 CLI0；其 surface02 **3/4 CLI1**：首板两角土面高出板顶约 0.03 m。按完整东岸截面降低后修复，未钉角／删板。
- 最终作者03 **9/9 CLI0**、surface03 **4/4 CLI0**；分别 2.307／2.799 秒，0 全前驱、0 新原生构造、0 GPU。完整新 near 覆盖 4,800 m²，无 XZ 零面积；原树／29 非目标 native 记录保持。首板两角近远地面间隙 0.151／0.229 m；3208 外缘点新增误差≤3.31 µm，85 湿线点≤4.43 µm；patch 法线均与实际面同向，最小 dot 0.8558。这些是作者检查，不冒称独立通过。
- 新增长期唯一 typed 源 **135,492 B**（public 114,612 + native 20,880），包括新旧与水 contact。V8 slab 的 pack.bytes 不作为生产内存。实际生命周期／完整独立归属尚未验证。
- 单张实际 HTTP/Worker 取图 **28.873 秒、CLI0**，209 输入／HTML 前后不变；原 d38 协议与基线机位/设置/帧顺序不变，无 JS/shader/context 错误，唯一 HTTP404 为 favicon.ico。稳定帧 335 total calls／473,428 submitted triangles／23,190,716 属性字节／224 geometry／11 texture；相对基线 **+2 calls、+253 triangles、+32,532 B、+2 geometry、0 texture**。Worker 源 6,284,976 B（基线 6,278,784 B）；不据耗时宣称提速或 FPS 提升。

A 低位／背向未运行；cold／低档／夜间／连续 LOD、生产交互／清退重入、独立完整源检查、完整 Node、CI／部署均未运行。00:46 工具 transport 断连在所有源码快照／图／报告落盘后发生，00:48 只读恢复重核散列一致；没有重建环境或改权限。

## V2：短宽浅盆，仍拒收；停止实现

V1拒收检查点为 `e9a18a9b149bea905963addc8e70e5b254f730a3`；root独立判定随后以纯文档 `1cccb6c1a74f4479e7d79c19eb3644ff797f87c1` 普通推送。V1源码和原失败没有覆盖。

唯一V2只改变明确的岸床横截面：盆中心约 z=-516、最宽半宽9.4m，南端在约-506收口，保原水位／z=-524接断面、原柱桥路和树。源码 `d4143f18a7e5a102ac90f3cf1f9f86cb9a904846850fb77606d3f307f80e7cba`，project不变；209输入HTML `131a167f3d118622c8fd972119e7530859bac7e8bd471555baa36a8e9ec32a2a`。精确来源见 [V2 manifest](genbu-bank-sections-v2-evidence/manifest.json)。

[原基线](genbu-bank-sections-v1-evidence/before.png)／[V1](genbu-bank-sections-v1-evidence/after.png)／[V2](genbu-bank-sections-v2-evidence/after.png)三张原PNG均保存。[Astra](genbu-bank-sections-v2-evidence/art-review.json)与[root](genbu-bank-sections-v2-evidence/root-art-review.json)实际独立审阅后一致拒收：蓝片变短变宽，但仍像直接铺在绿面，水床—湿坡—岸肩没有完整承托。两稿停止，不A、不V3、不转新区，不以源预算或技术通过代替画面接受。

- 作者04因临时目录Node22消失而shell **CLI127，0 JS执行**。官方原版Node22.23.3及SHA256恢复到持久目录后，作者05 **9/9 CLI0**（2.312秒）、surface05 **4/4 CLI0**（2.694秒）；没有用Node24跑候选，也没有重建原生基线。04原stderr及未启动记录保留。
- 作者有限检查：唯一新增源132,576B（public113,016 + native19,560）；核心面覆盖／根和其它原生记录保持、柱帽净空通过。首板两角0.147／0.229m，外缘新增误差≤3.31µm，湿线70点≤4.36µm。完整独立源检查尚未执行，不能把这些写成独立验收。
- 原d38协议单张实际HTTP/Worker全景 **28.578秒、CLI0**，209输入及产物前后相同；335 total calls／473,417 submitted triangles／23,189,396属性字节／224 geometry／11 texture，基线净 **+2 calls／+242 triangles／+31,212B／+2 geometry／0 texture**。无JS/context错误，唯一404是favicon.ico；不据耗时或三角数声称FPS提升。
- 此方法从未运行A低位／背向、cold／低档／夜间、连续LOD、生产交互／卸载重入、独立完整源检查、完整Node或部署。V1精确提交工作流查询0 runs；V2提交后的CI须另核，当前未运行。

## 共性诊断与恢复边界

显式截面解决了上一方法中“先混合高度、再钉局部点”的表示问题；本轮全景也较旧dd99干净。但数值上有床底和湿坡，并不自动形成画面上可读的水岸。两稿的可见收益主要仍来自终柱递降；浅盆改宽后，水与绿地之间的高低及材质关系不足，完整南口没有成立。本轮没有新低位图，不能借全景或法向dot宣称原折皱已从所有角度根治。

因此停止在当前微观控制值上继续试错。若以后重启，须先对“柱列南口—桥头—完整水床—外岸”作可评审的整体体量构图，明确固定镜头能读出的岸肩宽度／高差与水体接触，再决定控制网；不能只给同一水轮廓增加一圈点、换颜色、增加碎石草或延长测试。原资产、路径和两档／查询契约仍是约束，132KB预算通过不构成画面质量证明。

恢复入口为本源码、契约、两个evidence目录与原始执行器 `/workspace/genbu-bank-evidence`；大V8／dist未入Git。此隔离分支包括拒收祖先，禁止整支合入main；main运行内容保持已交付208输入／c532。本轮没有可发布的新地形成果。

Sol 最终仅作[已有证据与输入一致性审核](genbu-bank-sections-v2-evidence/independent-evidence-audit.json)：209实际输入、d414源码／副本、HTML131a、原协议及三组report／PNG精确核合，0build／hooks／native／GPU／完整Node。它不构成新几何或美术验收，原失败及未运行项不变。核心V2已隔离推送 `0d9eb2391cabc81e30507556929e47ee998c91ed`；此段为纯文档跟进。
