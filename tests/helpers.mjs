import {createHash} from 'node:crypto';
await import('../src/shared/core.js');
await import('../src/shared/analyzer.js');
await import('../src/shared/i18n.js');
await import('../src/background/store.js');
await import('../src/background/github.js');
await import('../src/background/service.js');
export const R=globalThis.RepoRun;
export const REF={owner:'octo',repo:'demo'};
export const HEAD='a'.repeat(40),TREE='b'.repeat(40);
export function memory(){
  const values={local:{},session:{}}, access=[];
  const area=name=>({
    async setAccessLevel(x){access.push([name,x.accessLevel]);},
    async get(key){if(typeof key==='string')return structuredClone({[key]:values[name][key]});return structuredClone(values[name]);},
    async set(x){Object.assign(values[name],structuredClone(x));}
  });
  return {storage:{local:area('local'),session:area('session')},values,access};
}
export function store(now=Date.now){const m=memory();return {store:new R.Store(m.storage,now),...m};}
export function fixture(fileMap,extra=[]){
  const blobs={},entries=[];
  for(const [name,text]of Object.entries(fileMap)){const sha=createHash('sha1').update(name+'\n'+text).digest('hex');blobs[sha]={encoding:'base64',content:Buffer.from(text).toString('base64'),size:Buffer.byteLength(text)};entries.push({path:name,mode:'100644',type:'blob',sha,size:Buffer.byteLength(text)});}
  entries.push(...extra);
  return {blobs,entries,handler:(kind,arg)=>kind==='meta'?{id:42,full_name:'octo/demo',default_branch:'main',private:false}:kind==='head'?[{sha:HEAD,commit:{tree:{sha:TREE}}}]:kind==='tree'?{tree:entries,truncated:false}:kind==='blob'?blobs[arg]:{resources:{core:{remaining:60}}}};
}
export function fakeApi(f){const calls=[];return {calls,cancel(){},async get(ref,kind,arg,epoch){calls.push({ref,kind,arg,epoch});return structuredClone(f.handler(kind,arg));}};}
export function analyzed(map,extra={}){
  const f=fixture(map);
  return R.analyze({ref:REF,sha:HEAD,files:map,inventory:f.entries.map(x=>({name:x.path,path:x.path,type:x.type,mode:x.mode,state:'read',size:x.size})),...extra});
}
export const row=(report,id)=>report.rows.find(x=>x.id===id);
