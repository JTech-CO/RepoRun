"""Attempt a normal unpacked MV3 load without altering managed browser policies.
Reports facts only. This probe does not contact GitHub or use a token.
"""
from pathlib import Path
import tempfile, json, shutil, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
result={'requestedVersion':json.loads((ROOT/'dist/manifest.json').read_text())['version'],'loaded':False,'githubTested':False}
with tempfile.TemporaryDirectory(prefix='reporun-native-') as profile:
    with sync_playwright() as p:
        try:
            context=p.chromium.launch_persistent_context(profile,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),headless=True,args=['--no-sandbox',f'--disable-extensions-except={ROOT/"dist"}',f'--load-extension={ROOT/"dist"}'])
            result['browser']=context.browser.version if context.browser else 'persistent Chromium'
            try:
                worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker',timeout=6000)
                result['workerUrl']=worker.url
                result['manifest']=worker.evaluate('({name:chrome.runtime.getManifest().name,version:chrome.runtime.getManifest().version})')
                result['loaded']=result['manifest']['version']==result['requestedVersion']
            except Exception as error:
                result['workerError']=str(error)[:350]
            page=context.pages[0] if context.pages else context.new_page()
            try:
                page.goto('chrome://extensions/',timeout=6000)
                result['managementText']=page.locator('body').inner_text()[:1200]
            except Exception as error:
                result['navigationError']=str(error)[:500]
            context.close()
        except Exception as error:
            result['launchError']=str(error)[:500]
(ROOT/'qa-results/native-install.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
