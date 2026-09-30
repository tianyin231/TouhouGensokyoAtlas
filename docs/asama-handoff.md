# 圣域—浅间净秽山：实施、出处与复测

> 2026-09-30，基线5a7aea6；局部选景初版。8目录不是8座从零建设的独立大区。当前核验、失败和预算见 [当前状态](current-status.md)，此前神社／高地记录见 [上轮快照](status-before-asama.md)。

## 来源与P边界

本轮查阅了社区场景索引以及原作文字的社区转录，未取得原始游戏背景图逐帧比对。T表示转录，不是假装直接审阅原始游戏文件；C表示社区整理；P表示本项目构形与布局。

| 入口 | 用途与限制 |
|---|---|
| [圣域（C）](https://thbwiki.cc/圣域) | 山麓森林、TH16红叶版本与作品关联；不提供工程坐标 |
| [浅间净秽山（C）](https://thbwiki.cc/浅间净秽山) | 第四、五、六面与化石森林目录；缺字或未确证外观不补猜 |
| [锦上京Omake（T）](https://thbwiki.cc/附带文档:东方锦上京/Omake) | 金字塔／神社封印、角色背景和景观关联；不推出整张化石森林地图 |
| [灵梦红线对话（T）](https://thbwiki.cc/游戏对话:东方锦上京/博丽灵梦（红）) | 四季竖穴、月海转换、最深处鸟居与神社身份；剧情空间转换不是普通地理相邻 |

所有尺寸、具体山路、背面、平台、迷宫拓扑、竖穴步道、地下建筑平面和化石形状都是P。四组地下预设为展示选景；未完成地表洞口到地下的物理配准，不建立假传送门，不将第五面月海转场改为整座山搬到月之都。地下神社不是复制博丽神社，也不是官图完整复刻。化石林的螺旋遗骸为艺术补完，不以贝子的身份作为确定地貌依据。

## 实际构建与导航

`seiki`在连续地表增加确定性植栽和公共路；不改变既有地形顶点。旧作魔界内部的 `sanctuary` 保留。`asama`独立空间内四组互斥选景，27预设在 `GA.ASAMA.views` 中。

| 目录 | 默认机位 | 主要附加检查机位 |
|---|---|---|
| sanctuary | seikiOverview | seikiPath、seikiRoots、seikiBack、seikiConnection |
| red_mountain | seikiAutumn | 与seikiOverview相同相机，仅改变本区叶色 |
| asama | asamaPyramid | asamaGate、asamaRear、asamaFoot、asamaPyramidSection |
| four_seasons_shaft | asamaShaft | asamaSeasons |
| labyrinth | asamaMaze | asamaMazeWalk及Red／Green／Yellow版本 |
| asama_depth | asamaDepth | asamaDescent、asamaSection |
| asama_deepest | asamaShrine | asamaShrineRear、asamaShrineFoot |
| fossil_forest | asamaFossils | asamaFossilSection、asamaFossilClose |

金字塔门洞在近远档都留开口，侧壁和顶板有实际厚度；入口后方仍是有限门廊，不宣称完整室内。迷宫49格使用连通树拓扑，竖穴侧通道与上层入口相连。深部中央地面留出下降口，避免用整面墙或平板挡住阶梯；后廊、窗洞、基座与地基低角度机位可检视。

新地区由主线程和Worker共用的模块列表注册。总览使用新增轻量构建器追加，不改 `assets/packs/overview.pack.gz`，不在启动时生成新增地区完整高模。圣域公共路只在总览包内保留，详情回收不删除；树木远近位置一致。仅本区克隆材质，地下退出后还原地表天气、时段和局部灯状态。

## 复测命令

```sh
python tools/build.py
node tools/check.mjs
node tools/audit-landmarks.mjs
# 一般环境：真实HTTP入口
python tools/check-asama-browser.py
# 本轮受策略限制的替代路径；Linux软件图形环境串行运行
xvfb-run -a python tools/check-asama-browser.py --content --headed --chromium /usr/bin/chromium
```

浏览器依赖仅用于回归，不是构建依赖。不要并行启动多个SwiftShader浏览器；本轮资源受限环境曾发生并行进程OOM，这不等于应用泄漏证据。脚本输出到忽略的 `dist/asama-browser-check/`。最终50项通过不证明所有历史浏览器套件或HTTP路径通过。

对照条件为1280×720、DPR1、标准画质、晴天、日间／夜间分别固定、时钟0、关闭环境动态并隐藏UI。圣域使用eye[-1425,425,-824]、target[-1170,240,-1060]、fov49；基线没有圣域默认机位，因此用相同坐标在原mountain区域取景。地下新增选景没有可比的旧专景，不伪造“修改前”图。图像与原始报告随会话证据包提供，仓库只保留源码、固定检查和此说明。

## 已知限制与继续顺序

先处理 `seikiConnection` 图中的接缝尖边及陡坡路肩，再复现“多区往返→三轮回收→轻量档”中曾出现的材质链接失败；最终串行复测未复现，不能因此删除失败记录。随后再精修岩壁、树冠和地下建筑中景材质，参考原始游戏背景图补足外观核对。当前形制尚未获用户美术认可。

这轮没有修改下一组妖怪之山9项。继续时仍须先确认源码和导航，不把普通山地或虹龙洞等已有内容代替秘天崖、天狗聚落、风穴及地下中心的专景。完整地形、人物资料、神社画面和既有高地始终是保护边界。
