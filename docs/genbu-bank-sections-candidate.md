# 玄武涧分段岸床 V1（拒收候选）

本树基于 5f30bca；新主线 59aa2e8 仅文档，208 个运行输入仍为已验收 b9ff4a3／c532。旧 Gaussian 地面 V2 已独立拒收归档为 b9fdb693，不合并。此方法直接以岸肩、湿边及床底的显式横截面构造面，启动约定及补充见 [契约](genbu-bank-sections-contract.md)。

V1 源 `803b575f7522fd2927b7d7453c9f4903a3f1b990138cc495e0b79b01c59aff93`，project `fc4a4914d2017d43b72f862580226f11b8d1c001845c5fe717f247cfb0084c7b`；209 输入 HTML `c82f56c2d821b656b493104d11bc808f9b84ba7aaed068772610c8d74bdeccaa`。完整输入／原始证据散列见 [manifest](genbu-bank-sections-v1-evidence/manifest.json)。此分支祖先不得直接合入 main。

新控制面 x[-1008,-928], z[-544,-484]，原桥及 39 树保持；37 native／14 cold 终柱按已核身份降高。核心 near/far 同形，外带各回旧 LOD；新旧真实 indexed 面分别查询，保留旧 query/near 偏移。四个 patch 各自沿用原父块 center/radius，法线先跨 tile 累计。没有新增纹理、草石或树身份。

[同机位原图](genbu-bank-sections-v1-evidence/before.png) → [V1 原图](genbu-bank-sections-v1-evidence/after.png)。Astra 与 root 均实际审阅并拒收：柱口和桥路开放、南岸平顺有收益；水尾仍呈长蓝片，岸肩与浅床厚度未读出。[美术判定](genbu-bank-sections-v1-evidence/art-review.json) 与技术结果分开。仅允许本方法一次 V2 短宽浅盆修正；若仍平片／缺岸脚则停止共同地形任务，交诊断，不扩山区。

## 已测与原失败

- 138 个旧桥／树根支撑面与新域内部无重叠，唯一离线核对 0.361 秒。
- 作者01 CLI1 为已知裁交点误用三角含点判定；原协议／源码／失败完整保留。改为已知平面求值，实际 contact 命中断言未放宽。
- 作者02 9/9 CLI0；其 surface02 **3/4 CLI1**：首板两角土面高出板顶约 0.03 m。按完整东岸截面降低后修复，未钉角／删板。
- 最终作者03 **9/9 CLI0**、surface03 **4/4 CLI0**；分别 2.307／2.799 秒，0 全前驱、0 新原生构造、0 GPU。完整新 near 覆盖 4,800 m²，无 XZ 零面积；原树／29 非目标 native 记录保持。首板两角近远地面间隙 0.151／0.229 m；3208 外缘点新增误差≤3.31 µm，85 湿线点≤4.43 µm；patch 法线均与实际面同向，最小 dot 0.8558。这些是作者检查，不冒称独立通过。
- 新增长期唯一 typed 源 **135,492 B**（public 114,612 + native 20,880），包括新旧与水 contact。V8 slab 的 pack.bytes 不作为生产内存。实际生命周期／完整独立归属尚未验证。
- 单张实际 HTTP/Worker 取图 **28.873 秒、CLI0**，209 输入／HTML 前后不变；原 d38 协议与基线机位/设置/帧顺序不变，无 JS/shader/context 错误，唯一 HTTP404 为 favicon.ico。稳定帧 335 total calls／473,428 submitted triangles／23,190,716 属性字节／224 geometry／11 texture；相对基线 **+2 calls、+253 triangles、+32,532 B、+2 geometry、0 texture**。Worker 源 6,284,976 B（基线 6,278,784 B）；不据耗时宣称提速或 FPS 提升。

A 低位／背向未运行；cold／低档／夜间／连续 LOD、生产交互／清退重入、独立完整源检查、完整 Node、CI／部署均未运行。00:46 工具 transport 断连在所有源码快照／图／报告落盘后发生，00:48 只读恢复重核散列一致；没有重建环境或改权限。
