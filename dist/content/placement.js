/* Sidebar-only launcher placement. Unknown layouts use one compact floating control.
 * Never put RepoRun back into GitHub's Watch/Fork/Star (or other Repo tools) actions.
 */
(() => {
  'use strict';
  const R = globalThis.RepoRun;
  const SIDEBARS = [
    '#repo-content-pjax-container .Layout-sidebar',
    '.repository-content .Layout-sidebar',
    'main .Layout-sidebar',
    '[data-testid="repository-sidebar"]',
    '[data-testid="repo-sidebar"]',
    '.repository-content .gutter-condensed > .col-md-3',
    'main aside[aria-label="About"]',
    'main aside[aria-label="소개"]'
  ].join(',');
  const ABOUT = /^(about|소개|정보)$/i;

  function shown(element) {
    if (!element?.isConnected || element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const rect = element.getBoundingClientRect();
    if (!element.getClientRects().length || rect.width < 1 || rect.height < 1) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
    }
    return true;
  }

  R.resolveLauncherPlacement = () => {
    for (const sidebar of document.querySelectorAll(SIDEBARS)) {
      if (!shown(sidebar)) continue;
      const box = sidebar.getBoundingClientRect();
      // A stacked About section is not a right-hand sidebar. Do not send users
      // to a button below the entire file/README listing on narrow layouts.
      if (box.width < 180 || box.width > innerWidth * 0.5 || box.left < innerWidth * 0.45) continue;
      const headings = Array.from(sidebar.querySelectorAll('h2,h3,[role="heading"]'));
      const heading = headings.find(node => ABOUT.test(node.textContent.trim()));
      let target = sidebar.querySelector('[data-testid="about-section"],[data-testid="repository-about"]');
      if (!target && heading) {
        target = heading.closest('.BorderGrid-cell');
        if (!target || !sidebar.contains(target)) target = heading.closest('section');
        if (!target || !sidebar.contains(target)) {
          // Modern non-BorderGrid markup: choose the About block immediately
          // under the sidebar, not a small heading/actions row inside it.
          target = heading;
          while (target.parentElement && target.parentElement !== sidebar) target = target.parentElement;
          if (target === heading) target = sidebar;
          // Do not guess at the bottom of a wrapper that also holds Releases,
          // Packages or Languages. Unknown About boundaries use the fallback.
          if (Array.from(target.querySelectorAll('h2,[role="heading"]')).some(node => node !== heading && !ABOUT.test(node.textContent.trim()))) target = null;
        }
      }
      if (!target && ABOUT.test(sidebar.getAttribute('aria-label') || '')) target = sidebar;
      if (target && sidebar.contains(target) && shown(target)) return { mode: 'sidebar', target, sidebar };
    }
    return { mode: 'floating', target: document.body, sidebar: null };
  };

  R.launcherCss = `
    :host{display:block;box-sizing:border-box;line-height:normal;color-scheme:light dark}
    :host([data-placement="sidebar"]){margin-top:16px;width:100%;min-width:0}
    :host([data-placement="floating"]){position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:1000;width:44px;height:44px}
    :host([data-placement="floating"][data-panel-open="true"]){visibility:hidden;pointer-events:none}
    *,*::before,*::after{box-sizing:border-box}
    button{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:9px 11px;border:1px solid var(--borderColor-default,#d1d9e0);border-radius:6px;background:var(--button-default-bgColor-rest,var(--bgColor-muted,#f6f8fa));color:var(--fgColor-default,#1f2328);font:600 14px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:start;cursor:pointer;touch-action:manipulation}
    button:hover{border-color:var(--fgColor-accent,#2563eb);background:var(--button-default-bgColor-hover,var(--bgColor-muted,#f6f8fa))}
    button:focus-visible{outline:2px solid var(--fgColor-accent,#2563eb);outline-offset:3px}
    img{display:block;flex:none;object-fit:contain;width:28px;height:28px}
    .rr-launcher-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}
    .rr-launcher-title{overflow-wrap:anywhere}
    .rr-launcher-note{font-weight:400;font-size:12px;line-height:1.4;color:var(--fgColor-muted,#59636e);overflow-wrap:anywhere}
    .rr-launcher-chevron{font-size:22px;font-weight:400;color:var(--fgColor-muted,#59636e)}
    :host([data-placement="floating"]) button{justify-content:center;width:44px;height:44px;min-height:44px;padding:4px;border:1px solid #1d4ed8;border-radius:12px;background:#2563eb;color:white;box-shadow:0 2px 9px #0003}
    :host([data-placement="floating"]) button:hover{background:#1d4ed8}
    :host([data-placement="floating"]) img{width:34px;height:34px}
    :host([data-placement="floating"]) .rr-launcher-copy,:host([data-placement="floating"]) .rr-launcher-chevron{display:none}
    :host([data-placement="floating"]) button:is(:hover,:focus-visible)::after{content:attr(data-tooltip);position:absolute;right:54px;bottom:4px;padding:8px 10px;width:max-content;max-width:min(230px,calc(100vw - 88px));border:1px solid var(--borderColor-default,#d1d9e0);border-radius:6px;background:var(--bgColor-default,#fff);color:var(--fgColor-default,#1f2328);font-size:12px;font-weight:500;line-height:1.4;pointer-events:none}
    @media(forced-colors:active){button{border:1px solid ButtonText}:host([data-placement="floating"]) button{background:ButtonFace;border-color:ButtonText}button:focus-visible{outline-color:Highlight}}
  `;
})();
