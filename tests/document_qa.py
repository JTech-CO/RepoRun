"""Offline documentation, asset and hostile-text rendering checks."""
from pathlib import Path
import base64
import json
import os
import shutil
import re
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,ok):
    checks.append({'name':name,'pass':bool(ok)})
    if not ok:raise AssertionError(name)
helper=(ROOT/'tests/browser_qa.py').read_text().split('with sync_playwright() as p:')[0]
ns={'__file__':str(ROOT/'tests/browser_qa.py')};exec(helper,ns)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
    for name in ('privacy-policy','help'):
        for scheme in ('light','dark'):
            context=browser.new_context(viewport={'width':1100,'height':980},color_scheme=scheme)
            page=context.new_page()
            html=(ROOT/f'public/{name}.html').read_text()
            check(f'{name} has local PNG favicon ({scheme})','href="icons/32.png?v=1.0.1"' in html)
            html=re.sub(r'<link\b[^>]*>','',html)
            src='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'public/icons/logo.svg').read_bytes()).decode()
            html=html.replace('icons/logo.svg?v=1.0.1',src)
            page.set_content(html);page.add_style_tag(content=(ROOT/'public/document.css').read_text())
            check(f'{name} {scheme} logo decoded',page.locator('.brand img').evaluate('(x)=>x.complete&&x.naturalWidth>0'))
            check(f'{name} {scheme} both languages present',page.locator('#en[lang=en]').count()==1 and page.locator('#ko[lang=ko]').count()==1)
            check(f'{name} {scheme} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            if scheme=='dark':page.screenshot(path=str(ROOT/f'docs/screenshots/{"07-privacy" if name=="privacy-policy" else "08-help"}-dark.png'))
            context.close()
    context,page=ns['setup'](browser)
    page.get_by_role('button',name='Run setup',exact=True).click();page.locator('.rr-facts').wait_for()
    # Generated report content is captured instead of performing a policy-blocked download.
    page.evaluate('RepoRun.download=(name,text)=>{rrQA.exported={name,text};}')
    page.on('dialog',lambda d:d.accept())
    page.get_by_role('button',name='Export report',exact=True).click()
    data=page.evaluate('rrQA.exported')
    check('export handler creates a Markdown filename',data['name'].endswith('.md'))
    check('export includes pinned evidence','/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/' in data['text'])
    check('export omits environment example values','fixture_value_do_not_show' not in data['text'])
    (OUT/'sample-report.md').write_text(data['text'])
    # Use the production analyzer and renderer with adversarial repository text.
    page.evaluate('''() => {
      const R=RepoRun;
      const files={'package.json':JSON.stringify({scripts:{dev:'echo "<img src=x onerror=globalThis.rrPwned=true>"'}})};
      const report=R.analyze({ref:{owner:'octo',repo:'demo'},sha:'a'.repeat(40),files,inventory:[{name:'package.json',path:'package.json',mode:'100644',type:'blob',state:'read'}],meta:{branch:'main',filesRead:1,requests:4,children:[]}});
      document.getElementById('reporun-panel-host').remove();
      rrQA.testPanel=new R.Panel({owner:'octo',repo:'demo'});
      rrQA.testPanel.report=report;rrQA.testPanel.tab='commands';rrQA.testPanel.render();rrQA.testPanel.dialog.showModal();
    }''')
    check('hostile markup remains visible literal text','<img src=x' in page.locator('.rr-command code').first.inner_text())
    check('hostile repository text does not create an HTML image',page.locator('.rr-dialog img[src=x]').count()==0)
    check('hostile onerror does not execute',page.evaluate('globalThis.rrPwned===undefined'))
    context.close()
    for size in (16,32,48,128):
        image=Image.open(ROOT/f'public/icons/{size}.png')
        check(f'PNG {size} has matching dimensions',image.size==(size,size))
    browser.close()
(OUT/'documents.json').write_text(json.dumps({'checks':checks,'notes':'Offline DOM/asset checks. Export intercepts the generated report, not a native download.'},indent=2))
print(f'Document / asset / hostile-text checks: {len(checks)} passed')
