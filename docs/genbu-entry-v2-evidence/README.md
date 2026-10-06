# 玄武涧南口 V2：拒收评审归档

这不是可合并的成果分支。原生南口终柱、桥口和来路有可见收益，但 V2 在低位与背向复核时暴露折皱岸面和平片水尾，根代理与作者共同拒收。停止同类 V3，也未执行 B 批、连续 LOD、交互／卸载重入、完整 Node 或候选发布。不要将运行 CLI 0 解释为美术通过。

本分支从已交付 `b9ff4a369080e861027966c13d071d08716a1348` 独立建立，主线后续 `5f30bca` 只有文档更新。原 V1 仍保存在远端 `experiment/genbu-entry-v1-review-20261005`／`623442588cc580767fc3ed57f021c188dae4ac26`，未覆盖、未改写。这个 V2 分支也不能整分支合入 main。

- 精确候选 [源码](../../src/genbu-entry.js) SHA `dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544`，project SHA `1e816ddf9d81b8508c210982170442b11f9eaab56b7558a5d0482fb62bec2148`。
- 候选 209 输入／HTML `5480b1a3cca167bc49a1e20fe3f6601e9077bfc725f28f5eeee0e9332d2d4bbd`；基线 208 输入／HTML `c5327ca02eb542ea4f5816e445d4e1720628626bab01f39e9558cbefedc5286a`。完整输入绑定见 [candidate-release](binding/candidate-release.json) 和 [baseline-release](binding/baseline-release.json)，不归档 HTML／dist／V8。
- [候选说明](../genbu-entry-candidate.md) 保留作者失败链、局部修复、未测项；[新表示纸面诊断](../genbu-entry-method-diagnosis.md) 尚未实施。

## 原图与原协议

六张 PNG 是原始截图，未裁剪、重绘或用生成图替代。

| 固定机位 | 基线 | V2 | 结论 |
| --- | --- | --- | --- |
| 原 genbuOverview | [原图](images/baseline-overview.png) | [原图](images/v2-overview.png) | 限定全景收益，曾允许进入补充门。 |
| frontLow | [原图](images/baseline-frontLow.png) | [原图](images/v2-frontLow.png) | 新岸面折皱与水尾平片感，拒收。 |
| reverse | [原图](images/baseline-reverse.png) | [原图](images/v2-reverse.png) | 桥口显露，但床岸承托仍不足，拒收。 |

各图同机位实际均 +0 calls／+612 提交三角／+79320 B 几何属性／0 新几何／0 新纹理。软件后端未测硬件 FPS；执行可能与轻量 CPU 诊断重叠，耗时不用来比较提速。

[overview 协议](protocols/capture-overview.py)、[A 协议](protocols/capture-view-A.py)、[A 固定参数](protocols/view-A-spec.json) 原样保存。`captures/` 保存四次原报告及执行绑定；`art/` 保存按时间形成的原审阅，最终状态以 [root A 拒收](art/root-view-A-review.json) 为准，不能把早先 overview 的局部门通过当最终接受。协议中的执行工作区绝对路径有意保留以核对原运行；复现需从绑定输入重建，不能假装这些私有 dist／V8 一并提供。

## 技术证据与停止点

[作者 06](checks/author-prepare-06.json) 为复用已保存原包的 8/8 检查，[seams06](checks/author-seams-06.json) 为 5/5；均不是新的完整 Worker 构建或独立回归。长期新增源 598212 B，构建期 contact 副本 203616 B 单列。真实两次浏览器观察的 native 源为 6293376 B，原始为 6278784 B；V8 slab 的绝对 byteCount 不能当生产驻留。

独立原 V1 法线 [CLI 1](checks/independent-v1-road-normal.json) 与 V2 [局部摘要](checks/independent-v2-same-road-edge-summary.json) 均保留：22 原失败面已同向，819 支撑样点不变，但额外“整个四条地形数组不变”守卫被授权的 V2 岸床变化触发，整体仍为 3/4 CLI 1。摘要明确省略的逐点数组和原报告 SHA，原大报告未改写。

停止后的[唯一近岸离线诊断](checks/independent-v2-west-bank-folds-summary.json)证实真折坡与法线失配并存：同一 4 m 西岸边的折角约 8.64°→59.91°、端点无缝；一侧面法线最大偏差约 5.34°→51.09°。两片新增零面积面另外列出，原跑／续跑均保留严格 CLI 1。累计墙钟 1.861 s，0 hooks／native／GPU；没有为拒收候选启动新回归或根据微片角度声称可见孔洞。

**独立完整候选检查未完成。** [最终账本](checks/independent-v2-source-final-ledger.json) 是读取入口：首跑因已接受模块的运行计时字段得到 CLI 1；修订在美术停止后 SIGTERM，wrapper CLI -15，Genbu hook 未证明完成、native 0。`independent-v2-source-02.json` 的中途 `passed:true` 不能当通过，必须连同执行 JSON 和最终账本阅读。精确原协议和原报告均保存，未放宽几何、资源或验收断言。

`unaccepted-integration/` 只保存根代理尚未验收的 Flower 登记适配补丁和九条轻探针，未应用到本分支运行工具、未更改 fixtures、未执行完整 Flower／Node。保存它是恢复线索，不是新成果。

最终文件清单与散列见 `archive-manifest.json`。本次归档没有重跑构建、GPU、native 或长回归；只核文件绑定、文档链接、Git 差异后普通提交与推送。
