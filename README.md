# TouhouGensokyoAtlas · 幻想乡立体风物志

使用 Three.js 构建可浏览的幻想乡地图。地点、资料来源和工程补完分别记录；目录当前包含 179 个地点，目录收录不等于全部已建成。

在线体验：[幻想乡立体风物志](https://tianyin231.github.io/TouhouGensokyoAtlas/)。下载版本请到 [Releases](https://github.com/tianyin231/TouhouGensokyoAtlas/releases) 获取 HTML。仓库维护当前源码和必需资源，完整 HTML 是构建产物。

## 后户之国（0.25.0）

顶部「后户之国」进入TH16绿色门群，14机位覆盖四季窥景、门背合页、二童子活动处、座席、上下纹样、第六面黑暗串门和Extra选景。四季窗口是本作三维小景的一次性离屏渲染，不是实时地表传送门；门与上层地面可关闭／恢复。布局、尺寸及座席保留P标记。

基于已合并的`b25a778`追加，原畜生界、林缘景观、路线导览、地面行走、自由飞行及Pages配置全部保留。当前179条目录中87可导航、92待处理；人物78条，新增三人未核原图明确显示缺图。新模块为`src/backdoor.js`、`src/backdoor-renderer.js`与`data/backdoor.json`，具体[依据、四季窗口预算与边界](docs/backdoor-reference.md)可查。

构建与静态检查命令不变；可选新回归为`python tools/check-backdoor-browser.py`。CI对本次区域和公共回归通过HTTP检查，其结果以每次运行记录为准，不把工作流存在当成通过。旧的快速切换着色器问题不因本轮选定测试通过而宣称已修复。

## 保留场景：畜生界与灵长园（0.24.0加入）

0.24候选经PR #1合并到主分支，包含其后整合的林缘和相机功能；当前以合并后的`b25a778`继续开发。此前快速未同步切回博丽神社的着色器校验错误仍未确认根因，详见[当前状态](docs/current-status.md)，不因合并或本轮检查通过而改称已修复。

顶部「畜生界」进入高楼都市与锁孔形林地；导航可切到电子遗产内景。16个机位覆盖街巷、退台楼顶、土垒、守备口、陶偶、制作区、高廊与可逆剖览。TH17袿姬时期与改造前意象分开；后者不代表完整历史地图。新建筑与室内均为P补完，不给普通大楼命名组织总部。

新增`src/animal.js`、`src/animal-renderer.js`、`data/animal.json`及[出处与边界](docs/animal-reference.md)。原73位人物及全部旧场景保留，新增磨弓、袿姬；原作图未核时明确显示。0.24目录为179项中的86可导航／93待处理，不是竣工比例。可选浏览器检查：`python tools/check-animal-browser.py`。

## 保留场景：彼岸与三途河（0.23.0加入）

顶部「彼岸」进入中有之道摊街、赛之河原、三途河渡口和彼岸花原；共16机位，两岸分别导览，不设跨河桥或固定渡河里程。码头、空心木舟、石堆风车、反卷红花与无专名关口均为真实几何。关口不是是非曲直厅总部，布局和背面保留P标记。

[考据与范围](docs/higan-reference.md)记录原作文字、同人预览与补完区别。0.23版本时目录为179条中84可导航、95待处理，不是竣工比例。新增 `src/higan.js`、`src/higan-renderer.js`和`data/higan.json`，原地区与源资产不改。可选回归为`python tools/check-higan-browser.py`；`.github/workflows/scene-check.yml`以只读权限独立重建并运行HTTP浏览器检查，短期附件不替代正式Release。

## 保留场景：天界与玄云海（0.22.0加入）

顶部「天界」进入有顶天桃林与花原、临云小亭、要石、玄云海山顶岩地；14机位包含背侧／岩基、局部绯云征兆、宴席和TH155土石极光选景。在0.22版本时，三项已有目录接入后为 **80条可导航、99条待处理／共179条**，不是竣工比例。未把天界合并到神子仙界、月都或幻想乡地表。

新模块为 `src/heaven.js`、`src/heaven-renderer.js`、`data/heaven.json`。小亭、路形、岩基、未见立面与所有尺寸标P；TH105与TH155场景不同时叠加。[考据、版本边界与预算](docs/heaven-reference.md)可查。构建检查命令不变，新增可选 `python tools/check-heaven-browser.py`，原作图仍按真实加载状态显示。本轮不自动创建Release。

## 保留场景：冥界与目录修正（0.21.0加入）

顶部「冥界」进入幽明结界、长阶、白玉楼和西行妖，共13个机位。白玉楼采用コ字形本殿、枯山水中庭与低墙外樱庭；西行妖默认封印不开花，花苞事件、雪庭和本殿剖览均可恢复。[依据与P补完边界](docs/netherworld-reference.md)单独记录。

同时补上8条已有模型的目录绑定，取消幻想风穴／山麓间歇泉／圣域3条错误邻区回退。在0.21版本时，179条中77条可导航、102条待处理，**这是导航覆盖，不是竣工比例**。`node tools/audit-landmarks.mjs`生成与界面使用同一解析器的完整核对表。新增源码、资料与测试；原地表、旧地狱、辉针城、月世界和魔界不重建覆盖。

## 保留场景：魔界（0.20.0加入）

顶部「魔界」进入：星莲船的红黑封印与法界、怪绮谈的洞口／街道／冰雪世界／万魔殿、灵异传的维纳废墟与堕落神殿。共19个机位，万魔殿包括大堂、侧廊、后庭和可逆剖览。按作品分图展示，不主张它们是三个不同的官方宇宙，也不悬置在幻想乡上空。

新增 `src/makai.js`、`src/makai-renderer.js`、`data/makai.json`；[来源与P补完边界](docs/makai-reference.md)单独记录。离线构建与检查命令不变，可选浏览器回归为 `python tools/check-makai-browser.py`。原地表、旧地狱、辉针城和月世界源资产保留。本轮直接推送源码，不自动创建Release。

## 保留场景：月世界（0.19.0加入）

顶部「月之都」进入城内、绵月宅、桃园和丰富海；底部可切换静海表里与第四槐安通道，也可返回完整幻想乡。共有14个机位，封存事件与日常场景分开。不是把月都悬在地表上空。

新增 `src/lunar.js`、`src/lunar-renderer.js` 与构建资料补丁 `data/lunar.json`。旧地点及人物源数据不覆盖；详细身份与边界见 [月世界考据与实现](docs/lunar-reference.md)。集成检查仍为 `node tools/check.mjs`，另有可选 `python tools/check-lunar-browser.py`；浏览器脚本需要Playwright／Chromium，不是构建依赖。

## 保留场景：辉针城（0.18.0加入）

顶部“辉针城”或地区下拉菜单进入。提供外观、空中来路、背侧、石垣、望楼、大殿、可逆剖览和事件风暴八个机位；地点检索也支持“逆城”与“Kishinjou”。TH145三层外形与TH14逆向室内的依据、版本差异、同人参照和P补完见[辉针城考据与实现](docs/kishinjou-reference.md)。这次更新源码，不自动创建或覆盖Release；构建后才能看到新场景。

## 构建与预览

需要 Python 3.10 或更高版本；检查脚本需要 Node.js 22 或更高版本。不需要安装 npm 或 pip 包，构建不下载网络资源。

在项目根目录运行：

```powershell
python tools/build.py
node tools/check.mjs
python -m http.server 8765 --bind 127.0.0.1 --directory dist
```

打开 http://127.0.0.1:8765/ ，点击构建出的 HTML。使用支持 WebGL2 的现代浏览器。通过本地 HTTP 预览，避免各浏览器对 `file://` 下 Worker 等能力的差异。

构建在 `dist/` 中生成 `TouhouGensokyoAtlas-v0.17.html` 这样的版本化 HTML、`SHA256SUMS.txt` 和 `release.json`。后者记录本次输出和输入文件的校验值；它们都不提交到 Git。修改源码后重新构建，浏览器刷新后才会看到修改。

引擎、地图数据和模型资源内嵌在 HTML 内；角色头像与资料链接可能访问外部网站。构建不会自动下载或重新授权这些图片。

## 修改入口

| 文件或目录 | 用途 |
|---|---|
| `project.json` | 当前版本、发布标题、Three.js 版本及建模模块的拼接顺序 |
| `src/index.html`、`src/styles.css` | 页面模板、界面和样式；模板本身不能直接预览 |
| `src/app.js` | 地点选择、导览、界面状态和启动逻辑 |
| `src/animal.js`、`src/animal-renderer.js`、`data/animal.json` | 畜生都市、灵长园内外、历史状态、按区加载和人物来源 |
| `src/higan.js`、`src/higan-renderer.js`、`data/higan.json` | 此岸与彼岸两图、渡舟／花原、人物出处及四项目录入口 |
| `src/world-builder.js` | 基础数学、地形及已有地表区域的程序化建模 |
| `src/heaven.js`、`src/heaven-renderer.js`、`data/heaven.json` | 天界与玄云海的近远景、版本显隐与人物出处 |
| `src/netherworld.js`、`src/netherworld-renderer.js`、`data/netherworld.json` | 冥界几何、春雪／封印状态及人物资料 |
| `src/landmarks.js`、`tools/audit-landmarks.mjs` | 显式地点导航与同源核对报告 |
| `src/makai.js`、`src/makai-renderer.js`、`data/makai.json` | 魔界版本选集、万魔殿内外、封印与历史人物关联 |
| `src/lunar.js`、`src/lunar-renderer.js`、`data/lunar.json` | 月都、静海与梦境独立空间、近远景、资料追加与人物身份 |
| `src/kishinjou.js`、`src/kishinjou-renderer.js` | 辉针城近远景、独立空中定位、局部材质与可逆剖览 |
| `src/old-hell.js` | 旧地狱区域的建模、地点映射与导览镜头 |
| `src/renderer.js`、`src/old-hell-renderer.js` | 渲染、材质、光照与地下专用效果 |
| `src/camera.js`、`src/streaming.js` | 相机操作、区域 Worker、缓存和资源释放 |
| `src/characters.js`、`data/characters.json` | 角色标记与角色资料 |
| `data/atlas.json`、`data/expansion.json` | 地点、来源、关系与扩展建模数据 |
| `assets/packs/*.pack.gz` | 必需的总览和旧场景源资源包，不是可删除的缓存 |
| `vendor/three/` | 固定版本的 Three.js 引擎与上游 MIT 许可证 |
| `preview/` | 少量代表性实景截图，不按每个版本批量归档 |
| `tools/build.py`、`tools/check.mjs` | 构建与发布前集成检查 |

## 维护时必须注意

- 只修改源码和源资源，不修改 `dist/` 中的成品，也不恢复“以上一版 HTML 为输入”的构建方式。旧命令 `tools/build_v017.py` 已由 `tools/build.py` 替代。
- `src/index.html` 中的 `{{...}}` 是构建占位符。新增建模模块时按依赖顺序加入 `project.json` 的 `worldBuilders`；构建自动把同一份代码分别内嵌给主线程和 Worker，不维护两个副本。
- `assets/packs/` 是从原工程分离出的 gzip 压缩二进制包，内部包含 JSON 清单和数组数据。当前构建只校验/内嵌它们，不会从建模代码自动重建总览。修改地形或建筑后，需要分别检查近景和总览；需要更新总览时另行生成对应资源包。
- 地点 ID 是检索、角色关联和导览的连接键。新增或改名时同时核对相关映射；不要删除资料来源，或把标记为 `P` 的工程补完改成官方事实。
- 当前发布版本由 `project.json` 统一决定，格式如 `0.17.0`。末段为零时标签为 `v0.17`，否则如 `0.17.1` 对应 `v0.17.1`。页面标题、版本显示、下载名称由构建填入。数据里的资料版本、区域版本和历史来源说明有独立含义，不要全局替换所有旧版本号。
- 升级 Three.js 时，`three.core.js` 与 `three.module.js` 必须来自同一上游版本，同时更新 `threeRevision` 和许可证。不要让构建临时从 CDN 获取“最新版本”。
- `vendor/three/LICENSE` 仅适用于 Three.js。东方角色、原作图片和引用资料的权利说明见各数据源，本仓库没有因此重新授权它们。

提交前运行构建和检查，再通过浏览器检查地表总览、旧地狱、地点定位及返回地表。检查脚本会拒绝过期成品、部分无效资源、脚本语法错误和被 Git 跟踪的发布 HTML；实际画面仍需要浏览器验收。

## 提交与发布

日常提交维护同一套源码。Git 提交保存修改记录，标签标记正式版本；无需把 `v0.16.html`、`v0.17.html` 等完整副本长期放在主分支。

在线体验跟随 `main` 分支，可能包含尚在打磨的内容。推送后，`.github/workflows/pages.yml` 自动运行构建和检查，将通过检查的 HTML 以 `index.html` 发布到 GitHub Pages；也可在 Actions 中手动运行。仓库 Settings → Pages 的 Source 应保持为 **GitHub Actions**。不要改成从源码分支直接发布，也不要把 `dist/` 或网站成品提交到 Git。构建或检查失败时，本次更新不会发布，可在 Actions 中查看原因。

网站部署与正式 Release 独立：更新网站无需创建标签或覆盖已有附件。Pages 仅上传 `dist/pages/`，临时部署制品保留 1 天；该保留期不影响已上线网站。正式版本仍按以下流程发布。

发布顺序：更新版本与内容 → 构建和检查 → 浏览器验收 → 提交并推送源码 → 创建并推送标签 → 上传本次 HTML 与校验文件。

下面以 `v0.17` 为命令示例。后续发布请按 `dist/release.json` 中的 `tag` 和 `artifact` 替换，不重复使用已发布的标签：

```powershell
python tools/build.py
node tools/check.mjs
git status --short
git add src data assets vendor tools project.json README.md AGENTS.md .gitignore .gitattributes
git commit -m "发布 v0.17 旧地狱全域"
git push origin main
git tag -a v0.17 -m "v0.17 旧地狱全域"
git push origin v0.17
gh release create v0.17 dist/TouhouGensokyoAtlas-v0.17.html dist/SHA256SUMS.txt --verify-tag --title "v0.17 旧地狱全域" --notes-from-tag
```

发布需要 GitHub CLI 已登录且有仓库写入权限。附件使用 ASCII 文件名，避免 GitHub 自动改名后与校验文件不一致。上传时指定本次产物，不使用 `dist/*.html`，避免上传遗留的其他版本。不要移动已发布标签或覆盖 HTML 内容；场景修订后发布新版本。

首次 `v0.17` 标签中的构建工具输出中文文件名，Release 附件已统一为 ASCII 名称，HTML 内容的 SHA-256 相同。当前主分支已直接生成 ASCII 名称，后续版本遵循上述流程。

## 旧版本与仓库体积

本次结构迁移保留初始提交历史，只让完整 HTML 退出当前分支的跟踪。原本地 HTML 可作为个人备份，但不再参与构建；全新克隆无需下载旧 Release，也能独立构建。

`.gitignore` 和普通删除不会清除已经提交的历史内容。当前迁移的作用是停止以后继续累积整包 HTML，不宣称已经清空历史占用。历史重写应作为独立迁移处理，不混入日常发布。

## 项目记忆与接手文档

**最新视觉与空间要求：正常天空、日光和天气下的一整块连续幻想乡大空岛。**岛内保留地区之间的土地、道路、林缘与坡地过渡；虚空只在外围。地下采用可逆剖切或独立空间，不能再改成黑色展厅中的多个独立空岛。

| 文档 | 接手时要了解的内容 |
|---|---|
| [AGENTS.md](AGENTS.md) | 当前维护约定、不可回退的需求、验证与交付边界 |
| [需求与决策记忆](docs/project-context.md) | 用户要求、参考图意图、已否定方案、森林补建与历史交付教训 |
| [当前状态与实现覆盖](docs/current-status.md) | 当前仓库结构、已建地表与地下、维护者新增旧地狱、尚未完成的部分 |
| [世界观、地理与来源](docs/world-reference.md) | 地区关系、22个研究锚点、时代／空间区分、原作与同人出处 |
| [美术与建模规范](docs/art-and-modeling.md) | 场景层次、建筑差异、连接地带、植物、材料、灯光和动态标准 |
| [工程架构与性能约定](docs/engineering.md) | 当前构建链、源资源、按区生成、CPU/GPU回收、渲染与统计口径 |
| [开发、验收与发布流程](docs/development-workflow.md) | 防止地区丢失、当前检查器边界、视觉回归、干净提交和有效交付 |

这些文档保存当前决策与来源，不保存旧版成品合集。需求或实现改变时更新对应章节；不要给每个版本再复制一套文档。修改了 `docs/` 时，将本轮实际变更的文档一并加入提交。
