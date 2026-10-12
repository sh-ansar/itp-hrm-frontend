# A12 — Frontend HTTP error metadata

The same-origin request client preserves a validated `code` field and `X-Request-ID` for API failures as nullable fields on `ApiError`. The user-facing messages remain local, generic and based on HTTP status: server-provided text is deliberately not rendered.

The behavior is backwards-compatible with existing Laravel `/auth` routes and responses without a machine code. Invalid JSON and untrusted metadata do not hide the original status. Correlation IDs must never be interpreted as authorization tokens.

Limitations: frontend build/typecheck CI is required; server-rendered exceptions, complete error display patterns and staging integration remain pending. A12 is not complete.
