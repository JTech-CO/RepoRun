/* No API requests on page visits. Only an explicit panel action starts a scan. */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  if (R.contentStarted) return;
  R.contentStarted = true;
  let ref = null, host = null, button = null, panel = null, lang = 'en', generation = 0, timer = null;
  let watchedSidebar = null, launcherHadFocus = false;
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;

  function pageRepo() {
    const candidate = R.parseRepo(R.currentUrl());
    if (!candidate) return null;
    const meta = document.querySelector('meta[name="octolytics-dimension-repository_nwo"],meta[name="repository_nwo"]');
    if (meta) return meta.content.toLowerCase() === R.key(candidate) ? candidate : null;
    const link = document.querySelector('#repository-container-header [itemprop="name"] a, #repository-details-container [itemprop="name"] a');
    const found = link ? R.parseRepo(link.href) : null;
    return found && R.key(found) === R.key(candidate) ? candidate : null;
  }
  function paint() {
    if (!button) return;
    const label = R.t(lang, 'button');
    // Avoid changing the light DOM on every MutationObserver callback.
    button.querySelector('.rr-launcher-title').textContent = label;
    button.querySelector('.rr-launcher-note').textContent = R.t(lang, 'launcherNote');
    button.title = `RepoRun: ${R.t(lang, 'open')}`;
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = button.title;
    button.setAttribute('aria-expanded', String(Boolean(panel?.alive)));
    host.lang = lang;
    host.dataset.panelOpen = String(Boolean(panel?.alive));
  }
  function open() {
    if (!ref) return;
    if (panel?.alive) { panel.dialog.focus(); return; }
    panel = new R.Panel(ref, lang, () => { panel = null; paint(); });
    panel.open();
    panel.returnFocus = button;
    paint();
  }
  function watch(sidebar) {
    if (watchedSidebar === sidebar) return;
    resizeObserver?.disconnect();
    watchedSidebar = sidebar;
    if (sidebar) resizeObserver?.observe(sidebar);
  }
  function ensure() {
    const placement = R.resolveLauncherPlacement();
    if (!placement.target) return;
    if (!host) {
      document.getElementById('reporun-button-host')?.remove();
      host = R.el('div', { id: 'reporun-button-host' });
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.append(R.el('style', {}, [R.launcherCss]));
      button = R.el('button', { type: 'button', 'aria-haspopup': 'dialog', onClick: open }, [
        R.logo(28),
        R.el('span', { class: 'rr-launcher-copy' }, [
          R.el('span', { class: 'rr-launcher-title' }),
          R.el('span', { class: 'rr-launcher-note' })
        ]),
        R.el('span', { class: 'rr-launcher-chevron', 'aria-hidden': 'true' }, ['›'])
      ]);
      shadow.append(button);
    }
    // GitHub may restore cached HTML containing an inert copy of our host.
    // Keep the live instance with its existing click handler and shadow root.
    for (const stale of document.querySelectorAll('#reporun-button-host')) {
      if (stale !== host) stale.remove();
    }
    const hadFocus = host.shadowRoot.activeElement === button ||
      (launcherHadFocus && (document.activeElement === document.body || document.activeElement === host));
    if (host.dataset.placement !== placement.mode) host.dataset.placement = placement.mode;
    if (host.parentElement !== placement.target) {
      placement.target.append(host);
      if (hadFocus && !panel?.alive) button.focus({ preventScroll: true });
    }
    watch(placement.sidebar);
    paint();
  }
  async function sync() {
    const next = pageRepo();
    if ((next ? R.key(next) : '') !== (ref ? R.key(ref) : '')) {
      const g = ++generation;
      panel?.close(); panel = null;
      host?.remove(); host = null; button = null; launcherHadFocus = false; watch(null); ref = next;
      if (!ref) return;
      ensure();
      try {
        const data = await R.rpc({ type: 'BOOT', ref });
        if (g !== generation) return;
        lang = data.settings.language; paint();
      } catch { /* Opening the panel will surface an extension reload error. */ }
    } else if (ref) ensure();
  }
  function schedule() {
    if (timer !== null) return;
    timer = setTimeout(() => { timer = null; void sync(); }, 120);
  }
  function insideOwnUI(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(element?.closest('#reporun-button-host,#reporun-panel-host'));
  }
  // If a media query hides the About column before our resize callback runs,
  // Chrome may move focus to body. Remember only launcher focus, and clear it
  // on any deliberate pointer action or focus movement to another control.
  document.addEventListener('focusin', event => {
    if (event.target !== document.body) launcherHadFocus = Boolean(host && event.composedPath().includes(host));
  }, true);
  document.addEventListener('pointerdown', event => {
    if (!host || !event.composedPath().includes(host)) launcherHadFocus = false;
  }, true);
  const observer = new MutationObserver(records => {
    if (records.some(record => !insideOwnUI(record.target))) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'inert', 'content']
  });
  for (const event of ['turbo:load', 'turbo:render', 'pjax:end', 'soft-nav:end', 'popstate', 'pageshow', 'resize']) window.addEventListener(event, schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  chrome.runtime.onMessage.addListener((m, sender, respond) => {
    if (m?.namespace !== 'RepoRun' || sender.id !== chrome.runtime.id) return false;
    if (m.type === 'STATE_CHANGED') { panel?.invalidate(); return false; }
    if (m.type === 'LANGUAGE_CHANGED' && ref) {
      const g = generation;
      R.rpc({ type: 'BOOT', ref }).then(data => {
        if (g !== generation) return;
        lang = data.settings.language; paint();
        if (panel?.alive) { panel.lang = lang; panel.render(); }
      }).catch(() => {});
      return false;
    }
    if (m.type === 'OPEN_PANEL') {
      sync().then(() => { open(); respond({ opened: Boolean(panel?.alive) }); });
      return true;
    }
    return false;
  });
  void sync();
})();
