import { apiRequest } from './client'
import type { PagedResponse } from './organization'

export interface EmployeeRecord extends Record<string, unknown> {
  id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
}

export function listEmployees(companyId: string, page = 1): Promise<PagedResponse<EmployeeRecord>> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    throw new Error('Некорректный идентификатор компании')
  }
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  return apiRequest<PagedResponse<EmployeeRecord>>(`/companies/${companyId}/employees?per_page=25&page=${page}`)
}

export interface EmployeeAssignment extends Record<string, unknown> {
  id: string
  department_name: string
  position_name: string
  valid_from: string
  valid_to: string | null
}
export interface EmployeeDetail {
  data: EmployeeRecord
  assignments: EmployeeAssignment[]
  meta: { assignments_limit: number; assignments_truncated: boolean }
}
export function getEmployee(companyId: string, employeeId: string): Promise<EmployeeDetail> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(companyId) || !uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  return apiRequest<EmployeeDetail>(`/companies/${companyId}/employees/${employeeId}`)
}
