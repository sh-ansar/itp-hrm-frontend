# Prototype gap audit — HRM source ZIP vs current main

Date: 2026-10-14
Source of truth: project file `Зип.zip`
Scope: frontend presentation parity. Vercel remains an autonomous demo build.

## Summary

The current app has the correct overall HRM shell and most top-level routes, but prototype parity is uneven.
The Employee card is structurally present but many prototype sections are still reduced to summary fields.
Several prototype modules are also missing as full workspaces: onboarding, roles/permissions, and tariff/accrual directories.

Priority order:
1. Employee card completeness
2. Employees registry controls/parity
3. Organization + Staffing visual/data parity
4. Roles and permissions workspace
5. Settings parity + i18n foundation
6. Directories expansion
7. Main onboarding

## Employee card

The prototype has these tabs:
- Personal data
- Organizational data
- Employment data
- Documents
- Payroll and accruals
- Schedule and timesheet
- Talent pool and learning
- Change history

The current router/tab set already matches this structure. The contents do not yet.

### Personal data

Prototype requirements:
- Contacts and addresses: login, email, phone, multiple addresses, primary address, entrance, floor, apartment
- Identity documents: nationality, personal ID, country of issue, citizenship, document type, document number, issuer, issue date, valid-until date, attachment
- Place of birth + birth-certificate attachment
- Family data: marital status, relatives list, relationship, full name, date of birth / age, document attachment
- Military records: military status, military category, military-ticket attachment, comment
- Save state / last updated

Current state:
- Basic identity, citizenship, marital status, email/phone and two addresses exist
- One identity-document summary exists
- Bank details are shown here even though the prototype places them with payroll
- Missing: login, structured addresses, nationality as separate value, issue country, place of birth, family/relatives, attachments, military records, comment

Status: **PARTIAL — major gap**

### Organizational data

Prototype requirements:
- Company, department, position, category, personnel type, appointment date, primary workplace
- Object/workplace: object, work zone, site/area, location, access status, pass number, pass issue date
- Team and managers: brigade, brigadier, department manager, direct manager, assignment status/date
- Employee and staffing-position status: employee status, archive flag, staffing position, staffing code, status-change reason/date, employment type, position-since date

Current state:
- Department, position, appointment date, object, work zone, team, direct manager and employee status exist
- Missing most of the remaining prototype fields above

Status: **PARTIAL — major gap**

### Employment data

Prototype requirements:
- Contract: number, type, valid from/to, probation toggle and dates, hiring basis/date, employment-contract attachment
- Seniority: total/company/current-position/site/special seniority
- Work-history table: period, organization, position, proof/file, industry/scope, actions
- Working conditions and personified accounting: condition type/code, list-position code, compensations, condition basis, start/end dates, attachment
- Combination/additional duties: enabled flag, dates, combined position, reason, replacement person, basis, duties, material-liability flag/document
- Contract termination: enabled flag, termination date, basis, basis group, reason, comment, document

Current state:
- Contract number/date/type, employment type, hiring basis, probation-until and work schedule exist
- Assignment history and generic experience rows exist
- Missing the majority of prototype employment fields and all specialized working-condition/combination/termination sections

Status: **PARTIAL — major gap**

### Documents

Prototype:
- Employee-specific document registry with folders, file, document number, type, status, actions, selection, search, filters, grouping, columns, templates and export

Current:
- Compact four-column table plus link to the global document register

Status: **PARTIAL — major visual/functional gap**

### Payroll and accruals

Prototype requirements:
- Pay conditions: payment type, currency, base rate, settlement period, calculation method, source
- Allowances, compensations and deductions
- Payment/hours dynamics chart + detailed table
- Payslip KPIs and line-item register
- Accrual history
- Banking and tax data: bank, IBAN/account, recipient, medical insurance, tax status, pension accruals, attachment

Current:
- Salary, currency, payment frequency, next payment date, bank and IBAN only

Status: **PARTIAL — critical gap**

### Schedule and timesheet

Prototype requirements:
- Production calendar, schedule/regime, time-accounting method, default shift, shift length, valid dates, basis
- Night-shift and weekend/holiday toggles
- Leave/absence limits: entitlement, used, balance, planned, work-year period, balance method, source, limits table
- Period timesheet with day strip, summary, deviations and source
- Attendance/absence/overtime event KPIs and event table
- Timesheet history

Current:
- Schedule, shift, hours/week, timesheet month, planned hours, worked hours

Status: **PARTIAL — critical gap**

### Talent pool and learning

Prototype requirements:
- Summary cards: reserve status, fit %, education, learning
- Reserve status form: enabled/status/target position/inclusion date/review date/level/type/basis/comment/exclusion
- Education and qualification records + diploma files
- Fit/commission criteria table with requirement, fact, score, recommendation
- Additional-learning table

Current:
- Reserve table and training table only

Status: **PARTIAL — major gap**

### Change history

Prototype:
- Action journal: date/time, section, change, before, after, system result, author + table controls

Current:
- Change, actor, date

Status: **PARTIAL — major gap**

## Employees registry

Already present:
- register/archive/development tabs
- search
- status filter
- checkbox row selection
- bulk actions
- column picker
- saved view
- pagination
- fullscreen
- grouping by department
- KPI cards

Prototype gaps:
- grouping menu supports none / departments / categories / objects, not just one boolean grouping mode
- filter drawer is materially richer than the current status-only filter
- column selector contains more prototype fields
- template workflow/drawers are simplified
- registry KPI/column details still need screenshot sign-off

Status: **GOOD BASE / PARTIAL PARITY**

## Organization and staffing

Already present:
- four prototype tabs
- organization table
- organization diagram
- staffing table
- vacant positions
- staffing change history
- create/edit department
- staffing-plan and staffing-line editing

Remaining:
- exact KPI/card parity
- exact diagram-card fields and density
- exact table columns and prototype row actions
- add-employee / new-structural-unit drawer parity
- final screenshot sign-off for diagram open/closed states

Status: **STRONG BASE / NEEDS PARITY SWEEP**

## Main

Current:
- KPI cards
- employee register
- vacant positions
- recent personnel actions

Prototype gap:
- three-step onboarding workspace is absent
- prototype start-screen/widget preference flow is absent

Status: **DASHBOARD GOOD / ONBOARDING MISSING**

## Roles and permissions

Prototype includes:
- role assignment dashboard
- user-centric role assignment
- role-centric assignment
- role creation
- permissions matrix by module
- view/create/edit/approve scopes
- temporary access
- logs

Current:
- no dedicated Roles route/workspace
- backend has company membership assignment primitives, but no full prototype role-definition UI/contract

Status: **MISSING MODULE**

## Directories

Prototype includes a broad directory workspace:
- leave and limits
- working conditions / allowances / compensation
- tariffs and accruals
- development and recruitment
- documents and bases
- tariff types
- charging methods
- tariffs
- cargo types
- units
- position tariff schemes
- tariff grounds

Current:
- positions directory only

Status: **MISSING MOST OF PROTOTYPE**

## Settings

Prototype:
- interface/system
- notifications
- security
- selectable timezone, language, date/time format, number format
- start screen
- notification channels/rules
- MFA
- IP restriction
- password rules
- inactivity timeout

Current:
- three main tabs exist
- theme, sidebar, company, read-only language/format summary
- basic demo notification toggles
- basic security/session description

Missing:
- real language selector/i18n
- region/time/date/number controls
- start-screen configuration
- detailed notification rules
- actual security controls

Status: **PARTIAL**

## Immediate implementation sequence

### P0 — before management demo
- [x] Complete Employee card Personal data in demo, including military records and family data
- [x] Complete Employee card Organizational data in demo
- [x] Complete Employee card Employment data in demo
- [x] Expand Payroll and Schedule tabs with prototype sections in demo
- [x] Expand Talent/Learning and History tabs in demo
- [x] Upgrade employee Documents table fields in demo
- [ ] Add full Documents-tab toolbar/folders/filter parity
- [ ] Screenshot sign-off for all Employee-card tabs after a Vercel build slot is available

### P1
- [ ] Employees grouping modes and richer filters
- [ ] Organization/Staffing final parity sweep
- [ ] Settings controls + RU/KZ/EN i18n foundation
- [ ] Main onboarding flow

### P2
- [ ] Roles/permissions workspace
- [ ] Expanded directories/tariff workspace

## Important backend note

The current Laravel employee detail endpoint returns employee identity, assignments, experience, reserve, training and audit history.
It does **not yet return the prototype-level reference profile** used by the demo for passport/family/military/payroll/schedule/etc.
Therefore frontend demo parity can be completed first, but the real Laravel/PostgreSQL schema/API must later be extended before these fields can become production data.


## Implementation update — employee-card parity branch

Branch: `feat/employee-card-prototype-parity-20261014`

Implemented for the autonomous demo:
- Personal: login, structured addresses, identity-document metadata, place of birth, family table, military records
- Organization: company/category/personnel type, workplace/pass, team/managers, staffing-position status
- Employment: contract validity/probation, seniority, working conditions, combination/additional duties, termination
- Payroll: pay conditions, adjustments/deductions, payslip summary, history/dynamics, banking/tax
- Schedule: schedule parameters, leave balances/limits, current timesheet, attendance events, timesheet history
- Development: reserve summary/details, education, fit assessment, reserve history, additional training
- History: section, before/after, system result, author and timestamp
- Documents: document/file/type/number/date/status columns

Production note: these extended reference fields remain optional because Laravel does not yet expose the corresponding reference profile. The demo is intentionally ahead of the production persistence contract.
