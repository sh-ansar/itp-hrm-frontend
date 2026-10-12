<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Network,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-vue-next'
import BaseNotice from './components/ui/BaseNotice.vue'
import BaseButton from './components/ui/BaseButton.vue'
import { useSessionStore } from './stores/session'
import { browserLoginEnabled } from './router'

const router = useRouter()
const session = useSessionStore()
const logoutError = ref('')
const mobileNavOpen = ref(false)

const navigation = [
  {
    label: 'Рабочее пространство',
    items: [{ to: '/', label: 'Обзор', icon: LayoutDashboard }],
  },
  {
    label: 'Кадровый учёт',
    items: [
      { to: '/employees', label: 'Сотрудники', icon: Users },
      { to: '/personnel-actions', label: 'Кадровые действия', icon: UserRoundCheck },
      { to: '/documents', label: 'Документы и приказы', icon: FileText },
    ],
  },
  {
    label: 'Организация',
    items: [
      { to: '/organization', label: 'Оргструктура', icon: Network },
      { to: '/staffing', label: 'Штатное расписание', icon: BriefcaseBusiness },
      { to: '/directories', label: 'Справочники', icon: ClipboardList },
    ],
  },
  {
    label: 'Развитие и время',
    items: [
      { to: '/learning', label: 'Обучение', icon: BookOpenCheck },
      { to: '/reserve', label: 'Кадровый резерв', icon: ShieldCheck },
      { to: '/leaves', label: 'Отпуска', icon: CalendarDays },
      { to: '/timesheets', label: 'Табельный учёт', icon: ClipboardList },
    ],
  },
  {
    label: 'Аналитика',
    items: [
      { to: '/reports', label: 'Отчёты и аналитика', icon: BarChart3 },
      { to: '/settings', label: 'Администрирование', icon: Settings },
    ],
  },
]

async function logout() {
  logoutError.value = ''
  try {
    await session.logout()
    await router.replace({ name: 'login' })
  } catch (cause) {
    logoutError.value = cause instanceof Error ? cause.message : 'Не удалось завершить сеанс'
  }
}

function closeMobileNav() {
  mobileNavOpen.value = false
}
</script>

<template>
  <RouterView v-if="$route.name === 'login'" />
  <div v-else class="app-shell">
    <button v-if="mobileNavOpen" class="nav-backdrop" type="button" aria-label="Закрыть меню" @click="closeMobileNav" />
    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }">
      <div class="sidebar-head">
        <div class="brand">ITP HRM<small>Кадровая система</small></div>
        <button class="mobile-nav-close" type="button" aria-label="Закрыть меню" @click="closeMobileNav"><X :size="20" /></button>
      </div>
      <nav aria-label="Главная навигация">
        <section v-for="group in navigation" :key="group.label" class="nav-group">
          <p class="nav-group-title">{{ group.label }}</p>
          <RouterLink v-for="link in group.items" :key="link.to" class="nav-item" :to="link.to" @click="closeMobileNav">
            <component :is="link.icon" :size="18" />
            <span>{{ link.label }}</span>
          </RouterLink>
        </section>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-title">
          <button class="mobile-nav-trigger" type="button" aria-label="Открыть меню" @click="mobileNavOpen = true"><Menu :size="21" /></button>
          <div><strong>Кадровая служба</strong><small>Единое рабочее пространство HR</small></div>
        </div>
        <div v-if="browserLoginEnabled && session.user" class="user-panel">
          <span class="muted">{{ session.user.name }}</span>
          <BaseButton variant="secondary" :disabled="session.loading" @click="logout">Выйти</BaseButton>
        </div>
        <span v-else class="muted">Демонстрационная среда</span>
      </header>
      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.user-panel{display:flex;gap:12px;align-items:center}
.shell-error{margin:12px 32px}
.sidebar-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.nav-group{display:grid;gap:4px}
.nav-group+.nav-group{margin-top:18px}
.nav-group-title{margin:0 10px 5px;color:var(--color-muted);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.topbar-title{display:flex;align-items:center;gap:12px;min-width:0}
.topbar-title>div{display:grid;gap:3px}
.topbar-title small{font-size:12px;color:var(--color-muted);font-weight:400}
.mobile-nav-trigger,.mobile-nav-close{display:none;border:0;background:transparent;color:var(--color-text);padding:8px;border-radius:var(--radius-sm)}
.nav-backdrop{display:none}
@media(max-width:860px){
  .user-panel{gap:8px}.user-panel .muted{max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mobile-nav-trigger,.mobile-nav-close{display:inline-flex;align-items:center;justify-content:center}
  .sidebar{position:fixed;inset:0 auto 0 0;width:min(320px,88vw);z-index:30;transform:translateX(-104%);transition:transform .2s ease;overflow-y:auto}
  .sidebar.sidebar--open{transform:translateX(0)}
  .nav-backdrop{display:block;position:fixed;inset:0;z-index:20;border:0;background:rgba(7,35,49,.35)}
}
</style>
