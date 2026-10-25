# Shared UI controls — 23 October 2026

Scope: shared select styles and ZIP Expand Arrow SVG; status dots disabled by default; empty marker removed; sidebar burger/footer link; compact employee lookup in documents; shared theme toggle; translated login/recovery/reset copy and accessible recovery dialog.

## Validation on Ansar

- TypeScript and production build passed, including final auth changes; demo build passed.
- Existing design consistency suite: 5 passed. Browser-runtime and locale static checks: 3 passed.
- Chromium: 3 new shared-control/auth tests plus 6 existing workspace locale/responsive tests passed. Includes RU/KK/EN/KA, 375/768/1280/1440 widths, both themes, real picker open/selection/Escape, employee lookup Enter, auth focus/validation/reveal.
- Inspected screenshots: documents picker at 1440; Georgian dark login at 375; documents/login overflow 0 at 375 and 1440; auth select/theme controls both 40px and aligned.
- New browser spec included in demo CI, but remote CI has not run for this commit.

## Compatibility and remaining acceptance

`appearance: base-select` styles the actual native accessible picker in supporting browsers, retaining HTML validation, keyboard navigation, option semantics and Vue change events. Browser-native top-layer placement handles dialogs and viewport edges. Non-supporting browsers retain an operable native picker and shared closed-field styles; their popup appearance is not guaranteed identical. Chromium was tested; Firefox/WebKit were not.

This is UI validation, not authentication/SMTP delivery or PostgreSQL workflow acceptance. No API routes, database records, production settings or feature flags changed. Existing demo records are not a newly seeded backend QA dataset. ZIP inventory confirmed 76 PNGs and 269 SVGs; full per-screen visual parity is unfinished. The pre-existing large-bundle warning remains.
