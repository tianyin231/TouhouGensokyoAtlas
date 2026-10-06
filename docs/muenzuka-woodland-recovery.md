# 无缘塚剩余林冠：停止与恢复入口

2026-10-06保全阶段，只保存既有成果，没有开发、构建、取图、重跑检查或再次下载失败文件。上游文件503不是源码验收失败。远端main保持 `2a5ac93e8aebbf539feec8a1e9408a0a6ebea02d`，运行内容仍为b9ff4a3／208输入c532。

## 已保存成果

原实验分支 `experiment/muenzuka-canopy-remaining-20261006`，此前远端检查点 `5ea8027dbc81c6d6aed82e68ca9f61cd3305df48`。在其上追加尚未远端保存的211项集成内容、原完整回归、失败协议及恢复说明；不合main，不创建发布或触发新的实验批次。

- 37棵剩余原生普通冠、独立冷21株及六组真实图审／独立源10项，仍使用5ea8027已保存源码和精选六图。
- 集成HTML为36,472,193B、SHA `e2956858b9b588ee787ead21eec4cfd79ef63a5c0fbe6d472621a44823a92d45`。211输入比原已审图210多一个可复跑检查器；运行成品逐字节相同。
- 原完整Node22.23.3于01:46—02:03 UTC运行979.708秒，46组CLI0，输入／成品／release前后不变。[原报告](muenzuka-woodland-regression.json)和[完整原输出](evidence/muenzuka-woodland-integration/integrated-regression-01.log)已保全，禁止为本次中断重跑。
- 新检查复用已有实际公共hook及原生包，不增加地区构造。当前Muenzuka期望经显式审阅改为7e24a87d，其他12区及历史西弧c0f2登记保持。

## 失败和未验收

208／c532生命周期基线CLI1，02:04:52.556—02:05:37.114 UTC、44.557秒；5个检查前4通过，第5个新增相机期望失败。真实RAF的CameraRig将eye.Y=110重构为110.00000000000001，相差1 binary64 ULP。既有相机代码的离线诊断精确复现，Float32 view／VP逐位相同；未改产品、容差或原失败结果。

原始[执行](evidence/muenzuka-woodland-lifecycle-stopped/baseline-native/execution.json)、[失败报告](evidence/muenzuka-woodland-lifecycle-stopped/baseline-native/report.json)、[诊断](evidence/muenzuka-woodland-lifecycle-stopped/baseline-native-pose-diagnosis.json)、完整协议及未执行旧稿均见[证据清单](evidence/muenzuka-woodland-lifecycle-stopped/evidence-manifest.json)。失败PNG与5ea8027已保存的baseline-A/southEast.png字节相同，没有重复入库。

候选生命周期未启动。连续LOD、实际鼠标／滚轮段、自然回收等待后的库存、卸载和重入恢复均未执行。仅两份基线即时库存的字节自洽通过，不能写成资源释放通过；原南东+6852944B／+99几何、夜景+1253084B／+26几何仍未完成归属。原A/B缺少该瞬间逐对象库存，未来也不能追溯冒称每个旧对象已经查明。

该保全提交CI／部署未运行。因明确停止实验，不开会触发新检查的PR，也不合main。没有FPS、CPU提速、物理显存或长期无泄漏结论。

## 下次恢复

必须先取得后续继续指令并重核预算、远端与环境。保留46组CLI0和六组实图结果；源未变时复用，不重跑。211项版本是最终集成候选，历史生命周期的210输入绑定对应5ea8027，不能把旧profile直接改成211后冒称是同一次执行。

若继续，先审阅尚未实施的窄协议修正：新prospective相机守卫应采用未改CameraRig的确定性重构值并保护Float32 view／VP等式；不能加入epsilon、改相机或放宽旧资源／相机／LOD／PNG恢复等式。旧CLI1必须保留，是否重新开展一对会话由新的执行范围和预算决定。当前没有批准继续实验。

主岛地形、坡脚、林分疏密与林下仍未完成。命莲寺、玄武涧、人里街院、湖岸和Alice林下拒收候选继续隔离，不能合并它们的运行改动。

02:37 UTC进程清点未发现本任务检查脚本，协作树仅root；此前两子代理均已不在运行树。未远端保存的dist、V8、非精选原图和临时文件仍仅本地，按仓库规范不上传；必要源码、回归报告、协议、原失败和恢复说明均纳入本次提交。
