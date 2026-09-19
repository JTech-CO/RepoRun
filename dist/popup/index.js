(async () => {
  'use strict';
  const R=globalThis.RepoRun,e=R.el,app=document.getElementById('app');document.head.append(e('style',{},[R.styles]));
  let lang='en';
  try{
    const state=await R.rpc({type:'BOOT'});lang=state.settings.language;const t=k=>R.t(lang,k);document.documentElement.lang=lang;
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const ref=R.parseRepo(tab?.url||'');const note=e('p',{class:'rr-note','aria-live':'polite'});
    const open=async()=>{try{const response=await chrome.tabs.sendMessage(tab.id,{namespace:'RepoRun',type:'OPEN_PANEL'});if(response?.opened)window.close();else note.textContent=t('onGithub');}catch{note.textContent=R.errorText({code:'EXTENSION_RELOADED'},lang);}};
    app.replaceChildren(e('main',{class:'rr-popup'},[R.brand(),e('p',{class:'rr-muted'},[t('tagline')]),ref?e('p',{class:'rr-code'},[`${ref.owner}/${ref.repo}`]):e('p',{class:'rr-note'},[t('onGithub')]),ref?R.button(t('open'),open,'primary'):null,R.button(t('openSettings'),()=>chrome.runtime.openOptionsPage()),note,e('p',{class:'rr-note'},[t('nothingRun')])]));
  }catch(error){app.replaceChildren(e('p',{class:'rr-popup'},[R.errorText(error,lang)]));}
})();
