# HRM release preflight — 2026-10-23

Status: candidate prepared locally; unpublished and not deployed. This is not final acceptance of the complete project.

## Candidate evidence

- Combined frontend application source: dfb16889ee1296979c3e3a09bc3e11f39cdba429.
- `build:htdocs` passed, including typecheck; output uses `/hrm/`.
- `/hrm/` Chromium suite: 5 passed. Covers direct navigation/reload, readiness gating, recovery dialog, SVG assets and deep links. API responses are mocked in this suite; it is not authenticated production acceptance.
- Recovery test now scopes the footer close action because the shared dialog intentionally also exposes a header close button.
- Earlier local evidence: 11 demo browser tests, 8 static tests, production/demo builds; real Laravel/SQLite tab approval E2E; 13 backend worktime tests / 149 assertions.
- PostgreSQL follow-up integration and full visual matrix remain pending.

## Production observed, read-only

- URL: https://platform.itpmining.kz/hrm/
- Frontend: `C:\deploy\hrm\site\current`.
- Backend: `C:\deploy\hrm\backend-release-contract-windows-20261016`, commit 2f0fe17ef83f69d4500e36d467121db66f0d3185.
- Isolated HRM HTTP/FastCGI/PostgreSQL services running. PostgreSQL database `hrm`, loopback port 55432.
- HRM/login/deep-link shell and API health return 200; anonymous companies API returns 401; `.env` returns 403. Platform and Unityre landing checks return 200.
- Candidate backend main d6117d7a3968f2354a0bfcab51d6ef86b4ff20aa has eight migrations absent from production, dated 2026-10-19 through 2026-10-23 (worktime periods).
- Worktime period approvals and leave manager approval are disabled. Preserve current flags during deployment.

## Gates before deployment

1. Publish scoped branches, create/update separate PRs, pass required CI and merge.
2. Run PostgreSQL integration and schema upgrade rehearsal; take and verify recoverable HRM backups.
3. Deploy compatible backend and eight pending migrations with the dedicated migrator identity, then frontend. Do not change platform/Unityre services or global PHP.
4. Verify authenticated HRM flows, assets, API and logs; compare unrelated service baselines. Keep a compatible application/database rollback plan.

No production application, database or flags were changed by this preflight. No backup/restore success or authenticated production browser acceptance is claimed.
