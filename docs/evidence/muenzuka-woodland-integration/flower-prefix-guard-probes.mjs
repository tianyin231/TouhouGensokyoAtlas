import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {registeredFlowerHillPredecessors} from '/workspace/muenzuka-woodland-integration/tools/check-flower-hill-entry.mjs';
const root='/workspace/muenzuka-woodland-integration/',output='/workspace/muenzuka-woodland-evidence/flower-prefix-guard-probes.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const base=JSON.parse(fs.readFileSync(root+'project.json'));
const read=(project=base,altered)=>path=>path==='project.json'?Buffer.from(JSON.stringify(project)):altered?.path===path?Buffer.concat([fs.readFileSync(root+path),Buffer.from('\n')]):fs.readFileSync(root+path);
const clone=()=>structuredClone(base),checks=[],start=performance.now();
function check(name,fn){fn();checks.push({name,passed:true});}
check('Actual 49 registration returns 47 Flower predecessors and one exact deferred successor',()=>{
 const r=registeredFlowerHillPredecessors(read(),base);assert.equal(r.modules.length,47);assert.equal(r.modules.at(-1),'src/muenzuka-edge.js');assert(!r.modules.includes('src/flower-hill-entry.js'));assert.deepEqual(r.deferredSuccessors.map(x=>x.path),['src/muenzuka-woodland.js']);
});
check('Controlled historical 48 registration remains supported',()=>{const p=clone();p.worldBuilders.pop();p.extensionRenderers.pop();const r=registeredFlowerHillPredecessors(read(p),p);assert.equal(r.modules.length,47);assert.equal(r.deferredSuccessors.length,0);});
check('Substituted project is rejected',()=>{const p=clone();p.worldBuilders.pop();assert.throws(()=>registeredFlowerHillPredecessors(read(),p));});
for(const [name,mutate] of [
 ['Reordered accepted prefix',p=>{[p.worldBuilders[2],p.worldBuilders[3]]=[p.worldBuilders[3],p.worldBuilders[2]];}],
 ['Duplicated successor',p=>p.worldBuilders.push(p.worldBuilders.at(-1))],
 ['Unreviewed successor',p=>{p.worldBuilders[p.worldBuilders.length-1]='src/unreviewed.js';}],
 ['Missing Muenzuka predecessor',p=>p.worldBuilders.splice(46,1)],
 ['Successor before Flower',p=>{[p.worldBuilders[47],p.worldBuilders[48]]=[p.worldBuilders[48],p.worldBuilders[47]];}],
 ['Duplicate Flower',p=>p.worldBuilders.push('src/flower-hill-entry.js')]
])check(name+' is rejected',()=>{const p=clone();mutate(p);assert.throws(()=>registeredFlowerHillPredecessors(read(p),p));});
for(const path of ['src/muenzuka-woodland.js','src/muenzuka-edge.js','src/sunflower-entry.js'])check('Changed protected source is rejected: '+path,()=>assert.throws(()=>registeredFlowerHillPredecessors(read(base,{path}),base)));
const report={schema:1,kind:'Registration helper probes only; no scene or candidate acceptance',nodeVersion:process.version,sourceSHA:sha(fs.readFileSync(root+'tools/check-flower-hill-entry.mjs')),projectSHA:sha(fs.readFileSync(root+'project.json')),checks,passed:true,elapsedMs:performance.now()-start,builds:0,hooks:0,nativeBuilds:0,GPU:0,fixtureChanges:0,fullFlowerCheckRun:false};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({passed:report.passed,checks:checks.length,elapsedMs:report.elapsedMs,sourceSHA:report.sourceSHA})+'\n');
