# Design system

Reference: `sh-ansar/demo_bnt_dt` (`assets/css/tokens.css`, `assets/css/components.css`, `assets/css/shell-v91.css`). Use the established corporate light palette and Golos Text where licensed/available; provide system font fallback. Never bring legacy DOM manipulation into Vue.

## Reuse rule
1. Look for a shared component in `src/components/ui`.
2. Compare with BNT tokens and behavior.
3. Extend shared components with props/slots and tests when appropriate.
4. Create a new component only for genuinely distinct behavior.

All components must handle keyboard focus, loading, empty, error and disabled states where relevant. Avoid page-specific copies of buttons, tables and form controls. Shared implementation precedes screens.

## HRM 2026 acceptance rules
- Functional form structure and fields come from the "Кадры 2026" presentation; BNT is the visual reference, not a source for invented HR fields.
- All screens must use the same semantic colors, typography, 44px minimum control height, focus styles and error states defined in `src/styles/tokens.css`.
- Reuse `BaseCard`, `BaseButton`, `BaseNotice`, `BaseEmptyState`, `BaseLoadingState`, `BaseDataTable`, `BaseFormField` and `BaseDialog`; do not create copycat controls in views.
- Review desktop, tablet and mobile widths; avoid clipped actions, inconsistent form widths and different table styles.
- Change shared components first, run build and Chromium checks and record exact evidence in backend `docs/CHECKLIST.md`.
- Initial token migration is not a pixel-level visual audit or signoff for every future module.
