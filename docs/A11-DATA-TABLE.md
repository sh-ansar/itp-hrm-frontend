# A11 — Shared data table

BaseDataTable provides accessible column headings, keyboard focus for the horizontal scroll region, responsive overflow, optional cell slots and a consistent loading/empty state. It is not wired to personnel endpoints: no live employee data, sorting, paging, mutation actions or authorization decisions are made by this component.

For production use, callers must provide a stable row identifier instead of positional indices, pagination and error handling. The initial generic table is a visual foundation; A11 remains incomplete until browser component tests and integration are available.
