# RepoRun 1.0.1 architecture

[한국어](ARCHITECTURE-KR.md) · [README](../README.md)

## Data flow and trust boundaries

The isolated content script recognizes a GitHub repository from the URL and repository markers. It adds one Shadow-DOM button but makes no analysis API call on a page visit. An explicit button action sends `ANALYZE` with an owner/repo and relative directory. The worker validates message namespace, extension ID, sender page, top-frame status and operation permissions. Untrusted page callers cannot submit arbitrary fetch URLs or token-management operations.

The service reads metadata, resolves the default-branch HEAD once, and takes its commit/tree SHAs. Every subsequent tree/blob request uses a Git object ID from that snapshot. Non-recursive tree walking selects one directory; nested workspaces and parent configuration are deliberately not combined. Only allowlisted regular text blobs are read. The analyzer normalizes declarations and evidence; the UI receives a report, not the token or the raw file map.

```text
GitHub page -> validated extension message -> Service
    -> repository metadata -> default-branch commit/tree SHA
    -> non-recursive directory tree(s) -> selected bounded blobs
    -> deterministic analyzer -> normalized session report
    -> Overview / Commands / Evidence / user export
```

## Modules

`shared/core.js`: input validation, error types, fixed limits, safe GitHub URLs and best-effort display redaction. `shared/analyzer.js`: deterministic file interpretation. `shared/i18n.js`: complete EN/KR UI strings. `shared/ui.js`: text-node rendering, links, logo and report/clipboard/download helpers. `shared/styles.css`: maintained style source; `styles.js` is generated at build time.

`background/github.js`: the only production network client. `fetcher.bind(globalThis)` preserves the WorkerGlobalScope receiver. GET-only endpoint construction, cookies omitted, request timeout, bounded streaming response, HTTP/parse/network/programmer errors kept distinct, no compatibility retries. A fixed diagnostics endpoint is accessible only through trusted options messages. An HTTP-success diagnostic does not establish private-repository authorization.

`background/store.js`: durable language preference; session-only token, auth epoch, reports and quota state. Both storage scopes are restricted to trusted extension contexts. Changes are serialized. Tokens and raw files are not exported. Epoch checks prevent old requests from populating a new credential session.

`background/service.js`: bounded scan orchestration, in-flight de-duplication, explicit scope, file-read budgets, report cache and message authorization. Same-scope calls share a scan. Up to three distinct scans may be in flight. A scan budget is checked before each request; individual requests still have their own timeout.

`content/placement.js`: visible right-hand About section detection and sidebar/floating launcher styles. `content/index.js`: GitHub route handling, one persistent launcher, resize/DOM observation and focus-preserving relocation. The header action list is never an insertion target. `content/panel.js`: native dialog, directory input, keyboard tabs, report states and explicit export. Options handles token storage, diagnostics, language and cache; popup opens the panel/settings.

## Network surface

- GET `/repos/{owner}/{repo}`
- GET `/repos/{owner}/{repo}/commits?sha={defaultBranch}&per_page=1`
- GET `/repos/{owner}/{repo}/git/trees/{treeSHA}` (non-recursive)
- GET `/repos/{owner}/{repo}/git/blobs/{blobSHA}`
- GET `/rate_limit` (user diagnostics only)

Responses remain in the official GitHub API scope. GitHub controls redirect behavior; cross-origin response destinations are rejected, and credentials are never placed in a URL. No raw.githubusercontent.com hostname permission is needed. Source evidence opens ordinary GitHub commit/blob pages on user action.

## Permissions and assets

`storage`, `https://github.com/*`, `https://api.github.com/*` only. No history/cookies/nativeMessaging/all-sites permissions. Only `icons/logo.svg` is web-accessible and only on github.com. All code/styles/icons are bundled. No remote-code imports. Manifest PNGs, web UI SVG and document icons are version-aligned and hash-checked.

## Extending safely

Add new rules as pure evidence extraction with fixtures; never evaluate a repository config or turn a framework hint into a compatibility claim. New file reads must be allowlisted and stay within explicit limits. New state must specify retention and token-isolation behavior. Re-run native Worker receiver regression in addition to mock transport tests.

Primary references (checked 2026-09-19): [Git trees](https://docs.github.com/en/rest/git/trees), [Git blobs](https://docs.github.com/en/rest/git/blobs), [npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [Chrome cross-origin requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
