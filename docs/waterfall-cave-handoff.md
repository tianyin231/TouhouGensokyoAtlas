# 瀑后洞穴：轨道选景与地表入口

> 2026-09-30；基线 `01676b969622a17666c305078244d0e9340672fe`。仅处理 `waterfall_cave`，不是完成黄瓜田或整条运输线路。最终结果、失败与成本见 [当前状态](current-status.md)。

## 来源和施工边界

[《铃奈庵》第28话P16–17的社区文字转录](https://thbwiki.cc/东方铃奈庵/第二十八话)在P16记述瀑布后洞穴与轨道，P17为河童集合。[第29话P12–15转录](https://thbwiki.cc/东方铃奈庵/第二十九话)另述边远黄瓜种植地。因此入口出处细化到28话，不能把远处农场布置成瀑布旁菜地。[九天瀑布索引](https://thbwiki.cc/九天瀑布)只作C关联资料。

本轮查阅的是T转录与C索引，未直接逐图核验原始漫画。洞形、支护、灯、台车、检修道、石阶、精确位置和尺度全部为P。洞段长116米、轨距1.16米、检修道宽1.6米只是工程参数，不是官方测绘。没有新增人物、修改人物位置或把河童活动地写成永久住所。

原九天瀑布的水幕、岩壁、平台和旧山路保留。新增地表6米深的有限入口短廊，洞内则为独立空间 `falls_cave`，使用目录和机位切换，**没有从原连续地形中挖通，没有原地进洞或贯通到黄瓜田**。黄瓜田仍未绑定。

## 实现入口

`src/waterfall-cave.js`、`src/waterfall-cave-renderer.js`、`data/waterfall-cave.json`通过 `project.json` 注册，主线程与原生Worker同源。地表取景同时要求 `waterfall_cave` 与 `mountain` 详情，避免旧瀑布被卸载。新材质限于本区，复用已有4盏局部灯；离开时恢复参数，不新增阴影贴图、环境目标或反射通道。

公共石阶接原 `mountain-lower-path` 的 `[-430,251,-941]` 附近，绕开两处旧树干。踏步承托依据实际近远地形采样，平台终点248.25，旧树和原地形不移位。阶梯不随详情回收消失。原观景台附近近远地形高差较大，本次不重造那段地形。

| 范围 | 机位 |
|---|---|
| 原瀑布、入口、来路、低角度石基 | fallsContext、fallsThreshold、fallsApproach、fallsSurfaceFoot |
| 门槛、轨道、装卸凹室、轨枕与水沟 | fallsEntry、fallsTrack、fallsBay、fallsRail |
| 转折、回望水帘、剖览、壳体背面 | fallsBend、fallsDaylight、fallsSection、fallsRear |

洞内有双轨、枕木、9组木支护、排水沟、侧向台车／台面／箱筐和可逆拱顶剖览。两档共208次线段／实际三角面检查保护轨道及检修道净空，不等同玩家碰撞或寻路系统。

## 复测

```sh
python tools/build.py
node tools/check.mjs
node tools/audit-landmarks.mjs
python tools/check-evidence-corrections.py
python tools/check-waterfall-cave-browser.py
# 仅当HTTP受限时使用明确标注的替代路径
xvfb-run -a python tools/check-waterfall-cave-browser.py --content --headed --chromium /usr/bin/chromium
```

专项脚本记录所有启动后的上下文丢失／恢复事件，不能只依据最终 `isContextLost=false` 判通过。固定截图段等待GPU完成；正常选择器、机位按钮、静止、轻量设置及窄屏段不手动绘制或同步GPU。HTTP检查另设独立CI作业，避免被前置旧套件失败直接跳过；以实际运行结果为准。

## 继续精修与限制

表面洞口仍偏规则拱壳，石基与岩罩边缘、内部岩层变化、排水沟和检修道接缝需要继续精修；首版不是用户已认可的美术终稿。首稿两个广角机位被原山体挡住，已抬高重拍同条件基线；没有通过删除旧山体获得好看的截图。

最终专项32项通过，但首轮专项和另外的长批量取图仍出现上下文丢失；基线取图也有失败。全部失败独立保留，未改共享渲染／恢复模块，不能称根因已定位或修复。完整物理连通、黄瓜田、建筑碰撞、车辆运行、实体显卡和手机FPS、长期内存压力及全地区视觉回归未完成。
