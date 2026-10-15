# Private employee records manager – F124 handoff

## Target prototype and architectural boundaries
Source: project archive Zип.zip, employee card / Личные данные 1 and 2.
The visual sections already exist in EmployeeDetailView.vue. This change
replaces connected-mode placeholders with actual company-scoped Laravel B72
family members and encrypted identity-document records. The demo still
uses synthetic source-inspired fixture data and does not claim persistence.

## Ownership
- Laravel B72: employee_family_members, employee_identity_documents; their
  tenant constraints, field validation, record revision, encryption and audit.
- Vue src/api/personnel.ts: typed EmployeeFamilyMember and
  EmployeeIdentityDocument interfaces and create/update/archive functions.
- Vue src/views/EmployeeDetailView.vue: employee ID and company route owner,
  HR-only record projection; primary identity shown in existing detail grid;
  relatives listed in the existing compact table.
- Vue src/components/EmployeePrivateRecordsManager.vue: reusable drawer for
  either record section, list/create/edit/archive with server versions.
- Vue src/i18n/privateRecords.ts: RU/KZ/EN/GE UI copy. All controls use
  existing theme tokens and BaseButton/BaseDrawer/BaseFormField components.

## API contract and safety
- POST /companies/{company}/employees/{employee}/private-records/{section}
- PUT /companies/{company}/employees/{employee}/private-records/{section}/{id}
- DELETE /companies/{company}/employees/{employee}/private-records/{section}/{id}
- Allowed section=family|identity. POST sends only validated fields; PUT
  sends fields plus current positive revision; DELETE sends revision.
- Server applies tenant, role, employee-visibility, feature flag and
  optimistic revision checks. Client does not trust its own role selector.
- Record save/archive closes the drawer and refetches the employee from
  server. Stale 409 shows a reload action; invalid 422 is handled locally.
- National document numbers are decrypted only in authorized HR detail.
  The manager list masks document numbers except the last 4 characters;
  edit form and primary document details are restricted to HR roles.
- No localStorage, Pinia persistence or console logging of private records.
- Record references are not file uploads; attachment workflow is separate.
- Archive is non-destructive. Browser requires user confirmation.
- A promoted primary document demotes the prior primary in a transaction.
  The backend partial unique index protects against raw-import duplicates.

## QA
- F124 TypeScript check and Vue demo build.
- Authenticated Chromium with synthetic isolated Laravel fixtures at 375px:
  relative creation/edit/archival, identity creation, persistence on reload,
  correct primary projection, no body horizontal overflow.
- Read-only Chromium and demo browser suite remain green.
- Pin known-reviewed backend merge SHA for frontend integration CI:
  83c3b7587d75c82e6cd08ec6808feddf6818d252.

## Unfinished by design
- Private file uploads and retention/scanning.
- Backend reference directories for document type, kinship, countries.
- Data classification/consent and jurisdiction-specific HR record policy.
- A dedicated paginated history view for 100+ records.
- Payroll ledger/projections, pensions, disciplinary/benefit records.
- Employee self-service and finely scoped delegated approval.
