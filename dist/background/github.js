/* Bound native fetch, fixed GitHub endpoints, bounded bodies, distinct failures. */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  R.GitHub = class {
    constructor(store, fetcher = globalThis.fetch, now = Date.now) {
      R.assert(typeof fetcher === 'function');
      this.fetcher = fetcher.bind(globalThis); this.store = store; this.now = now; this.controllers = new Set();
    }
    cancel() { for (const c of this.controllers) c.abort(); }
    endpoint(ref, kind, arg = '') {
      if (kind === 'diagnostic') return 'https://api.github.com/rate_limit';
      const r = R.validateRef(ref), base = `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`;
      if (kind === 'meta') return base;
      if (kind === 'head') { R.assert(typeof arg === 'string' && arg.length > 0 && arg.length <= 255 && !/[\x00-\x1f]/.test(arg)); return `${base}/commits?sha=${encodeURIComponent(arg)}&per_page=1`; }
      R.assert(['tree','blob'].includes(kind) && R.sha(arg));
      return `${base}/git/${kind === 'tree' ? 'trees' : 'blobs'}/${arg}`;
    }
    async body(response, limit) {
      const length = Number(response.headers.get('content-length') || 0);
      if (length > limit) { await response.body?.cancel(); R.fail('TOO_LARGE',response.status); }
      if (!response.body?.getReader) { const text = await response.text(); R.assert(new TextEncoder().encode(text).length <= limit,'TOO_LARGE'); return text; }
      const reader = response.body.getReader(), chunks = []; let size = 0;
      try {
        while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); R.fail('TOO_LARGE',response.status); } chunks.push(value); }
      } finally { reader.releaseLock(); }
      const out = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { out.set(chunk,offset); offset += chunk.byteLength; }
      return new TextDecoder('utf-8',{fatal:true}).decode(out);
    }
    async get(ref, kind, arg, epoch, anonymous = false) {
      const url = this.endpoint(ref,kind,arg), auth = await this.store.auth();
      R.assert(auth.epoch === epoch,'AUTH_CHANGED');
      const rate = await this.store.rate();
      if (kind !== 'diagnostic' && rate.retryAt > this.now()) R.fail('RATE_LIMIT',429,'',rate.retryAt);
      const controller = new AbortController(); this.controllers.add(controller);
      const timer = setTimeout(() => controller.abort(),R.LIMITS.timeout);
      let response;
      try {
        const headers = { Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':R.API_VERSION };
        if (auth.token && !anonymous) headers.Authorization = `Bearer ${auth.token}`;
        try { response = await this.fetcher(url,{method:'GET',headers,credentials:'omit',redirect:'follow',cache:'no-store',signal:controller.signal}); }
        catch (error) {
          R.assert((await this.store.auth()).epoch === epoch,'AUTH_CHANGED');
          if (controller.signal.aborted) R.fail('TIMEOUT');
          if (/illegal invocation|incompatible receiver/i.test(error?.message || '')) R.fail('CLIENT_ERROR',0,R.safeError(error));
          R.fail('NETWORK',0,R.safeError(error));
        }
        R.assert((await this.store.auth()).epoch === epoch,'AUTH_CHANGED');
        if (response.url) {
          const final = new URL(response.url);
          R.assert(final.origin === 'https://api.github.com' && !final.username && !final.password && (kind === 'diagnostic' ? final.pathname === '/rate_limit' : /^\/(?:repos\/|repositories\/\d+(?:\/|$))/.test(final.pathname)), 'UNSAFE_REDIRECT');
        }
        let text;
        try { text = await this.body(response,kind === 'blob' ? 220000 : R.LIMITS.responseBytes); }
        catch (error) { if (error.code) throw error; if (controller.signal.aborted) R.fail('TIMEOUT'); R.fail('BAD_RESPONSE',response.status); }
        let json = null; try { json = JSON.parse(text); } catch { /* HTTP classification takes precedence. */ }
        const remainHeader = response.headers.get('x-ratelimit-remaining');
        const remaining = remainHeader === null ? null : Number(remainHeader);
        const resetAt = Number(response.headers.get('x-ratelimit-reset') || 0)*1000;
        const retry = response.headers.get('retry-after');
        const limited = [403,429].includes(response.status) && (remaining === 0 || retry !== null || response.status === 429 || /rate limit|abuse/i.test(json?.message || ''));
        const retryAt = limited ? Math.max(this.now()+60000, Number.isFinite(Number(retry)) && retry !== null ? this.now()+Number(retry)*1000 : 0, remaining === 0 ? resetAt : 0) : 0;
        // Anonymous diagnostic responses must not overwrite an authenticated quota.
        if (!anonymous) await this.store.setRate({remaining,resetAt,retryAt},epoch);
        if (limited) R.fail('RATE_LIMIT',response.status,'',retryAt);
        if (!response.ok) R.fail(response.status === 401 ? 'TOKEN_REJECTED' : response.status === 403 ? 'FORBIDDEN' : response.status === 404 ? 'NOT_FOUND' : response.status === 409 ? 'EMPTY_REPO' : response.status >= 500 ? 'GITHUB_UNAVAILABLE' : 'API_ERROR',response.status);
        R.assert(json !== null,'BAD_RESPONSE');
        R.assert((await this.store.auth()).epoch === epoch,'AUTH_CHANGED');
        return json;
      } finally { clearTimeout(timer); this.controllers.delete(controller); }
    }
    async diagnose() {
      const auth = await this.store.auth();
      const probe = async anonymous => {
        const at = this.now();
        try { await this.get(null,'diagnostic','',auth.epoch,anonymous); return {ok:true,status:200,elapsedMs:this.now()-at}; }
        catch (e) { return {ok:false,...R.errorObject(e),elapsedMs:this.now()-at}; }
      };
      const anonymous = await probe(true); R.assert((await this.store.auth()).epoch === auth.epoch,'AUTH_CHANGED');
      const authenticated = auth.token ? await probe(false) : null;
      R.assert((await this.store.auth()).epoch === auth.epoch,'AUTH_CHANGED');
      return {anonymous,authenticated};
    }
  };
})();
