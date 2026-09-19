'use strict';
importScripts('../shared/core.js','../shared/analyzer.js','store.js','github.js','service.js');
const R = globalThis.RepoRun;
const store = new R.Store(chrome.storage);
const api = new R.GitHub(store);
const service = new R.Service(store,api);
async function broadcast(type) {
  const tabs = await chrome.tabs.query({url:'https://github.com/*'});
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id,{namespace:'RepoRun',type}).catch(()=>{})));
  // Other extension pages observe this best-effort notification. It exposes no token.
  chrome.runtime.sendMessage({namespace:'RepoRun',type}).catch(()=>{});
}
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  if (message?.namespace !== 'RepoRun' || ['STATE_CHANGED','LANGUAGE_CHANGED'].includes(message.type)) return false;
  R.dispatch(message,sender,service,chrome.runtime.id,() => chrome.runtime.openOptionsPage()).then(async data => {
    respond({ok:true,data});
    if (['TOKEN','CLEAR'].includes(message.type)) void broadcast('STATE_CHANGED').catch(()=>{});
    if (message.type === 'LANGUAGE') void broadcast('LANGUAGE_CHANGED').catch(()=>{});
  }).catch(error => { respond({ok:false,error:R.errorObject(error)}); });
  return true;
});
