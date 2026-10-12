import { createRouter, createWebHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
import OrganizationView from '../views/OrganizationView.vue'
import EmployeesView from '../views/EmployeesView.vue'
import EmployeeDetailView from '../views/EmployeeDetailView.vue'
import ModulePendingView from '../views/ModulePendingView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import LoginView from '../views/LoginView.vue'
import { useSessionStore } from '../stores/session'

export const browserLoginEnabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/employees', name: 'employees', component: EmployeesView },
    { path: '/employees/:company/:employee', name: 'employee-detail', component: EmployeeDetailView },
    { path: '/organization', name: 'organization', component: OrganizationView },
    { path: '/staffing', name: 'staffing', component: ModulePendingView, props: { title: 'Штатное расписание', description: 'Работа со штатными единицами появится после реализации версионирования и прав доступа.' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  if (!browserLoginEnabled || to.name === 'login') return true

  const session = useSessionStore()
  if (!session.checked) {
    await session.refresh()
  }

  if (!session.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})
