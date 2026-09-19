/* Deterministic ZIP writer: built-in Node modules only. */
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateRawSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'..');
for(const script of ['test.mjs','build.mjs']){const r=spawnSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
async function walk(dir,prefix=''){const out=[];for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(e.isDirectory())out.push(...await walk(join(dir,e.name),prefix+e.name+'/'));else out.push({name:prefix+e.name,data:await readFile(join(dir,e.name))});}return out;}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const locals=[],central=[];let offset=0;
for(const file of await walk(join(root,'dist'))){const name=Buffer.from(file.name),data=deflateRawSync(file.data),crc=crc32(file.data);const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(0x21,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(file.data.length,22);h.writeUInt16LE(name.length,26);locals.push(h,name,data);const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0x21,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(file.data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+data.length;}
const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));await mkdir(join(root,'releases'),{recursive:true});const dest=join(root,'releases',`RepoRun-v${pkg.version}-chrome.zip`);await writeFile(dest,Buffer.concat([...locals,cd,end]));console.log(`Packaged ${dest}`);
