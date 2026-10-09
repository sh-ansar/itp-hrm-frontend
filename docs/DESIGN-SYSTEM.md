# Design system

Reference: `sh-ansar/demo_bnt_dt` (`assets/css/tokens.css`, `assets/css/components.css`, `assets/css/shell-v91.css`). Use the established corporate light palette and Golos Text where licensed/available; provide system font fallback. Never bring legacy DOM manipulation into Vue.

## Reuse rule
1. Look for a shared component in `src/components/ui`.
2. Compare with BNT tokens and behavior.
3. Extend shared components with props/slots and tests when appropriate.
4. Create a new component only for genuinely distinct behavior.

All components must handle keyboard focus, loading, empty, error and disabled states where relevant. Avoid page-specific copies of buttons, tables and form controls. Shared implementation precedes screens.
