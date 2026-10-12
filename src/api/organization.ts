import { apiRequest } from './client'

export interface CompanyRecord extends Record<string, unknown> { id: string; name: string }
export interface DepartmentRecord extends Record<string, unknown> { id: string; name: string; parent_id: string | null }
export interface PositionRecord extends Record<string, unknown> { id: string; name: string }
export interface PagedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

const assertCompanyId = (companyId: string) => {
  if (!/^[a-f0-9-]{36}$/i.test(companyId)) throw new Error('Некорректный идентификатор компании')
}

export const listCompanies = () => apiRequest<PagedResponse<CompanyRecord>>('/companies?per_page=100')

export const listDepartments = (companyId: string, page = 1) => {
  assertCompanyId(companyId)
  return apiRequest<PagedResponse<DepartmentRecord>>(`/companies/${companyId}/departments?per_page=100&page=${encodeURIComponent(page)}`)
}

export const listPositions = (companyId: string, page = 1) => {
  assertCompanyId(companyId)
  return apiRequest<PagedResponse<PositionRecord>>(`/companies/${companyId}/positions?per_page=100&page=${encodeURIComponent(page)}`)
}
