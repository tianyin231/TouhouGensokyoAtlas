// 仅 --web 构建调用：从与页面相同的建模串、资料和总览准备函数预建森林。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {encodeRegionPack} from './region-pack-codec.mjs';

assert.equal(Number(process.versions.node.split('.')[0]),22,'森林预建需要 Node.js 22，避免几何数值漂移');
assert.equal(process.argv[2],'--output-dir','缺少 --output-dir');
assert.equal(process.argv.length,4,'参数仅支持 --output-dir');
const output=path.resolve(process.argv[3]),input=JSON.parse(fs.readFileSync(0,'utf8'));
const context=vm.createContext({performance,TextDecoder,TextEncoder,atob});
vm.runInContext(input.builder,context,{filename:'world-builder'});
vm.runInContext(input.prepareOverview,context,{filename:'prepare-overview.js'});
const G=context.GA,raw=gunzipSync(Buffer.from(input.overview,'base64'));
const started=performance.now();
G.prepareOverview(input.data,G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));
const pack=await G.buildRegion(input.data,'forest'),buildMs=pack.builtMs;
// 构建耗时不参与文件散列；运行时单独记录获取耗时，不冒充现场建模耗时。
pack.builtMs=0;pack.prebuilt={schema:1,sourceHash:input.sourceHash};
const encoded=encodeRegionPack(pack),compressed=gzipSync(encoded,{level:9});
const restored=G.decodePack(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength));
// 完整往返同时校验元数据、数组内容和共享数组身份；不更新任何几何基线。
assert(encodeRegionPack(restored).equals(encoded),'森林预建编解码不一致');
const sha256=createHash('sha256').update(compressed).digest('hex'),url='packs/forest.'+sha256.slice(0,16)+'.pack.gz';
fs.mkdirSync(path.join(output,'packs'),{recursive:true});
fs.writeFileSync(path.join(output,url),compressed);
const manifest={schema:1,regions:{forest:{url,sha256,sourceHash:input.sourceHash,compressedBytes:compressed.length,decodedBytes:encoded.length}}};
process.stdout.write(JSON.stringify({manifest,report:{region:'forest',meshes:pack.meshes.length,sourceBytes:pack.bytes,decodedBytes:encoded.length,compressedBytes:compressed.length,buildMs,totalMs:performance.now()-started}}));
