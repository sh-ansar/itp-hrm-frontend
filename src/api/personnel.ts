import { apiRequest } from './client'
import type { PagedResponse } from './organization'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type EmploymentStatus = 'active' | 'planned' | 'archived' | 'unassigned'
export type EmploymentFilter = EmploymentStatus | 'all'

export interface EmployeeRecord extends Record<string, unknown> {
  employment_status?: EmploymentStatus
  id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
  revision: number
  birth_date?: string | null
  gender?: 'male' | 'female' | null
  email?: string | null
  phone?: string | null
  address?: string | null
  work_site?: string | null
  work_zone?: string | null
  work_team?: string | null
  supervisor_name?: string | null
  current_department_name?: string | null
  current_position_name?: string | null
  current_assignment_valid_from?: string | null
}

export interface EmployeeListResponse extends PagedResponse<EmployeeRecord> {
  meta: PagedResponse<EmployeeRecord>['meta'] & {
    employee_writes_enabled: boolean
    status_filter?: EmploymentFilter
    registry_summary?: {
      vacancies?: number | null
      expiring_contracts?: number | null
    }
  }
}

export function listEmployees(
  companyId: string, page = 1, search = '', status: EmploymentFilter = 'all',
): Promise<EmployeeListResponse> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const params = new URLSearchParams({ per_page: '25', page: String(page) })
  if (search.trim()) params.set('search', search.trim())
  if (status !== 'all') params.set('status', status)
  return apiRequest<EmployeeListResponse>(`/companies/${companyId}/employees?${params.toString()}`)
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

export interface EmployeeReferenceProfile {
  personal: {
    iin?: string | null
    citizenship?: string | null
    marital_status?: string | null
    registration_address?: string | null
    residence_address?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
  }
  identity_document: {
    type?: string | null
    number?: string | null
    issued_on?: string | null
    expires_on?: string | null
    issued_by?: string | null
  }
  banking: {
    bank_name?: string | null
    iban?: string | null
    payroll_account?: string | null
  }
  employment: {
    contract_number?: string | null
    contract_date?: string | null
    contract_type?: string | null
    employment_type?: string | null
    probation_until?: string | null
    work_schedule?: string | null
  }
  payroll: {
    salary?: number | null
    currency?: string | null
    payment_frequency?: string | null
    next_payment_date?: string | null
  }
  schedule: {
    schedule_name?: string | null
    shift?: string | null
    hours_per_week?: number | null
    timesheet_month?: string | null
    planned_hours?: number | null
    worked_hours?: number | null
  }
  documents: Array<{
    id: string
    title: string
    number: string
    issued_on: string | null
    status: string
  }>
  history: Array<{
    id: string
    action: string
    actor: string
    created_at: string
  }>
}

export interface EmployeeDetail {
  data: EmployeeRecord
  assignments: EmployeeAssignment[]
  experience: Array<{ id: string; revision: number; experience_type: string; started_on: string; ended_on: string | null; basis_reference: string | null }>
  reserve: Array<{ id: string; revision: number; target_position: string; reserve_level: string; reserve_type: string; joined_year: number; left_year: number | null; notes: string | null }>
  training: Array<{ id: string; revision: number; training_type: string; training_mode: string; topic: string; provider: string | null; city: string | null; started_on: string; ended_on: string | null; document_reference: string | null }>
  history?: EmployeeReferenceProfile['history']
  reference_profile?: EmployeeReferenceProfile
  meta: {
    history_limit?: number
    history_truncated?: boolean
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
  birth_date?: string | null
  gender?: 'male' | 'female' | null
  email?: string | null
  phone?: string | null
  address?: string | null
  work_site?: string | null
  work_zone?: string | null
  work_team?: string | null
  supervisor_name?: string | null
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
