import {checkHigan} from './check-higan.mjs';
import {checkLandscape} from './check-landscape.mjs';
// 构建集成检查：过期输出、嵌入脚本、资源包与地下模型；不需要安装 npm 依赖。
import {checkKishinjou} from './check-kishinjou.mjs';
import {checkLunar} from './check-lunar.mjs';
import {checkMakai} from './check-makai.mjs';
import {checkNetherworld} from './check-netherworld.mjs';
import {checkHeaven} from './check-heaven.mjs';
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
