/* Pure validation and display helpers. No repository code is executed. */
(() => {
  'use strict';
  const R = globalThis.RepoRun = globalThis.RepoRun || {};
  R.VERSION = '1.0.1';
  R.currentUrl = () => globalThis.location.href;
  R.API_VERSION = '2026-03-10';
  R.LIMITS = Object.freeze({ fileBytes: 131072, files: 14, responseBytes: 2000000, treeEntries: 10000, scripts: 40, environment: 100, runtimeFileEntries: 30, containerImages: 20, cacheMs: 300000, reports: 8, cacheBytes: 1500000, timeout: 15000, depth: 5 });
  R.Error = class extends Error {
    constructor(code, status = 0, detail = '', retryAt = 0) { super(code); this.name = 'RepoRunError'; Object.assign(this, { code, status, detail, retryAt }); }
  };
  R.fail = (code, status = 0, detail = '', retryAt = 0) => { throw new R.Error(code, status, detail, retryAt); };
  R.assert = (test, code = 'INVALID_INPUT') => { if (!test) R.fail(code); };
  R.object = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
  R.sha = x => typeof x === 'string' && /^[a-f0-9]{40}$/i.test(x);
  R.validateRef = ref => {
    R.assert(R.object(ref) && typeof ref.owner === 'string' && typeof ref.repo === 'string');
    R.assert(/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(ref.owner));
    R.assert(/^[a-z\d_.-]{1,100}$/i.test(ref.repo) && !['.', '..'].includes(ref.repo));
    return { owner: ref.owner, repo: ref.repo };
  };
  const reserved = new Set(['settings','notifications','search','explore','marketplace','login','logout','signup','orgs','organizations','users','topics','collections','sponsors','features','about','pricing','security','new','codespaces','apps','account','site','contact','enterprise','readme']);
  R.parseRepo = url => {
    try {
      const u = new URL(url); if (u.origin !== 'https://github.com' || u.username || u.password) return null;
      const [owner, repo] = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (!owner || !repo || reserved.has(owner.toLowerCase())) return null;
      return R.validateRef({ owner, repo });
    } catch { return null; }
  };
  R.key = ref => { const r = R.validateRef(ref); return `${r.owner}/${r.repo}`.toLowerCase(); };
  R.path = value => {
    R.assert(typeof value === 'string' && value.length <= 240);
    if (value === '') return '';
    const parts = value.split('/');
    R.assert(parts.length <= R.LIMITS.depth && parts.every(x => x && x !== '.' && x !== '..' && !/[\\%\x00-\x1f\x7f?#]/.test(x)));
    return parts.join('/');
  };
  R.fullPath = (folder, name) => folder ? `${folder}/${name}` : name;
  R.repoUrl = ref => { const r = R.validateRef(ref); return `https://github.com/${r.owner}/${r.repo}`; };
  R.fileUrl = (ref, sha, path, line = 0) => {
    R.assert(R.sha(sha)); R.assert(typeof path === 'string' && !path.split('/').some(x => x === '..' || x === '.'));
    return `${R.repoUrl(ref)}/blob/${sha}/${path.split('/').map(encodeURIComponent).join('/')}${Number.isInteger(line) && line > 0 ? `#L${line}` : ''}`;
  };
  // Returned strings may still contain sensitive project information. This is
  // defense in depth, not a claim to comprehensively detect secrets.
  R.redact = input => String(input ?? '')
    .replace(/\b(?:github_pat_[A-Za-z0-9_]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|sk-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED]')
    .replace(/((?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s;,]+)/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/:@]+:[^\s/@]+@/g, '$1[REDACTED]@');
  R.clean = (value, limit = 600) => R.redact(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '\uFFFD').slice(0, limit);
  R.safeError = e => R.clean(`${e?.name || 'Error'}: ${e?.message || ''}`, 180);
  R.errorObject = e => ({ code: e?.code || 'INTERNAL', status: e?.status || 0, detail: R.clean(e?.detail || '', 180), retryAt: e?.retryAt || 0 });
  R.queue = () => { let tail = Promise.resolve(); return fn => { const next = tail.then(fn); tail = next.catch(() => {}); return next; }; };
  R.settings = x => ({ language: x?.language === 'ko' ? 'ko' : 'en' });
  R.sourceNames = Object.freeze([
    'package.json', '.nvmrc', '.node-version', '.tool-versions', '.env.example', '.env.sample', '.env.template', '.env.local.example',
    'README.md', 'README.MD', 'readme.md', 'README', 'Dockerfile', 'compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml',
    'vercel.json', 'manifest.json'
  ]);
  R.recognized = name => R.sourceNames.includes(name) || ['package-lock.json','npm-shrinkwrap.json','pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb','index.html','pnpm-workspace.yaml','netlify.toml','deno.json','pyproject.toml','requirements.txt','Cargo.toml'].includes(name) || /^(?:vite|next|nuxt|astro|svelte)\.config\.(?:js|mjs|cjs|ts|mts)$/.test(name);
})();
