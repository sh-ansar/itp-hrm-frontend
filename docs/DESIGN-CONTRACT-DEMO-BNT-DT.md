# Shared HRM UI contract — adapted from `demo_bnt_dt`

**Source of design truth:** [`sh-ansar/demo_bnt_dt`](https://github.com/sh-ansar/demo_bnt_dt), branch `main`, `docs/corporate-ui-guidelines.md`, `docs/ui-component-audit.md`, `assets/css/{tokens,components,shell-v91}.css`, `assets/js/pages/equipment.js`, `assets/js/ui.js`.

**Scope:** Only reusable *visual and interaction contracts* are borrowed. `demo_bnt_dt` is HTML/CSS/vanilla JS, not a Vue component library. No mocked petrochemical statistics, port/rail business concepts, images, company identities, or unrelated icons are copied into HRM. HRM uses real Laravel APIs with its own RBAC, and keeps its reference-screen-specific layout as the primary HRM business contract.

## Rules confirmed from the reference

| Rule | Source | HRM implementation |
|---|---|---|
| Corporate Golos Text/Golos font; body smallest `12/16`, body small `14/20` | Guidelines §6; `assets/css/tokens.css` | `src/styles/tokens.css`; 12–13px table text and compact controls |
| Semantic blue `#0697E0`, ink `#093044`, muted `#7199AC`, page `#F8FAFB`, thin 8%/24% blue borders | Guidelines §7–8 | HRM `--color-*` tokens, both light and dark theme |
| Shared spacing scale `8/12/24/48px`; never scale border width via viewport | Guidelines §4–5 | HRM `--space-*`, 1px strokes |
| Base 1200–1440; >1440 and <390 responsive scaling, tablet/mobile breakpoints 960 and 640 | Guidelines §3 | HRM viewport regression at 375/768/1280/1440, responsive layouts |
| Sidebar 264px expanded / reference 60px icon rail; 100% viewport height | Guidelines §4; `shell-v91.css` | `AppSidebar.vue`/`App.vue` (60px collapsed variant) |
| Column filter icon opens anchored overlay below clicked `th`, constrained to viewport; closes on outside/Escape; list scrolls, not entire page | `assets/js/pages/equipment.js` (column filter) and `components.css` (`column-filter-popover`) | `BaseColumnFilterPopover.vue` + `BaseDataTable.vue` |
| Column checklist begins with «Все» selected; users can uncheck values; search scans visible options; selected values apply per column | Same reference | BNT faceted choice filter, multi-select, select all/search/apply/reset; **currently applies to loaded page only** |
| Status badges, buttons and input controls consume semantic tokens and reusable variants | `components.css` and `ui-component-audit.md` | `BaseStatusPill`, `BaseButton`, `BaseFormField`, `BaseSelectField` |
| Four compact KPI cards, 52px two-pixel progress ring; label above, value + description alongside, semantic progress color | `components.css` `.payment-summary-card` / `.payment-progress-ring` | `BaseKpiGrid.vue` + `DashboardMetricCard.vue`; actual HRM source metrics |
| Horizontal scroll in one contained grid only; no nested vertical scrollbar on the table wrapper | Table rules / HRM prototype | `BaseDataTable.vue`, `contain:layout paint`, `overflow-x:auto; overflow-y:hidden` |

## Reusable HRM components and where they are available

| Reusable pattern from BNT | HRM implementation | State |
|---|---|---|
| Column filter popover (search + «Все» + checkbox options) | `BaseColumnFilterPopover.vue` | Implemented, shared by all `BaseDataTable` instances |
| Table with header sorting, selection, grouped rows, compact sizing | `BaseDataTable.vue` | Implemented |
| Selected rows → choose action → execute / clear | `BaseTableBulkActions.vue` | Implemented; actual export/navigation only, no fake mutations |
| Four-column metric grid with progress rings | `BaseKpiGrid.vue`, `DashboardMetricCard.vue` | Implemented |
| Status indicator / semantic badge | `BaseStatusPill.vue` | Implemented |
| Button variants and accessible fields | `BaseButton.vue`, `BaseFormField.vue`, `BaseSelectField.vue` | Implemented |
| Show/hide and save table columns | `BaseColumnPicker.vue` | Implemented |
| Page title, sections, tabs, empty/error/loading | `BasePageHeading.vue`, `BaseViewTabs.vue`, `BaseEmptyState.vue`, `BaseNotice.vue`, `BaseLoadingState.vue` | Implemented |
| Slide-in action/edit panel / dialog | `BaseDialog.vue`, feature-specific forms | Existing; can adopt BNT drawer geometry without replacing forms |
| Fixed topbar and full-height navigation | `AppTopbar.vue`, `AppSidebar.vue` | Implemented; do not add inert bell/microphone |
| Charts, graphs, timeline, custom reporting | HRM Reports views | Adapt only when product APIs and prototypes justify them |
| Toast/notifications/avatar menu | Not part of approved real HRM endpoints yet | **Not implemented**; no decorative fake actions |

## Operational constraints

1. Real app: `npm run dev` on Ansar (5173) with Laravel on 8000 + dedicated local PostgreSQL; authorization and server RBAC remain enforced. CI may use mock fixtures for isolated visual regression; **do not call that production readiness**.
2. Filters work on already fetched rows. They **must not imply they filter all pages in the DB**; use server pagination/filter endpoints for true cross-page filtering later.
3. Selected-row actions must be real. CSV export and route navigation are available; changing many HR records requires approved backend bulk API and business security review, not front-end-only controls.
4. Maintain consistent light/dark, 375/768/1280/1440 responsive checks, keyboard focus, Escape dismissal and scroll containment.
5. Add only assets actually used by HRM. The BNT source component CSS and unrelated industrial SVGs are design references, not runtime dependencies.

## Reference/implementation parity checklist

- [x] Compare original equipment filter interaction and its anchored positioning/checkbox states
- [x] Compare compact KPI metrics/ring/card spacing and semantic tokens
- [x] Use the current `demo_bnt_dt` source guidelines and audit rather than inventing design values
- [x] Implement common components for reuse across the current HRM screens
- [ ] Browser screenshot sign-off against the complete original HRM ZIP on both themes
- [ ] Server-backed cross-page multi-facet filtering and server-approved mass edits, if required by business spec
- [ ] Real notification/inbox feature, once permissions, events and endpoints are specified
