/* Resolve one immutable commit, then read only allowlisted regular blobs. */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  R.Service = class {
    constructor(store, api, now = Date.now) { this.store = store; this.api = api; this.now = now; this.inflight = new Map(); }
    async analyze(ref, folder = '', force = false) {
      ref = R.validateRef(ref); folder = R.path(folder);
      const auth = await this.store.auth(), key = `${R.key(ref)}:${folder}`, inflightKey = `${auth.epoch}:${key}`;
      if (this.inflight.has(inflightKey)) return this.inflight.get(inflightKey);
      if (!force) { const cached = await this.store.cached(key,auth.epoch); if (cached) { R.assert((await this.store.auth()).epoch === auth.epoch,'AUTH_CHANGED'); return {...cached,fromCache:true}; } }
      // A second caller may have entered while the session cache was read.
      if (this.inflight.has(inflightKey)) return this.inflight.get(inflightKey);
      R.assert(this.inflight.size < 3,'BUSY');
      const work = this.scan(ref,folder,auth.epoch).then(async report => { await this.store.put(key,report,auth.epoch); R.assert((await this.store.auth()).epoch === auth.epoch,'AUTH_CHANGED'); return report; });
      this.inflight.set(inflightKey,work);
      try { return await work; } finally { if (this.inflight.get(inflightKey) === work) this.inflight.delete(inflightKey); }
    }
    async scan(requestedRef, folder, epoch) {
      let requests = 0;
      const started = this.now();
      const get = async (ref,kind,arg='') => {
        R.assert(this.now() - started < 180000, 'TIMEOUT');
        requests++; return this.api.get(ref,kind,arg,epoch);
      };
      const meta = await get(requestedRef,'meta');
      R.assert(R.object(meta) && typeof meta.full_name === 'string' && typeof meta.default_branch === 'string' && Number.isSafeInteger(meta.id),'BAD_RESPONSE');
      const parts = meta.full_name.split('/'); R.assert(parts.length === 2,'BAD_RESPONSE');
      const ref = R.validateRef({owner:parts[0],repo:parts[1]});
      const commits = await get(ref,'head',meta.default_branch);
      R.assert(Array.isArray(commits),'BAD_RESPONSE'); if (!commits.length) R.fail('EMPTY_REPO');
      const sha = commits[0]?.sha; let treeSha = commits[0]?.commit?.tree?.sha;
      R.assert(R.sha(sha) && R.sha(treeSha),'BAD_RESPONSE');
      const tree = async id => {
        const result = await get(ref,'tree',id);
        R.assert(Array.isArray(result?.tree),'BAD_RESPONSE');
        return {entries:result.tree.slice(0,R.LIMITS.treeEntries).filter(e => typeof e.path === 'string' && !e.path.includes('/') && !/[\x00-\x1f]/.test(e.path) && !['.','..'].includes(e.path)), truncated:result.truncated === true || result.tree.length > R.LIMITS.treeEntries};
      };
      let listing = await tree(treeSha), wasTruncated = listing.truncated;
      for (const part of folder ? folder.split('/') : []) {
        const found = listing.entries.find(e => e.path === part && e.type === 'tree' && e.mode === '040000');
        R.assert(found && R.sha(found.sha),'DIRECTORY_NOT_FOUND');
        listing = await tree(found.sha); wasTruncated ||= listing.truncated;
      }
      const inventory = listing.entries.filter(e => R.recognized(e.path)).map(e => ({ name:e.path, path:R.fullPath(folder,e.path), type:e.type, mode:e.mode, size:e.size || 0, sha:e.sha, state:'presence', reason:'' }));
      inventory.sort((a,b) => { const ai = R.sourceNames.indexOf(a.name), bi = R.sourceNames.indexOf(b.name); return (ai < 0 ? 100 : ai)-(bi < 0 ? 100 : bi) || a.name.localeCompare(b.name); });
      const files = Object.create(null); let loaded = 0, attempted = 0;
      for (const item of inventory) {
        if (item.type !== 'blob' || !['100644','100755'].includes(item.mode)) { item.state = 'skipped'; item.reason = 'nonRegular'; continue; }
        if (!R.sourceNames.includes(item.name)) continue;
        if (item.size > R.LIMITS.fileBytes) { item.state='skipped'; item.reason='oversize'; continue; }
        if (attempted >= R.LIMITS.files) { item.state='skipped'; item.reason='fileLimit'; continue; }
        if (!R.sha(item.sha)) { item.state='error'; item.reason='invalidBlob'; continue; }
        try {
          attempted++;
          const blob = await get(ref,'blob',item.sha);
          R.assert(blob?.encoding === 'base64' && typeof blob.content === 'string' && Number.isFinite(blob.size),'BAD_RESPONSE');
          R.assert(blob.size <= R.LIMITS.fileBytes && blob.content.length <= 185000,'TOO_LARGE');
          const raw = atob(blob.content.replace(/\s/g,'')); R.assert(raw.length <= R.LIMITS.fileBytes,'TOO_LARGE');
          const decoded = new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c => c.charCodeAt(0)));
          if (decoded.startsWith('version https://git-lfs.github.com/spec/')) { item.state='skipped'; item.reason='lfsPointer'; continue; }
          if (decoded.includes('\u0000')) { item.state='skipped'; item.reason='nonText'; continue; }
          files[item.name] = decoded; item.state='read'; loaded++;
        } catch (error) {
          if (['TOKEN_REJECTED','FORBIDDEN','RATE_LIMIT','NETWORK','TIMEOUT','AUTH_CHANGED','CLIENT_ERROR','GITHUB_UNAVAILABLE','UNSAFE_REDIRECT'].includes(error.code)) throw error;
          item.state='error'; item.reason=error.code === 'TOO_LARGE' ? 'oversize' : 'fileReadFailed';
        }
      }
      R.assert((await this.store.auth()).epoch === epoch,'AUTH_CHANGED');
      const children = listing.entries.filter(e => e.type === 'tree' && !['node_modules','.git'].includes(e.path)).slice(0,40).map(e => R.fullPath(folder,e.path));
      return R.analyze({ref,sha,folder,files,inventory,truncated:wasTruncated,inspectedAt:this.now(),meta:{branch:R.clean(meta.default_branch,255),private:meta.private === true,repoId:meta.id,fromCache:false,requests,children,filesRead:loaded,totalEntries:listing.entries.length}});
    }
    async reset(token) { this.api.cancel(); return token === undefined ? this.store.clear() : this.store.setToken(token); }
  };
  R.authorize = (message,sender,runtimeId) => {
    R.assert(R.object(message) && message.namespace === 'RepoRun' && sender?.id === runtimeId,'FORBIDDEN');
    const trusted = typeof sender.url === 'string' && sender.url.startsWith(`chrome-extension://${runtimeId}/`);
    const common = ['BOOT','ANALYZE','OPEN_OPTIONS','LANGUAGE'];
    R.assert((trusted ? [...common,'OPTIONS','TOKEN','CLEAR','DIAGNOSTICS'] : common).includes(message.type),'FORBIDDEN');
    if (!trusted) { const ref = R.parseRepo(sender.url); R.assert(sender.tab && ref && [0,undefined].includes(sender.frameId),'FORBIDDEN'); R.assert(R.key(ref) === R.key(message.ref),'FORBIDDEN'); }
    return trusted;
  };
  R.dispatch = async (m,sender,service,runtimeId,openOptions=()=>{}) => {
    R.authorize(m,sender,runtimeId);
    switch(m.type) {
      case 'BOOT': return {settings:await service.store.settings()};
      case 'ANALYZE': return service.analyze(m.ref,m.folder || '',m.force === true);
      case 'OPEN_OPTIONS': await openOptions(); return {};
      case 'LANGUAGE': return service.store.language(m.language);
      case 'OPTIONS': return {settings:await service.store.settings(),hasToken:Boolean((await service.store.auth()).token),rate:await service.store.rate()};
      case 'TOKEN': R.assert(typeof m.token === 'string','INVALID_TOKEN'); return service.reset(m.token);
      case 'CLEAR': return service.reset();
      case 'DIAGNOSTICS': return service.api.diagnose();
      default: R.fail('FORBIDDEN');
    }
  };
})();
