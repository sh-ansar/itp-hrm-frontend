# Visual parity audit — HRM reference screens (13 October 2026)

Reference: user's ZIP containing **67 images** (44 PNG layouts/fragments, 23 JPG page views), including desktop employee registers, employee card sections, staffing, department tree, drawers, settings and reports. This document records UX and data-contract differences; images are **not** committed because they may contain employee/personally identifiable information.

## Implemented or aligned

| Reference | HRM implementation | Verification |
|---|---|---|
| Desktop employee register, ungrouped/grouped, empty | Prototype-style header metrics, active/archive navigation, toolbar, server-scoped search/status, grouping of **visible page only**, configurable supported columns, empty state | Browser E2E + backend filtering tests |
| Employee card labour data / closed tabs | Compact employee summary and real tabs for assignments, experience, training, reserve; preserve drawer-based guarded edit flow | Chromium write tests |
| Right-side creation drawer | Shared BaseDialog, one-column identity form, sticky actions; supports actual employee master fields | Browser create/edit |
| Collapsed/expanded navigation | Shared desktop sidebar, compact rail and mobile overlay | Shell E2E |
| HR overview | Главная with factual company statistics, short employee register, recent personnel actions and document entry point; no developer/project-status cards | Control preview pending |
| Archive employees | Effective-dated, company-scoped backend status; cannot classify never-hired people as former employees | Backend SQLite/PostgreSQL tests |
| Personnel actions | Unified journal for hire/transfer/termination, real backend contracts, responsive mobile cards, frontend demo mutations that update employee state and journal | Browser QA + demo build |
| Documents and orders | Flat HRM register, employee/type filters, draft drawer, optional personnel-action linkage, protected PDF attachment, desktop/mobile views and persistent demo mutations | Browser QA + demo build |
| Worktime / timesheets | Shared-tab workspace for timesheet, work schedules, production calendar and absences; production reads use scoped backend APIs, while deterministic mocks remain isolated to demo mode | Browser QA + production/demo builds |
| Reports and analytics | Company-scoped views for headcount, personnel movement, staffing/vacancies, training and worktime; worktime analytics use the same scoped production read contract as the timesheet workspace | Browser QA + production/demo builds |
| Development / reserve / training | Combined employee workspace plus full training and reserve registries, responsive mobile cards, search/status filtering and employee drill-down | Browser QA + demo build |
| Settings workspace | Session/profile state, backend-projected company role and department scope, accessible companies and persistent interface preferences; role mutation remains gated | Browser QA + production/demo builds |
| Leave schedule | Annual leave schedule, monthly distribution and leave categories; production reads use the scoped leave API while deterministic prototype values remain isolated to demo mode | Browser QA + production/demo builds |
| Directories | Company-scoped position directory with real create/edit/delete permissions, shared drawer form and responsive desktop/mobile register; departments remain managed only in organization structure | Browser QA + demo build |

## Backend gaps and demo-mode rule

The frontend-only Vercel demo may render isolated deterministic mock values to reproduce approved prototype states. Those values must never be written to or mixed with the real backend. Outside `VITE_DEMO_MODE`, unavailable backend fields remain unavailable.

## Not implemented in the real backend — do **not** present mock values as production data

1. **Employee master**: the demo card now reproduces the approved prototype groups for identity, contacts, bank details and employment contract using isolated mock data. The real backend still requires approved field definitions, validation and role-specific privacy access before those extra fields become writable production data.
2. **Development combined display** `Desktop_Employees_full_screen_Кадровый_резерв_и_обучение.png`: a combined employee workspace now shows кадровый резерв and обучение together from the existing authorized APIs, with direct drill-down to the full reserve/training registries. No fictitious workflow, approval or certificate lifecycle is added.
3. **Staffing explorer** `Desktop_Оргструктура_и_штатка_схема_open_Организационная_структура.png` and four staffing table screenshots: department chart, staffing, vacancy view, authorized staffing history and CSV export are implemented against real scoped data. Approval queue and staffing version comparison remain separate future contracts; do not fake them.
4. **Contract expiration, hiring dates, demographics and earnings** in register/dashboard screenshots: no reliable scoped APIs for these values. Do not hardcode reference screenshot numbers (340 employees, 18 departments, etc.).
5. **Employee management actions**: mass editing, deletion, moving to archive, 1C sync, template creation and exports in mockups are not approved endpoints or lifecycle operations. Keep out of active UI until contracts exist.
6. **Payroll, tariffs, notifications and mutation workflows for worktime/leaves** still require approved domain stages and authorization. Worktime and leave reads are production-backed; deterministic mock values are used only in `VITE_DEMO_MODE` for visual parity.
7. **Documents**: current C02 supports drafts, optional personnel-action linkage and private PDF attachments. The frontend register now matches that contract in desktop/mobile demo. Templates, signing, approval and broader document lifecycle remain separate work and are intentionally not fabricated.

## Visual rules for subsequent stages

- Use shared semantic tokens, Golos Text, BaseCard/BaseButton/BaseDialog/BaseDataTable/BaseViewTabs.
- Match airy sidebar/header, short headings, compact table toolbars, secondary labels and fine-border cards; no product-development slogans in user-facing pages.
- Right-side drawer is the default for complex create/edit; native accessible modal semantics must be preserved.
- Every control must perform a real authorized action; server-side totals and archive criteria must not be derived from just the current page.
- Compare 375px, 768px, 1280px, 1440px layouts; no horizontal **document** overflow. Tables may scroll within their own region.
- Read-only modes and department-scoped employee visibility must remain intact.

## Final parity verification status

1. **Shell/navigation**: expanded/collapsed sidebar, top search, desktop and mobile navigation use the shared design system; no developer/status slogans are shown in normal product pages.
2. **Employees**: primary register defaults to active employees, archive remains a separate tab, grouping/search/columns/mobile cards are preserved, and overview headcount matches the active register.
3. **Employee card**: all eight prototype tabs fit on desktop and remain horizontally scrollable only on narrower viewports; profile sections use the shared card/table components.
4. **Organization/staffing**: hierarchy labels no longer break inside words, the diagram keeps horizontal scrolling inside the canvas only, and approved staffing versions are strictly read-only while drafts expose edit/approve actions.
5. **Development**: combined reserve/training workspace plus full registries are browser-checked; training type/mode enums are rendered as user-facing Russian labels.
6. **Personnel actions/documents**: journal, drawers, document register and protected attachment flow remain aligned with the shared responsive components.
7. **Worktime/reports**: timesheet, schedules, production calendar, absences and report aggregation use the scoped production read contract outside demo mode; missing values are never converted into false zeroes.
8. **Leaves**: production reads use the scoped leave API; demo-only implementation notices were removed from the product surface.
9. **Directories/settings**: directory CRUD stays company-scoped; settings show the real company role and department scope while using product language rather than implementation terminology.
10. **Responsive/theme verification**: 375px mobile and 1440px desktop were rechecked during the final sweep; prior 768/1280 checks remain part of the shared component audit. No document-level horizontal overflow is allowed.

### Corrections made in the final prototype sweep

- Active employee totals on Главная and Реестр сотрудников now use the same server status scope.
- Organization cards were compacted so long Russian department names wrap only at word boundaries.
- Employee card tabs were tightened so all prototype tabs remain visible at 1440px.
- Raw `internal/external` training values were replaced with human-readable labels.
- Demo/production implementation copy was removed from user-facing Leaves and Settings surfaces.
- Staffing demo state now follows the real contract: approved versions are immutable; draft versions can add/edit lines and be approved.
- Direct `/learning` and `/reserve` routes were revalidated on a clean preview after an earlier stale-preview false failure.

## Backend gap review for full personal cards (B08)

The real `employees` contract now includes core identity/contact/workplace fields such as birth date, gender, email, phone, address, work site, work zone, team and supervisor. The reference card still contains additional sensitive domains (IIN, identity-document details, family/emergency contacts, banking/payroll, contract details) that are not yet fully backed by approved production storage and field-level authorization. Those values remain isolated to demo/reference presentation until the sensitive-data schema, retention, redaction and role rules are approved.

The development aggregate API is implemented separately because training and reserve tables already exist. Reserve free-text notes are intentionally omitted from aggregate lists; full notes remain available only in the appropriately authorized employee card. Existing create/edit endpoints are reused and have optimistic revision checks.

## Core employee form and history follow-up (13 October 2026)

- The original ZIP bytes (67 images) are now available for visual inspection; employee references and the creation drawer were inspected. This does not certify full pixel parity for every screen.
- The normal employee create/edit drawer now sends the backend-supported birth date, gender, contacts and workplace fields. Shared field controls are grouped into personal, contact and workplace sections.
- Omitted optional fields remain unchanged for legacy API clients. Explicit null clears one field, with revision checking and transactional audit.
- The history tab reads a protected backend projection of the last 100 employee events. Company/employee boundaries and HR-only access are tested; raw event context is never exposed.
- New development record mutations carry employee IDs in their audit events. Older development events without employee IDs are not retroactively fabricated into the card history.
- Browser verification: all 16 demo workspaces plus employee creation/edit/history passed at 375, 768, 1280 and 1440 px without JavaScript exceptions or document overflow. Actual Vue → Laravel → SQLite creation, editing, reload persistence, single-contact clearing and history rendering also passed in Chromium at 375 px.
- Backend/browser CI now pins the paired backend revision rather than the earlier backend without these fields. Sensitive fields and document approval remain unfinished. Photo is implemented in the paired follow-up.

## Photo and full-reference follow-up (14 October 2026)

Photo upload/replacement/removal and protected persistence are implemented and tested. See [the complete 67-row comparison](PROTOTYPE-COMPARISON-2026-10-14.md) for actual status; earlier aligned descriptions are not 1:1 acceptance.
