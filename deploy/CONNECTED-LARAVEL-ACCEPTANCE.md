# HRM connected gateway acceptance (Laravel + PostgreSQL + MinIO)

The Vercel frontend remains an isolated **design demo**. Actual HRM uses the
dedicated Laravel API, its PostgreSQL database and private MinIO under a single
platform origin. Never use Vercel demo records as proof of persisted HR data.

## Expected production topology

```text
https://platform.itpmining.kz/hrm/          -> Vue dist-only Apache Alias
https://platform.itpmining.kz/hrm-api/      -> dedicated HRM PHP 8.4 Laravel
                                          -> separate PostgreSQL 16, schema hrm
                                          -> private MinIO bucket
```

Vue release configuration is defined in `.env.hrm`:
`VITE_APP_BASE_PATH=/hrm/`, `VITE_BACKEND_PREFIX=/hrm-api`,
`VITE_API_BASE_URL=/hrm-api/api/v1`,
`VITE_XSRF_COOKIE_NAME=HRM-XSRF-TOKEN`,
`VITE_ENABLE_BROWSER_LOGIN=true`, `VITE_DEMO_MODE=false`.
Use `npm run build:htdocs`; **only** its compiled dist goes into the
separate HRM static site. Never put Laravel source, storage, credentials,
PostgreSQL or MinIO secrets in that directory.

## New mandatory CI acceptance: connected PostgreSQL browser

`.github/workflows/connected-postgres-gateway-e2e.yml` checks **real** PHP
8.4 Laravel, PostgreSQL 16, a private MinIO service and Chromium, not a mock
API. The two-document workflows are tested through actual Vue browser actions.

- A dedicated GitHub Actions PostgreSQL 16 Docker service uses database
  `itp_hrm_browser_ci`, user `hrm_browser_ci`, schema `hrm` and loopback
  5432. Credentials are **synthetic and runner-local**; never copy them to
  staging or production.
- Fixtures run only after the strict `assert-disposable-ci-database.php`
  preflight, which refuses production, missing GitHub Actions marker, wrong
  host/database/user/schema/port and unexpected PostgreSQL connections.
- Isolated PHP/SQL migrations, cookie-backed browser sessions and Laravel
  ACL queries must work on PostgreSQL rather than only SQLite.
- Vite routes **only** `/hrm-api` to Laravel in gateway mode; it must not
  also claim `/api` or `/auth` belonging to the parent platform.
- A separate `hrm_ci_browser_session` cookie and `HRM-XSRF-TOKEN` are
  checked. Guest access and missing-CSRF writes must be rejected; HR's
  approved requests must not leak data from another company.
- A real file is submitted to private MinIO and downloaded only by its
  authorized subject/HR; independent reviewer and order/evidence decisions
  retain the four-eyes rule.
- The acceptance script runs `migrate:fresh` **only in disposable CI**.
  Absolutely never copy that command into operational release scripts.

## What a green CI result means — and what it does not

A green connected E2E proves a working end-to-end contract for the pinned
frontend/backend SHAs, synthetic data and isolated PostgreSQL+MinIO. It
**does not** prove readiness for live medical data, a signed order, the
shared platform Apache cookie coexistence or backup restores.

Before production deployment, compare the checked-in SHAs to the isolated
Windows HRM service, rehearse its **additive** migrations with a separate
migrator on an approved isolated staging database, verify rollback and backup
restore, MinIO ACL and antivirus/retention policy, and test HTTPS/SSO/session
cookie interactions with the existing platform and Unityre. Roll out
feature flags independently; do not flip all writes on simultaneously.

See backend `docs/HRM-PRODUCTION-ISOLATION.md` and
`docs/PROTECTED-LEAVE-EVIDENCE.md` for the service boundaries.
