import { apiRequest } from './client'
import type { PagedResponse } from './organization'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface EmployeeRecord extends Record<string, unknown> {
  id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
  revision: number
}

export interface EmployeeListResponse extends PagedResponse<EmployeeRecord> {
  meta: PagedResponse<EmployeeRecord>['meta'] & { employee_writes_enabled: boolean }
}

export function listEmployees(companyId: string, page = 1): Promise<EmployeeListResponse> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  return apiRequest<EmployeeListResponse>(`/companies/${companyId}/employees?per_page=25&page=${page}`)
}

export interface EmployeeAssignment extends Record<string, unknown> {
  id: string
  department_id: string
  position_id: string
  department_name: string
  position_name: string
  valid_from: string
  valid_to: string | null
  basis_reference: string | null
  revision: number
}

export interface EmployeeDetail {
  data: EmployeeRecord
  assignments: EmployeeAssignment[]
  experience: Array<{ id: string; revision: number; experience_type: string; started_on: string; ended_on: string | null; basis_reference: string | null }>
  reserve: Array<{ id: string; revision: number; target_position: string; reserve_level: string; reserve_type: string; joined_year: number; left_year: number | null; notes: string | null }>
  training: Array<{ id: string; revision: number; training_type: string; training_mode: string; topic: string; provider: string | null; city: string | null; started_on: string; ended_on: string | null; document_reference: string | null }>
  meta: {
    assignments_limit: number
    assignments_truncated: boolean
    extended_sections_visible: boolean
    profile_writes_enabled: boolean
    assignment_writes_enabled: boolean
    employee_writes_enabled: boolean
  }
}

export function getEmployee(companyId: string, employeeId: string): Promise<EmployeeDetail> {
  if (!uuid.test(companyId) || !uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  return apiRequest<EmployeeDetail>(`/companies/${companyId}/employees/${employeeId}`)
}

export interface EmployeeIdentityPayload {
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
}

export function createEmployee(
  companyId: string,
  payload: EmployeeIdentityPayload,
): Promise<{ data: EmployeeRecord }> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  return apiRequest<{ data: EmployeeRecord }>(`/companies/${companyId}/employees`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateEmployee(
  companyId: string,
  employeeId: string,
  revision: number,
  payload: EmployeeIdentityPayload,
): Promise<{ data: EmployeeRecord }> {
  if (!uuid.test(companyId) || !uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия карточки')
  return apiRequest<{ data: EmployeeRecord }>(`/companies/${companyId}/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, revision }),
  })
}


export interface AssignmentCreatePayload {
  department_id: string
  position_id: string
  valid_from: string
  valid_to: string | null
  basis_reference: string | null
}

export function createEmployeeAssignment(
  companyId: string,
  employeeId: string,
  payload: AssignmentCreatePayload,
): Promise<{ data: { id: string; employee_id: string; valid_from: string; valid_to: string | null; revision: number } }> {
  if (!uuid.test(companyId) || !uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  if (!uuid.test(payload.department_id) || !uuid.test(payload.position_id)) throw new Error('Выберите подразделение и должность')
  return apiRequest<{ data: { id: string; employee_id: string; valid_from: string; valid_to: string | null; revision: number } }>(
    `/companies/${companyId}/employees/${employeeId}/assignments`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export type ProfileSection = 'experience' | 'reserve' | 'training'
export async function createEmployeeProfileRecord(
  companyId: string,
  employeeId: string,
  section: ProfileSection,
  payload: Record<string, string | number | null>,
): Promise<{ data: { id: string; section: ProfileSection } }> {
  if (!uuid.test(companyId) || !uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  if (!['experience', 'reserve', 'training'].includes(section)) throw new Error('Некорректный раздел')
  return apiRequest<{ data: { id: string; section: ProfileSection } }>('/companies/' + companyId + '/employees/' + employeeId + '/profile/' + section, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type ProfileEditRow = { id: string; revision: number; [key: string]: unknown }

export function updateEmployeeProfileRecord(
  companyId: string,
  employeeId: string,
  section: ProfileSection,
  recordId: string,
  revision: number,
  payload: Record<string, string | number | null>,
): Promise<{ data: { id: string; section: ProfileSection; revision: number } }> {
  if (![companyId, employeeId, recordId].every(id => uuid.test(id))) throw new Error('Некорректный идентификатор')
  if (!['experience', 'reserve', 'training'].includes(section)) throw new Error('Некорректный раздел')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия записи')
  return apiRequest<{ data: { id: string; section: ProfileSection; revision: number } }>(
    '/companies/' + companyId + '/employees/' + employeeId + '/profile/' + section + '/' + recordId,
    { method: 'PUT', body: JSON.stringify({ ...payload, revision }) },
  )
}


export function updateEmployeeAssignment(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  revision: number,
  payload: AssignmentCreatePayload,
): Promise<{ data: { id: string; employee_id: string; valid_from: string; valid_to: string | null; revision: number } }> {
  if (![companyId, employeeId, assignmentId].every(id => uuid.test(id))) throw new Error('Некорректный идентификатор')
  if (!uuid.test(payload.department_id) || !uuid.test(payload.position_id)) throw new Error('Выберите подразделение и должность')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия назначения')
  return apiRequest(`/companies/${companyId}/employees/${employeeId}/assignments/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, revision }),
  })
}


export function transitionEmployeeAssignment(
  companyId: string,
  employeeId: string,
  assignmentId: string,
  revision: number,
  payload: AssignmentCreatePayload,
): Promise<{ data: {
  closed_assignment: { id: string; valid_to: string; revision: number }
  new_assignment: { id: string; employee_id: string; valid_from: string; valid_to: string | null; revision: number }
} }> {
  if (![companyId, employeeId, assignmentId].every(id => uuid.test(id))) throw new Error('Некорректный идентификатор')
  if (!uuid.test(payload.department_id) || !uuid.test(payload.position_id)) throw new Error('Выберите новое подразделение и должность')
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Неверная версия назначения')
  return apiRequest(`/companies/${companyId}/employees/${employeeId}/assignments/${assignmentId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, revision }),
  })
}
