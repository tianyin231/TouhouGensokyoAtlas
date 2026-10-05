# 无名之丘坡鞍：提交成本未通过的隔离审阅

本分支从文档主线504808e建立，运行前驱仍为已部署6a27bb4／HTML402224fe。准确候选源码87096ff3、project d9ae63c及独立检查器73b1229冻结；203项构建输入对应HTMLaa4519cd。**这是未达到发布门槛的候选，不合入本审阅祖先，也不代表无名之丘完成。**

候选直接形成完整宽鞍和坡脚，保留路线XY、原株身份及XY、风岩石座、已交付太阳花田。公共检查19/19、CLI0；root与Astra实际逐对审阅七组原图，仅接受宽鞍与路面支撑的局部收益。裸地、原树冠／疏密、齐整花缘仍未精修；背向中段道路被新肩遮挡，不能称完整路线从背面可见。更早V1源码0dff69dc的16/19原失败保留于独立审阅3cceacb，本分支不覆盖它。

| 原同机位全景 | 当前宽鞍候选 |
|---|---|
| ![原全景](previews/flower-hill-cost/before-saddle.png) | ![候选全景](previews/flower-hill-cost/candidate-saddle.png) |

| 原背向视角 | 当前背向候选 |
|---|---|
| ![原背向](previews/flower-hill-cost/before-reverse.png) | ![候选背向](previews/flower-hill-cost/candidate-reverse.png) |

原七图成本检查保持CLI1：背向稳定帧139→140次调用、660107→668571提交三角，**+8464超过预设+4000**。低档和夜间图已拍并审阅，原始计数已保存，但顺序成本断言在背向失败后未抵达它们。不能把这次采集记作全通过。

随后仅重放既有相机前序，各一次基线／候选实际绘制追踪，均精确复现每帧计数与wanted/LOD历史，没有重拍七图。8464已闭合归属：两组原树各因真实接地后距离变化而正常切到近档，各+1158三角、不增加调用；唯一新增调用是`flowerlands:nameless:lily:0:-39:35`，212株×29个远档三角=6148。其余实际提交批次的调用和三角不变。

该铃兰批始终为远档，缓存球与按当前原型重算的球逐值一致，排除了本批沿用旧LOD包围球的解释。真实视锥右侧平面的球余量从−0.17870米到+0.20676米；这只证明保守球与视锥相交，尚不证明212株的实际顶点可见。后续有界Nameless原生成对检查将验证实际顶点、着色器摆动范围和保护对象，本检查点不预写它的结果。保持树木细节、接地、身份和原4000预算，不以固定远档、改相机或删花过关。

唯一新增持久源backing484008B，含contact和originalContact各118728B；静态far地形+3775三角，0新绘制记录／贴图。源缓冲与实际提交量分别计数，未把前者通过当作后者通过。所有浏览器证据使用SwiftShader，不代表实体FPS或显存改善。

准确源绑定、原CLI、全部三帧计数、图审和实际draw归属见[精简证据](flower-hill-cost-evidence.json)。普通说明见[候选说明](flower-hill-candidate.md)。完整两bank原生保护、真实交互／卸载重入、完整Node和此候选CI／部署均未完成；不要复用前驱太阳花田的通过冒充本候选验收。

恢复先用仓库正常构建得到203项／HTMLaa4519cd，再检查已保存的原失败。原七图协议为[准确采集脚本](../tools/capture-flower-hill-cost-review.py)与[机位规格](../tools/flower-hill-cost-review-views.json)，三帧显式绘制及GPU finish仅用于构图和计数。实际追踪的[原脚本](../tools/trace-flower-hill-cost-review.py)仍保留执行时的绝对父协议路径及SHA；若换环境复现，先把准确采集脚本放到它声明的`/workspace/flower-hill-evidence/capture-views.py`。路径适配后的新协议必须另记散列，不冒称原执行。
