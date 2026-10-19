<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import BaseNotice from './components/ui/BaseNotice.vue'
import { useCompanyAccessStore } from './stores/companyAccess'
import { useUiPreferencesStore } from './stores/uiPreferences'

const route = useRoute()
const ui = useUiPreferencesStore()
const access = useCompanyAccessStore()
const connected = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true' && import.meta.env.VITE_DEMO_MODE !== 'true'
const workspaceNavigation = computed(() => !connected || access.can('overview.view'))
const logoutError = ref('')
const mobileNavOpen = ref(false)
function closeMobileNav() { mobileNavOpen.value = false }
function openMobileNav() { mobileNavOpen.value = true }
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && mobileNavOpen.value) {
    closeMobileNav()
    void nextTick(() => document.querySelector<HTMLButtonElement>('.mobile-nav-trigger')?.focus())
  }
}
watch(() => route.fullPath, closeMobileNav)
watch(mobileNavOpen, opened => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hrm-mobile-nav-open', opened)
  if (opened) void nextTick(() => document.querySelector<HTMLButtonElement>('.mobile-nav-close')?.focus())
})
onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('hrm-mobile-nav-open')
})
</script>

<template>
  <RouterView v-if="['login', 'reset-password'].includes(String(route.name))" />
  <div v-else class="app-shell" :class="{ 'app-shell--collapsed': ui.sidebarCollapsed, 'app-shell--personal': !workspaceNavigation }">
    <button v-if="mobileNavOpen" class="nav-backdrop" type="button"
      aria-label="Закрыть боковое меню" @click="closeMobileNav" />
    <AppSidebar v-if="workspaceNavigation" v-model:mobile-open="mobileNavOpen" />
    <div class="main">
      <AppTopbar @open-mobile-menu="openMobileNav" @logout-error="logoutError = $event" />
      <RouterLink v-if="access.can('self_service.view') && route.path !== '/my'" class="shell-error" to="/my">{{ { ru: 'Мой кабинет', kk: 'Менің кабинетім', en: 'My workspace', ka: 'ჩემი კაბინეტი' }[ui.locale] }}</RouterLink>
      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main id="main-content" class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.app-shell{--app-sidebar-width:264px}
.app-shell--collapsed{--app-sidebar-width:66px}
.app-shell--personal{--app-sidebar-width:0px}
.main{min-width:0;max-width:100%}
.shell-error{margin:12px 24px}
.nav-backdrop{display:none}
@media(max-width:860px){
  .app-shell,.app-shell--collapsed{display:block}
  .nav-backdrop{
    display:block;position:fixed;inset:0;z-index:35;
    border:0;border-radius:0;background:var(--color-overlay);
  }
  .shell-error{margin:10px 14px}
}
</style>
<style>
body.hrm-mobile-nav-open{overflow:hidden}
</style>