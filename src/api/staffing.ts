import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface StaffingPlanRecord extends Record<string, unknown> {
  id: string
  name: string
  valid_from: string
  valid_to: string | null
  status: 'draft' | 'approved'
  revision: number
}

export interface StaffingPlanLine extends Record<string, unknown> {
  id: string
  department_id: string
  position_id: string
  department_name: string
  position_name: string
  planned_units: number
  occupied_units: number
  vacant_units: number
  overstaffed_units: number
  base_salary: number | null
  currency: string | null
  notes: string | null
  revision: number
}

export interface StaffingPlanListResponse {
  data: StaffingPlanRecord[]
  meta: {
    staffing_writes_enabled: boolean
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface StaffingPlanDetailResponse {
  data: StaffingPlanRecord
  lines: StaffingPlanLine[]
  meta: {
    as_of: string
    staffing_writes_enabled: boolean
  }
}

export interface StaffingPlanPayload {
  name: string
  valid_from: string
  valid_to: string | null
}

export interface StaffingLinePayload {
  department_id: string
  position_id: string
  planned_units: number
  base_salary: number | null
  currency: string | null
  notes: string | null
}

function assertUuid(value: string, label = 'идентификатор') {
  if (!uuid.test(value)) throw new Error(`Некорректный ${label}`)
}

export function listStaffingPlans(companyId: string, page = 1): Promise<StaffingPlanListResponse> {
  assertUuid(companyId, 'идентификатор компании')
  return apiRequest<StaffingPlanListResponse>(`/companies/${companyId}/staffing-plans?page=${page}&per_page=25`)
}

export function getStaffingPlan(companyId: string, planId: string): Promise<StaffingPlanDetailResponse> {
  assertUuid(companyId, 'идентификатор компании')
  assertUuid(planId, 'идентификатор штатного расписания')
  return apiRequest<StaffingPlanDetailResponse>(`/companies/${companyId}/staffing-plans/${planId}`)
}

export function createStaffingPlan(
  companyId: string,
  payload: StaffingPlanPayload,
): Promise<{ data: StaffingPlanRecord }> {
  assertUuid(companyId, 'идентификатор компании')
  return apiRequest<{ data: StaffingPlanRecord }>(`/companies/${companyId}/staffing-plans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createStaffingLine(
  companyId: string,
  planId: string,
  payload: StaffingLinePayload,
): Promise<{ data: { id: string; staffing_plan_id: string; revision: number } }> {
  assertUuid(companyId, 'идентификатор компании')
  assertUuid(planId, 'идентификатор штатного расписания')
  return apiRequest(`/companies/${companyId}/staffing-plans/${planId}/lines`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateStaffingLine(
  companyId: string,
  planId: string,
  lineId: string,
  revision: number,
  payload: StaffingLinePayload,
): Promise<{ data: { id: string; revision: number } }> {
  ;[companyId, planId, lineId].forEach(id => assertUuid(id))
  return apiRequest(`/companies/${companyId}/staffing-plans/${planId}/lines/${lineId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, revision }),
  })
}

export function approveStaffingPlan(
  companyId: string,
  planId: string,
  revision: number,
): Promise<{ data: { id: string; status: 'approved'; revision: number } }> {
  assertUuid(companyId, 'идентификатор компании')
  assertUuid(planId, 'идентификатор штатного расписания')
  return apiRequest(`/companies/${companyId}/staffing-plans/${planId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ revision }),
  })
}
