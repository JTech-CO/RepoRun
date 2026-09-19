# RepoRun branding asset pipeline

[한국어](BRANDING-KR.md) · [README](../README.md)

The 1.0.1 mark is a white two-item checklist inspected through a magnifier, on a rounded blue tile. It represents inspecting declared requirements, not a terminal, an execute button or a safety certification. No text or font is embedded. Primary blue is `#2563eb`, hover blue `#1d4ed8`, and dark-mode accent `#79a9ff`.

`public/icons/logo.svg` is the canonical vector source (128 × 128 viewBox). All installation/action PNGs (16, 32, 48 and 128 pixels) are generated from it by `python scripts/icons.py`. SVG and PNG SHA-256 hashes are in `assets.json`. `npm run check` and `npm run build` reject mismatched source/derivative hashes or incorrect dimensions. CairoSVG is needed only for regeneration, not normal builds.

The same SVG is used in the sidebar launcher, floating fallback, modal, options, popup, README and help/privacy headers. Help/privacy/options/popup favicons use the generated PNG and the current version query. Only the bundled logo SVG is exposed to github.com; no new host or API permissions are added.

Update the SVG, run the icon script, run `npm run package`, refresh the screenshot tests, and upload rebuilt output. Store dashboard icons and screenshots require a separate update; modifying a GitHub repository alone does not replace them.

References: https://developer.chrome.com/docs/extensions/reference/manifest/icons and https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources
