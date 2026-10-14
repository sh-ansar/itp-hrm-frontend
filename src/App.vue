<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import BaseNotice from './components/ui/BaseNotice.vue'
import { useUiPreferencesStore } from './stores/uiPreferences'

const route = useRoute()
const ui = useUiPreferencesStore()
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
  <RouterView v-if="route.name === 'login'" />
  <div v-else class="app-shell" :class="{ 'app-shell--collapsed': ui.sidebarCollapsed }">
    <button v-if="mobileNavOpen" class="nav-backdrop" type="button"
      aria-label="Закрыть боковое меню" @click="closeMobileNav" />
    <AppSidebar v-model:mobile-open="mobileNavOpen" />
    <div class="main">
      <AppTopbar @open-mobile-menu="openMobileNav" @logout-error="logoutError = $event" />
      <BaseNotice v-if="logoutError" class="shell-error" tone="error">{{ logoutError }}</BaseNotice>
      <main id="main-content" class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.app-shell{--app-sidebar-width:264px}
.app-shell--collapsed{--app-sidebar-width:66px}
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
