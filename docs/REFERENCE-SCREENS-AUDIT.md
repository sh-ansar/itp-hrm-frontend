# Visual parity audit — HRM reference screens (13 October 2026)

Reference: user's ZIP containing **67 images** (44 PNG layouts/fragments, 23 JPG page views), including desktop employee registers, employee card sections, staffing, department tree, drawers, settings and reports. This document records UX and data-contract differences; images are **not** committed because they may contain employee/personally identifiable information.

## Implemented or aligned

| Reference | HRM implementation | Verification |
|---|---|---|
| Desktop employee register, ungrouped/grouped, empty | Prototype-style header metrics, active/archive navigation, toolbar, server-scoped search/status, grouping of **visible page only**, configurable supported columns, empty state | Browser E2E + backend filtering tests |
| Employee card labour data / closed tabs | Compact employee summary and real tabs for assignments, experience, training, reserve; preserve drawer-based guarded edit flow | Chromium write tests |
| Right-side creation drawer | Shared BaseDialog, one-column identity form, sticky actions; supports actual employee master fields | Browser create/edit |
| Collapsed/expanded navigation | Shared desktop sidebar, compact rail and mobile overlay | Shell E2E |
| HR overview | Factual company statistics, short employee and personnel action tables; no developer/project-status cards | Browser and API |
| Archive employees | Effective-dated, company-scoped backend status; cannot classify never-hired people as former employees | Backend SQLite/PostgreSQL tests |

## Backend gaps and demo-mode rule

The frontend-only Vercel demo may render isolated deterministic mock values to reproduce approved prototype states. Those values must never be written to or mixed with the real backend. Outside `VITE_DEMO_MODE`, unavailable backend fields remain unavailable.

## Not implemented in the real backend — do **not** present mock values as production data

1. **Employee master**: the demo card now reproduces the approved prototype groups for identity, contacts, bank details and employment contract using isolated mock data. The real backend still requires approved field definitions, validation and role-specific privacy access before those extra fields become writable production data.
2. **Development combined display** `Desktop_Employees_full_screen_Кадровый_резерв_и_обучение.png`: separate HR-protected company training and reserve registries with status counters, search and drawer creation now exist. A combined timeline, workflows, approvals and training certificates remain pending.
3. **Staffing explorer** `Desktop_Оргструктура_и_штатка_схема_open_Организационная_структура.png` and four staffing table screenshots: department chart, staffing, vacancy view, authorized staffing history and CSV export are implemented against real scoped data. Approval queue and staffing version comparison remain separate future contracts; do not fake them.
4. **Contract expiration, hiring dates, demographics and earnings** in register/dashboard screenshots: no reliable scoped APIs for these values. Do not hardcode reference screenshot numbers (340 employees, 18 departments, etc.).
5. **Employee management actions**: mass editing, deletion, moving to archive, 1C sync, template creation and exports in mockups are not approved endpoints or lifecycle operations. Keep out of active UI until contracts exist.
6. **Payroll, tariffs, time attendance, personal settings, notifications** shown in screenshots: require domain stages and authorization; current placeholder routes are not acceptance-complete.
7. **Documents**: current C02 supports drafts and private PDF attachments; templates, signing, approval and document lifecycle remain separate work.

## Visual rules for subsequent stages

- Use shared semantic tokens, Golos Text, BaseCard/BaseButton/BaseDialog/BaseDataTable/BaseViewTabs.
- Match airy sidebar/header, short headings, compact table toolbars, secondary labels and fine-border cards; no product-development slogans in user-facing pages.
- Right-side drawer is the default for complex create/edit; native accessible modal semantics must be preserved.
- Every control must perform a real authorized action; server-side totals and archive criteria must not be derived from just the current page.
- Compare 375px, 768px, 1280px, 1440px layouts; no horizontal **document** overflow. Tables may scroll within their own region.
- Read-only modes and department-scoped employee visibility must remain intact.

## Next parity milestones

1. Finish screenshot-verified employee register and tabs, and test fast search, archive and column grouping.
2. Expand employee identity fields via approved sensitive-data schema before implementing reference photo/personal tabs.
3. Add org-tree visualization and unified staffing/vacancies tabs.
4. Add company-level training/reserve views and authenticated report exports.

## Backend gap review for full personal cards (B08)

The existing `employees` data contract contains only personnel number, names and revisions. The reference screenshot also includes passport/ID numbers, contact information, birth date, family and bank details, employee photo, and employment contract details. These fields cannot be fabricated in the UI or put into an unscoped JSON blob. Before B08 implementation, the team must agree on field-level purposes, validation, data retention, encryption/redaction, employee consent/legal basis, access by role and audit behaviour.

The development aggregate API is implemented separately because training and reserve tables already exist. Reserve free-text notes are intentionally omitted from aggregate lists; full notes remain available only in the appropriately authorized employee card. Existing create/edit endpoints are reused and have optimistic revision checks.
