import { apiRequest } from './client'

/**
 * B70: effective permissions for a specific company, projected from the
 * authenticated Laravel session. NEVER send these values as authorization.
 */
export type CapabilityKey =
  | 'overview.view' | 'employees.view' | 'employees.extended_view'
  | 'organization.view' | 'staffing.view' | 'personnel_actions.view'
  | 'worktime.view' | 'leaves.view' | 'documents.view' | 'directories.view'
  | 'development.view' | 'reports.view' | 'settings.view'
  | 'roles.interface' | 'employees.write' | 'staffing.write'
  | 'documents.write' | 'worktime.calendar.edit'
  | 'leave.requests.manage' | 'leave.requests.approve'
  | 'leave.types.manage' | 'roles.assign'

export type CompanyRole = 'company_admin' | 'hr_specialist' | 'department_manager' | 'employee'
export type CompanyAccess = {
  company_id: string
  company_name: string
  role_code: CompanyRole
  department_scopes: Array<{ id: string; name: string }>
  capabilities: Record<CapabilityKey, boolean>
}
export type AccessResponse = {
  data: { companies: CompanyAccess[] }
  meta: { schema_version: number; source: string }
}
export function getCurrentAccess(): Promise<AccessResponse> {
  return apiRequest<AccessResponse>('/me/access', { cache: 'no-store' })
}
