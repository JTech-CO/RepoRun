(() => {
  'use strict';
  const R = globalThis.RepoRun, e=R.el;
  R.Panel = class {
    constructor(ref,lang='en',onClose=()=>{}) {
      this.ref=ref;this.lang=lang;this.onClose=onClose;this.report=null;this.error=null;this.busy=false;this.folder='';this.tab='overview';this.generation=0;this.alive=true;
      this.host=e('div',{id:'reporun-panel-host'});this.shadow=this.host.attachShadow({mode:'open'});
      this.dialog=e('dialog',{class:'rr-dialog','aria-labelledby':'rr-dialog-title'});
      this.shadow.append(e('style',{},[R.styles]),this.dialog);document.body.append(this.host);
      this.dialog.addEventListener('cancel',ev=>{ev.preventDefault();this.close();});
      this.dialog.addEventListener('click',ev=>{if(ev.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)this.close();}});
    }
    t(key){return R.t(this.lang,key);}
    async open(){this.returnFocus=document.activeElement;this.render();this.dialog.showModal();await this.inspect(false);}
    close(){if(!this.alive)return;this.alive=false;this.generation++;this.dialog.close();this.host.remove();this.onClose();this.returnFocus?.focus?.();}
    invalidate(){this.generation++;this.busy=false;this.report=null;this.error=new R.Error('AUTH_CHANGED');this.render();}
    async inspect(force=true){
      const raw=this.shadow.querySelector('#rr-directory')?.value.trim() ?? this.folder;
      try{this.folder=R.path(raw==='.'?'':raw.replace(/\/$/,''));}catch(error){this.error=error;this.render();return;}
      const gen=++this.generation;this.busy=true;this.error=null;this.report=null;this.render();
      try{const data=await R.rpc({type:'ANALYZE',ref:this.ref,folder:this.folder,force});if(this.alive&&gen===this.generation)this.report=data;}
      catch(error){if(this.alive&&gen===this.generation)this.error=error;}
      finally{if(this.alive&&gen===this.generation){this.busy=false;this.render();}}
    }
    async language(){
      this.lang=this.lang==='en'?'ko':'en';this.render();
      try{await R.rpc({type:'LANGUAGE',ref:this.ref,language:this.lang});}catch(error){this.error=error;this.render();}
    }
    async options(){try{await R.rpc({type:'OPEN_OPTIONS',ref:this.ref});}catch(error){this.error=error;this.render();}}
    fact(row){return e('div',{class:'rr-fact'},[e('div',{},[e('div',{class:'rr-fact-title'},[this.t(row.id)]),e('span',{class:`rr-status ${row.status}`},[this.t(row.status)])]),e('div',{},[e('div',{class:'rr-value'},[row.value||this.t('unknown')]),e('p',{class:'rr-note'},[this.t(row.note)]),R.sources(row.evidence)])]);}
    overview(){
      const r=this.report;
      const box=e('div',{},[e('p',{class:'rr-legend'},[this.t('statusLegend')]),e('div',{class:'rr-facts'},r.rows.map(x=>this.fact(x)))]);
      box.append(e('section',{class:'rr-section'},[e('h2',{},[this.t('environment')]),e('p',{class:'rr-note'},[this.t('envNote')]),r.env.length?e('div',{class:'rr-list'},r.env.map(x=>e('div',{class:'rr-env'},[e('code',{},[x.name]),R.sources(x.evidence)]))):e('p',{class:'rr-note'},[this.t('noEnv')])]));
      box.append(e('section',{class:'rr-section'},[e('h2',{},[this.t('containers')]),r.services.length?e('div',{},r.services.map(x=>e('div',{class:'rr-command'},[e('h3',{},[this.t(x.kind)]),e('code',{},[x.value]),e('p',{class:'rr-note'},[this.t(x.note)]),R.sources(x.evidence)]))):e('p',{class:'rr-note'},[this.t('noServices')])]));
      if(r.notices.length)box.append(e('section',{class:'rr-section'},[e('h2',{},[this.t('notices')]),...r.notices.map(x=>e('div',{class:'rr-callout'},[this.t(x.code),R.sources(x.evidence)]))]));
      return box;
    }
    commands(){
      const r=this.report,box=e('div',{},[e('p',{class:'rr-callout'},[this.t('scriptNote')])]);
      if(!r.commands.length)box.append(e('p',{class:'rr-muted'},[this.t('noCommands')]));
      for(const c of r.commands){
        const copy=R.button(this.t('copy'),ev=>R.copy(c.command,ev.currentTarget,this.lang),'',{disabled:!c.copyable,title:c.copyable?this.t('copy'):this.t('copyBlocked')});
        box.append(e('div',{class:'rr-command'},[e('div',{class:'rr-command-header'},[e('h3',{},[c.name,c.hook?e('span',{class:'rr-status inferred',style:'margin-left:10px'},[this.t('hook')]):null]),copy]),e('code',{},[c.command]),!c.copyable?e('p',{class:'rr-note'},[this.t('copyBlocked')]):null,R.sources(c.evidence)]));
      }
      box.append(e('section',{class:'rr-section'},[e('h2',{},[this.t('readme')]),e('p',{class:'rr-note'},[this.t('readmeNote')]),...r.readme.map(x=>e('div',{class:'rr-command'},[e('code',{},[x.value]),R.sources(x.evidence)])),!r.readme.length?e('p',{class:'rr-note'},[this.t('noReadme')]):null]));
      return box;
    }
    evidence(){
      const rows = this.report.inventory.map(x => e('tr', {}, [
        e('td', {}, [R.link(x.path, R.fileUrl(this.report.ref, this.report.sha, x.path))]),
        e('td', {}, [this.t(x.state), x.reason ? e('p', {class:'rr-note'}, [this.t(x.reason)]) : null])
      ]));
      const table = e('table', {class:'rr-table'}, [
        e('thead', {}, [e('tr', {}, [e('th', {}, [this.t('file')]), e('th', {}, [this.t('treatment')])])]),
        e('tbody', {}, rows)
      ]);
      return e('div', {}, [e('h2', {}, [this.t('filesTitle')]), e('p', {class:'rr-note'}, [this.t('scopeNote')]), table]);
    }
    render(){
      if(!this.alive)return;this.dialog.lang=this.lang;
      const title=R.brand();title.id='rr-dialog-title';
      const header=e('header',{class:'rr-header'},[e('div',{},[title,e('div',{class:'rr-tagline'},[this.t('tagline')])]),e('div',{class:'rr-actions'},[R.button(this.lang==='en'?'KR':'EN',()=>this.language(),'quiet',{'aria-label':this.t('language')}),R.button(this.t('settings'),()=>this.options(),'quiet'),R.button('×',()=>this.close(),'quiet',{'aria-label':this.t('close')})])]);
      const meta=e('div',{class:'rr-meta'},this.report?[e('code',{},[this.report.branch]),R.link(this.report.sha.slice(0,7),`${R.repoUrl(this.report.ref)}/commit/${this.report.sha}`),e('span',{},[this.t(this.report.fromCache?'cached':'fresh')]),e('span',{},[new Date(this.report.inspectedAt).toLocaleString(this.lang==='ko'?'ko-KR':'en-US')])]:[this.t('defaultOnly')]);
      const input=e('input',{id:'rr-directory',class:'rr-input',value:this.folder,placeholder:this.t('root'),autocomplete:'off',list:'rr-directories',disabled:this.busy});
      const form=e('form',{class:'rr-scope',onSubmit:ev=>{ev.preventDefault();this.inspect(true);}},[e('label',{for:'rr-directory'},[this.t('scope'),input]),e('button',{type:'submit',class:'rr-button primary',disabled:this.busy},[this.t('analyze')]),e('datalist',{id:'rr-directories'},(this.report?.children||[]).map(x=>e('option',{value:x})))]);
      const identity=e('div',{class:'rr-identity'},[e('div',{class:'rr-repo'},[`${this.ref.owner} / ${this.ref.repo}`]),meta,form]);
      const tabs=e('div',{class:'rr-tabs',role:'tablist','aria-label':'RepoRun'});
      const names=['overview','commands','evidence'];
      for(const name of names){const tab=e('button',{type:'button',class:'rr-tab',role:'tab',id:`rr-tab-${name}`,'aria-selected':String(this.tab===name),'aria-controls':'rr-tabpanel',tabindex:this.tab===name?'0':'-1',onClick:()=>{this.tab=name;this.render();this.shadow.querySelector(`#rr-tab-${name}`)?.focus();},onKeyDown:ev=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(ev.key)){ev.preventDefault();this.tab=ev.key==='Home'?names[0]:ev.key==='End'?names[2]:names[(names.indexOf(name)+(ev.key==='ArrowRight'?1:2))%3];this.render();this.shadow.querySelector(`#rr-tab-${this.tab}`)?.focus();}}},[this.t(name)]);tabs.append(tab);}
      const content=e('div',{class:'rr-scroll',id:'rr-tabpanel',role:'tabpanel','aria-labelledby':`rr-tab-${this.tab}`,'aria-busy':String(this.busy),tabindex:'0'});
      if(this.busy)content.append(e('div',{class:'rr-empty',role:'status'},[e('div',{class:'rr-progress'}),e('h2',{},[this.t('loading')]),e('p',{class:'rr-muted'},[this.t('loadingNote')])]));
      else if(this.error)content.append(e('div',{class:'rr-empty'},[e('h2',{},['RepoRun']),e('p',{class:'rr-callout error',role:'alert'},[R.errorText(this.error,this.lang)]),R.button(this.t('retry'),()=>this.inspect(true),'primary')]));
      else if(this.report)content.append(this[this.tab]());
      else content.append(e('p',{class:'rr-muted'},[this.t('empty')]));
      const info=this.report?`${this.report.filesRead} ${this.t('filesRead')} · ${this.report.requests} ${this.t('apiRequests')}`:this.t('nothingRun');
      const footer=e('footer',{class:'rr-footer'},[e('div',{},[e('div',{},[info]),this.report?e('div',{},[this.t('nothingRun')]):null]),R.button(this.t('export'),()=>{if(this.report&&window.confirm(this.t('exportConfirm')))R.download(`RepoRun-${this.ref.owner}-${this.ref.repo}-${this.report.sha.slice(0,7)}.md`,R.reportText(this.report,this.lang));},'quiet',{disabled:!this.report||this.busy})]);
      this.dialog.replaceChildren(e('div',{class:'rr-shell'},[header,identity,tabs,content,footer]));
    }
  };
})();
