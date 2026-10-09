# Frontend architecture

- Vue 3 + TypeScript SPA, routed by Vue Router; Pinia holds session and view-level state.
- Explicit API boundary (`src/api`) for Laravel `/api/v1`, with typed DTOs and normalized errors.
- `src/components/ui`: reusable primitives; `src/components/domain`: domain-specific shared composites; `src/features`: HR screens and queries.
- Security: never persist HR PII in browser localStorage. Authentication to use secured first-party cookie session + CSRF with Laravel Sanctum, subject to final deployment topology.
- All numbers shown in overview must come from API when implemented; no fake KPIs.
- Supported languages: Russian initially, structure ready for translation.
