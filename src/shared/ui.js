(() => {
  'use strict';
  const R = globalThis.RepoRun;
  R.el = (tag,attrs={},children=[]) => {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(),v);
      else if (['value','checked','disabled','hidden'].includes(k)) e[k] = v;
      else if (k === 'class') e.className = v;
      else e.setAttribute(k,String(v));
    }
    for (const child of [].concat(children)) if (child !== null && child !== undefined) e.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return e;
  };
  R.button = (text,fn,cls='',attrs={}) => R.el('button',{type:'button',class:`rr-button ${cls}`,onClick:fn,...attrs},[text]);
  R.logo = (size=28) => R.el('img',{class:'rr-logo',src:chrome.runtime.getURL('icons/logo.svg'),width:size,height:size,alt:'','aria-hidden':'true'});
  R.link = (text,url) => R.el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},[text]);
  R.rpc = async m => {
    let response; try { response = await chrome.runtime.sendMessage({namespace:'RepoRun',...m}); }
    catch { R.fail('EXTENSION_RELOADED'); }
    if (!response?.ok) { const e = response?.error || {code:'EXTENSION_RELOADED'}; throw new R.Error(e.code,e.status,e.detail,e.retryAt); }
    return response.data;
  };
  R.sources = list => R.el('div',{class:'rr-sources'},[].concat(list || []).filter(Boolean).map(x => R.link(`${x.path}${x.field ? ` › ${x.field}` : ''}${x.line ? `:${x.line}` : ''}`,x.url)));
  R.brand = () => R.el('div',{class:'rr-brand'},[R.logo(),R.el('span',{},['RepoRun'])]);
  R.copy = async (text,button,lang) => {
    try { await navigator.clipboard.writeText(text); const old = button.textContent; button.textContent = R.t(lang,'copied'); setTimeout(()=>{if(button.isConnected) button.textContent=old;},1800); }
    catch { button.textContent = R.t(lang,'copyFailed'); }
  };
  R.reportText = (report,lang) => {
    const t = key => R.t(lang,key), quote = text => String(text).split('\n').map(l => `    ${l}`).join('\n');
    const lines = ['# RepoRun report','',`${report.ref.owner}/${report.ref.repo}`,`Commit: ${report.sha}`,`Directory: ${report.folder || '/'}`,`Checked: ${new Date(report.inspectedAt).toISOString()}`,'',t('scopeNote'),t('nothingRun'),''];
    for (const row of report.rows) lines.push(`## ${t(row.id)} [${t(row.status)}]`,'',quote(row.value || t('unknown')),t(row.note),...row.evidence.map(s => s.url),'');
    lines.push(`## ${t('commands')}`,'',t('scriptNote'),'');
    for (const c of report.commands) lines.push(quote(`${c.name}: ${c.command}`),c.evidence.url,'');
    lines.push(`## ${t('environment')}`,'',t('envNote'),''); for (const v of report.env) lines.push(quote(v.name),v.evidence.url);
    lines.push('',`## ${t('containers')}`); for (const v of report.services) lines.push(quote(v.value),t(v.note),v.evidence.url);
    lines.push('',`## ${t('readme')}`,'',t('readmeNote')); for (const v of report.readme) lines.push(quote(v.value),v.evidence.url);
    lines.push('',`## ${t('notices')}`); for (const v of report.notices) lines.push(t(v.code),...[].concat(v.evidence || []).map(s => s.url));
    lines.push('',`## ${t('filesTitle')}`); for (const f of report.inventory) lines.push(quote(`${f.path}: ${t(f.state)}${f.reason ? ` (${t(f.reason)})` : ''}`));
    return lines.join('\n')+'\n';
  };
  R.download = (name,text) => { const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})); const a=R.el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); };
})();
