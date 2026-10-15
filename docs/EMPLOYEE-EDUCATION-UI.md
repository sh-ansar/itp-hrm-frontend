# Employee education and qualifications UI — F125

## Prototype ownership
The existing employee card "Кадровый резерв и обучение" contains a
"Образование и квалификация" table. In connected mode, this section
must be populated by **formal education** stored in Laravel B74, not
`employee_training` (courses) or the presentation's synthetic demo data.

## Reuse / contract
- B74 backend `employee_education_records`, composite company FK,
  audit-safe create/update/archive with record revision and immutable history.
- GET /api/v1/companies/{company}/employees/{employee} returns
  `private_profile.education[]` for HR/company-admin only;
  `meta.private_education_truncated` reports bounded 100-row projection.
- F125 `src/api/personnel.ts`: typed EmployeeEducationRecord,
  EducationRecordPayload, and the shared route generator selects the
  `/education` endpoint instead of `/private-records/{section}`.
- F125 `src/components/EmployeePrivateRecordsManager.vue`: reuses list,
  editor, archive and 409 recovery for a third section without duplicating
  complex DOM or creating a second form for identical record lifecycles.
- The EmployeeDetailView development section uses real `source.education`
  and offers the manage button only when the backend grants
  `meta.private_profile_writes_enabled`.
- All display/edit language strings exist for RU/KZ/EN/GE with the same theme
  and typography tokens as the rest of the employee card.
- Unknown historical dates remain NULL (never autofilled), and end date
  cannot precede start date. No country/legal equivalence is guessed.

## Acceptance
- Backend B74 SQLite/PostgreSQL: bounded HR-only reads, validation,
  optimistic revision 409, archive retention, company and role isolation.
- Frontend F125 typed build, demo visual suite and isolated synthetic Chromium
  editing at 375px (create -> reload -> edit -> archive) against pinned B74
  merge `0c2aecbd4e5cf510d11cd9d8aae656d6263273fd`.
- Browser verifies existing training rows unchanged after modifying formal
  education; this is an architectural rule, not just UI naming.

## Future modules
- Reviewed country-specific education-type directories and diploma status.
- Protected attachment storage, scanning and signature/verification.
- Accreditation and credential-expiry review process (not present yet).
- Permission-scoped employee self-service requires explicit user mapping.
- No real production HR data or flags until approved staging and backup review.
