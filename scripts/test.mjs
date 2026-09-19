import {readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');const tests=(await readdir(join(root,'tests'))).filter(x=>x.endsWith('.test.mjs')).map(x=>join(root,'tests',x));
const r=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});process.exit(r.status||0);
