import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const source=(await Promise.all(['src','scripts','public'].map(d=>walk(join(root,d))))).flat();
let count=0;
for(const file of source){if(/\.(?:js|mjs)$/.test(file)){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);count++;}else if(file.endsWith('.json')){JSON.parse(await readFile(file,'utf8'));count++;}}
const manifest=JSON.parse(await readFile(join(root,'public/manifest.json'),'utf8'));
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
assert.equal(manifest.version,pkg.version);
const hashes=JSON.parse(await readFile(join(root,'public/icons/assets.json'),'utf8'));
const digest=buf=>createHash('sha256').update(buf).digest('hex');
assert.equal(digest(await readFile(join(root,'public/icons',hashes.source))),hashes.sha256,'SVG changed: regenerate PNGs with scripts/icons.py');
for(const [name,hash]of Object.entries(hashes.generated)){const bytes=await readFile(join(root,'public/icons',name));assert.equal(digest(bytes),hash,`Icon out of sync: ${name}`);const size=Number(name.replace('.png',''));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
assert.deepEqual(manifest.permissions,['storage']);assert.deepEqual(manifest.web_accessible_resources,[{resources:['icons/logo.svg'],matches:['https://github.com/*']}]);
await import('../src/shared/core.js');await import('../src/shared/i18n.js');
assert.equal(globalThis.RepoRun.VERSION,pkg.version);
const {en,ko}=globalThis.RepoRun.strings;assert.deepEqual(Object.keys(en).sort(),Object.keys(ko).sort());assert.deepEqual(Object.keys(en.errors).sort(),Object.keys(ko.errors).sort());
console.log(`Syntax/JSON: ${count}; version, locale, permissions and icon hashes: PASS`);
