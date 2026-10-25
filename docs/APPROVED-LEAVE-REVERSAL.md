# Approved future leave reversal

The HR leave workspace exposes cancellation only when Laravel returns `meta.can_reverse_approved_leave=true` and the booking is approved. Default-OFF deployments and HR/employee/manager roles do not display the action. A shared drawer requires a 5–500-character reason and submits the loaded revision to the explicit `reverse-approved` route.

The server remains authoritative for dates, scope, own-subject, attendance, closed-year and locked-timesheet restrictions. Errors preserve the entered reason; conflicts require refreshing the list. Company switches invalidate pending UI responses. Successful cancellation reloads request history and emits the existing schedule refresh event. Balances are fetched again when viewed.

Copy supports RU/KK/EN/KA. The API success is never simulated. Isolated real Chromium/Laravel/SQLite acceptance on 2026-10-23 passed: HR creates/submits; another admin approves; 24→19 booked balance; HR has no reversal button; admin cancels with reason; preserved cancelled history, 19→24 balance, schedule removal, repeated reversal 409 and rebooking through the public API. Each run creates unique synthetic records in disposable QA only.

The paired CI workflow pins reviewed backend 7f13441 and uses the same scenario. Production feature activation and PostgreSQL acceptance remain separately recorded release gates.
