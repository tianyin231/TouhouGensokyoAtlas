# 场景配乐与试听

这是《幻想乡立体风物志》的东方 Project 同人改编配乐。原作音乐由 ZUN／上海アリス幻樂団创作；场景绑定与改编意图属于本项目创作，不表示这些原曲原本就是对应地图的环境 BGM。

现成完整试听包已保存为 [touhou-music-review-154fbb1.zip](../music/downloads/touhou-music-review-154fbb1.zip)，包含 10 首 MP3、MIDI、JSON 乐谱及来源记录。[下载与本地拉取说明](../music/downloads/README.md)附文件散列。本次仓库交付保留原音频字节，不重新渲染。

## 第一首试听：博丽神社 · 暮色绮想

- [试听／下载 MP3](../assets/music/hakurei-dusk.mp3) · [循环 OGG](../assets/music/hakurei-dusk.ogg) · [MIDI](../music/midi/hakurei-dusk.mid) · [可编辑 XSXB 工程](../music/scores/hakurei-dusk.json)
- 80 BPM，D 小调，32 小节，循环长 96 秒。钢琴引入 → 长笛主题 → 钢琴回应 → 低八度长笛变奏 → 稀疏回转。
- 原曲：《少女綺想曲 ～ Dream Battle》，《東方永夜抄 ～ Imperishable Night.》（2004），音乐室第 9 曲、博丽灵梦主题。资料：[原作 Music Room 文字转录](https://en.touhouwiki.net/wiki/Imperishable_Night/Music)、[4A 剧本转录](https://www.thpatch.net/wiki/Th08/Magic_Team%27s_Scenario/en)。因灵梦与博丽神社的关联选曲；这里是游览用的舒缓再编曲。
- 记谱参考：Hisaraito 的同人 MIDI，来自 [Touhou MIDI Collection](https://github.com/AyHa1810/touhou-midi-collection)，固定提交 `5a11a0a184102aa28ea85605e20a678fe68ea42e`。该库维护者的 [Usage Policy](https://github.com/AyHa1810/touhou-midi-collection/blob/5a11a0a184102aa28ea85605e20a678fe68ea42e/README.md#usage-policy) 允许使用／修改并要求署名；**这不等于原记谱者授权链已经核实**。合集注明转载，原 MIDI 中泛化的版权文本不能作为完整许可。本批参考保留来源、固定版本和作者署名，原记谱者许可仍待核实；发行前应核对原作者许可或替换成独立记谱，不宣称已完全清权。本作不使用标注为 ZUN 的游戏原始 MIDI。参考文件路径、SHA-256、轨号、节拍范围及提取旋律在 [source-motifs.json](../music/source-motifs.json)。
- 改编：主题下降半音，重新写室内乐和声、低音、竖琴分解与弦乐内声；调整句尾呼吸、力度、声像和混响；没有搬用原曲录音或整段同人伴奏。

## 本批曲目

共 10 段、8 首原曲、12 分 39 秒。表中每首有 MP3 试听；同名 MIDI、XSXB JSON 乐谱与技术报告分别位于 `music/midi/`、`music/scores/`、`music/reports/`。[曲目清单](../music/catalog.json) 保存逐曲出处链接、参考记谱者、改编方式、循环长度与音频校验值。

| 场景／事件与试听 | 东方原曲 | 出处与选择理由 | BPM／秒 |
|---|---|---|---|
| [神社 · 暮色绮想](../assets/music/hakurei-dusk.mp3) | 少女綺想曲 ～ Dream Battle | 永夜抄 · 灵梦主题，钢琴与长笛的神社游览版 | 80／96 |
| [神社 · 月下绮想](../assets/music/hakurei-night.mp3) | 少女綺想曲 ～ Dream Battle | 同主题夜景版，双钢琴声部、稀疏低弦 | 66／116.36 |
| [森林 · 木偶与苔径](../assets/music/forest-dolls.mp3) | 人形裁判 ～ 人の形弄びし少女 | 妖妖梦 · 爱丽丝主题，钢琴、拨弦弦乐与长笛 | 92／62.61 |
| [山川 · 溪光行旅](../assets/music/mountain-stream.mp3) | 神々が恋した幻想郷 | 风神录 · 第三面道中，山溪长笛与流动竖琴 | 88／65.45 |
| [永远亭 · 竹间月影](../assets/music/bamboo-moon.mp3) | 竹取飛翔 ～ Lunatic Princess | 永夜抄 · 辉夜主题，竹林静景中的长笛与疏落竖琴 | 72／80 |
| [红魔馆 · 绯色回廊](../assets/music/scarlet-evening.mp3) | 亡き王女の為のセプテット | 红魔乡 · 蕾米莉亚主题，钢琴、拨奏大提琴和错拍弦乐 | 84／68.57 |
| [白玉楼 · 封樱余雪](../assets/music/nether-sakura.mp3) | 幽雅に咲かせ、墨染の桜 ～ Border of Life | 妖妖梦 · 幽幽子主题，弓弦旋律与钢琴回应 | 76／75.79 |
| [西行妖 · 花苞之兆](../assets/music/nether-bloom.mp3) | 幽雅に咲かせ、墨染の桜 ～ Border of Life | 同主题花苞事件版，提高速度、增加真实跳弓脉冲 | 100／57.6 |
| [旧地狱 · 遗落的摇篮](../assets/music/hell-lullaby.mp3) | 廃獄ララバイ | 地灵殿 · 第五面道中，以废弃旧地狱的寂寥为改编意象 | 68／84.71 |
| [花田演奏会 · 幽灵三重奏](../assets/music/flower-concert.mp3) | 幽霊楽団 ～ Phantom Ensemble | 妖妖梦 · 普莉兹姆利巴三姐妹主题，演出事件中的小号／钢琴／拨弦接力 | 112／51.43 |

扩展曲目的旋律参考分别署名 hisaraito（Version 2）、rongns_2、Hisaraito、sweetmusic、akira，具体文件路径、固定提交、SHA-256、提取轨号与节拍范围见 [scene-motifs.json](../music/scene-motifs.json)。这些是社区记谱参考，未将其当作原作录音或完整官方乐谱；伴奏、音区、速度、奏法与声部分配重新编写。上述原记谱者授权链尚未核实的限制适用于全部参考，不能以重新编曲或 CC0 乐器采样替代记谱来源许可的核对。

场景绑定是本项目二创：例如《神々が恋した幻想郷》也用于全岛巡游，演奏会引用《幽霊楽団》，不表示原曲在东方原作中属于这些具体机位。当前没有给全部 179 个目录地点配曲。魔理沙宅和未配曲的独立世界会淡出音乐，界面明确显示“此场景暂未配曲”。

## 项目播放与试听入口

构建后在设置面板点击“开启配乐”。默认不自动播放，不记住开启状态；仅记住音量。切换场景使用约 1.8 秒交叉淡化，神社夜景和西行妖花苞事件有独立版本；太阳花田演出仅在该区域的演出开关开启时播放。雨天与夜间对高频作轻微衰减。关闭配乐立即释放声源，页面隐藏时暂停 AudioContext，解码缓存最多保留两首，不驱动地图重绘。

运行 `python tools/music/build-review.py` 生成可直接打开的 `dist/music-listening.html` 与 `dist/touhou-music-review.zip`。前者嵌入全部 MP3、提供逐曲循环播放器；后者含 MP3、MIDI、可编辑乐谱、报告及来源记录。该试听页不依赖本机工作室服务。完整项目 HTML 同样内嵌 MP3；原有联网人物资源不因此变成离线。

## 真实采样的含义与来源

使用用户指定的 [XSXB-Band skill](https://github.com/sparklecatta-lang/XSXB-Band/blob/ff39f88e6c28fefa2f7b1bebe2eee41a00b761ee/skills/xsxb-band/SKILL.md)，以其原生采样播放引擎渲染。**这是由真实乐器录音采样演奏乐谱的成品，不是本次请真人乐手合奏录制。**没有使用振荡器替代缺失乐器，没有调用付费音乐生成服务。

| 乐器 | 录音库与固定版本 | 许可 |
|---|---|---|
| 立式钢琴、长笛、小提琴组、大提琴组、小号 | [Versilian Studios / VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e) | [CC0](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE) |
| 音乐会竖琴 | [Versilian Community Sample Library](https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e) | [CC0](https://github.com/sgossner/VCSL/blob/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/LICENSE) |

原始采样只存于工作室 `data/samples/`，不加入本项目。[音源清单](../music/sample-provenance.json) 记录最终渲染实际用到的 93 个录音文件的原始地址、大小、SHA-256、使用曲目与许可；已核对本机文件散列。发布的 OGG／MP3 是本项目的混音成品。CC0 音源许可不改变东方原曲权利；遵守 [东方二次创作指南](https://touhou-project.news/guideline/)。

## 制作与复现

工作室独立安装于 `/workspace/XSXB-Band`，本机会话地址 `http://127.0.0.1:4318`，歌曲库 ID `atlas-hakurei-dusk`；该本机地址不是互联网试听地址。

```sh
python tools/music/compose.py
python tools/music/compose-scenes.py
node /path/to/XSXB-Band/skills/xsxb-band/scripts/render.mjs \
  --studio /path/to/XSXB-Band --project music/scores/hakurei-dusk.json \
  --out /path/to/new-export --stems --browser /path/to/chromium
python tools/music/master.py /path/to/new-export hakurei-dusk
python tools/music/catalog.py
python tools/build.py
node tools/music/check-player.mjs
node tools/check.mjs
python tools/music/build-review.py
```

扩展曲目依次用同一渲染命令更换 `--project`、`--out` 和母带脚本的曲目 ID。编谱只依赖 Python 标准库；母带脚本需要 NumPy 和 FFmpeg。XSXB-Band 需要 Node 22.12+ 与 Chromium；本项目既有几何回归应使用 Node 22。浏览器音频回归另需 Python Playwright，在 `dist/` 开本机 HTTP 服务后运行 `python tools/music/check-browser.py --url http://127.0.0.1:8788`。MIDI 是音符数据，外部 MIDI 播放器的音色不能代表 WAV／MP3 成品。

工作室 `exports/` 保留逐曲 `mix.wav`、五条分轨和原始报告；母带输出 `listen.wav`（自然尾音）、`loop.wav`（整小节循环）、`loop-twice.wav`（连续两轮，供听接缝）。循环把自然混响尾音叠回开头，再作 5 毫秒边缘消点击，不删拍。音量采用固定增益，未以极限压缩追求响度。最终导出目录：首曲 `hakurei-v2`；森林、山川、封樱、花苞、演奏会使用相应曲目 ID 加 `-v2`；其余使用曲目 ID。重渲染应另选空目录。

## 验收状态

[技术报告](../music/reports/hakurei-dusk.json) 记录分轨电平、削波、真峰值、响度、边界样本差及文件散列。10 首循环 WAV 均为约 -21 LUFS，真峰值 -8.4 至 -4.0 dBFS，零饱和采样帧；这是技术裕量，不是响度／音色的听感结论。首曲和五首扩展版依据分轨电平重新调整了主旋律与伴奏比例；原始试稿仍留在工作室，不替换成已听通过记录。全部 10 份乐谱已验证可以逐字节重生成，并通过工作室保存、回读核对。

**尚待实际听辨，不声明音乐质量已验收。**请检查：约 12 秒处长笛主题是否可辨认；36 秒起钢琴能否接住主旋律；60 秒起低音区变奏是否清楚；重复听三轮是否疲劳；96 秒循环处是否突兀。首曲中段 24 小节共用四小节和声循环，须重点判断重复疲劳，不能仅凭配器轮换视为已解决。数值通过不能证明这些项目通过。监督者已独立核对首曲文件散列、96 秒解码、约 -21 LUFS 以及主题 MIDI 与成品旋律对应；这仍不表示听觉验收完成。

本批用于试听与技术集成，未经用户要求不合并到主分支，不创建正式发布或部署。

首曲最初交付保留在提交 `f19e2dd`。本批对它仅追加 5 毫秒循环边缘消点击处理，旋律、和声与 MIDI 未改，MP3／OGG 文件散列因重新编码而改变；旧文件与本批文件的散列不能混用。

浏览器验证使用 Chromium 原生 Web Audio：10 首均实际解码，并经过场景入口切换，验证输出信号、音量、关闭释放、未配曲场景淡出、两首缓存上限、原生音频上下文暂停恢复及跨循环边界渲染。测试暂停了地图帧循环以隔离软件 GPU 开销，不能据此宣称地图性能或画面验收。5 项自动播放器测试（含过期解码竞态）及 Node 22 项目完整回归通过。10 份最终渲染输入、MIDI 音高／起点与保存乐谱对应；构建可重现且全部 221 项输入散列吻合。[验证记录](../music/validation.json)保留具体结果。

试听页经本机 HTTP 加载后禁用网络，原生播放器进度正常，切换曲目会暂停上一首；ZIP 逐项散列和完整性通过。受本次浏览器策略限制，未验证直接以 `file:` URL 打开页面的路径。完整 HTML 因内嵌 MP3 增加约 20.8 MiB；播放时至多缓存两首解码音频，切换淡化期间旧声部短暂保留。本次没有作音频开启前后的整机性能验收。

项目基线：`2a5ac93`。配乐分支：`audio/xsxb-scene-bgm-20261008`，工作区 `/workspace/atlas-music`；并行 UI 工作区与主分支保持独立。
