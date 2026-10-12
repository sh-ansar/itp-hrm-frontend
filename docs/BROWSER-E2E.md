# A09 first-party browser integration tests

This PR introduces a **real Chromium end-to-end check in GitHub Actions** for the Laravel 12 and Vue 3 auth flow without touching the computer Ansar, production, other project databases or real employee data.

## How the workflow works
- On PRs and main updates, GitHub Actions checks out the frontend and an **explicitly pinned backend commit** (`0c1cdb1810aac49268681a54a234030f820caa5b`) for reproducibility. Update the pin through a reviewed PR when changing the auth contract.
- Installs PHP 8.4, SQLite, Node 22 and pinned Playwright Chromium.
- Uses a fresh SQLite file under GitHub runner temporary checkout, a synthetic identity and isolated development-only Laravel server. No registration/admin-grant route is added.
- Runs Vite proxy and Laravel on localhost. `APP_ENV=local` is required to verify **real CSRF enforcement**, because Laravel automatically disables CSRF checks in unit-test environment.
- `HRM_BROWSER_LOGIN_ENABLED=true` and `VITE_ENABLE_BROWSER_LOGIN=true` apply **only within the disposable CI job**. They remain disabled in committed `.env.example`.
- Uses a persistent file-backed rate limiter in this CI run: `CACHE_STORE=file`, not array, so lockout counters persist across browser HTTP requests.

## Browser acceptance scenarios
1. Guest redirected from /employees to /login without leaking HR data.
2. Successful login rotates cookie, restores a server-side session after page refresh, and authorizes /api/v1/me through Sanctum.
3. No password/session/HR data written to localStorage.
4. Browser POST logout **without CSRF** gets 419 and preserves the session. Normal UI logout invalidates it, subsequent API call 401.
5. Wrong password rejected without revealing account existence; 6th failed attempt receives 429.
6. Untrusted cross-origin requests are not granted CORS read access.

## Known limitations
- Browser tests run with isolated local HTTP Vite proxy; **not** an approved production HTTPS hostname. Same-origin and TLS/reverse-proxy settings still require staging verification.
- End-to-end tests do not yet cover the organization's actual identity provider, provisioning or deprovisioning, MFA, password reset, multi-device logout or long-lived expiration.
- Role management remains disabled even in browser E2E. A09 is still incomplete, and Issue #7 stays open.
