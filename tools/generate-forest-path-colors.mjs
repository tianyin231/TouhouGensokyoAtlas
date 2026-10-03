// Explicit offline generation. Running this file without --write is read-only;
// the independent checker imports the source/sampling helpers, never the write.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
export const sha=b=>createHash('sha256').update(b).digest('hex');
const selected=m=>m.id==='forest:paths'||/^island:routes:forest:-?\d+:-?\d+(?::shoulder)?$/.test(m.id);
export function prepareForestPathColorSource(){
 assert(Number(process.versions.node.split('.')[0])>=22,'Use Node 22 for geometry checks');
 const read=p=>fs.readFileSync(root+p),context=vm.createContext({performance,TextDecoder,TextEncoder,atob});
 const modules=['src/world-builder.js','src/landmarks.js','src/landscape.js','src/highland.js','src/asama-roads.js'];
 for(const p of modules){if(p==='src/asama-roads.js')context.GA.ASAMA={};vm.runInContext(read(p).toString(),context,{filename:p});}
 const G=context.GA,data=JSON.parse(read('data/atlas.json')),terrain=new G.Terrain(data),z=gunzipSync(read('assets/packs/overview.pack.gz')),overview=G.decodePack(z.buffer.slice(z.byteOffset,z.byteOffset+z.byteLength));
 G.LANDSCAPE.apply(overview,terrain);G.applyHighlandGround(overview,terrain);
 const models=[...overview.meshes.filter(selected),G.buildForest(terrain).meshes.find(m=>m.id==='forest:paths')];
 assert.equal(models.length,9);assert.equal(models.reduce((n,m)=>n+m.vertices.length/9,0),15170);assert(models.every(m=>!m.farVertices));
 const inputs=Object.fromEntries([...modules,'data/atlas.json','assets/packs/overview.pack.gz'].map(p=>[p,sha(read(p))]));
 return{context,G,terrain,overview,models,inputs};
}
export function sampleForestPathColors(source){
 const {G,overview,models}=source,sample=G.ASAMA.sampleRenderedTerrain(overview),bytes=new Uint8Array(45510),records=[],tiles=new Map();let offset=0;
 for(const m of models){
  const vertexCount=m.vertices.length/9,start=offset;
  for(let i=0;i<vertexCount;i++){
   const a=m.vertices,v=sample(a[i*9],a[i*9+2],'near');tiles.set(v.tile.id,v.tile);
   for(let k=0;k<3;k++)bytes[offset++]=Math.round(Math.max(0,Math.min(1,v.c[k]))*255);
  }
  records.push({id:m.id,vertexCount,indexCount:m.index?.length||0,vertexSHA:sha(raw(m.vertices)),indexSHA:m.index?sha(raw(m.index)):null,offset:start,byteLength:vertexCount*3});
 }
 assert.equal(offset,bytes.length);
 const terrainTiles=[...tiles.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(m=>({id:m.id,vertexSHA:sha(raw(m.vertices)),indexSHA:sha(raw(m.index))}));
 return{bytes,records,terrainTiles};
}
export function serializeForestPathColors(source,sampled,sourceBaseline=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()){
 const metadata={revision:1,sourceBaseline,byteLength:sampled.bytes.byteLength,payloadSHA:sha(raw(sampled.bytes)),sampling:'Existing ASAMA near public-terrain triangle albedo after LANDSCAPE and highland ground; colors only, no road geometry/contact changes',inputs:source.inputs,records:sampled.records,terrainTiles:sampled.terrainTiles};
 return `/* Deterministic offline source colors. Regenerate only with explicit:\n * npx --yes --package=node@22 node tools/generate-forest-path-colors.mjs --write\n * Original record SHA/count metadata is checked independently before adoption.\n */\n(function(G){'use strict';\nconst metadata=${JSON.stringify(metadata,null,2)};\nconst encoded='${Buffer.from(sampled.bytes).toString('base64')}';\nconst records=new Map(metadata.records.map(m=>[m.id,Object.freeze(m)]));\nlet views=null;\nfunction get(id,vertexCount,indexCount){\n const m=records.get(id);if(!m||m.vertexCount!==vertexCount||m.indexCount!==indexCount)throw Error('Forest path color source/count mismatch: '+id);\n if(!views){const text=atob(encoded),bytes=new Uint8Array(text.length);if(bytes.length!==metadata.byteLength)throw Error('Forest path color payload length changed');for(let i=0;i<bytes.length;i++)bytes[i]=text.charCodeAt(i);views=new Map(metadata.records.map(r=>[r.id,bytes.subarray(r.offset,r.offset+r.byteLength)]));}\n return views.get(id);\n}\nG.FOREST_PATH_COLORS=Object.freeze({revision:1,metadata:Object.freeze(metadata),byteLength:metadata.byteLength,decodedBytes:()=>views?metadata.byteLength:0,get});\n})(globalThis.GA);\n`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags=process.argv.slice(2);assert(flags.every(f=>f==='--write'),'Only --write is supported');
 const source=prepareForestPathColorSource(),sampled=sampleForestPathColors(source),output=serializeForestPathColors(source,sampled),destination=path.join(root,'src/forest-path-colors.js');
 if(flags.includes('--write'))fs.writeFileSync(destination,output);
 console.log(JSON.stringify({wrote:flags.includes('--write'),destination,sourceBaseline:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),records:sampled.records.length,sourceBytes:sampled.bytes.byteLength,scriptBytes:Buffer.byteLength(output),payloadSHA:sha(raw(sampled.bytes)),scriptSHA:sha(Buffer.from(output))},null,2));
}
