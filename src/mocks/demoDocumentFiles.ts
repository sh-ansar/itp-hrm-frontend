/**
 * Ephemeral files selected in the frontend-only HRM demo.
 * No PDF bytes are sent to Laravel and nothing is written to browser storage.
 * Object URLs are revoked whenever the same document is replaced.
 */
const previewUrls = new Map<string, string>()

export function rememberDemoDocumentFile(documentId: string, file: File): void {
  const existing = previewUrls.get(documentId)
  if (existing) URL.revokeObjectURL(existing)
  previewUrls.set(documentId, URL.createObjectURL(file))
}

export function getDemoDocumentUrl(documentId: string): string | null {
  return previewUrls.get(documentId) ?? null
}
