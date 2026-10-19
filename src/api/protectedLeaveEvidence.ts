import { apiRequest, ApiError } from './client'
import { readXsrfCookie } from './csrf'
import type { LeaveCategory, LeaveRequestStatus } from './leaves'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const validate = (value: string, label: 'company' | 'request') => {
  if (typeof value !== 'string' || !uuid.test(value)) {
    throw new Error(`Invalid ${label} identifier (type ${typeof value}, length ${typeof value === 'string' ? value.length : 'n/a'})`)
  }
}
function path(company: string, request: string): string {
  validate(company, 'company'); validate(request, 'request')
  return `/companies/${company}/leave-requests/${request}/evidence`
}
export interface EvidenceRequest {
  id: string
  revision: number
  status: LeaveRequestStatus
  category?: LeaveCategory
  evidence_status?: 'pending' | 'verified' | 'rejected' | null
  evidence_revision?: number | null
}
export function privateEvidenceFileUrl(company: string, request: string): string {
  if (!base.startsWith('/') || base.startsWith('//')) throw new Error('API base must be same-origin')
  return `${base}${path(company, request)}/file`
}
export function reviewProtectedEvidence(company: string, request: string,
  revision: number, decision: 'verified' | 'rejected', comment: string | null) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid revision')
  return apiRequest<{ data: { status: 'verified' | 'rejected'; revision: number } }>(
    `${path(company, request)}/review`, {
      method: 'POST', body: JSON.stringify({ revision, decision, comment }),
    },
  )
}
export async function uploadProtectedEvidence(company: string, request: string,
  requestRevision: number, file: File) {
  if (!Number.isSafeInteger(requestRevision) || requestRevision < 1) throw new Error('Invalid revision')
  if (file.type !== 'application/pdf' || file.size < 1 || file.size > 5 * 1024 * 1024) {
    throw new ApiError('invalid-response', 422, 'Please select a PDF no larger than 5 MB')
  }
  const csrf = readXsrfCookie()
  if (!csrf) throw new ApiError('invalid-response', 419, 'Session expired; refresh this page')
  const data = new FormData()
  data.append('file', file, 'supporting-document.pdf')
  data.append('request_revision', String(requestRevision))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    let response: Response
    try {
      response = await fetch(privateEvidenceFileUrl(company, request), {
        method: 'POST', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-XSRF-TOKEN': csrf },
        body: data, signal: controller.signal,
      })
    } catch (cause) {
      // This diagnostic reports only the error class/text, never file contents,
      // names, document UUIDs or medical information.
      console.warn('HRM_PROTECTED_FETCH_DIAGNOSTIC', {
        kind: cause instanceof Error ? cause.name : 'unknown',
        detail: cause instanceof Error ? cause.message : 'unknown',
      })
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', null,
        controller.signal.aborted ? 'Private PDF upload timed out' : 'Could not upload private PDF')
    }
    if (!response.ok) {
      // Never display raw server details or private medical metadata.
      throw new ApiError('http', response.status,
        response.status === 409 ? 'The request or its document has changed. Reload it.'
          : response.status === 413 || response.status === 422 ? 'Invalid PDF. Maximum 5 MB.'
            : response.status === 403 || response.status === 404 ? 'Supporting document unavailable'
              : 'Could not save the private PDF')
    }
    return await response.json() as { data: { status: 'pending'; revision: number; has_file: true } }
  } finally {
    clearTimeout(timeout)
  }
}
