import { apiRequest } from './client'

export type SystemRoleCode = 'company_admin' | 'hr_specialist' | 'department_manager' | 'employee'

export type MembershipRecord = {
  user_id: number
  name: string
  email: string
  status: string
  role_code: SystemRoleCode
  department_scopes: Array<{ id: string; name: string }>
  updated_at: string | null
}

export type RoleAuditRecord = {
  id: string
  action: 'company.role_granted' | 'company.role_changed' | 'company.role_revoked'
  actor: string | null
  subject: string | null
  created_at: string
}

export type RoleCatalogRecord = {
  code: SystemRoleCode
  capabilities: Record<string, boolean>
  assignable: boolean
}

export type MembershipListResponse = {
  data: MembershipRecord[]
  roles: RoleCatalogRecord[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    role_management_enabled: boolean
  }
  audit: RoleAuditRecord[]
}

export function listMemberships(companyId: string, params: { page?: number; per_page?: number; search?: string } = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.search?.trim()) query.set('search', params.search.trim())
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest<MembershipListResponse>(`/companies/${companyId}/memberships${suffix}`)
}

export function saveMembership(
  companyId: string,
  userId: number,
  payload: { role_code: Exclude<SystemRoleCode, 'company_admin'>; department_ids?: string[] },
) {
  return apiRequest<{ data: { user_id: number; role_code: SystemRoleCode; department_ids: string[] } }>(
    `/companies/${companyId}/memberships/${userId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export function revokeMembership(companyId: string, userId: number) {
  return apiRequest<void>(`/companies/${companyId}/memberships/${userId}`, { method: 'DELETE' })
}
