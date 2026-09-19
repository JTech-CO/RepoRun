"""Validate install ZIP contents, asset links, permissions and listing field budgets."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
checks = []
def check(name, result):
    checks.append({'name': name, 'pass': bool(result)})
    if not result:
        raise AssertionError(name)

manifest = json.loads((ROOT / 'dist/manifest.json').read_text())
version = manifest['version']
archive = ROOT / f'releases/RepoRun-v{version}-chrome.zip'
with zipfile.ZipFile(archive) as z:
    check('ZIP CRC integrity', z.testzip() is None)
    names = set(z.namelist())
    disk = {p.relative_to(ROOT / 'dist').as_posix() for p in (ROOT / 'dist').rglob('*') if p.is_file()}
    check('manifest is at ZIP root', 'manifest.json' in names)
    check('ZIP contains precisely the dist file set', names == disk)
    check('all archived bytes equal dist bytes', all(z.read(n) == (ROOT / 'dist' / n).read_bytes() for n in names))
    check('QA tests, fixtures, env files and source-only docs excluded', all(not n.startswith(('qa/', 'qa-results/', 'tests/', 'docs/', 'scripts/')) and not n.endswith('.env') for n in names))
    check('no absolute or traversal ZIP names', all(not n.startswith('/') and '..' not in Path(n).parts for n in names))
check('version aligned', version == '1.0.1' == json.loads((ROOT/'package.json').read_text())['version'])
check('Manifest V3', manifest['manifest_version'] == 3)
check('storage is the only API permission', manifest['permissions'] == ['storage'])
check('host permissions are GitHub-only', manifest['host_permissions'] == ['https://github.com/*', 'https://api.github.com/*'])
check('only bundled SVG exposed on GitHub', manifest['web_accessible_resources'] == [{'resources':['icons/logo.svg'], 'matches':['https://github.com/*']}])
refs = [manifest['background']['service_worker'], manifest['action']['default_popup'], manifest['options_ui']['page']]
refs += list(manifest['icons'].values()) + list(manifest['action']['default_icon'].values())
refs += [f for script in manifest['content_scripts'] for f in script['js']]
check('every manifest reference exists', all((ROOT/'dist'/f).is_file() for f in refs))
check('no runtime package dependencies', not json.loads((ROOT/'package.json').read_text()).get('dependencies'))
check('public tree copied byte-for-byte', all((ROOT/'dist'/p.relative_to(ROOT/'public')).read_bytes() == p.read_bytes() for p in (ROOT/'public').rglob('*') if p.is_file()))
check('source module tree copied byte-for-byte', all((ROOT/'dist'/p.relative_to(ROOT/'src')).read_bytes() == p.read_bytes() for p in (ROOT/'src').rglob('*') if p.is_file()))
asset = json.loads((ROOT/'public/icons/assets.json').read_text())
check('SVG hash matches branding record', hashlib.sha256((ROOT/'public/icons/logo.svg').read_bytes()).hexdigest() == asset['sha256'])
check('all PNG hashes match branding record', all(hashlib.sha256((ROOT/'public/icons'/name).read_bytes()).hexdigest() == sha for name,sha in asset['generated'].items()))
for name in ['options','popup','help','privacy-policy']:
    text = (ROOT/f'dist/{name}.html').read_text()
    paths = re.findall(r'(?:src|href)="([^"#]+)"', text)
    local = [p.split('?')[0] for p in paths if not p.startswith(('http:', 'https:', 'data:', '#'))]
    check(f'{name} all local HTML links resolve', all((ROOT/'dist'/p).is_file() for p in local))
text = (ROOT/'docs/STORE-LISTING.txt').read_text()
parts = re.split(r'^<([^>]+)>\s*\n', text, flags=re.M)
fields = {parts[i]:parts[i+1].strip() for i in range(1,len(parts),2)}
for name in ['Single Purpose','storage','Host access: https://github.com/*','Host permission: https://api.github.com/*']:
    check(f'{name} within 1000 characters including spaces', 0 < len(fields[name]) <= 1000)
check('Description has no Key Features heading', 'Key Features' not in fields['Description'])
check('Description within 16000 characters', len(fields['Description']) < 16000)
check('Short Description within 132 characters', len(fields['Short Description']) <= 132)
code = '\n'.join(p.read_text() for p in (ROOT/'dist').rglob('*.js'))
check('no eval or Function-constructor execution', not re.search(r'\beval\s*\(|new\s+Function\s*\(', code))
check('no HTML injection sinks', not re.search(r'\.innerHTML\s*=|insertAdjacentHTML\s*\(', code))
check('no POST/PUT/PATCH/DELETE request methods', not re.search(r"method\s*:\s*['\"](?:POST|PUT|PATCH|DELETE)", code))
check('native fetch binding present in shipped transport', 'fetcher.bind(globalThis)' in (ROOT/'dist/background/github.js').read_text())
check('service worker imports only packaged local scripts', 'https://' not in (ROOT/'dist/background/index.js').read_text().split('const R')[0])
report={'checks':checks,'version':version,'installFiles':len(names),'installBytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'fieldCharacters':{k:len(v) for k,v in fields.items()},'note':'Static/package checks, not installed extension or live API certification.'}
(ROOT/'qa-results').mkdir(exist_ok=True)
(ROOT/'qa-results/package.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(f'Packaging checks: {len(checks)} passed; {len(names)} installed files; {archive.stat().st_size} bytes')
