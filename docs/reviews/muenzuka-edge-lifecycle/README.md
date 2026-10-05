# Muenzuka 生命周期精简证据

实际先运行202原版，再运行204候选，各一个浏览器会话。基线22／22、候选24／24，均CLI0；不是沿用Solar历史成绩。

`evidence.json`保存全部原始检查状态和必要数据、两份完整release输入、源／协议／报告SHA、六项资源计数、独占GPU释放、相机／wanted／LOD／程序精确恢复、PNG相同证明及未经改写的CPU观测。两份约16MB原始报告仍分别保留在`/workspace/muenzuka-evidence/baseline-native`与`/workspace/muenzuka-evidence/candidate-native`，本包没有复制原报告或构建HTML。

`check-native-draft.py`、`native-source-probe.js`及`tools/check-sunflower-browser.py`均为实际执行版本的逐字节副本；`native-protocol-preparation.json`为事前审阅清单。脚本中的历史绝对路径和命令对应本次证据，不是干净checkout的一键CI入口。未来运行应另建输出目录并重新绑定实际源，不能覆盖原报告。

两版各22个原生独占GPU几何全部释放。候选主线程四份近远缓存共287712B保持，其中248832B近档未驻留GPU；实际六组native和两组cold球包络通过。每会话包含一次比较用卸载重入；交互前置和复位使实际Worker构造数为3。

未改协议、生产源、画质、LOD阈值或资源／PNG容差。软件渲染和可能重叠的轻量CPU诊断使时长不能作提速比较；本包不证明硬件FPS、物理显存、最终GC时刻、长会话稳定性或连续LOD穿越。完整集成Node、最终CI／部署另外核验。
