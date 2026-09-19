/* Deterministic, evidence-first interpretation of a single directory snapshot. */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  const textValue = x => typeof x === 'string' || typeof x === 'number';
  R.analyze = input => {
    const { ref, sha, folder = '', files = {}, inventory = [] } = input;
    R.validateRef(ref); R.assert(R.sha(sha));
    const rows = [], commands = [], env = [], notices = [], readme = [], services = [];
    const byName = new Map(inventory.map(x => [x.name, x]));
    const exists = n => byName.has(n) && byName.get(n).mode !== '120000' && byName.get(n).type === 'blob';
    const ev = (name, field = '', line = 0) => ({ path: R.fullPath(folder, name), field, line, url: R.fileUrl(ref, sha, R.fullPath(folder, name), line) });
    const row = (id, value, status, evidence = [], note = '') => rows.push({ id, value: R.clean(value, 800), status, evidence, note });
    const parse = name => {
      if (!Object.hasOwn(files, name)) return null;
      try { const value = JSON.parse(files[name].replace(/^\uFEFF/, '')); if (!R.object(value)) throw Error(); return value; }
      catch { notices.push({ code: 'invalidJson', evidence: ev(name) }); return null; }
    };
    const pkg = parse('package.json');
    row('project', pkg ? 'Node.js / JavaScript package' : exists('index.html') ? 'HTML entry point' : '', pkg || exists('index.html') ? 'declared' : 'unknown', pkg ? [ev('package.json')] : exists('index.html') ? [ev('index.html')] : [], pkg ? 'packageNotGuarantee' : exists('index.html') ? 'htmlNotGuarantee' : 'unsupported');
    const runtimes = [], runtimeEv = [];
    if (R.object(pkg?.engines)) for (const [name, value] of Object.entries(pkg.engines)) {
      if (['node','npm','yarn','pnpm','bun','deno'].includes(name) && textValue(value)) { runtimes.push(`engines.${name}: ${value}`); runtimeEv.push(ev('package.json', `engines.${name}`)); }
    }
    if (R.object(pkg?.volta)) for (const name of ['node','npm','yarn','pnpm']) if (textValue(pkg.volta[name])) { runtimes.push(`volta.${name}: ${pkg.volta[name]}`); runtimeEv.push(ev('package.json', `volta.${name}`)); }
    for (const name of ['.nvmrc','.node-version']) if (typeof files[name] === 'string') {
      const line = files[name].split(/\r?\n/).findIndex(x => x.trim() && !x.trim().startsWith('#'));
      if (line >= 0) { runtimes.push(`${name}: ${files[name].split(/\r?\n/)[line].trim()}`); runtimeEv.push(ev(name, '', line + 1)); }
    }
    let toolVersionCount = 0;
    if (files['.tool-versions']) files['.tool-versions'].split(/\r?\n/).forEach((line, i) => {
      if (/^\s*nodejs\s+/.test(line)) {
        if (toolVersionCount++ < R.LIMITS.runtimeFileEntries) { runtimes.push(line.trim()); runtimeEv.push(ev('.tool-versions', '', i + 1)); }
      }
    });
    if (toolVersionCount > R.LIMITS.runtimeFileEntries) notices.push({code:'runtimeFileLimit', evidence:ev('.tool-versions')});
    const devEntries = key => { const x = pkg?.devEngines?.[key]; return Array.isArray(x) ? x.slice(0,20) : R.object(x) ? [x] : []; };
    for (const x of devEntries('runtime')) if (typeof x.name === 'string') { runtimes.push(`devEngines.runtime: ${x.name}${textValue(x.version) ? ` ${x.version}` : ''}${x.onFail ? ` (onFail: ${x.onFail})` : ''}`); runtimeEv.push(ev('package.json','devEngines.runtime')); }
    row('runtime', runtimes.join('\n'), runtimes.length ? 'declared' : 'unknown', runtimeEv, runtimes.length > 1 ? 'versionsNotResolved' : 'versionNotInstalled');
    const managers = [], managerEv = [], locks = [];
    if (typeof pkg?.packageManager === 'string') { managers.push(pkg.packageManager); managerEv.push(ev('package.json','packageManager')); }
    for (const x of devEntries('packageManager')) if (typeof x.name === 'string') { managers.push(`${x.name}${x.version ? `@${x.version}` : ''}`); managerEv.push(ev('package.json','devEngines.packageManager')); }
    for (const [name, manager] of Object.entries({ 'package-lock.json':'npm','npm-shrinkwrap.json':'npm','pnpm-lock.yaml':'pnpm','yarn.lock':'yarn','bun.lock':'bun','bun.lockb':'bun' })) if (exists(name)) locks.push({ name, manager });
    row('manager', managers.length ? managers.join('\n') : [...new Set(locks.map(x => x.manager))].join(' / '), managers.length ? 'declared' : locks.length ? 'inferred' : 'unknown', managers.length ? managerEv : locks.map(x => ev(x.name)), managers.length ? 'managerDeclaration' : 'lockHint');
    const declaredManagerNames = managers.map(x => /^(npm|pnpm|yarn|bun)(?:@|$)/.exec(x)?.[1]).filter(Boolean);
    if (new Set([...locks.map(x => x.manager), ...declaredManagerNames]).size > 1) notices.push({ code:'mixedManagers', evidence:locks.map(x => ev(x.name)) });
    const scripts = R.object(pkg?.scripts) ? Object.entries(pkg.scripts).filter(([,v]) => typeof v === 'string') : [];
    const rank = ['dev','start','build','preview','test','lint'];
    scripts.sort(([a],[b]) => (rank.includes(a) ? rank.indexOf(a) : 20) - (rank.includes(b) ? rank.indexOf(b) : 20) || a.localeCompare(b));
    for (const [name, raw] of scripts.slice(0,R.LIMITS.scripts)) {
      const command = R.clean(raw, 2000);
      commands.push({ name:R.clean(name,100), command, copyable:command === raw && !/[\x00-\x1f\x7f]/.test(raw), evidence:ev('package.json',`scripts.${R.clean(name,100)}`), hook:/^(preinstall|install|postinstall|prepare|prepublish|prepublishOnly|prepack|postpack)$/.test(name) });
    }
    if (scripts.length > R.LIMITS.scripts) notices.push({ code:'scriptLimit' });
    if (commands.some(x => x.hook)) notices.push({ code:'installHooks', evidence:ev('package.json','scripts') });
    row('build', typeof pkg?.scripts?.build === 'string' ? R.clean(pkg.scripts.build,500) : '', typeof pkg?.scripts?.build === 'string' ? 'declared' : 'unknown', typeof pkg?.scripts?.build === 'string' ? [ev('package.json','scripts.build')] : [], 'buildNotExecuted');
    const workspace = pkg?.workspaces;
    const patterns = Array.isArray(workspace) ? workspace : R.object(workspace) && Array.isArray(workspace.packages) ? workspace.packages : [];
    if (patterns.length || exists('pnpm-workspace.yaml')) {
      row('workspace', patterns.filter(x => typeof x === 'string').slice(0,12).join(', ') || 'pnpm-workspace.yaml', 'declared', patterns.length ? [ev('package.json','workspaces')] : [ev('pnpm-workspace.yaml')], 'workspaceNotExpanded');
    }
    const platform = ['os','cpu','libc'].filter(k => Array.isArray(pkg?.[k])).map(k => `${k}: ${pkg[k].filter(x => typeof x === 'string').join(', ')}`);
    if (platform.length) row('platform', platform.join('\n'), 'declared', platform.map((_,i) => ev('package.json', ['os','cpu','libc'].filter(k => Array.isArray(pkg?.[k]))[i])), 'noDeviceCheck');
    for (const name of ['.env.example','.env.sample','.env.template','.env.local.example']) if (Object.hasOwn(files,name)) {
      files[name].split(/\r?\n/).forEach((line,i) => {
        const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
        if (m && env.length < R.LIMITS.environment && !env.some(x => x.name === m[1])) env.push({ name:m[1], evidence:ev(name,'',i+1) });
      });
    }
    if (env.length === R.LIMITS.environment) notices.push({ code:'envLimit' });
    let dockerImageCount = 0;
    if (files.Dockerfile) files.Dockerfile.split(/\r?\n/).forEach((line,i) => {
      const m = /^\s*FROM\s+(?:--platform=\S+\s+)?([^\s]+)(?:\s+AS\s+\S+)?\s*$/i.exec(line);
      if (m && dockerImageCount++ < R.LIMITS.containerImages) services.push({ kind:'image', value:R.clean(m[1],180), evidence:ev('Dockerfile','',i+1), note:'dockerNotRequired' });
    });
    if (dockerImageCount > R.LIMITS.containerImages) notices.push({code:'dockerImageLimit', evidence:ev('Dockerfile')});
    for (const name of ['compose.yaml','compose.yml','docker-compose.yml','docker-compose.yaml']) if (exists(name)) {
      services.push({ kind:'compose', value:name, evidence:ev(name), note:'composeNotParsed' });
    }
    const deps = { ...(R.object(pkg?.devDependencies) ? pkg.devDependencies : {}), ...(R.object(pkg?.dependencies) ? pkg.dependencies : {}) };
    const frameworks = ['next','nuxt','vite','astro','@sveltejs/kit','react-scripts','express','fastify','@nestjs/core','electron'].filter(k => Object.hasOwn(deps,k));
    if (frameworks.length) row('framework', frameworks.join(', '), 'declared', frameworks.map(k => ev('package.json', `dependencies / devDependencies: ${k}`)), 'frameworkNotDeploy');
    const browserManifest = parse('manifest.json');
    if ([2,3].includes(browserManifest?.manifest_version)) row('extension', `Manifest V${browserManifest.manifest_version}`, 'declared', [ev('manifest.json','manifest_version')], 'extensionNotWeb');
    const deploy = ['vercel.json','netlify.toml', ...Array.from(byName.keys()).filter(n => /^(?:vite|next|nuxt|astro|svelte)\.config\./.test(n))].filter(exists);
    if (deploy.length) row('deploymentFiles', deploy.join(', '), 'declared', deploy.map(x => ev(x)), 'configNotExecuted');
    row('staticDeploy', '', 'unknown', exists('index.html') ? [ev('index.html')] : [], 'staticNotGuaranteed');
    const readmeName = ['README.md','README.MD','readme.md','README'].find(n => Object.hasOwn(files,n));
    if (readmeName) {
      let inFence = false, shell = false, marker = '', count = 0;
      files[readmeName].split(/\r?\n/).forEach((line,i) => {
        const fence = /^\s*(`{3,}|~{3,})(\S*)/.exec(line);
        if (fence) {
          if (!inFence) { inFence = true; marker = fence[1][0]; shell = ['','sh','bash','shell','console','powershell','cmd','zsh'].includes(fence[2].toLowerCase()); }
          else if (fence[1][0] === marker) { inFence = false; shell = false; }
          return;
        }
        if (inFence && shell && /^\s*(?:\$\s*)?(?:npm|npx|pnpm|yarn|bun|node|corepack|docker)\s+/.test(line) && count < 6) {
          const value = R.clean(line,600); readme.push({ value, evidence:ev(readmeName,'',i+1), copyable:value === line && !/^\s*\$/.test(line) }); count++;
        }
      });
    }
    if (folder) notices.push({ code:'folderScope' });
    if (input.truncated) notices.push({ code:'partialTree' });
    for (const file of inventory) if (file.state === 'skipped' || file.state === 'error') notices.push({ code:file.reason || 'skippedFile', evidence:ev(file.name) });
    return { ...input.meta, ref, sha, folder, rows, commands, env, services, readme, notices, inventory:inventory.map(({name,path,type,mode,state,reason,size}) => ({name,path,type,mode,state,reason,size})), inspectedAt:input.inspectedAt || Date.now(), scope:'directory', schemaVersion:1 };
  };
})();
