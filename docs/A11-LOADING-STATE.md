# A11 — Loading state component

`BaseLoadingState` gives upcoming employee, organization and staffing screens a consistent visual loading placeholder. It exposes a live status message to assistive technology, keeps decorative rows hidden, limits rendered rows to 1–8, and disables animation for reduced-motion preferences.

This PR adds a shared component only: it does not claim that the pending HR modules are connected or loading actual HR data. Component integration and interaction tests remain part of the open A11 checklist. No production data or API routes are changed.
