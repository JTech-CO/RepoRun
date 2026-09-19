"""Offline browser integration and native Worker regression. Requires Playwright.
Runs without GitHub or token access. Does NOT certify installed MV3 behavior.
"""
from pathlib import Path
import base64
import json
import os
import shutil
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-results'
OUT.mkdir(exist_ok=True)
SHOTS = ROOT / 'docs' / 'screenshots'
SHOTS.mkdir(exist_ok=True, parents=True)
results = []
errors = []

def check(name, value):
    ok = bool(value)
    results.append({'name': name, 'pass': ok})
    if not ok:
        raise AssertionError(name)

def setup(browser, mode='content', scheme='light', width=1280, height=980):
    context = browser.new_context(viewport={'width':width,'height':height}, color_scheme=scheme)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    if mode == 'content':
        html = (ROOT/'qa/index.html').read_text()
    else:
        html = (ROOT/f'public/{mode}.html').read_text()
    html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html, flags=re.I)
    html = re.sub(r'<link\b[^>]*>', '', html, flags=re.I)
    page.set_content(html)
    page.evaluate('(mode)=>{globalThis.RR_MODE=mode;}', mode)
    logo = 'data:image/svg+xml;base64,'+base64.b64encode((ROOT/'public/icons/logo.svg').read_bytes()).decode()
    page.evaluate('(data)=>{globalThis.RR_LOGO_DATA=data;}', logo)
    paths = ['src/shared/core.js','src/shared/analyzer.js','src/shared/i18n.js','src/shared/ui.js','src/shared/styles.js','src/background/store.js','src/background/github.js','src/background/service.js','qa/fixtures.js','qa/adapter.js']
    paths += ['src/content/panel.js','src/content/placement.js','src/content/index.js'] if mode=='content' else [f'src/{mode}/index.js']
    for path in paths:
        page.add_script_tag(content=(ROOT/path).read_text())
    return context,page

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome'), headless=True, args=['--no-sandbox'])
    context,page=setup(browser)
    page.get_by_role('button',name='Run setup',exact=True).wait_for()
    check('no GitHub requests from a page visit',page.evaluate('rrQA.calls.length')==0)
    check('one injected badge',page.locator('#reporun-button-host').count()==1)
    page.get_by_role('button',name='Run setup',exact=True).click()
    page.locator('.rr-facts').wait_for()
    check('overview displays runtime declaration',page.locator('.rr-facts').inner_text().find('>=22')>=0)
    check('overview shows explicit unknown static compatibility','Static hosting compatibility' in page.locator('.rr-facts').inner_text() and page.locator('.rr-status.unknown').count()>0)
    check('environment values never reach the rendered panel','fixture_value_do_not_show' not in page.locator('.rr-dialog').inner_text())
    check('environment names present','API_BASE_URL' in page.locator('.rr-dialog').inner_text())
    check('all logo resources decode',page.locator('.rr-logo').evaluate_all('(xs)=>xs.every(x=>x.complete&&x.naturalWidth>0)'))
    links=page.locator('.rr-dialog .rr-sources a').evaluate_all('(xs)=>xs.map(x=>x.href)')
    check('all evidence is commit-pinned',len(links)>0 and all('a49d85e211029f2f055bafbc5adb9fdff34451b8' in x for x in links))
    check('scan uses read-only GET requests',page.evaluate('rrQA.calls.every(x=>x.method==="GET")'))
    page.screenshot(path=str(SHOTS/'01-overview-en.png'))
    page.get_by_role('tab',name='Commands',exact=True).click()
    check('literal scripts are visible','vite --host' in page.locator('.rr-scroll').inner_text())
    check('no execute control is present',page.get_by_role('button',name='Run command',exact=True).count()==0)
    check('README commands are extracted','pnpm install' in page.locator('.rr-scroll').inner_text())
    # Clipboard test shim only: the UI receives a normal resolved clipboard promise.
    page.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{rrQA.copied=text;}}})')
    page.get_by_role('button',name='Copy script text',exact=True).first.click()
    check('copy uses visible script text',page.evaluate('rrQA.copied')=='vite --host')
    check('copy does not make an API request',page.evaluate('rrQA.calls.length')==8)
    page.screenshot(path=str(SHOTS/'03-commands-en.png'))
    page.get_by_role('tab',name='Evidence',exact=True).click()
    check('evidence differentiates presence-only files','Presence only' in page.locator('.rr-scroll').inner_text())
    check('real .env excluded from report inventory',page.locator('.rr-table a').evaluate_all('(xs)=>!xs.some(x=>x.textContent===".env")'))
    page.get_by_role('tab',name='Evidence',exact=True).press('ArrowLeft')
    check('keyboard tabs change selection',page.get_by_role('tab',name='Commands',exact=True).get_attribute('aria-selected')=='true')
    page.get_by_role('button',name='Switch language').click()
    page.get_by_role('tab',name='개요',exact=True).click()
    check('Korean locale applied','런타임 선언' in page.locator('.rr-dialog').inner_text())
    page.emulate_media(color_scheme='dark')
    check('GitHub dark tokens inherited',page.locator('.rr-dialog').evaluate('(x)=>getComputedStyle(x).backgroundColor')=='rgb(13, 17, 23)')
    page.screenshot(path=str(SHOTS/'02-overview-ko-dark.png'))
    page.get_by_role('tab',name='명령',exact=True).click()
    page.screenshot(path=str(SHOTS/'04-commands-ko-dark.png'))
    page.keyboard.press('Escape')
    check('Escape closes the dialog',page.locator('.rr-dialog').count()==0)
    check('focus returns to injected badge',page.evaluate('document.activeElement?.shadowRoot?.activeElement?.tagName')=='BUTTON')
    before=page.evaluate('rrQA.calls.length');page.get_by_role('button',name='실행 조건',exact=True).click();page.locator('.rr-facts').wait_for()
    check('reopening a fresh report uses cache',page.evaluate('rrQA.calls.length')==before)
    check('cache status shown','세션 캐시' in page.locator('.rr-meta').inner_text())
    page.locator('#rr-directory').fill('examples');page.get_by_role('button',name='분석',exact=True).click();page.locator('.rr-facts').wait_for()
    check('subdirectory warning present','상위 런타임' in page.locator('.rr-scroll').inner_text())
    check('subdirectory source links remain pinned',page.locator('.rr-sources a').first.get_attribute('href').find('/examples/package.json')>=0)
    page.evaluate('rrQA.notify("STATE_CHANGED")')
    check('credential/cache change invalidates visible report',page.locator('.rr-facts').count()==0)
    page.locator('#rr-directory').fill('../secret');page.get_by_role('button',name='분석',exact=True).click()
    check('path traversal rejected by UI', '지원하지 않는' in page.locator('.rr-dialog').inner_text())
    page.locator('#rr-directory').fill('');page.evaluate('rrQA.fault="401"');page.get_by_role('button',name='분석',exact=True).click();page.get_by_role('alert').wait_for()
    check('HTTP 401 is not a generic network message','401' in page.get_by_role('alert').inner_text())
    page.evaluate('rrQA.fault="NETWORK"');page.get_by_role('button',name='다시 시도',exact=True).click();page.get_by_role('alert').wait_for()
    check('network error retains actual browser detail','Failed to fetch' in page.get_by_role('alert').inner_text())
    page.evaluate('rrQA.fault=null');page.get_by_role('button',name='다시 시도',exact=True).click();page.locator('.rr-facts').wait_for()
    page.set_viewport_size({'width':430,'height':900})
    check('compact dialog stays within viewport',page.locator('.rr-dialog').evaluate('(x)=>x.getBoundingClientRect().right<=innerWidth&&x.getBoundingClientRect().left>=0'))
    check('compact panel has no horizontal overflow',page.locator('.rr-scroll').evaluate('(x)=>x.scrollWidth<=x.clientWidth+1'))
    page.screenshot(path=str(SHOTS/'05-compact-ko.png'))
    page.keyboard.press('Escape')
    page.evaluate('rrQA.virtualURL="https://github.com/settings/tokens";window.dispatchEvent(new Event("popstate"));')
    page.wait_for_timeout(250)
    check('badge removed on non-repository route',page.locator('#reporun-button-host').count()==0)
    context.close()
    context,page=setup(browser,'options')
    page.locator('#rr-token').wait_for()
    check('settings makes no automatic GitHub request',page.evaluate('rrQA.calls.length')==0)
    page.locator('#rr-token').fill('github_pat_synthetic_test_token_123456')
    page.get_by_role('button',name='Save for this session',exact=True).click()
    page.get_by_text('Session token saved.',exact=False).wait_for()
    check('token save does not claim authentication success','not yet been verified' in page.locator('.rr-flash').inner_text())
    check('token field cleared after save',page.locator('#rr-token').input_value()=='')
    check('token not leaked in local settings',page.evaluate('!JSON.stringify(rrQA.state.local).includes("github_pat_")'))
    page.get_by_role('button',name='Check API connection',exact=True).click()
    page.get_by_text('HTTP 200',exact=False).first.wait_for()
    check('anonymous and saved-token diagnostics both complete',page.get_by_text('HTTP 200',exact=False).count()==2)
    check('diagnostics explicitly are not repository authorization proof','not proof of access' in page.locator('.rr-settings').inner_text())
    page.locator('#rr-language').select_option('ko')
    page.get_by_role('heading',name='RepoRun 설정').wait_for()
    check('settings supports Korean',page.locator('#rr-language').input_value()=='ko')
    page.screenshot(path=str(SHOTS/'06-options-ko.png'),full_page=True)
    page.get_by_role('button',name='토큰 삭제',exact=True).click()
    page.get_by_text('세션 토큰과 캐시를 삭제했습니다.',exact=True).wait_for()
    check('token removal empties session credential',page.evaluate('rrQA.state.session["rr.auth"].token')=='')
    context.close()
    context,page=setup(browser,'popup')
    page.get_by_role('button',name='Inspect run requirements',exact=True).wait_for()
    check('popup recognizes active GitHub repository','octo/demo' in page.locator('.rr-popup').inner_text())
    check('popup icon decodes',page.locator('.rr-logo').evaluate('(x)=>x.naturalWidth===128'))
    page.get_by_role('button',name='Open settings',exact=True).click()
    check('popup settings control has a real handler',page.evaluate('rrQA.optionsOpened')==1)
    context.close()
    # Native WorkerGlobalScope.fetch, using the production client's constructor.
    context=browser.new_context();page=context.new_page();page.set_content('<p>Native worker receiver regression</p>')
    code=(ROOT/'src/shared/core.js').read_text()+'\n'+(ROOT/'src/background/github.js').read_text()+'''
    onmessage=async()=>{const out={};try{const bad={fetcher:self.fetch};await bad.fetcher('data:text/plain,ok');out.unbound='unexpected success';}catch(e){out.unbound=e.message;}try{const api=new RepoRun.GitHub({});const response=await api.fetcher('data:text/plain,ok');out.production={status:response.status,text:await response.text()};}catch(e){out.production={error:e.message};}postMessage(out);};'''
    result=page.evaluate('''code=>new Promise(resolve=>{const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const w=new Worker(url);const t=setTimeout(()=>{w.terminate();resolve({error:'timeout'});},8000);w.onmessage=e=>{clearTimeout(t);w.terminate();URL.revokeObjectURL(url);resolve(e.data);};w.onerror=e=>{clearTimeout(t);resolve({error:e.message});};w.postMessage({});})''',code)
    check('native Worker reproduces unbound Illegal invocation','Illegal invocation' in result.get('unbound',''))
    check('production client bound fetch returns HTTP 200 in native Worker',result.get('production')=={'status':200,'text':'ok'})
    (OUT/'native-worker.json').write_text(json.dumps(result,indent=2))
    context.close()
    check('no unhandled browser page errors',not errors)
    (OUT/'browser.json').write_text(json.dumps({'browser':browser.version,'checks':results,'pageErrors':errors,'mode':'offline simulated Chrome/GitHub plus native dedicated Worker fetch'},ensure_ascii=False,indent=2))
    browser.close()
print(f'Browser checks: {len(results)} passed; page errors: {len(errors)}')
