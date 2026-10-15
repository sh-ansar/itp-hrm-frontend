# HRM frontend under the existing platform host (Unityre-style routing)

Target: `https://platform.itpmining.kz/hrm/`.
Future separate backend: `https://platform.itpmining.kz/hrm-api/`.

## Current deployment: zero Apache configuration changes

On 2026-10-15 the static HRM frontend was published on WIN-487ME2E68DR
using an additive **physical subdirectory** of the existing platform
DocumentRoot:

`C:\xampp\htdocs\platform\dist\hrm\`

This path is separate from the platform's own `index.html` and `assets`
and from Unityre's `Alias /unityre`. Apache already allows nested
`.htaccess` rewrites; the parent site was tested with a temporary probe
and then that probe was removed. No Apache VirtualHost or global config
change, no Apache restart and no database write was necessary.

Release source: frontend main SHA
`e8c2c8c24a0560e1cff86be71a7cae058266c133`.
The build was produced **on the server**, in a private working directory:
`C:\deploy\hrm\build-20261015\dist\`. Only generated `dist` files
were copied to a new temporary sibling folder and atomically renamed
to the new `hrm` directory. The nested `.htaccess` is based on
`deploy/hrm-htaccess.example`.

The checked pre-deploy hashes of the platform index, Unityre index,
Apache vhost and Apache global configuration are stored **outside**
the webroot in
`C:\deploy\hrm\deployment-state\frontend-baseline-20261015.json`.

Local-host HTTPS smoke checks returned 200 for `/hrm/`, `/hrm/login`,
`/hrm/employees`, `/hrm/documents`, `/hrm/organization`, JS, CSS,
fonts and SVG. Existing platform and Unityre index hashes, Apache config
hashes, and the Apache service state remained unchanged. Browser E2E from
the separate Ansar device confirmed deep links, redirects and reloads.

**The frontend is not a functional HRM backend.** The isolated Laravel API
at `/hrm-api/` has not been published. The build is intentionally
`VITE_DEMO_MODE=false` and `VITE_ENABLE_BROWSER_LOGIN=true`, so
the login screen will appear but corporate HRM credentials cannot be
used until the backend, auth cookie isolation and security tests pass.
Do not enter real personnel data or credentials during this phase.

## Reproducible frontend build

```powershell
git checkout <approved-frontend-sha>
npm ci
npm run build:htdocs
npm run preview -- --mode hrm --host 127.0.0.1 --port 4178 --strictPort
$env:HRM_HTDOCS_BASE_URL='http://127.0.0.1:4178'
node --test tests/e2e/htdocs-subpath.test.mjs
```

`.env.hrm` sets Vite base `/hrm/`, the Vue Router history base, the
dedicated same-origin API route `/hrm-api/api/v1`, and
`/hrm-api/auth`, `/hrm-api/sanctum`. The default `npm run build`
remains rooted at `/` for Vercel. Never publish the backend sources,
`.env`, `vendor`, PostgreSQL data, MinIO secrets or Node modules into
`htdocs`.

## Operational caveat — future platform builds

This no-restart option is deliberately the least invasive for initial
deployment, but the folder is a **child of the platform's Vite dist**.
If a platform release empties or overwrites `platform/dist`, it may
remove `hrm` along with unrelated static files. The platform deployment
pipeline must therefore preserve this folder or HRM must migrate to its
own `C:\xampp\htdocs\hrm\dist` and an Apache `Alias /hrm/`.
See `deploy/platform-hrm-alias.conf.example` for the durable fallback.
That migration needs an Apache configuration backup, `httpd -t`, an
approved controlled reload, a smoke-test of **all** existing platform
routes and an HRM-only rollback. Do not change the global platform
`DocumentRoot` or existing `/api`/`/unityre` Aliases.

## Separate Laravel / PostgreSQL / MinIO

The backend requires PHP >= 8.4.1. Existing XAMPP Apache still runs
PHP 8.2 and must not be upgraded in place. Side-by-side PHP 8.4.26
and the locked Laravel 12 backend dependencies have been staged under
`C:\deploy\hrm\` (outside htdocs) without a service or public endpoint.
This is **not** an activated server.

Before enabling `/hrm-api/`, prepare an isolated PostgreSQL service,
fresh HRM database, runtime and migration users with distinct passwords
and minimum grants; a private MinIO bucket; a dedicated PHP HTTP
service; and TLS-only loopback reverse proxy. Do not reuse the
`postgresql-legacy-recovery-16` process or the shared 5432 database.

On the **same hostname** as platform/Unityre, Laravel must use its own
session cookie and XSRF token cookie (with matching frontend logic).
Explicitly test cookie non-collision, 401/403/419 responses, role
revocation and document download authorization. The current platform
vhost globally sets `X-Forwarded-Prefix: /unityre-api`; override that
only for HRM requests after isolated integration tests.
Leave all HRM write feature flags off until accepted.

## Rollback

Initial zero-reload frontend rollback does **not** require editing
Apache: move **only** the newly created
`C:\xampp\htdocs\platform\dist\hrm` directory to a unique private
quarantine/backup path outside `htdocs` after verifying the release
marker and file fingerprints. No other project path or service is touched.
The earlier `C:\deploy\hrm\build-20261015\dist` remains available
for restoration.

Never run a recursive delete in `C:\xampp\htdocs\platform\dist`,
and never restart or reconfigure PostgreSQL as part of a frontend rollback.
After any change, compare the unaffected file hashes and check
`/`, `/unityre/`, `/api`, `/unityre-api`, `/reporting`, and HRM
deep links. These health checks may have non-200 pre-existing behavior:
compare against the recorded baseline, not a guessed expected status.
