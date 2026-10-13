# HRM frontend visual contract

Source of truth for **page structure and composition**: the HRM prototype screenshots supplied by the product owner.

`sh-ansar/demo_bnt_dt` is a source only for **shared visual primitives** (tokens, typography, controls and reusable component styling), primarily:

- `assets/css/tokens.css`
- `assets/css/components.css`
- `assets/css/shell-v91.css`
- the HRM prototype screenshots supplied by the product owner.

## Non-negotiable rules

1. Do not invent visual patterns that are absent from the HRM prototype.
2. Never copy BNT page chrome, navigation, headings, sections or page composition into HRM unless that exact structure is visible in the HRM prototype.
3. Reuse shared UI components before adding page-local controls.
4. Page-local CSS may define layout only when a shared token or component cannot express it.
5. Do not introduce new colors, typography sizes, control heights, radii or shadows without a prototype source.
6. Remove service/development copy that is not visible in the prototype.
7. Desktop parity is checked against the prototype first; then tablet and mobile are adapted from the same visual system.
8. Mock data exists only to expose prototype states and must stay separable from the real API.
9. Every reusable component and finished screen must support both light and dark semantic themes; dark mode must not change layout geometry.

## Canonical foundation

- Typeface: Golos Text, weights 400/500/600/700.
- Brand: `#0697e0`.
- Primary text: `#093044`.
- Secondary text: `#7199ac`.
- Page surface: `#f8fafb`.
- Card/control surface: white / prototype raised white.
- Default border: `rgba(68,112,134,.08)`.
- Strong border: `rgba(68,112,134,.24)`.
- Shared control height: 40px.
- Shared spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Compact controls and table blocks use an 8px radius.
- Generic cards use the prototype 14px card radius.
- Shared components own buttons, inputs, selects, tables, tabs, notices, drawers, pagination, empty and loading states.

## Required visual checkpoints

Every finished module must be checked at:

- 1440px desktop prototype width
- 1280px desktop
- 768px tablet
- 375px mobile

A module is not complete while the layout, density, typography, spacing, controls or states visibly differ from the supplied prototype.
