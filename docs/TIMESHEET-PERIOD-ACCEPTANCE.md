# Timesheet period acceptance — 23 October 2026

The period panel now emits an explicit editable state. Editing is disabled until a real period GET confirms draft; read errors leave it disabled and expose a retry. A 404 preserves the separately gated legacy editor. Submitted/approved periods remain blocked by Laravel independently of Vue.

A transition captures its company, month and revision before awaiting HTTP. Obsolete success/error responses are ignored after month/company changes or unmount. Failed transitions re-read authoritative state before offering edits again.

Local evidence on Ansar:

- Production and demo builds including TypeScript passed.
- Browser-runtime and Laravel route-parity tests: 2 passed against the isolated reviewed backend checkout.
- Real Chromium/Laravel cycle passed using separate synthetic HR/reviewer accounts, fresh SQLite database and file sessions. Covered entry save, submission, HR approval denial, reviewer approval, locked PUT 409, mandatory reopen reason, revision 3 after reopen, stale actual 409 response while switching month, controlled read 503, delayed successful read and recovery. No successful write response was mocked.
- Read-only DB inspection after the cycle: 31 persisted worktime day rows; period audit contained 2 submissions, 1 approval and 1 reopen (the second submission intentionally creates the stale-response case).
- New acceptance spec and scoped synthetic reviewer fixture are wired into write-enabled browser CI only. PostgreSQL and remote CI have not run for this follow-up.

No production deployment, real employee data, policy changes or SMTP changes. Full locale/ZIP acceptance for the timekeeping workspace remains separate work.
