(() => {
  'use strict';
  const R=globalThis.RepoRun,e=R.el,app=document.getElementById('app');
  let lang='en',hasToken=false,busy=false,notice='',error=null,diagnostics=null,permission=null;
  document.head.append(e('style',{},[R.styles]));
  const t=key=>R.t(lang,key);
  async function load(){const state=await R.rpc({type:'OPTIONS'});lang=state.settings.language;hasToken=state.hasToken;permission=await chrome.permissions.contains({origins:['https://api.github.com/*']});}
  async function run(fn,success=''){
    if(busy)return;busy=true;error=null;notice='';render();
    try{await fn();await load();notice=success;}catch(err){error=err;}finally{busy=false;render();}
  }
  function render(){
    document.documentElement.lang=lang;
    const language=e('select',{id:'rr-language',class:'rr-input',disabled:busy,onChange:ev=>run(()=>R.rpc({type:'LANGUAGE',language:ev.target.value}))},[e('option',{value:'en'},['English']),e('option',{value:'ko'},['한국어'])]);language.value=lang;
    const tokenInput=e('input',{id:'rr-token',type:'password',class:'rr-input',placeholder:t('tokenPlaceholder'),autocomplete:'off',spellcheck:'false',autocapitalize:'none',maxlength:'255',disabled:busy,'aria-label':t('tokenTitle')});
    const tokenForm=e('form',{onSubmit:ev=>{ev.preventDefault();const value=tokenInput.value.trim();if(!value){tokenInput.focus();return;}diagnostics=null;run(()=>R.rpc({type:'TOKEN',token:value}),'saved');}},[
      tokenInput,e('div',{class:'rr-actions'},[e('button',{type:'submit',class:'rr-button primary',disabled:busy},[t('saveToken')]),R.button(t('removeToken'),()=>{diagnostics=null;run(()=>R.rpc({type:'TOKEN',token:''}),'removed');},'',{disabled:busy||!hasToken})])
    ]);
    const diagnosticRows=[e('tr',{},[e('td',{},[t('permission')]),e('td',{},[t(permission?'granted':'withheld')])])];
    if(diagnostics)for(const kind of ['anonymous','authenticated']){
      const result=diagnostics[kind];diagnosticRows.push(e('tr',{},[e('td',{},[t(kind)]),e('td',{},[result?result.ok?`HTTP ${result.status} · ${result.elapsedMs} ms`:R.errorText(result,lang):t('notRun')])]));
    }
    const request=()=>{
      // Call directly within the click, before awaiting anything, to preserve the user gesture.
      const promise=chrome.permissions.request({origins:['https://api.github.com/*']});
      run(async()=>{const granted=await promise;if(!granted)throw new R.Error('FORBIDDEN');},'restored');
    };
    const flash=e('div',{class:'rr-flash','aria-live':'polite'},[error?e('p',{class:'rr-callout error'},[R.errorText(error,lang)]):notice?e('p',{class:'rr-callout'},[t(notice)]):null]);
    app.replaceChildren(e('main',{class:'rr-settings'},[
      e('header',{class:'rr-topbar'},[R.brand(),e('span',{class:'rr-muted rr-small'},[`v${R.VERSION}`])]),e('h1',{},[t('optionsTitle')]),e('p',{class:'rr-muted'},[t('optionsIntro')]),flash,
      e('section',{class:'rr-section'},[e('h2',{},[t('interface')]),e('label',{for:'rr-language'},[t('interface')]),language]),
      e('section',{class:'rr-section'},[e('h2',{},[t('tokenTitle')]),e('p',{class:'rr-muted'},[t('tokenNote')]),R.link('GitHub token settings','https://github.com/settings/personal-access-tokens'),e('p',{class:'rr-note'},[t(hasToken?'hasToken':'noToken')]),tokenForm,e('p',{class:'rr-note',style:'margin-top:14px'},[t('sessionNote')])]),
      e('section',{class:'rr-section'},[e('h2',{},[t('diagnosticTitle')]),e('p',{class:'rr-muted'},[t('diagnosticNote')]),e('table',{class:'rr-table'},[e('tbody',{},diagnosticRows)]),e('div',{class:'rr-actions'},[R.button(t(busy?'diagnosing':'diagnose'),()=>run(async()=>{diagnostics=await R.rpc({type:'DIAGNOSTICS'});}), 'primary',{disabled:busy}),R.button(t('restore'),request,'',{disabled:busy||permission})])]),
      e('section',{class:'rr-section'},[e('h2',{},[t('cacheTitle')]),e('p',{class:'rr-muted'},[t('cacheNote')]),R.button(t('clearCache'),()=>run(()=>R.rpc({type:'CLEAR'}),'cleared'),'',{disabled:busy})]),
      e('footer',{class:'rr-settings-footer'},[e('span',{class:'rr-muted'},[t('independent')]),e('div',{class:'rr-actions'},[R.link(t('help'),'help.html'),R.link(t('privacy'),'privacy-policy.html')])])
    ]));
  }
  chrome.runtime.onMessage.addListener((m,sender)=>{
    if(m?.namespace==='RepoRun'&&sender.id===chrome.runtime.id&&['LANGUAGE_CHANGED','STATE_CHANGED'].includes(m.type)&&!busy){load().then(()=>{if(m.type==='STATE_CHANGED')diagnostics=null;render();}).catch(()=>{});}return false;
  });
  load().then(render).catch(err=>{error=err;render();});
})();
