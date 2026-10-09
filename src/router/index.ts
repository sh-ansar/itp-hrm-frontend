import { createRouter, createWebHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
import ModulePendingView from '../views/ModulePendingView.vue'
import NotFoundView from '../views/NotFoundView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/employees', name: 'employees', component: ModulePendingView, props: { title: 'Сотрудники', description: 'Реестр сотрудников будет доступен после подключения защищённого кадрового API.' } },
    { path: '/organization', name: 'organization', component: ModulePendingView, props: { title: 'Организационная структура', description: 'Раздел будет доступен после внедрения модели предприятий и подразделений.' } },
    { path: '/staffing', name: 'staffing', component: ModulePendingView, props: { title: 'Штатное расписание', description: 'Работа со штатными единицами появится после реализации версионирования и прав доступа.' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})
