# RepoRun 1.0.1 launcher placement

[한국어](PLACEMENT-KR.md) · [README](../README.md)

## Contract

The launcher goes at the bottom of the repository's right-hand About block. It is never inserted into Watch/Fork/Star, pagehead-actions or another extension's action group. When a suitable About block cannot be established, a single 44 × 44 CSS-pixel, icon-only button floats 16 pixels from the lower-right edge, accounting for safe-area insets. No large floating card is added.

About targets are resolved in `src/content/placement.js`, scoped to repository sidebar selectors. Classic BorderGrid-cell markup, explicit About section test markers and section-based markup are supported. An unknown shared wrapper containing both About and Releases is not guessed as the target. Empty metadata does not prevent a recognized About block from receiving the button.

A valid sidebar must be rendered, not under hidden/inert/aria-hidden ancestors, at least 180 CSS pixels wide, no more than half the viewport width, and begin within the right 55% of the viewport. This avoids putting the launcher at the bottom of a stacked mobile layout. Scrolling the sidebar out of the viewport does not trigger a floating duplicate.

## Lifecycle and accessibility

The same live host and click handler move between placements. Old inert host copies restored by GitHub are removed. ResizeObserver monitors an active sidebar; viewport resize, relevant DOM attributes and GitHub soft-navigation signals schedule a throttled reconciliation. There is no polling timer or network call for placement.

A hidden/deleted sidebar selects the fallback; a later visible About block moves the launcher back. Leaving repository routes removes the launcher and closes the panel. A single icon is used in both modes. EN/KR names, native title, aria-haspopup and aria-expanded remain set. The floating button has a keyboard/hover tooltip, a focus outline and a 44-pixel target. It hides while the modal is open and returns on close with focus restoration. Pointer/focus tracking avoids stealing focus from unrelated controls during relocation.

## Boundaries

GitHub DOM is not a stable public extension API. Layouts not recognized by these rules still offer the floating button and extension popup. This does not assert compatibility with every future GitHub UI experiment. Positioning logic makes no GitHub API calls and changes neither the analyzer nor token handling.

## Reproduce

Run `npm run package`, then `python tests/placement_qa.py` with Playwright and Chromium installed. The tests exercise real browser DOM/layout with simulated Chrome/GitHub APIs and clearly labeled fixtures. Screenshots are not live GitHub verification.
