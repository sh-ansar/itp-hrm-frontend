import { apiRequest } from './client'

export type CompanyRoleCode = 'company_admin' | 'hr_specialist' | 'department_manager'

export interface CompanyDepartmentScope {
  id: string
  name: string
}

export interface CompanyRecord extends Record<string, unknown> {
  id: string
  name: string
  role_code?: CompanyRoleCode
  department_scopes?: CompanyDepartmentScope[]
}
export interface DepartmentRecord extends Record<string, unknown> {
  id: string
  name: string
  parent_id: string | null
  revision: number
  manager_employee_id?: string | null
  manager_employee_name?: string | null
}
export interface PositionRecord extends Record<string, unknown> { id: string; name: string; revision: number }
export interface PagedResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number; [key: string]: unknown }
}

const assertCompanyId = (companyId: string) => {
  if (!/^[a-f0-9-]{36}$/i.test(companyId)) throw new Error('Некорректный идентификатор компании')
}

export interface CompanyListResponse extends PagedResponse<CompanyRecord> {
  meta: PagedResponse<CompanyRecord>['meta'] & { role_management_enabled?: boolean }
}

export const listCompanies = () => apiRequest<CompanyListResponse>('/companies?per_page=100')

export const listDepartments = (companyId: string, page = 1) => {
  assertCompanyId(companyId)
  return apiRequest<DepartmentListResponse>(`/companies/${companyId}/departments?per_page=100&page=${encodeURIComponent(page)}`)
}

export interface PositionListResponse extends PagedResponse<PositionRecord> {
  meta: PagedResponse<PositionRecord>['meta'] & { position_writes_enabled: boolean }
}

export const listPositions = (companyId: string, page = 1) => {
  assertCompanyId(companyId)
  return apiRequest<PositionListResponse>(`/companies/${companyId}/positions?per_page=100&page=${encodeURIComponent(page)}`)
}

export const createPosition = (companyId: string, name: string): Promise<{ data: PositionRecord }> => {
  assertCompanyId(companyId)
  return apiRequest<{ data: PositionRecord }>(`/companies/${companyId}/positions`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export const updatePosition = (
  companyId: string,
  positionId: string,
  revision: number,
  name: string,
): Promise<{ data: PositionRecord }> => {
  assertCompanyId(companyId)
  if (!/^[a-f0-9-]{36}$/i.test(positionId)) throw new Error('Некорректный идентификатор должности')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия должности')
  return apiRequest<{ data: PositionRecord }>(`/companies/${companyId}/positions/${positionId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, revision }),
  })
}

export const deletePosition = (
  companyId: string,
  positionId: string,
  revision: number,
): Promise<{ data: { id: string } }> => {
  assertCompanyId(companyId)
  if (!/^[a-f0-9-]{36}$/i.test(positionId)) throw new Error('Некорректный идентификатор должности')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия должности')
  return apiRequest<{ data: { id: string } }>(`/companies/${companyId}/positions/${positionId}`, {
    method: 'DELETE',
    body: JSON.stringify({ revision }),
  })
}


export interface DepartmentListResponse extends PagedResponse<DepartmentRecord> {
  meta: PagedResponse<DepartmentRecord>['meta'] & { department_writes_enabled: boolean; manager_assignment_supported?: boolean }
}

export interface DepartmentPayload {
  name: string
  parent_id: string | null
  manager_employee_id?: string | null
}

export const createDepartment = (companyId: string, payload: DepartmentPayload): Promise<{ data: DepartmentRecord }> => {
  assertCompanyId(companyId)
  return apiRequest<{ data: DepartmentRecord }>(`/companies/${companyId}/departments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const updateDepartment = (
  companyId: string,
  departmentId: string,
  revision: number,
  payload: DepartmentPayload,
): Promise<{ data: DepartmentRecord }> => {
  assertCompanyId(companyId)
  if (!/^[a-f0-9-]{36}$/i.test(departmentId)) throw new Error('Некорректный идентификатор подразделения')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия подразделения')
  return apiRequest<{ data: DepartmentRecord }>(`/companies/${companyId}/departments/${departmentId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, revision }),
  })
}

export const deleteDepartment = (
  companyId: string,
  departmentId: string,
  revision: number,
): Promise<{ data: { id: string } }> => {
  assertCompanyId(companyId)
  if (!/^[a-f0-9-]{36}$/i.test(departmentId)) throw new Error('Некорректный идентификатор подразделения')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия подразделения')
  return apiRequest<{ data: { id: string } }>(`/companies/${companyId}/departments/${departmentId}`, {
    method: 'DELETE',
    body: JSON.stringify({ revision }),
  })
}
