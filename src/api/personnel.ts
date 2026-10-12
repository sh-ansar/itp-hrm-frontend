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
