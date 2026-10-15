# HRM Vue in shared platform htdocs (same pattern as Unityre)

Target URL: `https://platform.itpmining.kz/hrm/` (Vue SPA only).
Separate reserved API URL: `https://platform.itpmining.kz/hrm-api/` (Laravel, later).

The existing HTTPS `platform.itpmining.kz` Apache VirtualHost already uses
`Alias /unityre` and `Alias /unityre-api`. Follow that pattern: add only
new aliases. Do **not** change the global `DocumentRoot`, existing
`/api`, `/unityre`, `/reporting`, service ports, or other tenants.

## Build

Use reviewed Git SHA on an isolated build machine:

```powershell
npm ci
npm run build:htdocs
npm run preview -- --mode hrm --host 127.0.0.1 --port 4178 --strictPort
# separately run:
$env:HRM_HTDOCS_BASE_URL='http://127.0.0.1:4178'
node --test tests/e2e/htdocs-subpath.test.mjs
```

`build:htdocs` loads the tracked `.env.hrm`, which sets:
- `VITE_APP_BASE_PATH=/hrm/` for Vite asset URLs and Vue Router history.
- `VITE_BACKEND_PREFIX=/hrm-api` for `auth/*` and `sanctum/*`.
- `VITE_API_BASE_URL=/hrm-api/api/v1` for employee, documents and other APIs.
- `VITE_DEMO_MODE=false`; `VITE_ENABLE_BROWSER_LOGIN=true`.

The generated `dist` is the **only** thing placed under
`C:\xampp\htdocs\hrm\dist\`. PHP code, PostgreSQL data, `.env`,
`node_modules`, lockfiles with internal paths, and MinIO credentials
must never be placed under the publicly served `htdocs` directory.
Do not ship a mocked production login or enable unaudited HRM write flags.

## Apache route

See `deploy/platform-hrm-alias.conf.example`. Add the *frontend-only*
Alias/Directory block to the existing `:443` platform VirtualHost, AFTER
backing up the exact config and confirming the dist folder has been staged.
Do not modify any other VirtualHost. `/hrm/` serves static files;
`RewriteBase /hrm/` provides reload/deep-link fallback.

Do not enable the `/hrm-api/` proxy portion until the *dedicated*
Laravel PHP >= 8.4.1 service is available on loopback, isolated from
XAMPP's shared PHP 8.2. HRM backend lives outside `htdocs`, uses its
own restricted OS service identity, PostgreSQL database/user (prefer an
isolated PostgreSQL instance), private MinIO bucket and log directory.
The frontend needs no extra web-server process, no new Apache vhost and
no shared `/api` route.

**Shared hostname security gate:** Laravel defaults to an `XSRF-TOKEN`
cookie visible across paths on the same host. Before real login, HRM
must use a unique session cookie and a separately named XSRF cookie,
both accepted by its frontend, so it cannot disturb existing platform
sessions. Validate Secure, HttpOnly (session only), SameSite, host-only
domain, HTTPS proxy trust and current-role revocation. The current
platform vhost also sets `X-Forwarded-Prefix: /unityre-api` globally;
verify a path-scoped `/hrm-api` override instead of changing Unityre's
settings for all requests.

## Safe rollout gates

1. Verify existing platform and Unityre responses; checksum the vhost
   config and save a known-good copy.
2. Build/scan `dist` from a pinned SHA; test direct `/hrm/login`,
   `/hrm/employees`, `/hrm/documents`, `/hrm/organization`,
   CSS/icons and 375/768/1440px layouts.
3. Test HRM's own backend, CSRF cookies, login/logout and PDF permissions
   on a private staging host with synthetic employees.
4. Stage files in a new HRM-only directory; validate
   `C:\xampp\apache\bin\httpd.exe -t` before a controlled reload.
5. Check the new `/hrm/` and `/hrm-api/` URLs, plus pre-existing
   `/`, `/api`, `/unityre`, `/unityre-api` and `/reporting`.
6. On failure, remove only the HRM route additions using the exact
   Apache config backup, re-validate Apache, and roll back only HRM
   files/services. Never restart PostgreSQL belonging to another app.

This Git change alone does not deploy anything on the live Apache server.
