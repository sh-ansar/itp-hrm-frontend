<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const navigation = [
  { to: '/', label: 'Главная', icon: '/prototype-icons/Home.svg' },
  { to: '/employees', label: 'Сотрудники', icon: '/prototype-icons/People-groupf.svg' },
  { to: '/organization', label: 'Оргструктура и штатка', icon: '/prototype-icons/Structure.svg' },
  { to: '/personnel-actions', label: 'Кадровые процессы', icon: '/prototype-icons/processf.svg' },
  { to: '/timesheets', label: 'Графики и табель', icon: '/prototype-icons/Calendar.svg' },
  { to: '/documents', label: 'Документы и приказы', icon: '/prototype-icons/Document.svg' },
  { to: '/reports', label: 'Отчёты и аналитика', icon: '/prototype-icons/Report.svg' },
  { to: '/directories', label: 'Справочники', icon: '/prototype-icons/Storagef.svg' },
  { to: '/settings', label: 'Настройки', icon: '/prototype-icons/Settings.svg' },
]

function storedCollapsed(): boolean {
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}
const sidebarCollapsed = ref(storedCollapsed())
const accountInitials = computed(() => {
  const words = session.user?.name?.trim().split(/\s+/) ?? []
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || 'HR'
})

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try { window.localStorage.setItem('hrm-sidebar-collapsed', String(sidebarCollapsed.value)) }
  catch { /* Privacy settings can disable local storage. */ }
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
          <span class="brand-mark" aria-hidden="true">ITP</span>
          <span class="brand-copy"><strong>HRM</strong></span>
        </RouterLink>
        <button class="sidebar-collapse" type="button"
          :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="!sidebarCollapsed" @click="toggleSidebar">
          <img :src="sidebarCollapsed ? '/prototype-icons/Open-Side.svg' : '/prototype-icons/Collapsed-screen.svg'" class="header-svg-icon" alt="" />
        </button>
        <button class="mobile-nav-close" type="button" aria-label="Закрыть меню"
          @click="closeMobileNav"><img class="header-svg-icon" src="/prototype-icons/Close.svg" alt="" /></button>
      </div>
      <nav class="sidebar-nav" aria-label="Главная навигация">
        <RouterLink v-for="link in navigation" :key="link.to" class="nav-item"
          :to="link.to" :aria-label="link.label" :title="sidebarCollapsed ? link.label : undefined"
          @click="closeMobileNav" :class="{ 'router-link-active': link.to === '/employees' && route.name === 'employee-detail' }">
          <img :src="link.icon" class="nav-svg-icon" alt="" aria-hidden="true" />
          <span class="nav-label">{{ link.label }}</span>
        </RouterLink>
        <div class="sidebar-divider" aria-hidden="true"></div>
        <a class="nav-item portal-link" href="/" aria-label="Вернуться на главную" title="Портал">
          <img src="/prototype-icons/Home.svg" class="nav-svg-icon" alt="" aria-hidden="true" /><span class="nav-label">Portal</span>
        </a>
      </nav>
      <div class="sidebar-foot">
        <div class="sidebar-foot-icon" aria-hidden="true"><img class="header-svg-icon" src="/prototype-icons/People-groupf.svg" alt="" /></div>
        <span>ITP HRM</span>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar-leading">
          <button class="mobile-nav-trigger" type="button" aria-label="Открыть меню"
            @click="mobileNavOpen = true"><img class="header-svg-icon" src="/prototype-icons/Menu.svg" alt="" /></button>
        </div>
        <form class="topbar-search" role="search" @submit.prevent="searchEmployees">
          <img src="/prototype-icons/Search.svg" class="header-svg-icon" alt="" />
          <input v-model="searchTerm" type="search" aria-label="Поиск сотрудника"
            placeholder="Поиск" autocomplete="off" />

          <button type="submit" class="search-submit" aria-label="Найти сотрудников"><img src="/prototype-icons/Search.svg" class="header-svg-icon search-invert" alt="" /></button>
        </form>
        <div class="topbar-user">
          <span class="header-utility" title="Уведомления" aria-label="Уведомления"><img src="/prototype-icons/Notification.svg" alt="" /></span>
          <span class="header-utility" title="Оформление" aria-label="Оформление"><img src="/prototype-icons/Sun.svg" alt="" /></span>
          <template v-if="browserLoginEnabled && session.user">
            <span class="user-avatar" aria-hidden="true">{{ accountInitials }}</span>
            <span class="user-name" :title="session.user.name">{{ session.user.name }}</span>
            <button class="logout-button" type="button" aria-label="Выйти из системы"
              title="Выйти" :disabled="session.loading" @click="logout"><img src="/prototype-icons/Log-Out.svg" class="header-svg-icon" alt="" /></button>
          </template>
        </div>
      </header>
      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main id="main-content" class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
/* Shared prototype shell: stable narrow navigation and left-aligned search */
.app-shell{grid-template-columns:240px minmax(0,1fr)}
.app-shell--collapsed{grid-template-columns:62px minmax(0,1fr)}
.topbar{height:62px;justify-content:flex-start;gap:16px;padding:0 22px}
.topbar-leading{display:none}
.topbar-search{margin-right:auto;flex:0 1 335px}
.topbar-user{margin-left:auto}
@media(max-width:860px){
  .app-shell,.app-shell--collapsed{display:block}
  .topbar-leading{display:flex}
  .topbar{padding:0 14px}
  .topbar-search{flex:1;min-width:0}
}

.sidebar-head{height:62px;flex:0 0 62px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 14px;border-bottom:1px solid var(--color-stroke)}
.brand-link{min-width:0;display:flex;align-items:center;gap:8px}
.brand-mark{flex:0 0 auto;font-size:15px;font-weight:800;letter-spacing:-.05em;color:var(--color-text)}
.brand-copy{min-width:0}
.brand-copy strong{font-size:14px;white-space:nowrap}
.sidebar-collapse,.mobile-nav-close,.mobile-nav-trigger,.logout-button{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:#7a9caf}
.sidebar-collapse:hover,.mobile-nav-close:hover,.mobile-nav-trigger:hover,.logout-button:hover{background:var(--color-soft);color:var(--color-text)}
.sidebar-nav{min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;padding:16px 10px;scrollbar-width:thin}
.nav-item{display:flex;align-items:center;gap:12px;min-height:43px;padding:10px 11px;border-radius:4px;color:var(--color-text);font-size:13px;font-weight:600;line-height:1.3}
.nav-svg-icon{width:19px;height:19px;flex:0 0 19px;object-fit:contain}
.nav-item:hover{background:#f0f8fb}
.nav-item.router-link-active{background:#eaf8ff;color:#0697e0}
.nav-item.router-link-active .nav-svg-icon{filter:brightness(0) saturate(100%) invert(47%) sepia(97%) saturate(2023%) hue-rotate(162deg) brightness(99%) contrast(96%)}
.nav-label{min-width:0}
.sidebar-divider{border-top:1px solid var(--color-stroke);margin:15px 0 7px}
.sidebar-foot{display:none}
.topbar-leading{display:flex;align-items:center;gap:10px}
.topbar-page-title{display:none}
.topbar-search{display:flex;align-items:center;gap:8px;flex:0 1 330px;min-width:160px;height:36px;padding:0 0 0 10px;border:1px solid var(--color-stroke);border-radius:6px;background:#fff;color:var(--color-muted)}
.topbar-search:focus-within{border-color:var(--color-primary)}
.topbar-search input{border:0;outline:0;background:transparent;color:var(--color-text);min-width:0;flex:1;width:100%;height:100%;font-size:13px}
.search-submit{height:35px;width:37px;display:grid;place-items:center;flex:0 0 37px;border:0;border-radius:0 5px 5px 0;background:var(--color-primary);color:#fff}
.topbar-user{display:flex;align-items:center;gap:12px;min-width:0}
.header-svg-icon{width:18px;height:18px;object-fit:contain}
.search-invert{filter:brightness(0) invert(1)}
.header-utility{display:grid;place-items:center;width:28px;height:30px;flex:0 0 28px}
.header-utility img{width:19px;height:19px}
.user-avatar{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:#eaf7fb;color:var(--color-text);font-size:11px;font-weight:700}
.user-name{font-size:12px;font-weight:600;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.shell-error{margin:12px 24px}
.nav-backdrop,.mobile-nav-trigger,.mobile-nav-close{display:none}
.app-shell--collapsed .sidebar-head{justify-content:center;padding:0 6px}
.app-shell--collapsed .brand-link{display:none}
.app-shell--collapsed .sidebar-nav{padding:12px 6px}
.app-shell--collapsed .nav-label{display:none}
.app-shell--collapsed .nav-item{justify-content:center;padding:10px 6px}
.app-shell--collapsed .sidebar-divider{margin:12px 0}
@media(max-width:860px){
.sidebar{position:fixed;inset:0 auto 0 0;width:min(280px,88vw);z-index:40;transform:translateX(-105%);transition:transform .2s ease;box-shadow:0 20px 55px rgba(9,48,68,.18)}
.sidebar.sidebar--open{transform:translateX(0)}
.nav-backdrop{display:block;position:fixed;inset:0;z-index:35;border:0;background:rgba(9,35,52,.38)}
.mobile-nav-trigger,.mobile-nav-close{display:grid}
.sidebar-collapse{display:none}
.app-shell--collapsed .brand-link{display:flex}
.app-shell--collapsed .sidebar-head{justify-content:space-between;padding:0 14px}
.app-shell--collapsed .sidebar-nav{padding:16px 10px}
.app-shell--collapsed .nav-label{display:inline}
.app-shell--collapsed .nav-item{justify-content:flex-start;padding:10px 11px}
}
@media(max-width:650px){
.topbar-search{flex:1;min-width:0}
.user-name,.topbar-user .user-avatar,.header-utility{display:none}
.topbar-user{gap:0}
}
.topbar-leading{display:none}
@media(max-width:860px){.topbar-leading{display:flex}}
@media(prefers-reduced-motion:reduce){.sidebar{transition:none}}
</style>
