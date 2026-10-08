# 场景配乐与试听

这是《幻想乡立体风物志》的东方 Project 同人改编配乐。原作音乐由 ZUN／上海アリス幻樂団创作；场景绑定与改编意图属于本项目创作，不表示这些原曲原本就是对应地图的环境 BGM。

## 首首样曲：博丽神社 · 暮色绮想

- [试听／下载 MP3](../assets/music/hakurei-dusk.mp3) · [循环 OGG](../assets/music/hakurei-dusk.ogg) · [MIDI](../music/midi/hakurei-dusk.mid) · [可编辑 XSXB 工程](../music/scores/hakurei-dusk.json)
- 80 BPM，D 小调，32 小节，循环长 96 秒。钢琴引入 → 长笛主题 → 钢琴回应 → 低八度长笛变奏 → 稀疏回转。
- 原曲：《少女綺想曲 ～ Dream Battle》，《東方永夜抄 ～ Imperishable Night.》（2004），音乐室第 9 曲、博丽灵梦主题。资料：[原作 Music Room 文字转录](https://en.touhouwiki.net/wiki/Imperishable_Night/Music)、[4A 剧本转录](https://www.thpatch.net/wiki/Th08/Magic_Team%27s_Scenario/en)。因灵梦与博丽神社的关联选曲；这里是游览用的舒缓再编曲。
- 记谱参考：Hisaraito 的同人 MIDI，来自 [Touhou MIDI Collection](https://github.com/AyHa1810/touhou-midi-collection)，固定提交 `5a11a0a184102aa28ea85605e20a678fe68ea42e`。该库的 [Usage Policy](https://github.com/AyHa1810/touhou-midi-collection#usage-policy) 允许使用／修改并要求署名；本作不使用标注为 ZUN 的游戏原始 MIDI。参考文件路径、SHA-256、轨号、节拍范围及提取旋律在 [source-motifs.json](../music/source-motifs.json)。
- 改编：主题下降半音，重新写室内乐和声、低音、竖琴分解与弦乐内声；调整句尾呼吸、力度、声像和混响；没有搬用原曲录音或整段同人伴奏。

## 真实采样的含义与来源

使用用户指定的 [XSXB-Band skill](https://github.com/sparklecatta-lang/XSXB-Band/blob/ff39f88e6c28fefa2f7b1bebe2eee41a00b761ee/skills/xsxb-band/SKILL.md)，以其原生采样播放引擎渲染。**这是由真实乐器录音采样演奏乐谱的成品，不是本次请真人乐手合奏录制。**没有使用振荡器替代缺失乐器，没有调用付费音乐生成服务。

| 乐器 | 录音库与固定版本 | 许可 |
|---|---|---|
| 立式钢琴、长笛、小提琴组、大提琴组 | [Versilian Studios / VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e) | [CC0](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE) |
| 音乐会竖琴 | [Versilian Community Sample Library](https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e) | [CC0](https://github.com/sgossner/VCSL/blob/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/LICENSE) |

原始采样只存于工作室 `data/samples/`，不加入本项目。采样逐文件地址、大小与校验来自 XSXB-Band 固定版本的 `public/library.json`；渲染器检查下载散列。发布的 OGG／MP3 是本项目的混音成品。CC0 音源许可不改变东方原曲权利；遵守 [东方二次创作指南](https://touhou-project.news/guideline/)。

## 制作与复现

工作室独立安装于 `/workspace/XSXB-Band`，本机会话地址 `http://127.0.0.1:4318`，歌曲库 ID `atlas-hakurei-dusk`；该本机地址不是互联网试听地址。

```sh
python tools/music/compose.py
node /path/to/XSXB-Band/skills/xsxb-band/scripts/render.mjs \
  --studio /path/to/XSXB-Band --project music/scores/hakurei-dusk.json \
  --out /path/to/new-export --stems --browser /path/to/chromium
python tools/music/master.py /path/to/new-export hakurei-dusk
```

编谱只依赖 Python 标准库；母带脚本需要 NumPy 和 FFmpeg。XSXB-Band 需要 Node 22.12+ 与 Chromium。MIDI 是音符数据，外部 MIDI 播放器的音色不能代表 WAV／MP3 成品。

保留 `mix.wav`、五条分轨和原始报告；母带输出 `listen.wav`（自然尾音）、`loop.wav`（96 秒）、`loop-twice.wav`（连续两轮，供听接缝）。循环把自然混响尾音叠回开头，不删拍或对整曲反复淡出。音量采用固定增益，未以极限压缩追求响度。

## 验收状态

[技术报告](../music/reports/hakurei-dusk.json) 记录分轨电平、削波、真峰值、响度、边界样本差及文件散列。第 1 版大提琴偏强、钢琴偏弱，依据分轨数据调整后重新渲染；原始试稿仍留在工作室，不替换成已听通过记录。

**尚待实际听辨，不声明音乐质量已验收。**请检查：约 12 秒处长笛主题是否可辨认；36 秒起钢琴能否接住主旋律；60 秒起低音区变奏是否清楚；重复听三轮是否疲劳；96 秒循环处是否突兀。数值通过不能证明这些项目通过。

项目基线：`2a5ac93`。配乐分支：`audio/xsxb-scene-bgm-20261008`，工作区 `/workspace/atlas-music`；并行 UI 工作区与主分支保持独立。
