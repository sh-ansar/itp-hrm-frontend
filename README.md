# ITP HRM — Frontend

Corporate personnel management application. Vue 3 + TypeScript + Vite.

## Principles
- Reuse established visual patterns from `sh-ansar/demo_bnt_dt` without copying its legacy JavaScript architecture.
- Design tokens first; shared UI components before page-specific implementations.
- No personal employee data or secrets in this repository.
- UI connects to versioned Laravel API; local example records are explicitly marked demonstration-only.

## Development
`npm install` then `npm run dev`. Configuration: copy `.env.example` to `.env.local`.

See `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, and `docs/ROADMAP.md`.

## C02 — protected personnel documents (first stage)

- The `/documents` workspace reads only the currently selected company's HR document register. The backend restricts this to `company_admin` and `hr_specialist`; department managers do not gain document access through ordinary company membership.
- With backend `HRM_DOCUMENT_WRITES_ENABLED=true`, authorized HR users can create **draft** records for orders, contracts, supporting documents, and other personnel materials, and attach **one private PDF up to 5 MiB** to a draft. No production enablement is implied by local or CI tests; the backend flag is off by default.
- Attachments are downloaded through authenticated, same-origin API requests. Only the boolean `has_file` is returned in list responses — physical disk names, paths, and content hashes remain private. Frontend upload uses CSRF protection and does not set a manual multipart Content-Type.
- Contract/command templates, approval signatures, issuing/finalization, amendments, file replacement and electronic signature are **not yet implemented**. A metadata draft must never be presented as a legally issued order.
- The Chromium suite runs read-only and write-enabled checks against an ephemeral synthetic backend/database. The document-write flag is activated only for the isolated write-enabled job.

