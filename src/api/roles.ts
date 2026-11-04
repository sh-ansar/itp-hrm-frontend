import { apiRequest } from './client'

export type SystemRoleCode = 'company_admin' | 'hr_specialist' | 'department_manager' | 'employee'

export type MembershipRecord = {
  user_id: number
  name: string
  email: string
  status: string
  role_code: SystemRoleCode
  custom_role_id?: string | null
  custom_role_name?: string | null
  department_scopes: Array<{ id: string; name: string }>
  updated_at: string | null
}

export type RoleAuditRecord = {
  id: string
  action: 'company.role_granted' | 'company.role_changed' | 'company.role_revoked'
    | 'company.role_template_created' | 'company.role_template_updated' | 'company.role_template_deleted'
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
    custom_role_templates_enabled?: boolean
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
  payload: { role_code: Exclude<SystemRoleCode, 'company_admin'>; department_ids?: string[]; custom_role_id?: string | null },
) {
  return apiRequest<{ data: { user_id: number; role_code: SystemRoleCode; department_ids: string[] } }>(
    `/companies/${companyId}/memberships/${userId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export function revokeMembership(companyId: string, userId: number) {
  return apiRequest<void>(`/companies/${companyId}/memberships/${userId}`, { method: 'DELETE' })
}


export type CustomRoleTemplate = {
  id: string
  code: string
  name: string
  description: string | null
  base_role: Exclude<SystemRoleCode, 'company_admin'>
  capabilities: Record<string, boolean>
  status: 'active' | 'archived'
  revision: number
  assigned_count: number
}

export type CustomRoleCreate = {
  code: string
  name: string
  description: string | null
  base_role: CustomRoleTemplate['base_role']
  capabilities: Record<string, boolean>
}

export type CustomRoleUpdate = {
  revision: number
  name?: string
  description?: string | null
  capabilities?: Record<string, boolean>
  status?: CustomRoleTemplate['status']
}

export function listCompanyRoleTemplates(companyId: string) {
  return apiRequest<{ data: CustomRoleTemplate[]; meta: { custom_roles_enabled: boolean } }>(
    `/companies/${companyId}/role-templates`,
  )
}

export function createCompanyRoleTemplate(companyId: string, payload: CustomRoleCreate) {
  return apiRequest<{ data: CustomRoleTemplate }>(`/companies/${companyId}/role-templates`, {
    method: 'POST', body: JSON.stringify(payload),
  })
}

export function updateCompanyRoleTemplate(companyId: string, templateId: string, payload: CustomRoleUpdate) {
  return apiRequest<{ data: CustomRoleTemplate }>(`/companies/${companyId}/role-templates/${templateId}`, {
    method: 'PUT', body: JSON.stringify(payload),
  })
}

export function deleteCompanyRoleTemplate(companyId: string, templateId: string, revision: number) {
  return apiRequest<void>(`/companies/${companyId}/role-templates/${templateId}`, {
    method: 'DELETE', body: JSON.stringify({ revision }),
  })
}
