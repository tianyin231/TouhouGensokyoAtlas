# 命莲寺原坡重建：两稿拒收与恢复入口

**V1、V2 均未达到画面门槛，本方法已停止，不合入 main、不继续 V3、不跑长回归。** 这是候选隔离记录，不表示命莲寺精修完成，也不表示整体主岛任务结束。运行基线为已交付 `29663c94616067de77657dddd41c01035b8bf58d`；后续main `9905a09` 仅修发布工作流及其严格散列保护；实际HTML与29663c逐字节相同。

原基线的三项明显问题是大块灰陡板与重复砖线、坡脚及阶梯两侧承托不清、原灌木呈贴墙扁片。本方法直接裁除局部原坡面，保留平台独立石基与原建筑；没有合并旧高度场或罩壳候选。V1 真实全景仍呈软灰绿斑与竖褶，四处岩露在规则采样中失去边界；精确源和原失败已隔离于 [`3bfe2a1`](https://github.com/tianyin231/TouhouGensokyoAtlas/commit/3bfe2a1cedb0327fe95d5051de32ceb26aae51e9)。

V2 相对 V1 的岩面边界更清楚，但相对基线仍无可交付的整景提升，两个独立画面审阅均拒收：

1. 主坡可见的三枚尖顶多边石形排列近似，像贴在墙上的灰色宝石，没有形成可信露岩。
2. 岩块之间和坡两端仍是软灰绿垂帘；长直平台下沿、主体陡板感与锯齿坡脚没有得到整体解决。
3. 阶梯两侧没有可读的宽基脚和连续土肩，原小灌木仍散贴陡面；硬岩面没有解决承托关系。

共同根因是控制网仍围绕原长直台地边界做局部起伏，缺少先于材质的整体坡体／坡脚组织。V1 的软场混合把岩石抹成污斑；V2 的同类 ring→单 crest 扇形虽然拓扑真实，却制造了重复尖锥。局部拓扑正确和硬边清晰并不等于自然地形设计成立。未来重新处理本处必须先解决整体剖面、不同宽深的坡肩与真实资产脚印之间的空间关系，不能从本稿继续换色、加草或增加同类石片。

## 已实施的有界内容

近景范围 x218–394、z354–391，中央 x288–312、原平台／台阶、中层台地、莲池／桥／侧梯与六处原树根近档小域保护。远档另有经授权的 x192–416、z336–416 支撑和接缝范围。八个原 terrain 的 vertices 与范围外原属性保持，仅压紧已验证排他的 index；新增拓扑使用独立 vertices 对象，未改 renderer。原树矩阵、墓地及地下保持；原灌木按完整丛刚性接地，没有拉伸冠体或新增草石，V2 详情移动数量尚未独立复核。

V2 将四个岩圈裁入土网格，生成 20 个有意硬面；实际土面与岩面共用 157 条精确 Float32 位置边，土法线只在土面内平滑。剖切按原洞矩形 x208–440、z378–628 裁除，V1 的 25 个 x<208 洞外远档缺面点已恢复。直接详情构建采用同一显式岩面采样；其完整原生保护检查仍未运行。

## 实测与失败边界

1280×720、DPR1、balanced、同一 myouren 机位与冻结协议，稳定帧结果如下。软件后端计数不代表硬件 FPS 或物理显存。

| 实图 | 全通道 calls | 提交三角 | 驻留属性 B | 几何对象 | 纹理 |
|---|---:|---:|---:|---:|---:|
| 基线 | 278 | 663,480 | 29,872,584 | 201 | 24 |
| V1 | 280 | 659,861 | 29,415,192 | 203 | 24 |
| V2 | 280 | 660,104 | 29,429,700 | 203 | 24 |

V2 新唯一源 backing 为 **607,080 B**，包括 contact 98,244 B、cutTrace 2,700 B，未超 0.6 MiB；20 条 rockFaces 为有界普通 JS 元数据，总堆未测。全景脚本 CLI0，无 JS／shader／context 错误，仅 favicon.ico 404。这些数据不构成画面验收。

- 作者首次短检因边界顶点重复登记产生约 8–15 微米差异，CLI1 原输出保存；修正后约 3.95 秒的短检 CLI0，0 退化三角、157 土岩边精确对应，24 岩控点在原视锥内（不测遮挡）。
- 独立 V2 原检查 **14／16、CLI1** 保存。157 土岩边被旧固定石色误分类，是检查协议错误；随后按实际位置与硬法线独立确认全部一土一岩接合，未改写原报告。
- **真实未修硬错：**near-cut 的 x288／312 边界在 z376.5 新开缝约 0.02818 m、z377.5 约 0.08453 m、z378 达 **0.112709 m**；基线同边差为 0。两翼使用 normal 面裁切，而中央保留原 cut 面，不能声称整个剖切地表已连续。局部归因 CLI1 同样保存。
- 六根共 102 个实际脚印点、非目标源、近档平台、x256 接缝与远档外缘等有界检查通过；完整原生灌木保护、导航、近／远／背面／昼夜／低档／剖切浏览器和重入、完整 Node 均未运行。
- 相机 ground／walk 仍查询原分析 Terrain.height，实际新坡的 CameraRig 专用高度采样未接入。固定 meadowWalk 不穿范围，不等于任意地面行走正确。

## 精确恢复入口

工作区 `/workspace/myouren-terrain-rebuild`，分支 `experiment/myouren-terrain-rebuild-20261005`；冻结源 `src/myouren-terrain-rebuild.js` SHA `f1c1c371951d5e3aaa49550c23a5c73b2d4fa7737cf7954328ac21fb7086f5c0`，project SHA `33d1a8580015f00061eb7d1c68f63104c6dad1561f68ebb950c0bef893e7fa11`。V2 HTML SHA `0723e15ae5c655ce8323803ebca06bfd7916027c0bfd46cc9a0e5ddfa84c5027`；截图协议 SHA `ab81458a203d12549c257063522be766c74a2a885116ada87f774c9a680186cf`。

`GA.MYOUREN_TERRAIN_REBUILD` 暴露范围、原记录、控制点和构建入口；`metadata.get(pack).rockFaces` 仅供定位实际三角段，不能替代独立验证。阶段证据根为 `/workspace/myouren-terrain-evidence`：`before/v1/v2` 同机位真图与运行报告；`v2-source` 源与精确执行 checker；`astra-v2/run-01`、`run-02` 原样 stdout／stderr、执行时源／脚本／工程；`independent-v2*` 原 14／16 CLI1；`v2-diagnostics*` 材质协议归因和真实开缝；`astra-review-v2.json` 精简图审与散列绑定。源码已冻结并由主代理保存于独立审阅分支 `experiment/myouren-terrain-review-20261005`，不得合入main。下一主空岛工作独立进行，本稿未修开缝及导航欠账不会被标为完成。

## 入库的精简审阅入口

[基线](previews/myouren-terrain-v1/before.png)、[V1](previews/myouren-terrain-v1/after.png)、[V2](previews/myouren-terrain-v1/after-v2.png)为三张实际同机位图，未进行生成或后期改图。[比较记录](myouren-terrain-v2-evidence/v2-comparison.json)与[Astra独立图审](myouren-terrain-v2-evidence/astra-review-v2.json)绑定原图、源、成品、脚本与实测计数。

[原独立14/16报告](myouren-terrain-v2-evidence/independent-v2.json)、[原CLI](myouren-terrain-v2-evidence/independent-v2-cli.json)、[后续开缝诊断](myouren-terrain-v2-evidence/v2-diagnostics.json)均按原字节保存；执行脚本与日志在相邻路径。[作者两次轻检](myouren-terrain-v2-evidence/author-light/README.md)保留先失败、实际修正后通过的范围。[独立checker协议改正说明](myouren-terrain-v2-evidence/checker-v2-change-note.md)保留旧误判来源，并不改写原失败。

V1的archive-sha.json绑定V1提交3bfe2a1的源码/checker；它不是当前V2源码的清单，未覆盖成新hash。V1诊断的依赖绑定是按冻结文件与实际执行顺序事后补存，限定见其v1-diagnostics-binding.json。所有脚本保留执行时路径，移机重放需按记录布置工作区，不能据此声称已经重放。
