# ITP HRM — frontend session authentication contract

Status: ready for review; **disabled by default** and not production-approved.

## Deployment topology
This frontend must reach Laravel through a **same-origin** reverse proxy. In local development Vite on port 5173 proxies `/api`, `/auth` and `/sanctum` to Laravel port 8000. The runtime request client accepts relative paths only and does not forward CSRF cookies to arbitrary absolute URLs.

Set `VITE_API_BASE_URL=/api/v1`. `VITE_ENABLE_BROWSER_LOGIN=false` is the default and must remain false until the backend flag `HRM_BROWSER_LOGIN_ENABLED` and HTTPS/session configuration are approved. Enabling frontend alone cannot enable backend login.

## Login flow
1. GET `/sanctum/csrf-cookie` (first-party cookie, no storage or bearer token).
2. Read and URL-decode the `XSRF-TOKEN` cookie; send it in `X-XSRF-TOKEN` for mutations.
3. POST `/auth/login` with email/password over HTTPS in deployment; never write password, session tokens or employee details to localStorage.
4. The backend issues an HttpOnly `web` session cookie. Vue keeps only the current minimal display identity in Pinia memory.
5. GET `/auth/me` to recover the session after page refresh. Route guard redirects to the login page when it receives 401 or 404. Backend errors remain visible.
6. POST `/auth/logout` with CSRF; upon 204, clear memory and redirect to login. On server failure, show an error, do not claim logout success.

## Failure states
- 401 — sign-in required.
- 403 — permission denied.
- 404 — backend feature disabled/unavailable.
- 419 — expired CSRF/session, retry after refreshing CSRF state.
- 422 — credential or form validation rejected; avoid account enumeration.
- 429 — rate limited.
- 5xx/network timeout — server unavailable; no silent success.

## Security and outstanding tests
Only TypeScript/Vite build verification exists in frontend CI. Browser integration tests of cookie delivery, CSRF, logout, session expiry and redirects are still required before production. Cross-subdomain deployment has not been approved; CORS remains deny-by-default. The view is a prepared UI, not a production login screen.

Related backend: `sh-ansar/itp-hrm-backend` Issue #7.
