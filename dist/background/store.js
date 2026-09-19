/* Session-only credentials/reports. Only the language preference is durable. */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  R.Store = class {
    constructor(storage, now = Date.now) {
      this.storage = storage; this.now = now; this.serial = R.queue();
      this.ready = Promise.all([
        storage.local.setAccessLevel({ accessLevel:'TRUSTED_CONTEXTS' }),
        storage.session.setAccessLevel({ accessLevel:'TRUSTED_CONTEXTS' })
      ]).then(async () => {
        const x = await storage.session.get('rr.auth');
        if (!x['rr.auth']) await storage.session.set({ 'rr.auth':{ token:'', epoch:crypto.randomUUID() } });
      });
    }
    async settings() { await this.ready; return R.settings((await this.storage.local.get('rr.settings'))['rr.settings']); }
    async language(language) { R.assert(['en','ko'].includes(language)); await this.ready; await this.storage.local.set({ 'rr.settings':{language} }); return {language}; }
    async auth() { await this.ready; return (await this.storage.session.get('rr.auth'))['rr.auth']; }
    async setToken(token) {
      R.assert(typeof token === 'string' && (token === '' || /^[A-Za-z0-9_-]{20,255}$/.test(token)), 'INVALID_TOKEN');
      await this.ready;
      return this.serial(async () => {
        await this.storage.session.set({ 'rr.auth':{ token, epoch:crypto.randomUUID() }, 'rr.reports':{}, 'rr.rate':{} });
        return {hasToken:Boolean(token)};
      });
    }
    async clear() { await this.ready; return this.serial(async () => { const old = await this.auth(); await this.storage.session.set({ 'rr.auth':{...old, epoch:crypto.randomUUID()}, 'rr.reports':{} }); return {}; }); }
    async cached(key, epoch) {
      await this.ready;
      const x = (await this.storage.session.get('rr.reports'))['rr.reports']?.[key];
      return x && x.epoch === epoch && this.now() - x.at < R.LIMITS.cacheMs ? x.report : null;
    }
    async put(key, report, epoch) {
      await this.ready;
      return this.serial(async () => {
        R.assert((await this.auth()).epoch === epoch, 'AUTH_CHANGED');
        const cache = (await this.storage.session.get('rr.reports'))['rr.reports'] || {};
        for (const [k,v] of Object.entries(cache)) if (this.now() - v.at >= R.LIMITS.cacheMs || v.epoch !== epoch) delete cache[k];
        cache[key] = {at:this.now(),epoch,report};
        const keys = Object.keys(cache).sort((a,b) => cache[a].at-cache[b].at);
        while (keys.length && (keys.length > R.LIMITS.reports || new TextEncoder().encode(JSON.stringify(cache)).length > R.LIMITS.cacheBytes)) delete cache[keys.shift()];
        await this.storage.session.set({ 'rr.reports':cache });
      });
    }
    async rate() { await this.ready; return (await this.storage.session.get('rr.rate'))['rr.rate'] || {}; }
    async setRate(value, epoch) { await this.ready; return this.serial(async () => { if ((await this.auth()).epoch === epoch) await this.storage.session.set({'rr.rate':value}); }); }
  };
})();
