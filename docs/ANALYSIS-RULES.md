# Analysis rules and limitations

[한국어](ANALYSIS-RULES-KR.md) · [README](../README.md)

## Result semantics

**Declared** means text/fields or file existence was established in the inspected scope. It is not a certification that the declaration is correct, mandatory for every usage, installed locally, or sufficient to run. **Inferred** means a limited clue (currently package manager inferred from lockfile names). **Not established** means evidence is insufficient, unsupported or unavailable; it never means “not required”. Links pin the inspected commit, and line numbers are added where extraction has a known line.

| Source | Interpretation | Not claimed |
| --- | --- | --- |
| `package.json` engines/Volta/devEngines | Separate runtime declarations | Semver intersection, actual installed version, framework compatibility |
| `.nvmrc`, `.node-version`, Node `.tool-versions` | Recorded version text | Shell/config execution or alias resolution |
| packageManager/devEngines.packageManager | Explicit manager declaration | Tool availability or validity |
| Lockfile filename | Inferred manager, conflict notice | Parsing locks, installed dependency tree |
| `scripts` | Literal definitions; lifecycle-hook warning | Safe or successful execution |
| `.env.example`, `.env.sample`, `.env.template`, `.env.local.example` | Variable names and lines | Values, requiredness, completeness |
| Dockerfile | Recognized single-line FROM declarations | ARG resolution, multiline Docker grammar, mandatory Docker dependency |
| Compose YAML | File presence | YAML services/profiles/interpolation/overrides |
| README | Six shell-like fenced-line samples | Full setup guide, ordering, multi-line shell context |
| `index.html` | Entry file exists | Asset availability, offline/file protocol support |
| Framework dependencies/config files | Dependency declaration or file presence | Build/hosting mode, safety or external-service necessity |
| workspaces/platform/browser manifest | Manifest declarations | Recursive workspace resolution or device checks |

`package.json`, version/example files, README variants, Dockerfile, Compose variants, `vercel.json` and `manifest.json` are on the bounded body-read allowlist. Some allowlisted bodies currently contribute only presence, not semantic configuration parsing. Known lockfiles, JS/TS framework configuration, index.html, pnpm-workspace.yaml and non-Node language indicators are presence-only. Evidence distinguishes reading from merely finding a name. Arbitrary source code, actual `.env`/`.env.local`, `.npmrc`, LFS payloads and lockfile bodies are not requested.

## Scope and limits

Default branch only. Root or one relative directory, maximum 240 characters / five levels. No ancestor inheritance or automated monorepo expansion. Tree listings are non-recursive and capped at 10,000 entries per directory. Server-truncated results remain explicitly partial.

At most 14 blob **attempts**, each at most 128 KiB decoded. Known oversize/non-regular files are skipped before fetching. One request has a 15-second timeout; a scan has a 180-second budget checked before requests, so an already-started request can add up to 15 seconds. API JSON bodies are bounded to 2,000,000 bytes (220,000 for blobs). No automatic retries. Up to three independent scans; same-scope scans are de-duplicated.

Maximum 40 script entries, 100 environment names, six README lines, 30 matching `.tool-versions` entries and 20 Docker FROM entries. `devEngines` arrays are bounded to 20 entries per category. Workspace display lists at most 12 patterns and does not expand them. Display strings are length-limited. The Evidence links remain available to inspect the complete source.

Reports are fresh for five minutes and cached in the session only, capped at eight reports / 1.5 million serialized UTF-8 bytes. An oversized report may not be retained in cache. Changing the token cancels active requests, clears cache and changes the credential epoch. Clear-cache changes the epoch and cancels in-flight inspections while preserving the token.

## Security interpretation

Only text is inspected. Repository code is not imported or executed. A plain literal script can still be destructive, malicious or platform-specific; Copy is not approval. Best-effort redaction recognizes certain token/password patterns but is not a secret scanner. Environment example values are not retained in the environment result; private information elsewhere in script text or README examples may remain. Review exports before sharing.

Static deployment compatibility is always left unconfirmed in 1.0.1. Add future deployment rules only when both the supported evidence and counterexamples are covered, not from framework names alone.
