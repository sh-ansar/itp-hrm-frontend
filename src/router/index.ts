import { createRouter, createWebHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
import OrganizationView from '../views/OrganizationView.vue'
import EmployeesView from '../views/EmployeesView.vue'
import StaffingView from '../views/StaffingView.vue'
import EmployeeDetailView from '../views/EmployeeDetailView.vue'
import ModulePendingView from '../views/ModulePendingView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import LoginView from '../views/LoginView.vue'
import { useSessionStore } from '../stores/session'

export const browserLoginEnabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'

const pending = (path: string, name: string, title: string, description: string) => ({
  path,
  name,
  component: ModulePendingView,
  props: { title, description },
})

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/employees', name: 'employees', component: EmployeesView },
    { path: '/employees/:company/:employee', name: 'employee-detail', component: EmployeeDetailView },
    { path: '/organization', name: 'organization', component: OrganizationView },
    { path: '/staffing', name: 'staffing', component: StaffingView },
    pending('/personnel-actions', 'personnel-actions', 'Кадровые действия', 'Приём, перевод, увольнение и связанные кадровые события будут оформляться здесь как отдельные бизнес-операции с основаниями и аудитом.'),
    pending('/documents', 'documents', 'Документы и приказы', 'Трудовые договоры, приказы, основания и защищённые кадровые документы будут собраны в едином реестре.'),
    pending('/directories', 'directories', 'Справочники', 'Классификаторы должностей, видов персонала, оснований, отпусков и других кадровых сущностей будут управляться здесь.'),
    pending('/learning', 'learning', 'Обучение', 'Общий реестр программ, сотрудников, сроков и подтверждающих документов будет вынесен из карточек сотрудников в отдельный модуль.'),
    pending('/reserve', 'reserve', 'Кадровый резерв', 'Сводный реестр кадрового резерва, движение кандидатов и решения по резерву будут доступны в этом разделе.'),
    pending('/leaves', 'leaves', 'Отпуска', 'Графики отпусков, категории, остатки, исполнения и кадровые документы будут реализованы отдельным модулем.'),
    pending('/timesheets', 'timesheets', 'Табельный учёт', 'Производственный календарь, графики, отсутствия, смены и табель будут реализованы здесь.'),
    pending('/reports', 'reports', 'Отчёты и аналитика', 'Численность, движения, текучесть, обучение, вакансии и срезы на дату будут собраны на аналитических страницах.'),
    pending('/settings', 'settings', 'Администрирование', 'Управление доступом, системными настройками и служебными параметрами будет доступно администраторам.'),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  if (!browserLoginEnabled || to.name === 'login') return true

  const session = useSessionStore()
  if (!session.checked) await session.refresh()

  if (!session.user) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})
