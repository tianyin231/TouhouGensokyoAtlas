# Flower独立审阅提交

本分支从已接受`6a27bb46…`建立，只保存Flower源`2fde1ae2…`、独立checker`7f22d62f…`、Solar→Flower project及限定宽鞍阶段说明。公共集成工具与fixture由root独立处理，本分支不是完整部署集成。主线只选择已验证文件，不合并旧候选祖先。

完整SHA、原始失败状态、未测项与复制文件散列见[binding.json](binding.json)。[view-deltas.json](view-deltas.json)绑定单区203／`da10025a…`的原七机位实测；`capture-views.py`和`views-spec.json`是当次准确协议。共用状态助手为仓库`tools/check-sunflower-browser.py`、SHA`ec5aa635…`。这轮截图显式绘制用于图审和确定性提交计数，不作为生产交互CPU或FPS测量。

[native-three-builds.json](native-three-builds.json)保存实际三个原生构造的原报告：Nameless10/10，Sunflower原6/7及CLI1。`run-native-three-builds.mjs`是实际执行脚本；[derived-normal-guard.json](derived-normal-guard.json)与`check-derived-normal-guard.mjs`仅在已存完整两包上证明四角点严格派生法线3/3、CLI0，没有重构或覆盖原失败。临时V8不上Git，其值散列和路径在原报告内。序列化backing身份不能替代真实资源所有权账目。

[lifecycle-pair.json](lifecycle-pair.json)保存202基线与208 Solar→Muen→Flower组合的生产协议`d6089e3b…`结果：两侧各20/20、CLI0，完整前后release inputs、source／资源／程序／相机／LOD／PNG恢复、owned释放和原始CPU观测。203截图和208组合是不同产物，工具prefix也不同；不得把这里208成功当作本checkout完整Node通过。组合锚点总+5calls／−360tri包含两阶段，未采逐draw清单，不伪称组合≤4或优化。完整Node仍由root执行；此提交不预写远端CI／部署成功。

V1原16/19、870背向+8464超预算和原生5/9、两个道路侧移方法失败、首个原生协议4-record误计、三个实际构造的Sunflower6/7均保留其CLI1。V1与870准确源码／失败报告已在`3cceacb0…`和`e883a332…`隔离提交；本分支不引入其祖先。原始大报告与未加工全套PNG保存在`/workspace/flower-hill-evidence`，Git仅含精简证据和四张必要预览。

两份美术记录分别为root与GPT-6 Astra Max的实际逐对审阅原件；写入时的待测状态保留，后来的生命周期终态另外记录。裸地、花缘、原树冠和林下疏密仍待精修。脚本历史绝对路径用于还原执行链，不能当作任意checkout的一键CI入口。后续复现应新建输出并绑定实际输入，不能覆盖旧失败。
