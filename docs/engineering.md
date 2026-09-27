# 工程架构与性能约定

> 当前结构快照：`5775e35a25e7eca9bb7ae02ef022bf2df92ecd37`。维护者已完成源码／资源拆分；旧HTML注入链仅是历史，不是当前构建方式。具体命令和版本规则以根目录README及 `project.json` 为准。

## 1. 当前独立构建链

```text
project.json + src/index.html/styles.css
  + data/atlas.json、characters.json、expansion.json
  + project.worldBuilders 指定的基础及地底建模脚本
  + 渲染、相机、人物、调度、应用脚本
  + assets/packs/ 两个必需源包
  + vendor/three/ 固定引擎与许可证
  → tools/build.py → dist/单HTML + release.json + SHA256SUMS.txt
```

命令是 `python tools/build.py`，随后 `node tools/check.mjs`。Python构建不读取旧HTML／Git历史、不临时下载依赖。`dist/` 是产物，不人工修改或提交；使用标签与Release分发成品，不恢复根目录版本化HTML集合。

`project.json` 当前为0.17.0、Three.js185，worldBuilders依次为 `src/world-builder.js` 与 `src/old-hell.js`。构建将同一建模字符串写入主线程和Worker；新增模块必须登记顺序，不能手工维护两个不同副本。模板 `{{...}}` 不是可直接运行的页面。

发布版本、原研究数据版本、区域元数据版本和历史来源身份分开。不能对全仓库替换所有0.16／0.17字符串；项目版本映射到标签和产物名由构建器统一完成。

## 2. 源资源包与模块边界

`src/world-builder.js` 集中了原先多个地表／地下地区生成器、基础几何与注册，不代表每个地区已有独立JS文件。修改森林先找到实际森林构建入口，不凭历史路径创造第二份同功能实现。

`assets/packs/overview.pack.gz` 和 `legacy.pack.gz` 是必需源资产，不是随时可删的浏览器缓存。内含JSON清单和数组数据；当前构建器只校验并内嵌，**不会因为近景生成器改变而自动重建总览**。改地形／建筑时要分别核对近景与总览，需要更新时另行生成对应包并保留可追溯来源。

运行单文件仍有 `atlas-data`、`character-data`、`overview-pack`、`legacy-pack`、`world-builder` 等内嵌块；应用使用 `globalThis.GA`。调试可查 `buildRegion`、`RegionStreaming`、`PRESETS`、`IMPLEMENTED`、`DIORAMA`、`DioramaRenderer`。若继续模块化，检查既有多层原型／方法覆盖的执行顺序，不根据同名函数就删掉前层。

固定Three.js r185的core和module必须同源同版本，升级同时更新配置与许可证。单HTML需要整体读取、解压缓存，**不是网络按区下载**。原作图片／资料链接仍可能联网，构建没有授予图像使用权。

## 3. 当前旧地狱如何接入

`old-hell.js` 增加 `oldhell` 区域／空间、12个预设、9个地点映射，并包装 `G.buildRegion`：只有请求此ID才调用 `buildOldHell()`，其余区域委托前面的构建器。模型ID以 `oldhell:` 开头，带 `owner`、`region`、`space`、`hellZone`、`ceiling`。

它按区段和材质合批，但仍是整个旧地狱一包详情。固定随机种子170927；不同请求顺序不应重排街区。返回包有 `meshes`、`signs`、`bytes` 和 `meta.lights`。

`old-hell-renderer.js` 继承当时的 `G.DioramaRenderer` 再覆盖入口，添加岩石／铺路／木瓦／金属、宫殿／彩窗、熔岩／炉心／油面／蒸汽等材质。复用8盏选近点光，大堂／回廊另有1024级局部投影灯，轻量档关闭该投影；地下隐藏天空和雨，动画复用原时钟。

保护 `attachPack`／`dropPack` 灯位生命周期、`wanted` 空间与顶盖过滤、`hellSection` 语义和返回地表时的环境恢复。通过两级原型寻找 `studioPost` 的调用依赖当前继承结构，迁移渲染器前要单独检查，不能只修好地下却破坏地表后期。

## 4. 空间、时代、坐标和连续地表

分别理解 `space`、`era`、`displayMode`。surface、mausoleum、senkai、oldhell不是同一坐标图。命莲寺历史地下和旧地狱的负Y不能直接合成一套地理深度。

地表默认一整块岛。详情包只管理精度与生命周期，不决定土地是否存在。公共地形／道路不能随单区卸载消失。剖切或展示展开需要显式变换，模型、灯、角色、拾取和镜头同步；退出恢复原关系、完整岛面和天气。

## 5. CPU与GPU生命周期

首屏解包预制全岛概览，先显示第一帧，再在Worker构建当前详情。不能先生成全图高模再降面来宣称按需。`src/streaming.js` 有任务epoch、取消和过期结果保护，快速切区时旧包不能回插。

调度器默认220MiB详情源软预算，非当前区约5.5秒后可回收，超过两个缓存包也触发清理；必须的当前包受保护，所以不是硬上限。画质相关旧策略曾采用CPU125／220／280MiB和GPU属性80／160／256MiB，维护时以当前应用赋值为准，不写成物理显存读数。

CPU数组、实例数据、Three.js几何、贴图、阴影／反射／后期目标、总堆和物理显存分别统计。`dispose()`不自动移除应用仍持有的数组引用；共享原型需要引用计数，不让一个地区离开就释放别区仍在用的资源。[清理说明](https://threejs.org/manual/pages/cleanup.html)

首次访问大型详情包仍可能等待。旧地狱优化先测构建时间、峰值和当前可见区，再考虑街区／宫殿／深层分包，保留公共洞道。不能通过删掉大堂、温泉街或旧血池来假装性能更好。

## 6. 可见精度、光影和效果预算

全域用地形和建筑群轮廓，中景保留街区／庭院，近景再用瓦垄、花丝和器具。实例化不会消除几何、阴影或透明填充成本，过大实例批次也会降低剔除效率。[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

地表太阳与天空保持一致；林雾、地下色调限制作用空间。雨、烟、火星限定数量与范围。聚焦优先一套主阴影、有限局部灯和一个主要反射水面，总览不逐湖重绘。AO／Bloom可关闭，景深不能遮掩未完成模型。

自定义材质、天空、水面和后期保持线性／HDR与单次输出转换，不用不断调曝光掩盖重复色调映射。[颜色管理](https://threejs.org/manual/pages/color-management.html) 反射裁切、地表观察孔和洞顶显隐分开。[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

历史的总览约700调用／180万三角形、样板约350调用／150万三角形，只是目标起点，不是当前旧地狱实测或强制删细节指标。新预算应在相同设备／镜头／完整通道下建立。

## 7. 时钟和统计口径

暂停保留当前场景时间，恢复接续；不能归零引起索道、水面跳相位。标签页隐藏时减工作，无可见动态的静止相机按需绘制，输入独立唤醒。15／30／60Hz调度上限不等于实际帧率。

每次测量记录提交SHA、浏览器／GPU后端、分辨率、DPR、画质、机位、天气／时钟、当前包、冷启动或重访，以及主场景／阴影／反射／后期成本。多通道时明确 `renderer.info` 重置时机，不能取最后一个输出四边形就说整个世界只有两个三角形。

源数组MiB不是总内存；属性软预算不是物理显存；绘制调用下降90%不是帧率提高90%。SwiftShader验证不等于真实独显或手机验收。本次知识整理没有新增性能测量。

## 8. 现有检查器与后续债务

`tools/check.mjs` 会核对产物SHA和输入是否过期、模板替换、内嵌脚本语法、主线程与Worker一致性、源包／引擎一致性，实际调用 `buildOldHell()` 检查地下模型ID／有限三角数据／字节和地点引用，并拒绝Git跟踪发布HTML。它不是所有地区视觉、碰撞或缓存压力验证。

已完成的工程改进是源码／资源独立和Release流程，不再把这项列为尚未迁移。仍需改善基础大文件的可维护性、总览资源更新链、独立地区覆盖与浏览器自动化、原图成功路径，以及大详情包的首次进入成本；应分阶段实施，不在补文档时改变运行代码。
