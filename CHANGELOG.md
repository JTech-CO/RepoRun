# Changelog

## 1.0.1 - 2026-09-19

- Move the launcher out of the repository header to the right-hand About block.
- Use a single 44px bottom-right icon when About is absent, hidden, narrow or stacked.
- Reconcile sidebar replacement, responsive changes and soft navigation without duplicate controls; preserve keyboard access and focus.
- Replace the green terminal with a blue checklist/magnifier on all active UI, icons and document surfaces.
- Refresh source PNGs, hashes, documentation, listing copy and screenshots; add placement regression tests.
- Keep background API/store/service files and analysis rules unchanged. No permission expansion.

[한국어](CHANGELOG-KR.md)

## 1.0.0 - 2026-09-19

Initial implementation of the evidence-first Node.js/static-web setup inspector. Adds a GitHub Run setup control, default-branch commit pinning, explicit directory scope, deterministic runtime/package/script/environment/container rules, EN/KR modal with source links, session-only PAT/report caching, diagnostics, Markdown export, unified icon assets, bundled help/privacy and store submission copy.

Bound native fetch and a real Worker receiver regression are included from the first version. No repository commands are executed. No GitHub repository or store publication is performed by this package. See the QA report for performed checks and remaining installed/live validation.
