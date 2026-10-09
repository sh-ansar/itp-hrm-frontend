# Routing and incomplete modules

The frontend must never silently redirect an unfinished HR module to the dashboard or display fabricated employee data.

- `/` — overview.
- `/employees`, `/organization`, `/staffing` — explicitly scoped placeholder pages while APIs and authorization remain under development.
- Any unknown URL — genuine 404 content with a route back to the overview.

These placeholder routes are intentionally **not** considered completion of staffing, personnel or organization requirements. Replace each with a secured, API-connected feature only when permissions, validation, error states and integration tests are complete.
