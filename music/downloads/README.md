# 配乐试听包下载

[下载完整试听 ZIP](touhou-music-review-154fbb1.zip)（16,435,006 字节，约 16.44 MB）。在 GitHub 文件页点击 **Download raw file**，或通过本分支拉取文件。

这是已有提交 `154fbb18309c9193b219bf501965117116334790` 的现成试听包，按用户要求复制到配乐分支交付；未重新编曲、渲染或压缩。包内包含全部 10 首 MP3、10 份 MIDI、10 份 XSXB JSON 乐谱、逐曲技术报告及曲目／音源来源，共 46 个文件。OGG 另见仓库的 `assets/music/`。

ZIP SHA-256：`1717b1dc1cc0f32435788d1ef7589a77fe434875da8ae4b63285e8bfecd1039b`。

代表曲是最终循环处理后的 [博丽神社 · 暮色绮想 MP3](../../assets/music/hakurei-dusk.mp3)，96 秒，2,082,476 字节；SHA-256：`1714e0521b386115a76cbafa42dd1098f5907764d7030b363fb49b8bcc3b8319`。它与较早的 `f19e2dd` 试听文件散列不同。

这批音乐由真实乐器录音采样渲染，并非真人合奏录音。**音乐实听仍待验收**，首曲中段四小节和声循环的重复疲劳仍是试听重点。

原作曲、社区记谱者、参考固定版本与音源出处见 [配乐说明](../../docs/music.md)。合集维护者允许修改署名，不等于原记谱者授权链已经核实；转载说明和泛化版权文本不构成完整许可。发行前仍需核对原作者许可或改用独立记谱，不声明已经完全清权。本次仅将现有试听稿交付到指定配乐分支，不合并主分支、不部署或创建正式 Release。

首次下载到本地可使用独立目录：

```sh
git clone --single-branch --branch audio/xsxb-scene-bgm-20261008 https://github.com/tianyin231/TouhouGensokyoAtlas.git TouhouGensokyoAtlas-music
```

已有仓库且不希望切换当前工作区时，在该仓库中执行：

```sh
git fetch origin audio/xsxb-scene-bgm-20261008
git worktree add --detach ../TouhouGensokyoAtlas-music FETCH_HEAD
```

两种方式的目标目录均应尚不存在。进入新目录后，试听包位于 `music/downloads/touhou-music-review-154fbb1.zip`，单曲位于 `assets/music/`，MIDI 与乐谱位于 `music/midi/`、`music/scores/`。
