import {checkBambooEntry} from './check-bamboo-entry.mjs';
import {checkSunflowerEntry} from './check-sunflower-entry.mjs';
import {checkMuenzukaEdge} from './check-muenzuka-edge.mjs';
import {checkFlowerHillEntry,checkFlowerHillNativeRepair} from './check-flower-hill-entry.mjs';
import {checkUIWork} from './check-ui-work.mjs';
import {checkFrameWork} from './check-frame-work.mjs';
import {checkRenderDiagnostics} from './check-render-diagnostics.mjs';
import {checkRenderResources} from './check-render-resources.mjs';
import {checkRenderOwnership} from './check-render-ownership.mjs';
import {checkStreamingLifecycle} from './check-streaming-lifecycle.mjs';
import {checkKourindou} from './check-kourindou.mjs';
import {checkForest} from './check-forest.mjs';
import {checkVillage} from './check-village.mjs';
import {checkTrail} from './check-trail.mjs';
import {checkTrailLandscape} from './check-trail-landscape.mjs';
import {checkTrailLandscapeRenderer} from './check-trail-landscape-renderer.mjs';
import {checkForestEntrance} from './check-forest-entrance.mjs';
import {checkForestCanopyRoad} from './check-forest-canopy-road.mjs';
import {checkGeyserCenter} from './check-geyser-center.mjs';
import {checkGeyser} from './check-geyser.mjs';
import {checkWindCave} from './check-wind-cave.mjs';
import {checkCucumberFarm} from './check-cucumber-farm.mjs';
import {checkWaterfallCave} from './check-waterfall-cave.mjs';
import {checkPeony} from './check-peony.mjs';
import {checkMayohiga} from './check-mayohiga.mjs';
import {checkHiten} from './check-hiten.mjs';
import {checkAsama} from './check-asama.mjs';
import {checkHighland} from './check-highland.mjs';
import {checkCurrentHell} from './check-current-hell.mjs';
import {checkKasen} from './check-kasen.mjs';
import {checkAnimal} from './check-animal.mjs';
import {checkBackdoor} from './check-backdoor.mjs';
import {checkHigan} from './check-higan.mjs';
import {checkLandscape} from './check-landscape.mjs';
// 构建集成检查：过期输出、嵌入脚本、资源包与地下模型；不需要安装 npm 依赖。
import {checkKishinjou} from './check-kishinjou.mjs';
import {checkLunar} from './check-lunar.mjs';
import {checkMakai} from './check-makai.mjs';
import {checkNetherworld} from './check-netherworld.mjs';
import {checkHeaven} from './check-heaven.mjs';
import {checkRainbowMine} from './check-rainbow-mine.mjs';
import {checkHakurei,geometryDigest} from './check-hakurei.mjs';
import * as T from '../vendor/three/three.module.js';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputDir = path.resolve(process.argv[2] || path.join(root, 'dist'));
const read = name => fs.readFileSync(path.join(root, name));
const hash = data => createHash('sha256').update(data).digest('hex');
const info = JSON.parse(fs.readFileSync(path.join(outputDir, 'release.json'), 'utf8'));
const htmlBytes = fs.readFileSync(path.join(outputDir, info.artifact));
assert.equal(hash(htmlBytes), info.sha256, '成品被修改，请重新构建');
for (const [name, digest] of Object.entries(info.inputs)) {
  assert.equal(hash(read(name)), digest, `${name} 已改变，请先运行 python tools/build.py`);
}
console.log('隐藏界面工作量检查通过：'+JSON.stringify(await checkUIWork(read)));
console.log('渲染循环工作量检查通过：'+JSON.stringify(await checkFrameWork(read)));
console.log('渲染诊断检查通过：'+JSON.stringify(checkRenderDiagnostics(read)));
console.log('渲染资源检查通过：'+JSON.stringify(checkRenderResources(read)));
console.log('渲染引用检查通过：'+JSON.stringify(await checkRenderOwnership(read)));
console.log('Worker生命周期检查通过：'+JSON.stringify(await checkStreamingLifecycle(read)));
const forestPathCheck = spawnSync(process.execPath, [path.join(root, 'tools/check-forest-path-renderer.mjs')], {cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024});
assert.equal(forestPathCheck.status, 0, `森林路边属性检查失败：${forestPathCheck.error || forestPathCheck.stderr}`);
console.log('森林路边属性检查通过：'+JSON.stringify(JSON.parse(forestPathCheck.stdout)));
const forestCoverageCheck = spawnSync(process.execPath, [path.join(root, 'tools/check-forest-path-coverage.mjs')], {cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024});
assert.equal(forestCoverageCheck.status, 0, `森林公共路覆盖检查失败：${forestCoverageCheck.error || forestCoverageCheck.stderr}`);
console.log('森林公共路覆盖检查通过：'+JSON.stringify(JSON.parse(forestCoverageCheck.stdout)));
const html = htmlBytes.toString('utf8');
assert(!/\{\{[A-Z_]+\}\}/.test(html), '成品仍有未替换的模板占位符');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const script = id => {
  const found = scripts.find(match => match[1].includes(`id="${id}"`));
  assert(found, `缺少内嵌脚本 ${id}`);
  return found[2];
};
const atlas = JSON.parse(script('atlas-data'));
const locations = new Set(atlas.locations.map(location => location.id));
assert.equal(locations.size, atlas.locations.length, '地点 ID 重复');
JSON.parse(script('character-data'));
JSON.parse(script('expansion-data'));
for (const [index, match] of scripts.entries()) {
  if (!match[1].includes('type=')) new vm.Script(match[2], { filename: `embedded-script-${index}.js` });
}
const builder = script('world-builder');
assert.equal(scripts.filter(match => match[2] === builder).length, 2, 'Worker 与主线程的建模代码不一致');
for (const [id, file] of [
  ['overview-pack', 'assets/packs/overview.pack.gz'],
  ['legacy-pack', 'assets/packs/legacy.pack.gz'],
]) {
  const bytes = Buffer.from(script(id), 'base64');
  assert(bytes.equals(read(file)), `${id} 与源资源不同`);
  const raw = gunzipSync(bytes);
  const manifestSize = raw.readUInt32LE(0);
  const manifest = JSON.parse(raw.subarray(4, 4 + manifestSize).toString('utf8'));
  assert(manifest.meshes.length && manifest.arrays.length, `${id} 没有模型数据`);
}
for (const [id, file] of [
  ['three-inline-core', 'vendor/three/three.core.js'],
  ['three-inline-module', 'vendor/three/three.module.js'],
]) {
  const bytes = Buffer.from(script(id), 'base64');
  assert(bytes.equals(read(file)), `${id} 与源引擎不同`);
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: bytes, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const context = vm.createContext({ performance, TextDecoder, TextEncoder });
vm.runInContext(builder, context);
let forestCanopyPublic;
// Reuse one public package, in production hook order. Kourindou transfers
// nearby public trees before the entrance sees its retained source instances;
// contact-only preparation cannot stand in for those predecessor hooks.
{
  const raw = gunzipSync(read('assets/packs/overview.pack.gz'));
  const overview = context.GA.decodePack(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const terrain = new context.GA.Terrain(atlas);
  context.GA.LANDSCAPE.apply(overview, terrain);
  context.GA.applyHighlandGround(overview, terrain);
  const builders = context.GA.extraOverviewBuilders;
  const entranceIndex = builders.indexOf(context.GA.FOREST_ENTRANCE.applyOverview);
  assert(entranceIndex >= 0, '森林入口总览入口未登记');
  for (const build of builders.slice(0, entranceIndex)) overview.meshes.push(...build(atlas, overview));
  console.log('森林入口源数据检查通过：'+JSON.stringify(checkForestEntrance(context.GA, overview, read)));
  // The entrance checker uses its own transactional copy. Apply the real
  // remaining hooks too, so native forest detail receives the same rendered
  // terrain contacts as the browser and Worker.
  for (const build of builders.slice(entranceIndex)) {
    const canopy = build === context.GA.FOREST_CANOPY.prepare;
    if (canopy) forestCanopyPublic = {overviewBefore:{...overview,meshes:overview.meshes.slice()}};
    overview.meshes.push(...build(atlas, overview));
    if (canopy) forestCanopyPublic.overviewAfter = {...overview,meshes:overview.meshes.slice()};
  }
  assert(forestCanopyPublic?.overviewAfter,'原生林冠实际总览入口未登记');
  console.log('雾雨弯道路面接地检查通过：'+JSON.stringify(checkForestCanopyRoad(context.GA,forestCanopyPublic.overviewBefore,forestCanopyPublic.overviewAfter,read)));
}
let flowerHillNativeCheck;
const hakureiCheck=await checkHakurei(context.GA,atlas,read,{onProtectedRegion:async(id,candidate)=>{
  if(id!=='nameless')return;
  const G=context.GA,U=G.FLOWER_HILL_ENTRY;
  assert(U,'无名之丘真实原生包装器缺失');
  // Reproduce the pre-repair pack from the actual predecessor with the current
  // shared terrain contact. Its independently fixed 870 digest is checked by
  // the native checker. No historical V8 file or candidate re-build is needed.
  const reference=await U.originalBuildRegion(atlas,id),before=geometryDigest(reference);
  flowerHillNativeCheck=checkFlowerHillNativeRepair(reference,candidate,{G,data:atlas,T,geometryDigest,sourceSHA:info.inputs['src/flower-hill-entry.js']});
  assert.equal(geometryDigest(reference),before,'无名之丘检查改变了原始参考包');
  assert(flowerHillNativeCheck.passed,'无名之丘原生保护失败：'+JSON.stringify(flowerHillNativeCheck.checks.filter(c=>!c.passed)));
  flowerHillNativeCheck.execution={referenceNativeBuilds:1,candidateNativeBuildsReusedFromFixedRegionCheck:1,historicalSnapshotsRequired:false};
}});
assert(flowerHillNativeCheck,'无名之丘原生区域检查未执行');
console.log('博丽神社检查通过：'+JSON.stringify(hakureiCheck));
console.log('无名之丘原生修复保护通过：'+JSON.stringify(flowerHillNativeCheck));
const bambooEntryCheck=await checkBambooEntry(context.GA,atlas,read);
assert(bambooEntryCheck.passed,'竹林入口检查失败：'+JSON.stringify(bambooEntryCheck.checks.filter(c=>!c.passed)));
console.log('竹林入口源数据检查通过：'+JSON.stringify(bambooEntryCheck));
const sunflowerEntryCheck=await checkSunflowerEntry(read,{sourceSHA:info.inputs['src/sunflower-entry.js'],native:false});
assert(sunflowerEntryCheck.passed,'太阳花田入口检查失败：'+JSON.stringify(sunflowerEntryCheck.checks.filter(c=>!c.passed)));
console.log('太阳花田入口源数据检查通过：'+JSON.stringify(sunflowerEntryCheck));
const muenzukaEdgeCheck=await checkMuenzukaEdge(read,{sourceSHA:info.inputs['src/muenzuka-edge.js']});
assert(muenzukaEdgeCheck.passed,'无缘塚西弧冠层检查失败：'+JSON.stringify(muenzukaEdgeCheck.checks.filter(c=>!c.passed)));
console.log('无缘塚西弧冠层源数据检查通过：'+JSON.stringify(muenzukaEdgeCheck));
const flowerHillEntryCheck=await checkFlowerHillEntry(read,{sourceSHA:info.inputs['src/flower-hill-entry.js']});
assert(flowerHillEntryCheck.passed,'无名之丘坡体源数据检查失败：'+JSON.stringify(flowerHillEntryCheck.checks.filter(c=>!c.passed)));
console.log('无名之丘坡体源数据检查通过：'+JSON.stringify(flowerHillEntryCheck));
const pack = context.GA.buildOldHell();
assert.equal(new Set(pack.meshes.map(mesh => mesh.id)).size, pack.meshes.length, '地下模型 ID 重复');
let bytes = 0;
for (const mesh of pack.meshes) {
  assert.equal(mesh.vertices.length % 27, 0, '三角面顶点格式不完整');
  assert(mesh.vertices.every(Number.isFinite), `${mesh.id} 出现无效坐标或颜色`);
  bytes += mesh.vertices.byteLength;
}
assert.equal(bytes, pack.bytes, '模型字节统计与实际不符');
for (const id of pack.meta.locations) assert(locations.has(id), `地下模型引用了不存在的地点 ${id}`);
// 即使误用 git add -f，也会在发布检查时阻止把成品再次塞回源码历史。
const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
if (tracked.status === 0) {
  const artifacts = tracked.stdout.split('\0').filter(name => name.startsWith('dist/') || /^(幻想乡大地图_v.*|TouhouGensokyoAtlas-v.*)\.html$/.test(name));
  assert.equal(artifacts.length, 0, `不应跟踪构建成品：${artifacts.join('、')}`);
}
const castle = await checkKishinjou(context.GA,atlas,JSON.parse(script('character-data')),read);
console.log('辉针城检查通过：'+JSON.stringify(castle));
console.log(`检查通过：${atlas.locations.length} 个地点，${pack.meshes.length} 个地下网格，脚本、资源与构建来源一致。`);

const lunar = await checkLunar(context.GA,atlas,JSON.parse(script('character-data')),read);
console.log('月世界检查通过：'+JSON.stringify(lunar));

console.log('魔界检查通过：'+JSON.stringify(await checkMakai(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('冥界及目录检查通过：'+JSON.stringify(await checkNetherworld(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('天界检查通过：'+JSON.stringify(await checkHeaven(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('此岸彼岸检查通过：'+JSON.stringify(await checkHigan(context.GA,atlas,JSON.parse(script('character-data')),read)));
console.log('林缘样板检查通过：'+JSON.stringify(checkLandscape(context.GA,atlas,read)));

console.log('畜生界检查通过：'+JSON.stringify(await checkAnimal(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('后户之国检查通过：'+JSON.stringify(await checkBackdoor(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('华扇仙界检查通过：'+JSON.stringify(await checkKasen(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('现行地狱检查通过：'+JSON.stringify(await checkCurrentHell(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('虹龙洞检查通过：'+JSON.stringify(await checkRainbowMine(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('伪天棚检查通过：'+JSON.stringify(await checkHighland(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('圣域／浅间净秽山检查通过：'+JSON.stringify(await checkAsama(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('秘天崖检查通过：'+JSON.stringify(await checkHiten(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('迷途之家检查通过：'+JSON.stringify(await checkMayohiga(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('芍药田检查通过：'+JSON.stringify(await checkPeony(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('瀑后洞穴检查通过：'+JSON.stringify(await checkWaterfallCave(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('黄瓜田检查通过：'+JSON.stringify(await checkCucumberFarm(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('幻想风穴检查通过：'+JSON.stringify(await checkWindCave(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('山麓间歇泉检查通过：'+JSON.stringify(await checkGeyser(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('间歇泉地下中心检查通过：'+JSON.stringify(await checkGeyserCenter(context.GA,atlas,JSON.parse(script('character-data')),read)));

console.log('香霖堂精修检查通过：'+JSON.stringify(await checkKourindou(context.GA,atlas,JSON.parse(script('character-data')),read)));
console.log('森林住宅与木板径检查通过：'+JSON.stringify(await checkForest(context.GA,atlas,JSON.parse(script('character-data')),read,forestCanopyPublic)));
console.log('人里精修检查通过：'+JSON.stringify(await checkVillage(context.GA,atlas,JSON.parse(script('character-data')),read)));
console.log('兽道桥头与夜雀屋结构检查通过：'+JSON.stringify(await checkTrail(context.GA,atlas,JSON.parse(script('character-data')),read)));
console.log('兽道树林与地表样板检查通过：'+JSON.stringify(await checkTrailLandscape(context.GA,atlas,JSON.parse(script('character-data')),read)));
console.log('兽道样板材质与资源检查通过：'+JSON.stringify(checkTrailLandscapeRenderer(context.GA,read)));
