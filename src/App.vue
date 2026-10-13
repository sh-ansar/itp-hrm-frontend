<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseNotice from './components/ui/BaseNotice.vue'
import { useSessionStore } from './stores/session'
import { browserLoginEnabled } from './router'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const logoutError = ref('')
const mobileNavOpen = ref(false)
const searchTerm = ref('')
const contextbarHidden = ref(false)

type NavigationItem = { to: string; label: string; icon: string; detail?: boolean }
type ShellGroup = { id: 'enterprise' | 'management'; label: string; defaultTo: string; icon: string; items: NavigationItem[] }

const shellGroups: ShellGroup[] = [
  {
    id: 'enterprise',
    label: 'Предприятие',
    defaultTo: '/',
    icon: '/prototype-icons/Group.svg',
    items: [
      { to: '/', label: 'Главная', icon: '/prototype-icons/Home.svg' },
      { to: '/employees', label: 'Сотрудники', icon: '/prototype-icons/People-groupf.svg' },
      { to: '/organization', label: 'Оргструктура и штатка', icon: '/prototype-icons/Structure.svg' },
      { to: '/personnel-actions', label: 'Кадровые процессы', icon: '/prototype-icons/processf.svg' },
      { to: '/timesheets', label: 'Графики и табель', icon: '/prototype-icons/Calendar.svg' },
      { to: '/documents', label: 'Документы и приказы', icon: '/prototype-icons/Document.svg' },
      { to: '/learning', label: 'Обучение', icon: '/prototype-icons/Chart-bar-01.svg' },
      { to: '/reserve', label: 'Кадровый резерв', icon: '/prototype-icons/User.svg' },
    ],
  },
  {
    id: 'management',
    label: 'Управление',
    defaultTo: '/reports',
    icon: '/prototype-icons/Settingsf.svg',
    items: [
      { to: '/reports', label: 'Отчёты и аналитика', icon: '/prototype-icons/Report.svg' },
      { to: '/directories', label: 'Справочники', icon: '/prototype-icons/Storagef.svg' },
      { to: '/settings', label: 'Настройки', icon: '/prototype-icons/Settings.svg' },
    ],
  },
]

const currentGroupId = computed<ShellGroup['id']>(() => {
  const managementRoutes = new Set(['reports', 'directories', 'settings'])
  return managementRoutes.has(String(route.name ?? '')) ? 'management' : 'enterprise'
})
const currentGroup = computed(() => shellGroups.find(group => group.id === currentGroupId.value) ?? shellGroups[0])
const navigation = computed(() => currentGroup.value.items)

const routeLabels: Record<string, string> = {
  overview: 'Главная',
  employees: 'Сотрудники',
  'employee-detail': 'Карточка сотрудника',
  organization: 'Организационная структура',
  staffing: 'Штатное расписание',
  'personnel-actions': 'Кадровые процессы',
  timesheets: 'Графики и табель',
  documents: 'Документы и приказы',
  learning: 'Обучение',
  reserve: 'Кадровый резерв',
  reports: 'Отчёты и аналитика',
  directories: 'Справочники',
  settings: 'Настройки',
}
const currentPageLabel = computed(() => routeLabels[String(route.name ?? '')] ?? 'Кадры')

function storedCollapsed(): boolean {
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}
const sidebarCollapsed = ref(storedCollapsed())

const accountName = computed(() => session.user?.name?.trim() || 'ITP HRM')
const accountCaption = computed(() => browserLoginEnabled ? 'Профиль пользователя' : 'Рабочее пространство')
const accountInitials = computed(() => {
  const words = accountName.value.split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || 'HR'
})

function toggleSidebar() {
  if (window.matchMedia('(max-width: 959px)').matches) {
    mobileNavOpen.value = false
    return
  }
  sidebarCollapsed.value = !sidebarCollapsed.value
  try { window.localStorage.setItem('hrm-sidebar-collapsed', String(sidebarCollapsed.value)) }
  catch { /* Privacy settings can disable local storage. */ }
}
function selectGroup(group: ShellGroup) {
  mobileNavOpen.value = false
  if (group.id !== currentGroupId.value) router.push(group.defaultTo)
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

let lastScrollY = 0
let scrollDistance = 0
let scrollDirection = 0
function updateContextbar() {
  const next = Math.max(0, window.scrollY)
  const delta = next - lastScrollY
  const direction = Math.sign(delta)
  if (direction && direction !== scrollDirection) {
    scrollDirection = direction
    scrollDistance = 0
  }
  scrollDistance += delta
  if (next <= 8) {
    contextbarHidden.value = false
    scrollDistance = 0
  } else if (scrollDistance >= 8) {
    contextbarHidden.value = true
    scrollDistance = 0
  } else if (scrollDistance <= -4) {
    contextbarHidden.value = false
    scrollDistance = 0
  }
  lastScrollY = next
}
onMounted(() => {
  lastScrollY = Math.max(0, window.scrollY)
  window.addEventListener('scroll', updateContextbar, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', updateContextbar))
</script>

<template>
  <RouterView v-if="$route.name === 'login'" />
  <div v-else class="app-shell" :class="{ 'app-shell--collapsed': sidebarCollapsed }">
    <button v-if="mobileNavOpen" class="nav-backdrop" type="button"
      aria-label="Закрыть боковое меню" @click="closeMobileNav" />

    <aside class="sidebar" :class="{ 'sidebar--open': mobileNavOpen }" aria-label="Боковая панель">
      <div class="sidebar-head">
        <RouterLink to="/" class="brand-link" title="ITP HRM — главная" @click="closeMobileNav">
          <span class="brand-mark" aria-hidden="true">ITP</span>
          <span class="brand-copy"><strong>HRM</strong></span>
        </RouterLink>

        <button class="sidebar-collapse shell-icon-button" type="button"
          :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="!sidebarCollapsed" @click="toggleSidebar">
          <img :src="sidebarCollapsed ? '/prototype-icons/Open-Side.svg' : '/prototype-icons/Collapsed-screen.svg'" alt="" />
        </button>
        <button class="mobile-nav-close shell-icon-button" type="button" aria-label="Закрыть меню"
          @click="closeMobileNav"><img src="/prototype-icons/Close.svg" alt="" /></button>
        <span class="brand-divider" aria-hidden="true"></span>
      </div>

      <nav class="sidebar-nav" aria-label="Основная навигация">
        <RouterLink v-for="link in navigation" :key="link.to" class="nav-item"
          :to="link.to" :aria-label="link.label" :title="sidebarCollapsed ? link.label : undefined"
          @click="closeMobileNav"
          :class="{ 'router-link-active': link.to === '/employees' && route.name === 'employee-detail' }">
          <span class="nav-icon"><img :src="link.icon" alt="" aria-hidden="true" /></span>
          <span class="nav-label">{{ link.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-foot">
        <span class="live-dot" aria-hidden="true"></span>
        <span class="sidebar-foot-copy">Данные обновляются</span>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="mobile-nav-trigger shell-icon-button" type="button" aria-label="Открыть меню"
          @click="mobileNavOpen = true"><img src="/prototype-icons/Menu.svg" alt="" /></button>

        <nav class="shell-sections" aria-label="Разделы системы">
          <button v-for="group in shellGroups" :key="group.id" type="button"
            class="shell-section" :class="{ active: currentGroupId === group.id }"
            :aria-current="currentGroupId === group.id ? 'page' : undefined"
            @click="selectGroup(group)">
            <span class="shell-section-icon"><img :src="group.icon" alt="" /></span>
            <span>{{ group.label }}</span>
          </button>
        </nav>

        <form class="topbar-search" role="search" @submit.prevent="searchEmployees">
          <label class="search-field">
            <span class="search-leading" aria-hidden="true"><img src="/prototype-icons/Search.svg" alt="" /></span>
            <input v-model="searchTerm" type="search" aria-label="Поиск сотрудника"
              placeholder="Поиск" autocomplete="off" />
          </label>
          <button type="submit" class="search-submit" aria-label="Найти сотрудников">
            <img src="/prototype-icons/Search.svg" alt="" />
          </button>
        </form>

        <div class="topbar-tools">
          <span class="shell-icon-button topbar-tool" title="Уведомления" aria-label="Уведомления">
            <img src="/prototype-icons/Notification.svg" alt="" />
          </span>
          <span class="shell-icon-button topbar-tool" title="Оформление" aria-label="Оформление">
            <img src="/prototype-icons/Sun.svg" alt="" />
          </span>
          <div class="profile">
            <span class="user-avatar" aria-hidden="true">{{ accountInitials }}</span>
            <div class="profile-copy">
              <strong :title="accountName">{{ accountName }}</strong>
              <small>{{ accountCaption }}</small>
            </div>
          </div>
          <button v-if="browserLoginEnabled && session.user" class="logout-button shell-icon-button" type="button"
            aria-label="Выйти из системы" title="Выйти" :disabled="session.loading" @click="logout">
            <img src="/prototype-icons/Log-Out.svg" alt="" />
          </button>
        </div>
      </header>

      <div class="contextbar" :class="{ 'contextbar--hidden': contextbarHidden }">
        <nav class="shell-breadcrumbs" aria-label="Хлебные крошки">
          <RouterLink class="context-home" to="/" aria-label="Главная">
            <img src="/prototype-icons/Home.svg" alt="" />
          </RouterLink>
          <span class="context-separator" aria-hidden="true">/</span>
          <RouterLink :to="currentGroup.defaultTo">{{ currentGroup.label }}</RouterLink>
          <span class="context-separator" aria-hidden="true">/</span>
          <span aria-current="page">{{ currentPageLabel }}</span>
        </nav>
      </div>

      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main id="main-content" class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.app-shell{width:100%;min-height:100vh;min-height:100dvh;display:grid;grid-template-columns:var(--shell-sidebar) minmax(0,1fr);transition:grid-template-columns .2s ease}
.app-shell--collapsed{grid-template-columns:60px minmax(0,1fr)}
.sidebar{
  position:sticky;top:0;z-index:50;width:var(--shell-sidebar);height:100vh;height:100dvh;min-height:0;
  display:flex;flex-direction:column;overflow:hidden;background:var(--color-surface);
  border-right:1px solid var(--color-stroke);box-shadow:var(--shadow-float);color:var(--color-text);
  transition:width .2s ease,transform .2s ease
}
.app-shell--collapsed .sidebar{width:60px}
.sidebar-head{
  position:relative;width:100%;height:var(--shell-topbar);min-height:var(--shell-topbar);flex:0 0 var(--shell-topbar);
  display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:0 clamp(12px,.833333vw,16px)
}
.brand-divider{position:absolute;right:clamp(12px,.833333vw,16px);bottom:0;left:clamp(12px,.833333vw,16px);height:1px;background:var(--color-stroke)}
.brand-link{min-width:0;display:flex;align-items:center;gap:var(--space-2);color:inherit}
.brand-mark{
  width:clamp(36px,2.5vw,48px);height:clamp(36px,2.5vw,48px);min-width:clamp(36px,2.5vw,48px);
  display:grid;place-items:center;color:var(--color-primary);font-size:15px;font-weight:700;letter-spacing:-.05em
}
.brand-copy{min-width:0}
.brand-copy strong{display:block;margin:0;color:var(--color-text-secondary);font-size:var(--font-page-heading);line-height:1.33;font-weight:700}
.shell-icon-button{
  position:relative;width:clamp(36px,2.5vw,48px);height:clamp(36px,2.5vw,48px);min-width:clamp(36px,2.5vw,48px);
  display:inline-grid;place-items:center;padding:0;border:0;border-radius:var(--space-2);background:transparent;color:var(--color-muted)
}
.shell-icon-button:hover{background:var(--color-hover);color:var(--color-primary)}
.shell-icon-button img{width:24px;height:24px;object-fit:contain}
.sidebar-nav{flex:1 1 auto;min-height:0;display:block;padding:clamp(12px,.833333vw,16px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
.nav-item{
  width:100%;height:40px;min-height:40px;margin:0 0 var(--space-1);padding:4px 8px;
  display:flex;align-items:center;justify-content:flex-start;gap:var(--space-2);
  border:0;border-radius:4px;background:transparent;color:var(--color-text);
  font-size:var(--font-body-size);line-height:var(--line-body);font-weight:500;white-space:nowrap;
  transition:color .15s ease,background-color .15s ease
}
.nav-item:hover{color:var(--color-text);background:var(--color-hover)}
.nav-item.router-link-active{color:var(--color-primary);background:transparent}
.nav-item.router-link-active:hover{background:var(--color-hover)}
.nav-icon{width:20px;height:20px;min-width:20px;flex:0 0 20px;display:grid;place-items:center;overflow:hidden;color:var(--color-muted)}
.nav-icon img{width:20px;height:20px;display:block;object-fit:contain}
.nav-item.router-link-active .nav-icon img{filter:brightness(0) saturate(100%) invert(47%) sepia(97%) saturate(2023%) hue-rotate(162deg) brightness(99%) contrast(96%)}
.nav-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.sidebar-foot{
  position:relative;margin-top:auto;padding:var(--space-4) var(--space-5);display:flex;align-items:center;gap:var(--space-2);
  color:var(--color-muted);font-size:var(--font-caption-size);line-height:var(--line-caption)
}
.sidebar-foot::before{content:"";position:absolute;top:0;right:clamp(12px,.833333vw,16px);left:clamp(12px,.833333vw,16px);height:1px;background:var(--color-stroke)}
.live-dot{width:16px;height:16px;flex:none;border:4px solid var(--color-success-surface);border-radius:50%;background:var(--color-success);background-clip:padding-box}
.main{min-width:0;width:auto;background:var(--color-surface)}
.topbar{
  position:sticky;top:0;z-index:40;width:100%;height:var(--shell-topbar);min-height:var(--shell-topbar);
  display:grid;grid-template-columns:max-content minmax(240px,1fr) max-content;align-items:center;gap:var(--space-2);
  padding:0 var(--shell-gutter);background:var(--color-surface);border:0;box-shadow:none
}
.shell-sections{height:100%;display:flex;align-items:flex-end;justify-content:flex-start;gap:0}
.shell-section{
  --section-bg:transparent;position:relative;min-width:0;height:clamp(44px,3.055556vw,58.666667px);
  display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
  padding:clamp(8px,.555556vw,10.666667px) clamp(24px,1.666667vw,32px) clamp(16px,1.111111vw,21.333333px);
  border:0;border-radius:var(--space-4) var(--space-4) 0 0;background:var(--section-bg);color:var(--color-text);
  font-size:var(--font-body-size);line-height:var(--line-body);font-weight:500;white-space:nowrap
}
.shell-section:hover{--section-bg:var(--color-hover);color:var(--color-text)}
.shell-section.active{--section-bg:var(--color-page);background:var(--section-bg);color:var(--color-primary);box-shadow:0 -2px 4px rgba(56,83,97,.05);z-index:2}
.shell-section:is(.active,:hover)::before,.shell-section:is(.active,:hover)::after{content:"";position:absolute;bottom:0;width:var(--space-4);height:var(--space-4);pointer-events:none}
.shell-section:is(.active,:hover)::before{right:100%;background:radial-gradient(circle var(--space-4) at top left,transparent 100%,var(--section-bg) 100%)}
.shell-section:is(.active,:hover)::after{left:100%;background:radial-gradient(circle var(--space-4) at top right,transparent 100%,var(--section-bg) 100%)}
.shell-section-icon{width:20px;height:20px;flex:0 0 20px;display:grid;place-items:center;color:var(--color-muted)}
.shell-section-icon img{width:20px;height:20px;display:block;object-fit:contain}
.shell-section.active .shell-section-icon img{filter:brightness(0) saturate(100%) invert(47%) sepia(97%) saturate(2023%) hue-rotate(162deg) brightness(99%) contrast(96%)}
.topbar-search{
  width:100%;max-width:var(--shell-search-max);justify-self:center;min-width:0;
  display:grid;grid-template-columns:minmax(0,1fr) clamp(36px,2.5vw,48px);align-items:center;gap:var(--space-2)
}
.search-field{
  height:clamp(36px,2.5vw,48px);min-width:0;display:flex;align-items:center;gap:var(--space-2);
  padding:0 var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-page);box-shadow:var(--shadow-control);color:var(--color-muted)
}
.search-leading{width:20px;height:20px;flex:0 0 20px;display:grid;place-items:center}
.search-leading img{width:20px;height:20px}
.search-field input{
  min-width:0;height:100%;flex:1;margin:0;padding:0;border:0;outline:0;background:transparent;color:var(--color-text);
  font:inherit;font-size:var(--font-body-size);line-height:var(--line-body);font-weight:400
}
.search-field input::placeholder{color:var(--color-muted);opacity:1}
.search-field input:focus::placeholder{color:transparent}
.search-submit{
  width:clamp(36px,2.5vw,48px);height:clamp(36px,2.5vw,48px);display:grid;place-items:center;padding:var(--space-2);
  border:0;border-radius:var(--space-2);background:var(--color-primary);color:var(--color-on-primary);box-shadow:0 2px 4px rgba(56,83,97,.2)
}
.search-submit img{width:18px;height:18px;filter:brightness(0) invert(1)}
.topbar-tools{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2)}
.contextbar{
  position:sticky;top:var(--shell-topbar);z-index:35;width:100%;height:clamp(40px,2.777778vw,53.333333px);
  min-height:clamp(40px,2.777778vw,53.333333px);display:flex;align-items:center;padding:0 var(--shell-gutter);
  background:var(--color-page);border:0;border-radius:var(--space-3) var(--space-3) 0 0;color:var(--color-text);
  transform:translateY(0);opacity:1;transition:transform .2s ease,opacity .15s ease
}
.contextbar--hidden{transform:translateY(-100%);opacity:0;pointer-events:none}
.shell-breadcrumbs{
  width:max-content;max-width:100%;display:flex;align-items:center;gap:4px;min-width:0;
  font-size:var(--font-body-size);line-height:var(--line-body);font-weight:400;color:var(--color-text);white-space:nowrap
}
.shell-breadcrumbs a:hover{color:var(--color-primary)}
.shell-breadcrumbs span[aria-current="page"]{min-width:0;overflow:hidden;text-overflow:ellipsis}
.context-home{width:16px;height:16px;flex:0 0 16px;display:grid;place-items:center;color:var(--color-muted)}
.context-home img{width:16px;height:16px;display:block}
.context-separator{width:18px;display:grid;place-items:center;color:var(--color-muted)}
.topbar-tool{color:var(--color-primary)}
.profile{min-width:0;display:flex;align-items:center;gap:var(--space-2);margin-left:var(--space-1)}
.user-avatar{
  position:relative;width:clamp(32px,2.222222vw,42.666667px);height:clamp(32px,2.222222vw,42.666667px);min-width:clamp(32px,2.222222vw,42.666667px);
  display:grid;place-items:center;border:1px solid var(--color-page);border-radius:50%;background:var(--color-accent-soft);
  color:var(--color-primary);font-size:11px;font-weight:600
}
.user-avatar::after{content:"";position:absolute;right:-1px;bottom:-1px;width:8px;height:8px;border:1px solid var(--color-surface);border-radius:50%;background:var(--color-success)}
.profile-copy{min-width:0;display:grid;gap:0}
.profile-copy strong,.profile-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.profile-copy strong{max-width:170px;color:var(--color-text);font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:500}
.profile-copy small{max-width:170px;color:var(--color-muted);font-size:var(--font-caption-size);line-height:var(--line-caption);font-weight:400}
.logout-button:disabled{opacity:.5;cursor:not-allowed}
.mobile-nav-trigger,.mobile-nav-close,.nav-backdrop{display:none}
.shell-error{margin:var(--space-3) var(--shell-gutter)}
.app-shell--collapsed .sidebar-head{justify-content:center;padding-inline:10px}
.app-shell--collapsed .brand-link{display:none}
.app-shell--collapsed .sidebar-collapse{margin:0}
.app-shell--collapsed .sidebar-nav{padding-inline:10px}
.app-shell--collapsed .nav-item{width:40px;min-width:40px;max-width:40px;justify-content:center;margin-right:auto;margin-left:auto;padding:10px}
.app-shell--collapsed .nav-label,.app-shell--collapsed .sidebar-foot-copy{display:none}
.app-shell--collapsed .sidebar-foot{justify-content:center;padding-inline:0}
.app-shell--collapsed .live-dot{width:16px;height:16px}
@media(max-width:1440px){
  .topbar{grid-template-columns:max-content minmax(240px,1fr) max-content;gap:var(--space-2)}
  .shell-section{padding-inline:24px}
}
@media(max-width:959px){
  .contextbar{height:40px;min-height:40px}
  .shell-breadcrumbs{font-size:12px;line-height:16px}
  .app-shell,.app-shell--collapsed{display:block;min-height:100vh;max-width:100%}
  .sidebar,.app-shell--collapsed .sidebar{
    position:fixed;inset:0 auto 0 0;width:264px;height:100dvh;z-index:50;
    transform:translateX(-102%);box-shadow:var(--shadow-float)
  }
  .sidebar.sidebar--open{transform:translateX(0)}
  .nav-backdrop{display:block;position:fixed;inset:0;z-index:45;border:0;background:rgba(0,34,51,.32)}
  .mobile-nav-trigger,.mobile-nav-close{display:grid}
  .sidebar-collapse{display:none}
  .app-shell--collapsed .brand-link{display:flex}
  .app-shell--collapsed .sidebar-head{justify-content:space-between;padding:0 var(--space-4)}
  .app-shell--collapsed .sidebar-nav{padding:var(--space-4)}
  .app-shell--collapsed .nav-item{width:100%;max-width:none;justify-content:flex-start;margin-left:0;margin-right:0;padding:4px 8px}
  .app-shell--collapsed .nav-label,.app-shell--collapsed .sidebar-foot-copy{display:block}
  .app-shell--collapsed .sidebar-foot{justify-content:flex-start;padding:var(--space-4) var(--space-5)}
  .topbar{grid-template-columns:40px minmax(0,1fr);padding-inline:var(--shell-gutter)}
  .shell-sections,.topbar-tools{display:none}
  .mobile-nav-trigger{width:40px;height:40px;min-width:40px}
  .topbar-search{width:100%;max-width:none;grid-template-columns:minmax(0,1fr) 36px;gap:var(--space-2)}
  .search-field,.search-submit{height:36px}
  .search-submit{width:36px}
}
@media(max-width:389px){.sidebar,.app-shell--collapsed .sidebar{width:67.692308vw}}
@media(prefers-reduced-motion:reduce){.app-shell,.sidebar{transition:none}}
</style>
