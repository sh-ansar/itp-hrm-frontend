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
  has_photo?: boolean
  birth_date?: string | null
  gender?: 'male' | 'female' | null
  email?: string | null
  phone?: string | null
  address?: string | null
  work_site?: string | null
  work_zone?: string | null
  work_team?: string | null
  supervisor_name?: string | null
  current_department_id?: string | null
  current_position_id?: string | null
  current_department_name?: string | null
  current_position_name?: string | null
  current_assignment_valid_from?: string | null
  employee_category?: string | null
  personnel_type?: string | null
  contract_type?: string | null
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
  companyId: string, page = 1, search = '', status: EmploymentFilter = 'all', perPage = 25,
): Promise<EmployeeListResponse> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  if (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100)
    throw new Error('Некорректное количество строк на странице')
  const params = new URLSearchParams({ per_page: String(perPage), page: String(page) })
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

/**
 * HR-only sensitive profile. Never include these records in registry results.
 */
export type EmployeePrivateSection = 'personal' | 'military'
export interface EmployeePrivatePersonal {
  revision: number | null
  login: string | null
  iin: string | null
  nationality: string | null
  citizenship: string | null
  marital_status: string | null
  residence_address: string | null
  registration_address: string | null
  address_entrance: string | null
  address_floor: string | null
  address_apartment: string | null
  place_of_birth: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}
export interface EmployeeMilitaryRecord {
  revision: number | null
  status: string | null
  category: string | null
  document_reference: string | null
  comment: string | null
}
export interface EmployeePrivateProfile {
  personal: EmployeePrivatePersonal
  military: EmployeeMilitaryRecord
}
export type EmployeePrivateWritePayload = {
  revision: number | null
} & Record<string, string | number | null>

export interface EmployeeReferenceProfile {
  personal: {
    iin?: string | null
    login?: string | null
    nationality?: string | null
    citizenship?: string | null
    marital_status?: string | null
    registration_address?: string | null
    residence_address?: string | null
    address_entrance?: string | null
    address_floor?: string | null
    address_apartment?: string | null
    place_of_birth?: string | null
    birth_certificate_attachment?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
  }
  identity_document: {
    type?: string | null
    number?: string | null
    personal_number?: string | null
    country_of_issue?: string | null
    issued_on?: string | null
    expires_on?: string | null
    issued_by?: string | null
    attachment_name?: string | null
  }
  family?: Array<{
    id: string
    relationship: string
    full_name: string
    birth_date?: string | null
    document_reference?: string | null
  }>
  military?: {
    status?: string | null
    category?: string | null
    document_reference?: string | null
    comment?: string | null
  }
  banking: {
    bank_name?: string | null
    iban?: string | null
    payroll_account?: string | null
    recipient?: string | null
    medical_insurance?: string | null
    tax_status?: string | null
    pension_accruals?: string | null
    attachment_name?: string | null
  }
  organization?: {
    company_name?: string | null
    employee_category?: string | null
    personnel_type?: string | null
    primary_workplace?: string | null
    site_area?: string | null
    location?: string | null
    access_status?: string | null
    pass_number?: string | null
    pass_issued_on?: string | null
    brigade?: string | null
    brigadier?: string | null
    department_manager?: string | null
    assignment_status?: string | null
    assignment_date?: string | null
    archived?: string | null
    staffing_position?: string | null
    staffing_position_code?: string | null
    status_change_reason?: string | null
    status_change_date?: string | null
    employment_type?: string | null
    position_since?: string | null
  }
  employment: {
    contract_number?: string | null
    contract_date?: string | null
    contract_type?: string | null
    employment_type?: string | null
    valid_from?: string | null
    valid_to?: string | null
    probation_enabled?: string | null
    probation_from?: string | null
    probation_until?: string | null
    hire_basis?: string | null
    hire_date?: string | null
    contract_attachment?: string | null
    work_schedule?: string | null
    total_seniority?: string | null
    company_seniority?: string | null
    position_seniority?: string | null
    site_seniority?: string | null
    special_seniority?: string | null
  }
  working_conditions?: {
    condition_type?: string | null
    condition_code?: string | null
    list_position_code?: string | null
    compensation?: string | null
    basis?: string | null
    valid_from?: string | null
    valid_to?: string | null
    attachment_name?: string | null
  }
  combination?: {
    enabled?: string | null
    valid_from?: string | null
    valid_to?: string | null
    position?: string | null
    reason?: string | null
    replaced_employee?: string | null
    basis?: string | null
    duties?: string | null
    material_responsibility?: string | null
    material_attachment?: string | null
  }
  termination?: {
    terminated?: string | null
    termination_date?: string | null
    basis?: string | null
    basis_group?: string | null
    reason?: string | null
    comment?: string | null
    attachment_name?: string | null
  }
  payroll: {
    salary?: number | null
    currency?: string | null
    payment_frequency?: string | null
    next_payment_date?: string | null
    payment_type?: string | null
    base_rate?: string | null
    settlement_period?: string | null
    calculation_method?: string | null
    data_source?: string | null
  }
  payroll_adjustments?: Array<{
    id: string
    kind: string
    name: string
    period: string
    amount: number
    hours?: number | null
    basis?: string | null
  }>
  payroll_history?: Array<{
    id: string
    period: string
    accrued: number
    withheld: number
    paid: number
    worked_hours: number
    worked_days: number
  }>
  schedule: {
    schedule_name?: string | null
    shift?: string | null
    hours_per_week?: number | null
    timesheet_month?: string | null
    planned_hours?: number | null
    worked_hours?: number | null
    production_calendar?: string | null
    schedule_type?: string | null
    time_accounting?: string | null
    shift_duration?: string | null
    valid_from?: string | null
    valid_to?: string | null
    basis?: string | null
    night_shifts?: string | null
    weekend_work?: string | null
  }
  leave_summary?: {
    entitled_days?: number | null
    used_days?: number | null
    balance_days?: number | null
    planned_until?: string | null
    settlement_year?: string | null
    work_year_from?: string | null
    work_year_to?: string | null
    balance_method?: string | null
    data_source?: string | null
  }
  leave_limits?: Array<{
    id: string
    leave_type: string
    accrual_method: string
    entitled_days: number
    used_days: number
    balance_days: number
    basis?: string | null
  }>
  timesheet_history?: Array<{
    id: string
    period: string
    planned_hours: number
    worked_hours: number
    deviation_hours: number
    work_days: number
    night_hours: number
    overtime_hours: number
    absences_days: number
  }>
  attendance_events?: Array<{
    id: string
    event_type: string
    reason: string
    period: string
    days?: number | null
    hours?: number | null
    source?: string | null
    status?: string | null
  }>
  reserve_profile?: {
    status?: string | null
    match_percent?: number | null
    education?: string | null
    learning_plan?: string | null
    enabled?: string | null
    target_position?: string | null
    included_on?: string | null
    review_on?: string | null
    reserve_level?: string | null
    reserve_type?: string | null
    basis?: string | null
    basis_document?: string | null
    comment?: string | null
  }
  education?: Array<{
    id: string
    education_type: string
    organization: string
    started_on?: string | null
    ended_on?: string | null
    specialization?: string | null
    document_reference?: string | null
  }>
  fit_assessment?: Array<{
    id: string
    criterion: string
    requirement: string
    fact: string
    score_percent: number
    recommendation: string
  }>
  documents: Array<{
    id: string
    title: string
    number: string
    issued_on: string | null
    status: string
    document_type?: string | null
    file_name?: string | null
  }>
  history: Array<{
    id: string
    action: string
    actor: string
    created_at: string
    section?: string | null
    before?: string | null
    after?: string | null
    result?: string | null
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
  private_profile?: EmployeePrivateProfile
  meta: {
    history_limit?: number
    history_truncated?: boolean
    assignments_limit: number
    assignments_truncated: boolean
    extended_sections_visible: boolean
    profile_writes_enabled: boolean
    private_profile_writes_enabled?: boolean
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


/** B71: submit one complete section snapshot; server checks tenant, role and revision. */
export function saveEmployeePrivateSection(
  companyId: string,
  employeeId: string,
  section: EmployeePrivateSection,
  payload: EmployeePrivateWritePayload,
): Promise<{ data: { section: EmployeePrivateSection; revision: number } }> {
  if (!uuid.test(companyId) || !uuid.test(employeeId)) {
    throw new Error('Некорректный идентификатор сотрудника или компании')
  }
  if (!['personal', 'military'].includes(section)) {
    throw new Error('Неизвестный раздел личного дела')
  }
  return apiRequest('/companies/' + companyId + '/employees/' + employeeId + '/private-profile/' + section, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
