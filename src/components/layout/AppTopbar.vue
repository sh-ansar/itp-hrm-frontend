<script setup lang="ts">
import { publicAsset } from '../../utils/publicAsset'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Menu } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { useCompanyAccessStore } from '../../stores/companyAccess'
import { useAppI18n } from '../../i18n'
import { browserLoginEnabled } from '../../router'
import { apiRequest } from '../../api/client'
import BaseThemeToggle from '../ui/BaseThemeToggle.vue'
import HeaderNotifications from './HeaderNotifications.vue'
import AccountMenu from './AccountMenu.vue'

const emit = defineEmits<{ openMobileMenu: []; logoutError: [message: string] }>()
const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const access = useCompanyAccessStore()
const { t } = useAppI18n()
const topbar = ref<HTMLElement | null>(null)
const activePopover = ref<'notifications' | 'account' | null>(null)
const platformAdmin = ref(false)
const showEmployeeSearch = computed(() => !browserLoginEnabled || access.can('employees.view'))
const searchTerm = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

function togglePopover(which: 'notifications' | 'account') {
  activePopover.value = activePopover.value === which ? null : which
}
function searchEmployees() {
  const q = searchTerm.value.trim()
  void router.push({ name: 'employees', query: q ? { q } : {} })
}
function clearSearch() {
  searchTerm.value = ''
  if (route.name === 'employees') searchEmployees()
  if (showEmployeeSearch.value) void nextTick(() => searchInput.value?.focus())
}
async function logout() {
  activePopover.value = null
  emit('logoutError', '')
  try {
    await session.logout()
    await router.replace({ name: 'login' })
  } catch (cause) {
    emit('logoutError', cause instanceof Error ? cause.message : t('topbar.signOutTitle'))
  }
}
function handleShortcut(event: KeyboardEvent) {
  if (event.key === 'Escape' && activePopover.value) {
    const last = activePopover.value
    activePopover.value = null
    void nextTick(() => topbar.value?.querySelector<HTMLButtonElement>(
      last === 'account' ? '.account-trigger' : '.notification-button')?.focus())
    return
  }
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const element = event.target as HTMLElement | null
  if (element?.closest('input,textarea,select,[contenteditable="true"]')) return
  if (!showEmployeeSearch.value) return
  event.preventDefault()
  searchInput.value?.focus()
}
function handleOutside(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!target.closest('.account-menu-anchor,.notification-anchor')) activePopover.value = null
}
watch(() => [route.name, route.query.q] as const, ([name, q]) => {
  if (name === 'employees') searchTerm.value = typeof q === 'string' ? q : ''
}, { immediate: true })
watch(() => route.fullPath, () => { activePopover.value = null })
watch(() => session.user?.id, async id => {
  if (!browserLoginEnabled || !id) { platformAdmin.value = false; return }
  try {
    await apiRequest('/platform-admin/overview')
    if (session.user?.id === id) platformAdmin.value = true
  } catch {
    if (session.user?.id === id) platformAdmin.value = false
  }
}, { immediate: true })
onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
  document.addEventListener('pointerdown', handleOutside)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  document.removeEventListener('pointerdown', handleOutside)
})
</script>

<template>
  <header ref="topbar" class="topbar hrm-topbar">
    <button v-if="showEmployeeSearch" class="mobile-nav-trigger topbar-icon" type="button"
      aria-label="Открыть меню" @click="emit('openMobileMenu')">
      <Menu :size="21" aria-hidden="true" />
    </button>

    <form v-if="showEmployeeSearch" class="topbar-search" role="search" @submit.prevent="searchEmployees">
      <div class="search-field">
        <img class="search-leading-icon" :src="publicAsset('prototype-icons/Search.svg')" alt="" aria-hidden="true" />
        <input ref="searchInput" v-model="searchTerm" type="search"
          :aria-label="t('topbar.searchEmployee')" :placeholder="t('topbar.search')" autocomplete="off" />
        <button v-if="searchTerm" class="search-clear" type="button"
          :aria-label="t('topbar.clearSearch')" @click="clearSearch">
          <img :src="publicAsset('prototype-icons/Close.svg')" alt="" aria-hidden="true" />
        </button>
      </div>
      <button class="search-submit" type="submit" :aria-label="t('topbar.findEmployees')" :title="t('topbar.findEmployees')">
        <img :src="publicAsset('prototype-icons/Search.svg')" alt="" aria-hidden="true" />
      </button>
    </form>

    <div class="topbar-user">
      <HeaderNotifications :open="activePopover === 'notifications'"
        @toggle="togglePopover('notifications')" @close="activePopover = null" />
      <BaseThemeToggle />
      <AccountMenu :open="activePopover === 'account'" :platform-admin="platformAdmin"
        :busy="session.loading" @toggle="togglePopover('account')"
        @close="activePopover = null" @logout="logout" />
    </div>
  </header>
</template>

<style scoped>
.hrm-topbar{width:100%;max-width:100%;min-width:0;position:relative;
  height:64px;min-height:64px;padding:0 24px;display:flex;align-items:center;
  justify-content:space-between;gap:18px;background:transparent;z-index:25}
.topbar-search{display:flex;align-items:center;gap:8px;flex:0 1 455px;
  min-width:0;width:100%;margin-right:auto}
.search-field{display:flex;align-items:center;gap:9px;min-width:0;flex:1;height:38px;
  padding:0 11px 0 12px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-control)}
.search-field:focus-within{border-color:var(--color-primary-stroke);outline:1px solid var(--color-primary-stroke)}
.search-leading-icon{width:18px;height:18px;flex:none;object-fit:contain}
.search-field input{display:block;width:100%;min-width:0;height:100%;border:0;outline:0;
  padding:0;background:transparent;color:var(--color-text);font-size:13px;line-height:19px;appearance:none}
.search-field input::placeholder{color:var(--color-muted)}
.search-field input::-webkit-search-cancel-button{display:none}
.search-clear{display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;
  border:0;border-radius:5px;background:transparent;color:var(--color-muted)}
.search-clear:hover{background:var(--color-soft)}
.search-clear img{width:15px;height:15px}
.search-submit{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;
  border:1px solid var(--color-primary);border-radius:7px;background:var(--color-primary);
  color:var(--color-on-primary);box-shadow:0 2px 5px rgba(0,125,191,.15)}
.search-submit:hover{background:var(--color-primary-hover)}
.search-submit img{width:19px;height:19px;filter:brightness(0) invert(1)}
.topbar-user{display:flex;align-items:center;justify-content:flex-end;gap:8px;
  margin-left:auto;min-width:0;flex:none}
.topbar-icon{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;
  border:0;border-radius:7px;background:transparent;color:var(--color-muted)}
.topbar-icon:hover{background:var(--color-soft);color:var(--color-primary)}
.mobile-nav-trigger{display:none}
:global(:root[data-theme="dark"] .search-leading-icon),
:global(:root[data-theme="dark"] .search-clear img){
  filter:brightness(0) saturate(100%) invert(78%) sepia(24%) saturate(460%) hue-rotate(156deg) brightness(92%) contrast(88%)}
@media(max-width:1100px){.hrm-topbar{padding:0 18px;gap:12px}.topbar-search{flex-basis:360px}}
@media(max-width:860px){.hrm-topbar{height:64px;min-height:64px;padding:0 14px;gap:8px}
  .mobile-nav-trigger{display:grid}.topbar-search{flex:1 1 0;min-width:0;width:auto;max-width:none;margin-right:0}
  .topbar-user{gap:3px;margin-left:0}}
@media(max-width:520px){.hrm-topbar{gap:5px;padding:0 10px}
  .topbar-search{gap:5px}.search-field{height:36px;padding:0 7px;gap:6px}
  .search-leading-icon{width:15px;height:15px}.search-submit{width:36px;height:36px;flex-basis:36px}
  .topbar-icon{width:30px;height:32px;flex-basis:30px}.topbar-user{gap:0}}
@media(prefers-reduced-motion:reduce){.search-field{scroll-behavior:auto}}
</style>
