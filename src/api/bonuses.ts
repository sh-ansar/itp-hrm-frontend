import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type BonusKind = 'one_time' | 'performance' | 'holiday' | 'other'
export type BonusStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'

export interface EmployeeBonusRecord {
  id: string
  employee_id: string
  personnel_number?: string
  first_name?: string
  last_name?: string
  middle_name?: string | null
  bonus_kind: BonusKind
  award_on: string
  amount: string
  currency: string
  basis_reference: string
  note: string | null
  decision_comment: string | null
  status: BonusStatus
  revision: number
  created_by_user_id: number
  submitted_by_user_id: number | null
  decided_by_user_id: number | null
}
export interface EmployeeBonusesResponse {
  data: EmployeeBonusRecord[]
  meta: {
    current_page: number
    last_page: number
    total: number
    can_manage: boolean
    can_approve: boolean
    payroll_posting_enabled: false
  }
}
export interface BonusInput {
  employee_id: string
  bonus_kind: BonusKind
  award_on: string
  amount: string
  currency: string
  basis_reference: string
  note: string | null
}
type BonusResponse = { data: EmployeeBonusRecord }
function companyPath(companyId: string) {
  if (!uuid.test(companyId)) throw new Error('Invalid company id')
  return '/companies/' + companyId + '/bonuses'
}
function bonusPath(companyId: string, bonusId: string) {
  if (!uuid.test(bonusId)) throw new Error('Invalid bonus id')
  return companyPath(companyId) + '/' + bonusId
}
export function getEmployeeBonuses(companyId: string, page = 1): Promise<EmployeeBonusesResponse> {
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Invalid page')
  return apiRequest<EmployeeBonusesResponse>(companyPath(companyId) + '?page=' + page)
}
export function createEmployeeBonus(companyId: string, values: BonusInput, requestKey: string): Promise<BonusResponse> {
  if (!uuid.test(requestKey)) throw new Error('Invalid request key')
  return apiRequest(companyPath(companyId), {
    method: 'POST', body: JSON.stringify({ ...values, request_key: requestKey }),
  })
}
export function updateEmployeeBonus(companyId: string, record: EmployeeBonusRecord, values: BonusInput): Promise<BonusResponse> {
  return apiRequest(bonusPath(companyId, record.id), {
    method: 'PUT', body: JSON.stringify({ ...values, revision: record.revision }),
  })
}
export function transitionEmployeeBonus(
  companyId: string,
  record: EmployeeBonusRecord,
  operation: 'submit' | 'cancel' | 'approved' | 'rejected',
  comment: string | null = null,
): Promise<BonusResponse> {
  const endpoint = operation === 'approved' || operation === 'rejected' ? '/decision' : '/' + operation
  const payload = {
    revision: record.revision,
    ...(endpoint === '/decision' ? { decision: operation, comment } : {}),
  }
  return apiRequest(bonusPath(companyId, record.id) + endpoint, {
    method: 'POST', body: JSON.stringify(payload),
  })
}
