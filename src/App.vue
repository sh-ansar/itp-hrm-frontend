<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart3, BookOpenCheck, BriefcaseBusiness, CalendarDays, ChevronDown,
  ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Network,
  PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck,
  UserRoundCheck, Users, X,
} from 'lucide-vue-next'
import BaseNotice from './components/ui/BaseNotice.vue'
import { useSessionStore } from './stores/session'
import { browserLoginEnabled } from './router'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const logoutError = ref('')
const mobileNavOpen = ref(false)
const searchTerm = ref('')
const navigation = [
  { id: 'workspace', label: 'Рабочее пространство', items: [
    { to: '/', label: 'Обзор', icon: LayoutDashboard },
  ] },
  { id: 'personnel', label: 'Кадровый учёт', items: [
    { to: '/employees', label: 'Сотрудники', icon: Users },
    { to: '/personnel-actions', label: 'Кадровые действия', icon: UserRoundCheck },
    { to: '/documents', label: 'Документы и приказы', icon: FileText },
  ] },
  { id: 'organization', label: 'Организация', items: [
    { to: '/organization', label: 'Оргструктура', icon: Network },
    { to: '/staffing', label: 'Штатное расписание', icon: BriefcaseBusiness },
    { to: '/directories', label: 'Справочники', icon: ClipboardList },
  ] },
  { id: 'growth', label: 'Развитие и время', items: [
    { to: '/learning', label: 'Обучение', icon: BookOpenCheck },
    { to: '/reserve', label: 'Кадровый резерв', icon: ShieldCheck },
    { to: '/leaves', label: 'Отпуска', icon: CalendarDays },
    { to: '/timesheets', label: 'Табельный учёт', icon: ClipboardList },
  ] },
  { id: 'insights', label: 'Аналитика и настройки', items: [
    { to: '/reports', label: 'Отчёты и аналитика', icon: BarChart3 },
    { to: '/settings', label: 'Администрирование', icon: Settings },
  ] },
]

function storedCollapsed(): boolean {
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}
const sidebarCollapsed = ref(storedCollapsed())
const expandedGroups = ref<Record<string, boolean>>(
  Object.fromEntries(navigation.map(group => [group.id, true])),
)
const currentTitle = computed(() => {
  if (route.name === 'employee-detail') return 'Карточка сотрудника'
  return navigation.flatMap(group => group.items).find(link => link.to === route.path)?.label ?? 'Кадровая служба'
})
const accountInitials = computed(() => {
  const words = session.user?.name?.trim().split(/\s+/) ?? []
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || 'HR'
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try { window.localStorage.setItem('hrm-sidebar-collapsed', String(sidebarCollapsed.value)) }
  catch { /* Privacy settings can disable local storage. */ }
}
function toggleGroup(id: string) {
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false
    try { window.localStorage.setItem('hrm-sidebar-collapsed', 'false') } catch { /* ignore */ }
  }
  expandedGroups.value[id] = !expandedGroups.value[id]
}
function closeMobileNav() { mobileNavOpen.value = false }
function searchEmployees() {
  const q = searchTerm.value.trim()
  closeMobileNav()
  router.push({ name: 'employees', query: q ? { q } : {} })
}
async function logout() {
  logoutError.value = ''
  try {
    await session.logout()
    await router.replace({ name: 'login' })
  } catch (cause) {
    logoutError.value = cause instanceof Error ? cause.message : 'Не удалось завершить сеанс'
  }
}

watch(() => route.fullPath, closeMobileNav)
watch(() => route.query.q, q => {
  if (route.name === 'employees') searchTerm.value = typeof q === 'string' ? q : ''
}, { immediate: true })
</script>

<template>
  <RouterView v-if="$route.name === 'login'" />
  <div v-else class="app-shell" :class="{ 'app-shell--collapsed': sidebarCollapsed }">
    <button v-if="mobileNavOpen" class="nav-backdrop" type="button"
      aria-label="Закрыть боковое меню" @click="closeMobileNav" />
    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }" aria-label="Боковая панель">
      <div class="sidebar-head">
        <RouterLink to="/" class="brand-link" title="ITP HRM — обзор" @click="closeMobileNav">
          <span class="brand-mark">ITP</span>
          <span class="brand-copy"><strong>HRM</strong><small>Управление персоналом</small></span>
        </RouterLink>
        <button class="sidebar-collapse" type="button"
          :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="!sidebarCollapsed" @click="toggleSidebar">
          <PanelLeftOpen v-if="sidebarCollapsed" :size="19" />
          <PanelLeftClose v-else :size="19" />
        </button>
        <button class="mobile-nav-close" type="button" aria-label="Закрыть меню"
          @click="closeMobileNav"><X :size="21" /></button>
      </div>
      <nav class="sidebar-nav" aria-label="Главная навигация">
        <section v-for="group in navigation" :key="group.id" class="nav-group">
          <button type="button" class="nav-group-toggle"
            :aria-expanded="expandedGroups[group.id] || sidebarCollapsed"
            :aria-controls="'menu-' + group.id"
            :title="group.label" @click="toggleGroup(group.id)">
            <span class="nav-group-title">{{ group.label }}</span>
            <ChevronDown :size="15" class="group-chevron"
              :class="{ 'group-chevron--closed': !expandedGroups[group.id] }" />
          </button>
          <div v-show="expandedGroups[group.id] || sidebarCollapsed" :id="'menu-' + group.id" class="nav-items">
            <RouterLink v-for="link in group.items" :key="link.to" class="nav-item"
              :to="link.to" :aria-label="link.label" :title="sidebarCollapsed ? link.label : undefined"
              @click="closeMobileNav">
              <component :is="link.icon" :size="19" :stroke-width="1.8" aria-hidden="true" />
              <span class="nav-label">{{ link.label }}</span>
            </RouterLink>
          </div>
        </section>
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-foot-icon" aria-hidden="true"><Users :size="18" /></div>
        <span>ITP HRM</span>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar-leading">
          <button class="mobile-nav-trigger" type="button" aria-label="Открыть меню"
            @click="mobileNavOpen = true"><Menu :size="21" /></button>
          <strong class="topbar-page-title">{{ currentTitle }}</strong>
        </div>
        <form class="topbar-search" role="search" @submit.prevent="searchEmployees">
          <Search :size="18" aria-hidden="true" />
          <input v-model="searchTerm" type="search" aria-label="Поиск сотрудника"
            placeholder="Поиск по сотрудникам" autocomplete="off" />
          <kbd>/</kbd>
        </form>
        <div class="topbar-user">
          <template v-if="browserLoginEnabled && session.user">
            <span class="user-avatar" aria-hidden="true">{{ accountInitials }}</span>
            <span class="user-name" :title="session.user.name">{{ session.user.name }}</span>
            <button class="logout-button" type="button" aria-label="Выйти из системы"
              title="Выйти" :disabled="session.loading" @click="logout"><LogOut :size="18" /></button>
          </template>
        </div>
      </header>
      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main id="main-content" class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.sidebar-head{height:70px;flex:0 0 70px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px;border-bottom:1px solid var(--color-stroke)}
.brand-link{min-width:0;display:flex;align-items:center;gap:10px}
.brand-mark{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;background:var(--color-accent-soft);color:var(--color-primary);border-radius:11px;font-size:14px;font-weight:700}
.brand-copy{min-width:0;display:grid;gap:2px}
.brand-copy strong{font-size:18px;letter-spacing:-.03em}
.brand-copy small{font-size:10px;color:var(--color-muted);white-space:nowrap}
.sidebar-collapse,.mobile-nav-close,.mobile-nav-trigger,.logout-button{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:var(--color-muted)}
.sidebar-collapse:hover,.mobile-nav-close:hover,.mobile-nav-trigger:hover,.logout-button:hover{color:var(--color-primary);background:var(--color-accent-soft)}
.sidebar-nav{min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 11px;scrollbar-width:thin}
.nav-group{min-width:0;margin:0 0 8px}
.nav-group-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px 7px;border:0;background:none;color:var(--color-muted);text-align:left}
.nav-group-title{text-transform:uppercase;font-size:10px;letter-spacing:.07em;font-weight:700}
.group-chevron{flex:0 0 auto;transition:transform .18s ease}
.group-chevron--closed{transform:rotate(-90deg)}
.nav-items{display:grid;gap:3px}
.nav-item{display:flex;align-items:center;gap:11px;min-width:0;min-height:42px;padding:9px 12px;border-radius:9px;color:#46697b;font-size:13px;transition:background-color .15s,color .15s}
.nav-item svg{flex:0 0 19px}
.nav-item:hover{background:var(--color-soft);color:var(--color-text)}
.nav-item.router-link-active{color:var(--color-primary);background:var(--color-accent-soft);font-weight:600}
.nav-label{min-width:0;line-height:1.3}
.sidebar-foot{height:56px;border-top:1px solid var(--color-stroke);padding:11px 20px;display:flex;gap:10px;align-items:center;color:var(--color-muted);font-size:12px;font-weight:600}
.sidebar-foot-icon{display:grid;place-items:center}
.topbar-leading{min-width:0;display:flex;align-items:center;gap:12px}
.topbar-page-title{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar-search{display:flex;align-items:center;gap:10px;flex:0 1 380px;min-width:160px;height:40px;padding:0 12px;border:1px solid var(--color-stroke);border-radius:10px;background:var(--color-soft);color:var(--color-muted)}
.topbar-search:focus-within{border-color:var(--color-primary);box-shadow:0 0 0 3px var(--color-accent-soft)}
.topbar-search input{border:0;outline:0;background:transparent;color:var(--color-text);min-width:0;width:100%;height:100%;font-size:13px}
.topbar-search input::placeholder{color:var(--color-muted)}
.topbar-search kbd{display:none;font:inherit;font-size:11px;color:var(--color-muted)}
.topbar-user{display:flex;align-items:center;gap:9px;min-width:0}
.user-avatar{display:grid;place-items:center;background:var(--color-accent-soft);color:var(--color-primary);border-radius:50%;width:33px;height:33px;flex:0 0 33px;font-size:11px;font-weight:700}
.user-name{font-size:12px;font-weight:600;max-width:160px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.shell-error{margin:12px 24px}
.nav-backdrop,.mobile-nav-trigger,.mobile-nav-close{display:none}
.app-shell--collapsed .sidebar-head{justify-content:center;padding:0 8px;flex-wrap:wrap}
.app-shell--collapsed .brand-link{display:none}
.app-shell--collapsed .sidebar-nav{padding:10px 6px}
.app-shell--collapsed .nav-group-toggle{height:16px;padding:0;margin:6px 0 4px;pointer-events:none}
.app-shell--collapsed .nav-group-title,.app-shell--collapsed .group-chevron,.app-shell--collapsed .nav-label,.app-shell--collapsed .sidebar-foot span{display:none}
.app-shell--collapsed .nav-item{justify-content:center;padding:9px;min-height:42px}
.app-shell--collapsed .nav-items{gap:3px}
.app-shell--collapsed .sidebar-foot{justify-content:center;padding:10px}
@media(max-width:1050px){.user-name{max-width:96px}}
@media(max-width:860px){
  .sidebar{position:fixed;inset:0 auto 0 0;width:min(290px,88vw);z-index:40;transform:translateX(-105%);transition:transform .2s ease;box-shadow:0 20px 55px rgba(9,48,68,.18)}
  .sidebar.sidebar--open{transform:translateX(0)}
  .nav-backdrop{display:block;position:fixed;inset:0;z-index:35;border:0;background:rgba(9,35,52,.38)}
  .mobile-nav-trigger,.mobile-nav-close{display:grid}
  .sidebar-collapse{display:none}
  .app-shell--collapsed .brand-link{display:flex}
  .app-shell--collapsed .sidebar-head{justify-content:space-between;padding:0 14px}
  .app-shell--collapsed .sidebar-nav{padding:12px 11px}
  .app-shell--collapsed .nav-group-toggle{height:auto;padding:10px 11px 7px;margin:0;pointer-events:auto}
  .app-shell--collapsed .nav-group-title,.app-shell--collapsed .group-chevron,.app-shell--collapsed .nav-label,.app-shell--collapsed .sidebar-foot span{display:block}
  .app-shell--collapsed .nav-item{justify-content:flex-start;padding:9px 12px}
  .app-shell--collapsed .sidebar-foot{justify-content:flex-start}
}
@media(max-width:650px){
  .topbar-search{flex:1;min-width:0;height:38px}
  .topbar-page-title,.user-name,.topbar-user .user-avatar{display:none}
  .topbar-user{gap:0}
  .topbar-search input{font-size:12px}
}
@media(prefers-reduced-motion:reduce){.sidebar,.group-chevron,.nav-item{transition:none}}
</style>
