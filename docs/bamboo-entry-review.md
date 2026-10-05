# 竹林入口冠叶候选（未验收）

基于已验收主线 `261d5bfff5388cbf8192dbfd43445daf49183636`。2026-10-05首稿被拒收，独立分支仅保存可复核试稿，禁止将本提交作为已完成画面合入main。Astra Max负责构形，Sol Max负责独立CPU检查；真实截图来自云端Chromium151／SwiftShader，不含硬件FPS测量。

## 范围与保护

只替换原生 `3:8`、`4:8`、`3:9`、`4:9` 四个96米格中的807株竹子冠叶及侧枝。24条原记录、实例矩阵、颜色、材料、LOD距离、批边界、主竿前缀、原道路与建筑保持；900株冷总览代理与原生13488株并非一一对应，本候选未替换冷总览。

预算为新增draw calls／纹理0，每株近档不超过原1945三角、远档不超过原111三角，新增共享源驻留不超过0.6MiB。预算通过不是画面通过。

## V1实际结果：拒收

[原版入口](previews/bamboo-entry/before-entry.png) → [V1同机位](previews/bamboo-entry/v1-entry.png)。相机eye `[457,70.8,754]`、target `[411,73,845]`、FOV49，1280×720／DPR1、balanced、晴天12.5、AO开，动态／人物／标签／泛光／反射关。两侧都按 `bambooOverview → bambooEntry` 顺序进入，保持LOD历史一致。

V1将羽片式枝叶改为曲枝和窄叶，但近景冠层明显变稀，呈细杆上的小伞状叶簇，与右侧旧冠层形成断层。三变体近档叶面真实面积仅为原26.3%—26.8%；入口单批74实例的裁视锥后三角投影面积和为原51.27%，这是重叠累加，不能称覆盖率。独立近远连接探针CLI1：近80叶全部连接，远43叶中40个根部距真实竿／枝超过0.05米，最大约2.947米。失败原报保留，未放宽断言。

同机位入口实测：541 calls不变，三角1,857,369→1,712,470，属性驻留9,800,448→10,254,696B，几何136→148，纹理11不变；全景1637 calls不变，三角2,841,711→2,840,904，属性68,086,266→68,121,906B，几何737→743，纹理11不变。新共享源454,248B，近每株1292、远110三角。减少三角没有换来画面提升，不宣称FPS提高。

精确源／产物散列、协议与结论见[v1-review](evidence/bamboo-entry/v1-review.json)，实际帧见[v1-render](evidence/bamboo-entry/v1-render.json)与[baseline-render](evidence/bamboo-entry/baseline-render.json)。[连接失败](evidence/bamboo-entry/v1-leaf-connection-failed.json)、[叶面积诊断](evidence/bamboo-entry/v1-leaf-area.json)分别保存原输出。

仅执行构建、实际全景／入口两张图、两次有界CPU探针及一次完整有界候选checker。该checker用时5.81秒、23项中20项通过，仅三个变体的远叶连接失败，原CLI1及[失败报告](evidence/bamboo-entry/v1-independent-failed.json)保留。原记录身份、807矩阵和颜色、LOD、主竿、真实实例边界和路径净空、冷包及bytes核算均通过。完整Node22、昼夜／低档／背面、CPU交互、加载卸载重入、CI与部署均未运行。当前截图唯一HTTP404已定位为 `/favicon.ico`；历史报告未分类项不追认。

两个探针当时以inline JS执行，未在运行前绑定脚本SHA；按实际调用原文保存到 `tools/experiments/bamboo-entry/` 供重现，不冒称预先冻结的脚本。完整候选checker实际SHA为 `ca02be885b9b8d0e8126b339e3d64fa09120e15f9daa1f64a7f0a3662ff8773e`。

## V2补查：近枝有收益，低画质拒收

[原版入口](previews/bamboo-entry/before-entry.png) → [V2入口](previews/bamboo-entry/v2-entry.png)有可保留的近枝叶束和梢叶变化；背面近档也成立，夜景未发现新增异常。但[原版低档](previews/bamboo-entry/before-low.png) → [V2低档](previews/bamboo-entry/v2-low-rejected.png)暴露了远档表示问题：合并束变成宽大的实心三角／菱形片，窄竹叶辨识变差。本稿整体仍未验收，不能因近景有收益而发布。

最终plants SHA `5c6a5a93061bedf8b34b4832aef6d24ef8d67ffac8ad90793c7b732599238120`，HTML SHA `7fbeb277667d8dba9b0fbb3a9ceb3655cedcac04c9711698ae10f912912a9fd6`。近1823、远111三角；共享源626616B，原身份和净空保持。[独立23项](evidence/bamboo-entry/v2-independent.json)实际5.82秒全部通过，准确checker SHA `0ad4d633c021299cc2207ad6c5731f94dcf965dc8813ce93f85f6f0b907bf890`，原V1失败不改写。近叶面积回到原99.86%—101.19%，远叶面积129.09%—132.05%；面积接近没有防止远叶形状失败。

同入口541 calls、1,830,407三角、10,427,064属性B、148几何、11纹理；相对基线减少26,962个提交三角、增加626,616属性B。低档519 calls／1,324,581三角不变，属性增加35,964B、几何增加6、纹理9不变。背面与夜景的同机位指标及原始检查见[v2-detail-render](evidence/bamboo-entry/v2-detail-render.json)和[baseline-detail-render](evidence/bamboo-entry/baseline-detail-render.json)。软件GPU样本不代表硬件FPS或CPU交互改善。

本稿实际执行构建、一次完整有界CPU检查、一次叶面积探针、全景／入口及背面／低档／夜景的真实对照。23项源检查与浏览器预算通过，不等于视觉接受。完整Node22、连续路线LOD、CPU交互、原生加载／卸载重入、CI与部署均未运行。

## 继续入口

V1、V2精确源码分别由提交历史保存。活跃工作树 `/workspace/bamboo-entry-refinement`；下一步保留近景，改用真实窄叶与轻枝重做远档表示，仍守111三角和0.6MiB预算。只重测受影响项，不重跑未改变且已通过的昂贵检查。无需逐步等待用户确认；主入口群落疏密、裸地、林下过渡及庭院仍是独立欠账。
