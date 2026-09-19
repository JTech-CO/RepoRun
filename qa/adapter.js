/* Explicit offline adapter: real analyzer/client/service, simulated Chrome and HTTP. */
(() => {
  // about:blank used by restricted offline renderers is not a secure context.
  // Extension pages are secure contexts; this shim is QA-only.
  if (!crypto.randomUUID) crypto.randomUUID = () => {
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  };
  const R=globalThis.RepoRun,fixture=globalThis.rrFixture;
  const state={local:{},session:{}},listeners=[],calls=[];
  const clone=x=>structuredClone(x);
  const area=name=>({async setAccessLevel(){},async get(key){return clone({[key]:state[name][key]});},async set(x){Object.assign(state[name],clone(x));}});
  const blobs={},entries=[];
  let index=1;
  for(const [path,content]of Object.entries(fixture.files)){
    const sha=(index++).toString(16).padStart(40,'0');const bytes=new TextEncoder().encode(content);
    blobs[sha]={encoding:'base64',size:bytes.length,content:btoa(String.fromCharCode(...bytes))};
    entries.push({path,type:'blob',mode:'100644',sha,size:bytes.length});
  }
  entries.push({path:'examples',type:'tree',mode:'040000',sha:'c'.repeat(40)});
  const qa=globalThis.rrQA={state,calls,virtualURL:'https://github.com/octo/demo',fault:null,mode:globalThis.RR_MODE||'content',optionsOpened:0,notify:type=>listeners.forEach(fn=>fn({namespace:'RepoRun',type},{id:'reporun-qa'},()=>{}))};
  R.currentUrl=()=>qa.virtualURL;
  const sender=()=>qa.mode==='content'?{id:'reporun-qa',url:qa.virtualURL,tab:{id:1},frameId:0}:{id:'reporun-qa',url:`chrome-extension://reporun-qa/${qa.mode}.html`};
  globalThis.chrome={
    storage:{local:area('local'),session:area('session')},
    runtime:{id:'reporun-qa',getURL:path=>globalThis.RR_LOGO_DATA&&path==='icons/logo.svg'?globalThis.RR_LOGO_DATA:new URL('../public/'+path,location.href).href,
      onMessage:{addListener:fn=>listeners.push(fn)},openOptionsPage:async()=>{qa.optionsOpened++;},
      sendMessage:async m=>{try{const data=await R.dispatch(m,sender(),qa.service,'reporun-qa',()=>{qa.optionsOpened++;});if(['TOKEN','CLEAR'].includes(m.type))setTimeout(()=>qa.notify('STATE_CHANGED'),0);if(m.type==='LANGUAGE')setTimeout(()=>qa.notify('LANGUAGE_CHANGED'),0);return{ok:true,data};}catch(e){return{ok:false,error:R.errorObject(e)};}}
    },
    permissions:{contains:async()=>true,request:async()=>true},
    tabs:{query:async()=>[{id:1,url:'https://github.com/octo/demo'}],sendMessage:async()=>({opened:true})}
  };
  qa.store=new R.Store(chrome.storage);
  qa.api=new R.GitHub(qa.store,function(url,init){
    if(this!==globalThis)throw new TypeError('Illegal invocation');
    calls.push({url,method:init.method,hadToken:Boolean(init.headers.Authorization)});
    if(qa.fault==='NETWORK')return Promise.reject(new TypeError('Failed to fetch'));
    if(qa.fault==='401')return Promise.resolve(new Response('{"message":"Bad credentials"}',{status:401}));
    const u=new URL(url);let data;
    if(u.pathname==='/rate_limit')data={resources:{core:{remaining:60}}};
    else if(u.pathname.endsWith('/commits'))data=[{sha:fixture.head,commit:{tree:{sha:fixture.tree}}}];
    else if(u.pathname.includes('/git/trees/'))data={tree:entries,truncated:false};
    else if(u.pathname.includes('/git/blobs/'))data=blobs[u.pathname.split('/').pop()];
    else data={id:42,full_name:'octo/demo',default_branch:'main',private:false};
    return Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json','x-ratelimit-remaining':'55'}}));
  });
  qa.service=new R.Service(qa.store,qa.api);
})();
