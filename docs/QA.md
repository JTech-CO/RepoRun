# RepoRun v1.0.1 verification

[한국어](QA-KR.md) · [README](../README.md)

Based on the conversation's RepoRun-v1.0.0-source.zip. Changes are limited to About/floating placement, responsive lifecycle, blue checklist/magnifier branding, version metadata, docs and tests. Nothing was pushed to GitHub or submitted to Chrome Web Store.

## Results from this execution

- Node regression: 104 passed.
- Existing Chromium integration: 46 passed; no page errors.
- New placement/responsive integration: 40 passed; no page errors.
- Documentation, PNG dimensions, hostile text and export generation: 26 passed.
- Package integrity and listing budgets: 33 passed.

Chromium version: 144.0.7559.96. See qa-results JSON for individual checks. Tests use real Chromium layout and production app modules, with simulated GitHub and Chrome APIs. The native dedicated Worker check exercises the production bound fetch against data:, not GitHub and not an installed MV3 service worker.

The launcher is tested inside About, as a 44px fallback, after hiding/deleting/replacing/late-loading the sidebar, across desktop/compact resizes and soft navigation, with duplicate host removal, keyboard focus and EN/KR. The synthetic Activities/Delta/Star action HTML remains unchanged. These are not simultaneously installed RepoView/RepoDelta extensions.

## Code preservation

All four src/background files, the analyzer, shared UI helper, panel/options/popup JS match 1.0.0 bytes. core.js differs only in version. Permissions and web-accessible-resource rules are identical. sha256 evidence: qa-results/preservation.json. The icon source and generated PNG fingerprints are verified on check/build.

## Native/live limitations

A normal unpacked-extension probe did not obtain a service worker. Navigation to chrome://extensions/ returned ERR_BLOCKED_BY_ADMINISTRATOR. No managed policy was altered or bypassed. See qa-results/native-install.json. Native toolbar/management icons, installed MV3 execution, live GitHub DOM placement and real PAT access remain unverified for this build. The user's report that 1.0.0 worked is not treated as live verification of 1.0.1.

Screenshots in docs/screenshots use actual application modules and assets with simulated data; they are not live-GitHub or store-approval evidence. Clipboard/export checks inspect the generated text and handler, not OS clipboard or completed native downloads.

## Reproduce

```sh
npm run package
python tests/browser_qa.py
python tests/placement_qa.py
python tests/document_qa.py
python tests/package_qa.py
python tests/native_install_probe.py
```

Node tasks require Node 22+ and no npm dependencies. Optional browser tests require Python, Playwright and Chromium; document tests require Pillow. Icon regeneration alone requires CairoSVG. Do not equate a passing offline suite with the remaining native/live checks.

## Release use

Overwrite the same existing unpacked-extension folder, reload RepoRun, confirm 1.0.1 and refresh all open GitHub/settings pages. Session tokens/cache are reset; re-enter a token when needed. Do not keep an older unpacked copy active under another folder. Publish source at the repository root and deploy help/privacy HTML with their CSS/icons. Store-uploaded assets must be changed separately.

All single-purpose/permission field bodies are under 1,000 characters including spaces: 481 / 606 / 627 / 684. No separate Key Features heading is used.
