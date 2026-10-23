# HRM UI/component/API gap inventory — 2026-10-23

Scope: checked current frontend `main` (Vue) and backend `main` (Laravel) on the authorized Ansar device. This is a static source inventory plus independently reported Chromium evidence; it is **not** certification of every backend contract or pixel-perfect ZIP parity.

## Baseline and confirmed evidence

- Local source inventory: **21 Vue view files**, **72 Vue component files** under `src/components`, **21 API TypeScript files** under `src/api`.
- Six views exceed 600 lines: `EmployeeDetailView.vue` (1252), `EmployeesView.vue` (945), `TimesheetsView.vue` (856), `ReportsView.vue` (691), `StaffingView.vue` (670), `OrganizationView.vue` (637). Treat these as extraction candidates, **not** evidence of duplicate business logic.
- No direct `fetch(` call found in any of the 21 view files. All 21 API modules must still be checked against Laravel routes/response schemas; using a named API module does not guarantee a live backend contract.
- **Actual live Laravel route registry checked on Ansar:** `php artisan route:list --path=api --json` exposed **106 routes**. A static scan of 21 API modules extracted 64 straightforward `apiRequest` invocations; 58 matched method+URL immediately. The other six were **parser limitations**, involving URL strings concatenated from identifiers or optional query suffixes in `personnel.ts` (3), `worktime.ts` (1), `roles.ts` (1), and `staffing.ts` (1). Inspection found matching route shapes; these six are **not evidence of broken APIs**. Calls passed through helper functions, redirects and dynamic route builders are not exhaustively covered by this scan. Connected PostgreSQL + browser E2E remains the acceptance authority.
- `MyWorkspaceView.vue` contains a local `<table class="own-timesheet__table">`. This is a concrete remaining duplicate candidate. Before replacing it with `BaseDataTable`, verify its fixed-day grid semantics, keyboard navigation and narrow-screen behavior; calendar-like tables may require a specialized shared `TimesheetGrid` instead.
- Plain native inputs, selects or buttons found in `DirectoryHubView`, `EmployeeDevelopmentView`, `EmployeesView`, `OrganizationView`, `RolesView` and `SettingsView`. This requires *per occurrence* review for semantic native controls vs accidental styling duplication. Do not globally replace checkboxes, file inputs, zoom sliders or radio controls with select/button wrappers.

## E2E/visual evidence

- 96 route/locale/theme/viewport combinations loaded without runtime errors or page-level horizontal overflow (six routes, 4 locales, 2 themes, 375/1440 widths); **not** exhaustive ZIP pixel comparison.
- 8/8 locale/theme Chromium tests and 5/5 role/field-state/demo form tests passed locally.
- The full reference includes edit/read-only states, drawers, validation errors, table filters and dark/light themes; not all of these have screenshot-based assertions.
- Actual screenshots exposed Russian-only titles on Personnel Actions and Positions Directory in Georgian UI. Fix and regression via frontend PR #198 (pending CI at audit time).
- Company/personnel workflows are tested with synthetic demos and isolated CI. They are not proof that real production credentials, SMTP, data migrations or feature flags are configured.

## Explicit live-vs-demo API boundary

`src/api/client.ts` uses the **mock adapter only when `VITE_DEMO_MODE === 'true'`**. Otherwise it makes same-origin calls via `requestJson`, with CSRF and HTTP error handling; no silent mock fallback was found in that client. A green Vercel demo cannot be evidence of a production Laravel API deployment.

Backend `config/hrm.php` explicitly defaults all major write workflows to **false**: personnel, roles, documents and internal order reviews, worktime, leave requests, manager leave review, leave balances/enforcement, supporting medical/maternity evidence, bonuses, directories, browser login, password reset, bootstrapping. Code and tested routes exist, but **availability for a real user depends on controlled configuration and deployment**. Never activate these globally just to make an inert button work.

The 64 extracted URL sites were compared against a fresh `php artisan route:list --path=api --json`. 58 were exact static matches and the six remaining call-site shapes were manually traced to existing parameterized endpoints (string concatenation or query suffixes). **No missing endpoint is confirmed in this sample.** This check does not validate server payload shape, authorization correctness, or every indirect API helper.

## Confirmed backend/service gaps and gating decisions

Refer to backend `docs/HRM-FUNCTIONAL-COVERAGE.md`, `docs/QA-RELEASE-RECOVERY-GATES.md` and issue #118:

1. **Live contract audit:** verify every `src/api/*.ts` endpoint against `routes/api.php`, request validation, response DTOs, feature flags and role/tenant restrictions in connected PostgreSQL E2E. Keep the demo mock adapter separate and visibly identified.
2. **Archive semantics:** confirm terminated-vs-archived rules with HR; do not silently implement archival policy based on route labels.
3. **Special personnel cases:** medical/maternity/childcare leave entitlements, reversals of approved absence, statutory accrual and payroll tie-in require signed business acceptance; UI presence alone is not completion.
4. **Timesheet closed periods:** full lock/reopen/approval semantics remain future work according to backend architecture; test state transitions rather than table presentation only.
5. **Notification delivery:** SMTP retries, sensitive data minimization and delivery-state reporting require real isolated integration acceptance.
6. **Backup/restore:** run an actual disaster-recovery drill and post-deploy smoke tests with the intended hosting topology before any live employee data is collected.
7. **Central DMS:** HRM owns process starts/decisions; canonical documents, legal signatures and archive belong to a future separate DMS per `HRM-DMS-INTEGRATION-BOUNDARY.md`. Do not build a competing document repository inside HRM.

## Follow-up order

A. Complete green CI and merge or repair PRs #195 (directory search) and #198 (four-language headings). PR #197 is already merged.
B. Extract the repeated selection/search/table toolbar layout into proven shared Vue components, retaining page-specific scoped capabilities; add desktop/mobile E2E of enabled/disabled actions.
C. Add source/contract checklist per API module, including live/feature-flagged/demo-only and disabled flows; reject UI actions that have no backed route instead of silently mocking them.
D. Capture stable screenshots **after loading**, at all requested sizes and representative states for each of the original ZIP screens. Compare differences explicitly with screenshots and human review before declaring 1:1.
E. Run backend PostgreSQL contract E2E and scoped four-role negatives, then separate deployment/restore rehearsal.

This register is designed for maintainers; it does not authorize enabling feature flags or touching production.
