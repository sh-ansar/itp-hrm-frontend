import type { CapabilityKey } from '../api/access'

/**
 * UI routing policy only. APIs remain protected by Laravel; route hiding
 * never replaces authentication or authorization on the server.
 */
export function routeCapability(path: string): CapabilityKey | null {
  if (path === '/my') return 'self_service.view'
  if (path === '/') return 'overview.view'
  if (path === '/settings') return 'settings.view'
  if (path === '/roles') return 'roles.interface'
  if (path === '/reports') return 'reports.view'
  if (path === '/employees' || path.startsWith('/employees/')) return 'employees.view'
  if (['/employees-development', '/learning', '/reserve'].includes(path)) return 'development.view'
  if (path === '/organization') return 'organization.view'
  if (path === '/staffing') return 'staffing.view'
  if (path === '/personnel-actions') return 'personnel_actions.view'
  if (path === '/timesheets') return 'worktime.view'
  if (path === '/leaves') return 'leaves.view'
  if (path === '/documents') return 'documents.view'
  if (path === '/directories' || path.startsWith('/directories/')) return 'directories.view'
  return null // Public routes and real 404 handled by their own components.
}