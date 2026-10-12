import { apiRequest } from './client'

export interface CompanyRecord extends Record<string, unknown> { id: string; name: string }
export interface DepartmentRecord extends Record<string, unknown> { id: string; name: string; parent_id: string | null }
export interface PagedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export const listCompanies = () => apiRequest<PagedResponse<CompanyRecord>>('/companies?per_page=100')
export const listDepartments = (companyId: string, page = 1) => {
  if (!/^[a-f0-9-]{36}$/i.test(companyId)) throw new Error('Некорректный идентификатор компании')
  return apiRequest<PagedResponse<DepartmentRecord>>(`/companies/${companyId}/departments?per_page=25&page=${encodeURIComponent(page)}`)
}
