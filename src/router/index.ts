import { createRouter, createWebHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
import OrganizationView from '../views/OrganizationView.vue'
import EmployeesView from '../views/EmployeesView.vue'
import StaffingView from '../views/StaffingView.vue'
import DirectoriesView from '../views/DirectoriesView.vue'
import DirectoryHubView from '../views/DirectoryHubView.vue'
import PersonnelActionsView from '../views/PersonnelActionsView.vue'
import DocumentsView from '../views/DocumentsView.vue'
import DevelopmentView from '../views/DevelopmentView.vue'
import EmployeeDetailView from '../views/EmployeeDetailView.vue'
import EmployeeDevelopmentView from '../views/EmployeeDevelopmentView.vue'
import TimesheetsView from '../views/TimesheetsView.vue'
import LeavesView from '../views/LeavesView.vue'
import ReportsView from '../views/ReportsView.vue'
import SettingsView from '../views/SettingsView.vue'
import RolesView from '../views/RolesView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import AccessDeniedView from '../views/AccessDeniedView.vue'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { routeCapability } from '../config/routeAccess'
import LoginView from '../views/LoginView.vue'
import ResetPasswordView from '../views/ResetPasswordView.vue'
import { useSessionStore } from '../stores/session'

export const browserLoginEnabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'


export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
    { path: '/access-denied', name: 'access-denied', component: AccessDeniedView },
    { path: '/employees', name: 'employees', component: EmployeesView },
    { path: '/employees/:company/:employee', name: 'employee-detail', component: EmployeeDetailView },
    { path: '/employees-development', name: 'employees-development', component: EmployeeDevelopmentView },
    { path: '/organization', name: 'organization', component: OrganizationView },
    { path: '/staffing', name: 'staffing', component: StaffingView },
    { path: '/personnel-actions', name: 'personnel-actions', component: PersonnelActionsView },
    { path: '/documents', name: 'documents', component: DocumentsView },
    { path: '/directories', name: 'directories', component: DirectoryHubView },
    { path: '/directories/positions', name: 'positions-directory', component: DirectoriesView },
    { path: '/learning', name: 'learning', component: DevelopmentView, props: { section: 'training' } },
    { path: '/reserve', name: 'reserve', component: DevelopmentView, props: { section: 'reserve' } },
    { path: '/leaves', name: 'leaves', component: LeavesView },
    { path: '/timesheets', name: 'timesheets', component: TimesheetsView },
    { path: '/reports', name: 'reports', component: ReportsView },
    { path: '/roles', name: 'roles', component: RolesView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  if (!browserLoginEnabled || to.name === 'login' || to.name === 'reset-password') return true

  const session = useSessionStore()
  if (!session.checked) await session.refresh()

  if (!session.user) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.name === 'access-denied' || to.name === 'not-found') return true
  const access = useCompanyAccessStore()
  await access.refresh()
  if (access.error) return to.name === 'settings' ? true : { name: 'access-denied' }
  const scopedCompany = typeof to.params.company === 'string' ? to.params.company : null
  if (scopedCompany && !access.chooseCompany(scopedCompany)) return { name: 'access-denied' }
  if (to.name === 'overview' && !access.can('overview.view') && access.can('settings.view')) return { name: 'settings' }
  const required = routeCapability(to.path)
  if (required && !access.can(required)) return { name: 'access-denied' }
  return true
})
