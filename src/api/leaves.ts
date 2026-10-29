import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LeaveStatus = 'planned' | 'ongoing' | 'completed'
export type LeaveScheduleState = 'on_schedule' | 'shifted'

export interface LeaveRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
  department_name: string | null
  position_name: string | null
  leave_type_id: string
  leave_type_code: string
  leave_type_name: string
  annual_days: number | null
  balance_method: string | null
  planned_started_on: string
  planned_ended_on: string
  planned_days: number
  actual_started_on: string | null
  actual_ended_on: string | null
  actual_days: number | null
  started_on: string
  ended_on: string
  days: number
  status: LeaveStatus
  schedule_state: LeaveScheduleState
  revision: number
}

export interface LeaveResponse {
  data: LeaveRow[]
  meta: {
    year: number
    summary: {
      total: number
      employees: number
      days: number
      planned: number
      ongoing: number
      completed: number
      shifted: number
    }
    leave_writes_enabled: boolean
    can_manage_leave_requests?: boolean
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export function getLeaves(
  companyId: string,
  year: number,
  page = 1,
): Promise<LeaveResponse> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  if (!Number.isSafeInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Некорректный год')
  }
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const params = new URLSearchParams({
    year: String(year),
    page: String(page),
    per_page: '100',
  })
  return apiRequest<LeaveResponse>(`/companies/${companyId}/leaves?${params.toString()}`)
}


// B69: the schedule (GET /leaves) is approved-only; these are separate drafts/decisions.
export type LeaveCategory = 'ordinary' | 'maternity' | 'childcare' | 'medical'

export interface LeaveTypeRecord {
  id: string
  code: string
  name: string
  annual_days: number | null
  balance_method: 'calendar_days' | 'working_days'
  // Absent on earlier Laravel releases; never assume protected leave support.
  category?: LeaveCategory
  revision: number
}
export interface LeaveTypesResponse {
  data: LeaveTypeRecord[]
  meta: { can_manage_leave_types: boolean; supported_categories?: LeaveCategory[] }
}
export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
export interface LeaveRequestRecord {
  id: string
  employee_id: string
  leave_type_id: string
  leave_type_name: string | null
  manager_recommendation?: 'approved' | 'rejected' | null
  manager_reviewed_by_user_id?: number | null
  manager_reviewed_at?: string | null
  manager_decision_comment?: string | null
  /** Present on API versions with manager routing snapshots. */
  assigned_manager_user_id?: number | null
  assigned_manager_name?: string | null
  manager_department_id?: string | null
  last_name: string
  first_name: string
  middle_name: string | null
  planned_started_on: string
  planned_ended_on: string
  planned_days: number
  status: LeaveRequestStatus
  revision: number
  note: string | null
  decision_comment: string | null
  reversed_at?: string | null
  reversal_reason?: string | null
  published_leave_id: string | null
  created_by_user_id: number
  category?: LeaveCategory
  evidence_status?: 'pending' | 'verified' | 'rejected' | null
  evidence_revision?: number | null
}
export interface LeaveRequestsResponse {
  data: LeaveRequestRecord[]
  meta: {
    current_page: number
    last_page: number
    total: number
    can_reverse_approved_leave?: boolean
    can_approve_leave_requests: boolean
    manager_approval_required?: boolean
    can_review_leave_requests?: boolean
    can_manage_leave_requests?: boolean
    protected_evidence_uploads_enabled?: boolean
    protected_evidence_required?: boolean
  }
}
export interface LeavePlanInput {
  employee_id: string
  leave_type_id: string
  planned_started_on: string
  planned_ended_on: string
  note: string | null
}
export interface LeaveTypeInput {
  code: string
  name: string
  annual_days: number | null
  balance_method: 'calendar_days' | 'working_days'
  category?: LeaveCategory
}

function companyPath(companyId: string): string {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  return '/companies/' + companyId
}
function requestPath(companyId: string, id: string): string {
  if (!uuid.test(id)) throw new Error('Некорректный идентификатор заявки')
  return companyPath(companyId) + '/leave-requests/' + id
}
export function getLeaveTypes(companyId: string): Promise<LeaveTypesResponse> {
  return apiRequest<LeaveTypesResponse>(companyPath(companyId) + '/leave-types')
}
export function createLeaveType(companyId: string, data: LeaveTypeInput): Promise<{ data: LeaveTypeRecord }> {
  return apiRequest(companyPath(companyId) + '/leave-types', { method: 'POST', body: JSON.stringify(data) })
}
export function getLeaveRequests(companyId: string, page = 1,
  status?: LeaveRequestStatus, filters: { year?: number; q?: string } = {}): Promise<LeaveRequestsResponse> {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  if (filters.year) {
    if (!Number.isSafeInteger(filters.year) || filters.year < 2000 || filters.year > 2100)
      throw new Error('Некорректный год')
    params.set('year', String(filters.year))
  }
  if (filters.q?.trim()) params.set('q', filters.q.trim().slice(0, 120))
  return apiRequest(companyPath(companyId) + '/leave-requests?' + params.toString())
}
export function createLeaveRequest(companyId: string, data: LeavePlanInput): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(companyPath(companyId) + '/leave-requests', { method: 'POST', body: JSON.stringify(data) })
}
export function updateLeaveRequest(
  companyId: string, requestId: string, data: LeavePlanInput, revision: number,
): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(requestPath(companyId, requestId), {
    method: 'PUT', body: JSON.stringify({ ...data, revision }),
  })
}
export function submitLeaveRequest(
  companyId: string, requestId: string, revision: number,
): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(requestPath(companyId, requestId) + '/submit', {
    method: 'POST', body: JSON.stringify({ revision }),
  })
}
export function cancelLeaveRequest(
  companyId: string, requestId: string, revision: number,
): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(requestPath(companyId, requestId) + '/cancel', {
    method: 'POST', body: JSON.stringify({ revision }),
  })
}
export function decideLeaveRequest(
  companyId: string, requestId: string, revision: number, decision: 'approved' | 'rejected',
  comment: string | null,
): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(requestPath(companyId, requestId) + '/decision', {
    method: 'POST', body: JSON.stringify({ revision, decision, comment }),
  })
}

/** Scoped recommendation only. The final HR decision remains a separate endpoint. */
export function reviewLeaveRequestAsManager(
  companyId: string, requestId: string, revision: number,
  decision: 'approved' | 'rejected', comment: string | null,
): Promise<{ data: LeaveRequestRecord }> {
  return apiRequest(requestPath(companyId, requestId) + '/manager-decision', {
    method: 'POST', body: JSON.stringify({ revision, decision, comment }),
  })
}

/** Preserves approved booking history; server enforces future-only/admin restrictions. */
export function reverseApprovedLeave(companyId: string, requestId: string, revision: number, reason: string)
  : Promise<{ data: Pick<LeaveRequestRecord, 'id' | 'status' | 'revision' | 'reversed_at' | 'reversal_reason'> }> {
  return apiRequest(requestPath(companyId, requestId) + '/reverse-approved', {
    method: 'POST', body: JSON.stringify({ revision, reason: reason.trim() }),
  })
}
