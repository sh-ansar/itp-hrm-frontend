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
