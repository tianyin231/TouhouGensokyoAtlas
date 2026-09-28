// Generate a navigation report from the exact built artifact and the shared resolver.
// Output is intentionally in dist; do not commit a versioned copy of all catalogue entries.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);const dir=new URL('../dist/',import.meta.url),info=JSON.parse(fs.readFileSync(new URL('release.json',dir)));
const bytes=fs.readFileSync(new URL(info.artifact,dir));assert.equal(createHash('sha256').update(bytes).digest('hex'),info.sha256);
for(const[f,h]of Object.entries(info.inputs))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(f,root))).digest('hex'),h,`Rebuild stale input ${f}`);
const html=bytes.toString('utf8'),script=id=>{const match=html.match(new RegExp(`<script id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`));assert(match,`Missing ${id}`);return match[1];};
const context=vm.createContext({performance,TextDecoder,TextEncoder});vm.runInContext(script('world-builder'),context);
const audit=context.GA.auditLandmarks(JSON.parse(script('atlas-data')));audit.artifact=info.artifact;audit.sha256=info.sha256;
const prefix=`landmarks-${info.tag}`;fs.writeFileSync(new URL(prefix+'.json',dir),JSON.stringify(audit,null,2)+'\n');
const escape=v=>String(v??'').replaceAll('|','\\|').replaceAll('\n',' ');
const md=[`# 地点导航核对 · ${info.tag}`,'',`成品 SHA-256：\`${info.sha256}\`。`, '', `目录 ${audit.total} 项；可定位 ${audit.navigable} 项；未绑定 ${audit.pending} 项。**这是导航覆盖，不是施工竣工率。**`,'',`既有模型补绑定：${audit.repaired.join('、')}。`, '',`取消误导性回退：${audit.removedMisleadingFallbacks.join('、')}。`,'','| 地点 | ID | 分组 | 导航目标 | 状态说明 |','|---|---|---|---|---|',...audit.items.map(l=>`| ${[l.name,l.id,l.group,l.view||'—',l.note].map(escape).join(' | ')} |`),''].join('\n');
fs.writeFileSync(new URL(prefix+'.md',dir),md);console.log(JSON.stringify({total:audit.total,navigable:audit.navigable,pending:audit.pending,output:prefix},null,2));
