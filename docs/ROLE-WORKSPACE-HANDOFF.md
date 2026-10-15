# Connected Vue role-aware HRM contract (F122)

## Ownership and data flow
- Laravel GET /api/v1/me/access is authoritative for CURRENT session:
  company-scoped roles, department scopes, named boolean capabilities.
- Frontend src/api/access.ts (typed contract) -> Pinia companyAccess store
  -> config/routeAccess.ts (UI navigation hints only) -> router + AppSidebar.
- Server re-authorizes every endpoint and update. Vue route hiding is not
  a security boundary. Connected mode NEVER trusts a role selected in a UI.
- Company selection persists only in Pinia during a session, not
  localStorage. Every page selector reuses useActiveCompanySelection:
  choose preferred currently authorized company; update context on selection.
- Backend may revoke memberships. Refresh capability projection on protected
  navigation (short UI cache 15s); backend denies revoked permissions instantly.
- Login/logout and failed session checks clear cached company privileges.

## UX per role
- company_admin: implemented HR read workspaces, calendar and leave workflows
  only when their feature flags are enabled by Laravel.
- hr_specialist: HR workspaces and leave request planning, not approval.
- department_manager: minimal employee, org, worktime and leave views
  restricted to server-confirmed department scopes; no payroll/staffing/docs.
- employee: Settings + clear access-limited page. Self-service employee portal
  still needs identity-to-employee mapping, separate contracts and tests.
- Reports and role-matrix prototypes continue ONLY in public synthetic demo.
  In a connected session they are inaccessible until real reporting/role admin
  read APIs are developed. Do not show dummy users, grants or audit as real.

## Future work for next maintainer
1. Normalize configurable roles and permission assignments after approved
   business matrix. Existing company_user_roles has ONE role per company.
   Implement genuine role directory/list, user search, mutation, audit and
   hard 403/404 per scope; never run edits solely in frontend arrays.
2. Introduce a dedicated employee self-service portal with authorized
   identity linking to employee record and narrowly scoped GETs.
3. Review explicit department inheritance, approval delegation, effective
   dates, multi-company switching and per-screen form field permissions.
4. Add authenticated E2E for company_admin, hr_specialist,
   department_manager and employee, on approved HTTPS staging. Current
   browser E2E covers real synthetic HR session; backend feature tests
   exhaustively cover the other role projections.
5. Keep contract version 1 until backend JSON schema changes; version bump
   and typed frontend upgrade must land atomically.
6. Vercel is a FRONTEND-ONLY demo and does not represent persistent
   PostgreSQL data. No role or vacation changes can be published there.
