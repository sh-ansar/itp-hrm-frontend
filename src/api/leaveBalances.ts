import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const assertId = (value: string) => { if (!uuid.test(value)) throw new Error('Некорректный идентификатор') }
const assertYear = (year: number) => {
  if (!Number.isSafeInteger(year) || year < 2000 || year > 2100) throw new Error('Некорректный год')
}
const path = (company: string) => { assertId(company); return `/companies/${company}/leave-balances` }

export type LeaveBalanceState = 'unconfigured' | 'open' | 'closed' | 'calendar_incomplete' | 'policy_missing'
export interface LeaveBalanceRow {
  id: string | null
  employee_id: string
  leave_type_id: string
  leave_type_name: string
  year: number
  reference_annual_days: number | null
  balance_method: 'calendar_days' | 'working_days' | null
  granted_days: number | null
  carried_days: number | null
  adjustment_days: number | null
  booked_days: number | null
  pending_days: number | null
  available_days: number | null
  closing_available_days: number | null
  carried_out_days: number | null
  state: LeaveBalanceState
  revision: number | null
  carry_from_period_id: string | null
  closed_at: string | null
}
export interface LeaveBalanceResponse {
  data: LeaveBalanceRow[]
  meta: { year: number; can_manage: boolean; enforcement_enabled: boolean }
}
export function getEmployeeLeaveBalances(company: string, employee: string, year: number) {
  assertId(employee); assertYear(year)
  return apiRequest<LeaveBalanceResponse>(`${path(company)}?year=${year}&employee_id=${employee}`, { cache: 'no-store' })
}
export function getOwnLeaveBalances(company: string, year: number) {
  assertYear(year); assertId(company)
  return apiRequest<LeaveBalanceResponse>(`/companies/${company}/me/leave-balances?year=${year}`, { cache: 'no-store' })
}
export interface GrantInput {
  employee_id: string
  leave_type_id: string
  year: number
  granted_days: number
  reason: string
}
export function grantLeaveBalance(company: string, data: GrantInput): Promise<{ data: LeaveBalanceRow }> {
  assertId(data.employee_id); assertId(data.leave_type_id); assertYear(data.year)
  return apiRequest(`${path(company)}/periods`, { method: 'POST', body: JSON.stringify(data) })
}
export function adjustLeaveBalance(company: string, period: string, revision: number,
  delta: number, reason: string): Promise<{ data: LeaveBalanceRow }> {
  assertId(period)
  return apiRequest(`${path(company)}/periods/${period}/adjust`, {
    method: 'POST', body: JSON.stringify({ revision, delta_days: delta, reason }),
  })
}
export function carryLeaveBalance(company: string, period: string, revision: number,
  source: string, days: number, reason: string): Promise<{ data: LeaveBalanceRow }> {
  assertId(period); assertId(source)
  return apiRequest(`${path(company)}/periods/${period}/carryover`, {
    method: 'POST', body: JSON.stringify({ revision, source_period_id: source, days, reason }),
  })
}
