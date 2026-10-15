# Vue private employee profile integration (F123)

## Data ownership
- Laravel B71 is the authority for personal identifiers and military records.
- EmployeeDetailView.vue uses real GET /api/v1/companies/{company}/employees/{employee},
  private_profile.personal and private_profile.military, only when the backend grants
  extended_sections_visible. No copies in localStorage or Pinia.
- The private editor is a reusable BaseDrawer form using an explicit full-section
  snapshot and server revision. It never submits a guessed employee or company ID.
- The UI does not expose management controls unless
  meta.private_profile_writes_enabled is true.
- The response never contains these fields for department_manager; keep this
  server restriction when adding employee self-service.

## Prototype traceability
From Zип.zip:
- Личные данные_0: identity header and contact/address groups.
- Личные данные 1: identity document table (NOT implemented yet; B72).
- Личные данные 2: place of birth and multiple family records (family B72).
- Личные данные 3: military status/category/reference/comment (B71/F123).
Current connected-mode private storage covers the scalar fields and military
records only. The remaining reference groups intentionally display empty
states rather than synthetic "prototype" values.

## Backend API contract
PUT /companies/{company}/employees/{employee}/private-profile/{section}
section=personal|military
- Sends all fields including null and revision=null for first write,
  integer revision on subsequent edits.
- 409 stale revision: show a conflict notice and do not overwrite another user.
- 422: field validation warning, 403/404: controls gated by server capability.
- Save waits for the API response, reloads GET detail and displays the durable
  values; no optimistic PII patching.
- National identifier encryption uses the Laravel server key, not browser JS.

## Hand-off tests
- Backend EmployeePrivateProfileTest on SQLite and PostgreSQL proves encryption,
  tenant isolation, HR vs manager visibility, partial PUT rejection, revision
  conflict rollback and non-PII audit.
- Frontend tests/e2e/private-profile.test.mjs logs in to isolated Laravel with
  synthetic identity, edits both sections, reloads and checks persistence on
  375px viewport.
- Vercel demo uses its own synthetic reference data; do not promote it to
  persistent reality without importing into the normalized database.

## Next tasks
- Structured relative records + identity documents with private attachments.
- Versioned citizenship/relationship/military category directories by tenant
  or jurisdiction (never infer country values from geolocation).
- Reviewed employee self-service mapping and consent/retention policy.
- HR permission review and staging data validation before enabling writes.
