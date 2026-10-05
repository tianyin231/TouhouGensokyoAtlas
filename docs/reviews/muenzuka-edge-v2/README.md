# 无缘塚西弧 V2 评审检查点

此候选**技术未通过，不可直接合入 main**。分支`experiment/muenzuka-edge-20261005`从main `504808ea4d297ba67a8cd435fd52282cde33ad74`起步，只保存可审查源码和真实证据；最终交付须从最新main独立整合已修复、已验收内容。

V2源码SHA为`b2ef1b7c4acbc917fcaffba2fadb73ec775fc201e9bdeb0df375fa1680556045`，203输入原构建HTML为`ec19fa9107f1f947cc0d1ec6aa9a1ecf158162147fd0cf99130ad2fa62ca23a3`。检查点保存时逐文件重核原release的203输入及HTML，全部一致；未新增build、native构造或GPU实验。

[候选说明](../../muenzuka-edge-candidate.md)记录范围、V1南端旧冠接缝、V2补齐两株及全部未测项。[evidence.json](evidence.json)绑定原产物、完整输入SHA、精选原PNG、执行报告摘要与原报告SHA；仅四张代表图入库，近机位遮挡图仍保留在原证据目录。

- [原全景](../../previews/muenzuka-edge/before-overview.png)／[V2全景](../../previews/muenzuka-edge/after-overview.png)：西弧25原树冠体连续，局部画面有收益。
- [原背面](../../previews/muenzuka-edge/before-back.png)／[V2背面](../../previews/muenzuka-edge/after-back.png)：可看到近档冠体厚度、原枝干与路面；相机和条件相同。
- `near`虽然实际采集CLI0，但未修改的东侧前排冠层遮住大部分目标，不能称近细节已充分验收。

## 已执行状态

作者预检02为8项通过／CLI0，复用已存原生快照、0次新build；[准确原脚本](author-preflight-02.mjs)及[原报告](author-preflight-02.json)保留。V1四个近远原型数组与V2逐字节相同，新增source仍577780B。作者预检不等于独立测试。

全景与A近／背成对浏览器采集实际通过，均无JS／着色器／上下文错误，仅favicon404。相对原基线，全景0调用／−900提交三角，近机位0／−16590，背面0／−27050；0新纹理，不据此宣称FPS提升。A末三帧成本稳定，原近远级别列表与计数收在绑定证据中。CPU耗时可能与独立工作重叠，不作速度比较。

[独立包围球原报告](independent-bounds-v2.json)为**CLI1**，[原执行脚本](independent-bounds-v2.mjs)逐字节保留。Three近远缓存球在完整风动包络下，基线9组、V2有10组越界；V2最大0.234069米，`-23:7:0`有新增轻微越界。原位置／record bounds保持不能代替实际缓存球正确；不放宽断言、不缩冠放行。

B冷总览／低画质／夜间、原生交互／卸载重入、完整Node、候选CI与部署均未运行。独立源保护未完整结束。此检查点不包含待实施的局部包围修复，也不改花丘候选、已认可植被或通用渲染器。

## 原执行协议

`capture-baseline.py`、`capture-v2.py`与`capture-views.py`是实际执行文件的原字节，`view-spec-v2.json`是执行前声明的A／B机位。脚本保留历史绝对工作区路径及防覆盖断言，并非可在干净checkout直接运行的通用工具；没有改写协议后称其已执行。它们未登记到生产project、构建或回归入口。

独立脚本和作者脚本使用的原生V8、完整dist、完整截图批次与临时日志不入库；各自输入SHA及原报告绑定仍保留。工作区原V1、V2快照与原失败报告不覆盖。本检查点只保存证据，不追加实验。
