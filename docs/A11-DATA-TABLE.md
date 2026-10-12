# A11 — Shared data table

BaseDataTable provides accessible column headings, keyboard focus for the horizontal scroll region, responsive overflow, optional cell slots and a consistent loading/empty state. It is not wired to personnel endpoints: no live employee data, sorting, paging, mutation actions or authorization decisions are made by this component.

Callers must supply the stable `rowKey` field to avoid positional identities. Pagination and error handling remain the responsibility of the consuming feature. The initial generic table is a visual foundation; A11 remains incomplete until browser component tests and integration are available.
