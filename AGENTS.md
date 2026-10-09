# AGENTS.md — ITP HRM frontend

When asked "давай", "продолжай" or "делай дальше", inspect this repository, backend docs/EXECUTION-PLAN.md, git status and tests; implement the next unfinished item without re-planning.

Rule: reuse existing src/components/ui first; check BNT reference demo_bnt_dt for visual tokens/patterns, but do not copy its DOM manipulation runtime. Only create new UI components when necessary, and extend shared ones rather than duplicate.

Never mock successful API writes, fabricate HR KPIs, or store employee PII in localStorage. UI must show loading, empty, error and permission states. Commit only after TypeScript/build/tests; report evidence and SHA. Do not touch unrelated repositories, other services or production. Keep backend and frontend separate.
