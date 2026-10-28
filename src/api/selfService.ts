import { apiRequest } from './client'
import type { LeaveRequestStatus, LeaveCategory } from './leaves'

export interface OwnRequest {
  id: string; leave_type_id: string; leave_type_name: string
  planned_started_on: string; planned_ended_on: string; planned_days: number
  status: LeaveRequestStatus; revision: number; note: string | null; decision_comment: string | null
  category?: LeaveCategory; evidence_status?: 'pending' | 'verified' | 'rejected' | null
  evidence_revision?: number | null
  manager_recommendation?: 'approved' | 'rejected' | null
  manager_decision_comment?: string | null
  /** Actual reviewer pinned when the server's manager snapshot workflow is enabled. */
  assigned_manager_name?: string | null
}
export interface OwnLeave {
  id: string; leave_type_name: string; planned_started_on: string; planned_ended_on: string
  planned_days: number; actual_started_on: string | null; actual_ended_on: string | null; actual_days: number | null
}
export interface OwnWorkspace {
  data: {
    employee: { id: string; first_name: string; last_name: string; middle_name: string | null; personnel_number: string } | null
    requests: OwnRequest[]; leaves: OwnLeave[]; leave_types: { id: string; name: string; category: string }[]
  }
  meta: { can_request: boolean; requests_last_page: number; leaves_last_page: number
    protected_evidence_uploads_enabled?: boolean; protected_evidence_required?: boolean
    manager_approval_required?: boolean }
}
export type OwnLeaveInput = Pick<OwnRequest, 'leave_type_id' | 'planned_started_on' | 'planned_ended_on' | 'note'>
const base = (company: string) => `/companies/${company}/me`
export function getOwnWorkspace(company: string, requestsPage = 1, leavesPage = 1) {
  return apiRequest<OwnWorkspace>(`${base(company)}/workspace?requests_page=${requestsPage}&leaves_page=${leavesPage}`, { cache: 'no-store' })
}
export function saveOwnLeave(company: string, data: OwnLeaveInput, request?: OwnRequest) {
  return apiRequest(`${base(company)}/leave-requests${request ? '/' + request.id : ''}`, {
    method: request ? 'PUT' : 'POST', body: JSON.stringify({ ...data, ...(request ? { revision: request.revision } : {}) }),
  })
}
export function transitionOwnLeave(company: string, request: OwnRequest, action: 'submit' | 'cancel') {
  return apiRequest(`${base(company)}/leave-requests/${request.id}/${action}`, {
    method: 'POST', body: JSON.stringify({ revision: request.revision }),
  })
}
export interface EmployeeLink { employee_id: string | null; revision: number }
export function getEmployeeLink(company: string, user: number) {
  return apiRequest<{ data: EmployeeLink | null }>(`/companies/${company}/memberships/${user}/employee-link`)
}
export function saveEmployeeLink(company: string, user: number, data: EmployeeLink) {
  return apiRequest<{ data: EmployeeLink }>(`/companies/${company}/memberships/${user}/employee-link`, {
    method: 'PUT', body: JSON.stringify(data),
  })
}
/** The current user's own recorded hours only; null means no daily entry. */
export interface OwnTimesheetDay {
  date: string
  day_type: string
  label: string | null
  planned_minutes: number
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
  revision: number | null
}
export function getOwnTimesheet(company: string, month: string) {
  return apiRequest<{ data: OwnTimesheetDay[]; meta: { month: string; can_edit: false } }>(
    `${base(company)}/timesheet?month=${encodeURIComponent(month)}`, { cache: 'no-store' },
  )
}

/** Only explicitly shared PDFs scoped by the backend to this session's employee link. */
export interface OwnDocument {
  id: string
  document_type: 'order' | 'contract'
  title: string
  issued_on: string | null
  employee_shared_at: string | null
}
export interface OwnDocumentsResponse {
  data: OwnDocument[]
  meta: { current_page: number; last_page: number; total: number }
}
export function getOwnDocuments(company: string, page = 1): Promise<OwnDocumentsResponse> {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  return apiRequest<OwnDocumentsResponse>(`${base(company)}/documents?page=${page}`, { cache: 'no-store' })
}
export function ownDocumentFileUrl(company: string, document: string): string {
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id.test(company) || !id.test(document)) throw new Error('Некорректный идентификатор')
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
  if (!apiBase.startsWith('/') || apiBase.startsWith('//')) throw new Error('Некорректный API URL')
  return `${apiBase}${base(company)}/documents/${document}/file`
}
