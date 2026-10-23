# Organizational chart viewport

`OrgChartViewport` contains presentation-only pan/zoom state. It consumes the existing scoped tree through its default slot; no new API request or employee data projection is added.

- Pointer drag, real touch pan and two-pointer pinch; interactive tree controls are excluded from drag capture.
- Pointer-anchored wheel zoom, +/- buttons, 25–200% bounds, reset, fit and keyboard arrows.
- Fit measures all visible tree boxes, including branches that overflow left of the layout box. The minimum zoom still applies to very large trees.
- Expand into a full-window work area through Teleport, preserve transform, Escape to return, restore button focus and body overflow.
- RU/KK/EN/KA controls. Existing tree branch expansion/member links remain intact.

Validation on Ansar: TypeScript/demo build passed; two Chromium tests passed (desktop pan/wheel/keyboard/fit/expand/reset and real CDP touch pan across four locales at 375px). No browser runtime errors during touch regression. Screenshots inspected at 1440px; full ZIP tree card/connector parity remains separate acceptance work. New test included in demo CI; remote CI has not run for this branch. Production and database untouched.
