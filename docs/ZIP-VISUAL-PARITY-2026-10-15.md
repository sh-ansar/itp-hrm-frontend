# HRM prototype ZIP – final design and locale pass (15 October 2026)

## Evidence and scope
Reference: project archive `Зип.zip` (76 PNG). Matched by **exact screen identity**, not by guessed filenames. The archive contains the employee register and employee-card scroll states, organization chart and table, staffing plan / vacancy / changes views, plus navigation, role and settings references. It **does not** contain a standalone reference for the global `/documents` page.

This report describes code parity and test coverage. It is **not** a claim of a completed pixel-by-pixel screenshot diff: only a new browser screenshot side-by-side with the source prototype can prove 1:1 appearance.

| Prototype | Current implementation checked | Remaining acceptance work |
|---|---|---|
| `Desktop_Employees_Реестр сотрудников_Без группировки.png`, grouped / empty / archive states, table navigation / pagination / search / filters / template PNGs | `EmployeesView`, `BaseDataTable`, `BaseColumnFilterPopover`, `BaseColumnPicker`, `BaseTableBulkActions`, `EmployeeRegistryTemplatesDrawer`. Select-all checkboxes, grouping, filter chips, fullscreen, saved column visibility and templates are wired | Check horizontal-only scrolling, filter popovers at 375/768 widths and title text expansion in KZ/EN |
| `Desktop_Employees_Карточка сотрудника_Личные данные 1.png`, personal / organizational / employment scroll states | `EmployeeDetailView`, `EmployeeProfileSection`, `EmployeeDataGrid`, `EmployeePhoto`. Military-record block is present, as are identity, employment and organization sections | Compare exact field order, photo geometry, responsive expanded blocks, and label alignment against all scroll positions |
| `Карточка сотрудника_Документы.png`, payroll, schedule, reserve, history scroll states | Employee profile sections and `EmployeeDocumentsPanel`; shared table actions, grouping and file status | Verify the document row density, folder labels and PDF-action alignment; demo PDFs cannot substitute for authorized production documents |
| `схема_open/closed_Организационная структура.png`, org table | `OrganizationView`, `DepartmentTreeNode`, `OrgStaffingNav`; zoom, expansion, department table, drill-down to employees and KPI cells | Verify connector placement in a real multi-level hierarchy, clipping with long names and diagram width at mobile/tablet sizes |
| `таблица_Штатное расписание.png`, vacancies, changes | `StaffingView`, `StaffingMobileList`, common table controls, plan/history API screens, date-snapshot selection and totals | Compare KPI spacing, status chips, visible column order, and group boundaries at desktop and mobile widths |
| Global documents/orders | `DocumentsView`, `DocumentMobileList` and shared controls; API-backed read/write permissions retained | No standalone PNG reference; validate via shared BNT UI contract and existing documents/PDF E2E rather than inventing a mockup |

## Localization contract

- The interface vocabulary (not API business values) resolves via `useWorkspaceI18n`: RU source copy with KK and EN variants.
- Dates, date/time and numbers are formatted via `useUiFormatters`, including employee register and document register mobile views; no hard-coded RU `dd.mm.yyyy` remains in those modules.
- Table collation and filter case folding follow the saved locale; stored selection IDs and API model fields remain unchanged.
- Single source of truth for table accessibility and filters is the shared UI components, not five separate implementations.
- Every language must be usable in desktop (1440px), tablet (768px) and mobile (375px); browser test `demo-workspace-locales.test.mjs` covers primary route headings, employee date formatting and mobile overflow.

## Remaining acceptance gates

1. Pass Frontend CI, demo build, demo-browser E2E and authorization E2E for PR #117.
2. When a working preview/build slot is available, capture real RU/KK/EN light/dark screenshots of the five views for side-by-side geometry comparison with ZIP (font, rows, whitespace, chart, overlays).
3. Correct any screenshot-confirmed visual differences in follow-up commits; do not mark pixel-level parity as complete based solely on the source review.
4. Keep backend, API contracts and production data unchanged; maintain Git-only changes.

