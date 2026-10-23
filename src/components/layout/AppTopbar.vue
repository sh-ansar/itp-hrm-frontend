<script setup lang="ts">
import { publicAsset } from '../../utils/publicAsset'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Menu } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { useCompanyAccessStore } from '../../stores/companyAccess'
import { useUiPreferencesStore, type UiLocale } from '../../stores/uiPreferences'
import { localeOptions, useAppI18n } from '../../i18n'
import { browserLoginEnabled } from '../../router'
import BaseThemeToggle from '../ui/BaseThemeToggle.vue'

const emit = defineEmits<{
  openMobileMenu: []
  logoutError: [message: string]
}>()
const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const access = useCompanyAccessStore()
const showEmployeeSearch = computed(() => !browserLoginEnabled || access.can('employees.view'))
const ui = useUiPreferencesStore()
const { t } = useAppI18n()
const searchTerm = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const canSignOut = computed(() => browserLoginEnabled && Boolean(session.user))
const accountName = computed(() => canSignOut.value ? (session.user?.name ?? '') : 'ITP HRM')
const accountDetail = computed(() => canSignOut.value ? t('topbar.workAccount') : t('topbar.hrSystem'))
const initials = computed(() => {
  if (!canSignOut.value) return 'HR'
  const words = session.user?.name?.trim().split(/\s+/) ?? []
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || 'HR'
})
function setLocale(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'ru' || value === 'kk' || value === 'en' || value === 'ka') ui.setLocale(value as UiLocale)
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
  emit('logoutError', '')
  try {
    await session.logout()
    await router.replace({ name: 'login' })
  } catch (cause) {
    emit('logoutError', cause instanceof Error ? cause.message : t('topbar.signOutTitle'))
  }
}
function handleShortcut(event: KeyboardEvent) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const element = event.target as HTMLElement | null
  if (element?.closest('input,textarea,select,[contenteditable="true"]')) return
  if (!showEmployeeSearch.value) return
  event.preventDefault()
  searchInput.value?.focus()
}
watch(() => [route.name, route.query.q] as const, ([name, q]) => {
  if (name === 'employees') searchTerm.value = typeof q === 'string' ? q : ''
}, { immediate: true })
onMounted(() => window.addEventListener('keydown', handleShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))
</script>

<template>
  <header class="topbar hrm-topbar">
    <button v-if="showEmployeeSearch" class="mobile-nav-trigger topbar-icon" type="button" aria-label="Открыть меню"
      @click="emit('openMobileMenu')">
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
      <label class="locale-control">
        <span class="sr-only">{{ t('settings.language') }}</span>
        <select :value="ui.locale" :aria-label="t('settings.language')" :title="localeOptions.find(option => option.id === ui.locale)?.name" @change="setLocale">
          <option v-for="option in localeOptions" :key="option.id" :value="option.id">{{ option.id === 'ka' ? 'GE' : option.id === 'kk' ? 'KZ' : option.id.toUpperCase() }}</option>
        </select>
      </label>
      <BaseThemeToggle />
      <div class="profile-summary" :title="accountName">
        <span class="user-avatar" aria-hidden="true">{{ initials }}</span>
        <span class="profile-copy">
          <strong>{{ accountName }}</strong>
          <small>{{ accountDetail }}</small>
        </span>
      </div>
      <button v-if="canSignOut" class="logout-button" type="button" :disabled="session.loading"
        :aria-label="t('topbar.signOutAria')" :title="t('topbar.signOutTitle')" @click="logout">
        <img :src="publicAsset('prototype-icons/Log-Out.svg')" alt="" aria-hidden="true" />
        <span>{{ t('topbar.signOut') }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.hrm-topbar{
  width:100%;max-width:100%;min-width:0;
  height:64px;min-height:64px;padding:0 24px;
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  background:var(--color-surface);
}
.topbar-search{
  display:flex;align-items:center;gap:8px;flex:0 1 455px;
  min-width:0;width:100%;margin-right:auto;
}
.search-field{
  display:flex;align-items:center;gap:9px;min-width:0;flex:1;
  height:38px;padding:0 11px 0 12px;
  border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-control);
}
.search-field:focus-within{border-color:var(--color-primary-stroke);outline:1px solid var(--color-primary-stroke)}
.search-leading-icon{width:18px;height:18px;flex:none;object-fit:contain}
.search-field input{
  display:block;width:100%;min-width:0;height:100%;border:0;outline:0;
  padding:0;background:transparent;color:var(--color-text);
  font-size:13px;line-height:19px;appearance:none;
}
.search-field input::placeholder{color:var(--color-muted)}
.search-field input::-webkit-search-cancel-button{display:none}
.search-clear{
  display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;
  border:0;border-radius:5px;background:transparent;color:var(--color-muted);
}
.search-clear:hover{background:var(--color-soft)}
.search-clear img{width:15px;height:15px}
.search-submit{
  display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;
  border:1px solid var(--color-primary);border-radius:7px;
  background:var(--color-primary);color:var(--color-on-primary);
  box-shadow:0 2px 5px rgba(0,125,191,.15);
}
.search-submit:hover{background:var(--color-primary-hover)}
.search-submit img{width:19px;height:19px;filter:brightness(0) invert(1)}
.topbar-user{display:flex;align-items:center;justify-content:flex-end;gap:11px;margin-left:auto;min-width:0}
.locale-control{display:block;flex:none}
.locale-control select{
  height:34px;min-width:57px;padding:0 7px;border:1px solid var(--color-stroke);
  border-radius:7px;background:var(--color-surface);color:var(--color-text);
  font:inherit;font-size:11px;font-weight:700;box-shadow:var(--shadow-control);cursor:pointer;
}
.locale-control select:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.topbar-icon{
  display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;
  border:0;border-radius:7px;background:transparent;color:var(--color-muted);
}
.topbar-icon:hover{background:var(--color-soft);color:var(--color-primary)}
.profile-summary{
  display:flex;align-items:center;gap:8px;min-width:0;max-width:255px;
  padding:2px 10px 2px 0;
  border-right:1px solid var(--color-stroke);
}
.user-avatar{
  display:grid;place-items:center;flex:0 0 35px;width:35px;height:35px;
  border-radius:50%;color:var(--color-primary);background:var(--color-accent-soft);
  border:1px solid var(--color-primary-stroke);font-size:12px;font-weight:800;
}
.profile-copy{display:grid;gap:2px;min-width:0;line-height:1.15}
.profile-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:700}
.profile-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-muted);font-size:11px}
.logout-button{
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  height:37px;flex:none;padding:0 11px;
  border:1px solid var(--color-stroke);border-radius:8px;
  color:var(--color-text);background:var(--color-surface);
  box-shadow:var(--shadow-control);font-size:12px;line-height:17px;font-weight:700;
}
.logout-button:hover{border-color:var(--color-primary-stroke);color:var(--color-primary)}
.logout-button:disabled{opacity:.5;cursor:wait}
.logout-button img{width:18px;height:18px;object-fit:contain}
.mobile-nav-trigger{display:none}
:global(:root[data-theme="dark"] .search-leading-icon),
:global(:root[data-theme="dark"] .search-clear img),
:global(:root[data-theme="dark"] .logout-button img){
  filter:brightness(0) saturate(100%) invert(78%) sepia(24%) saturate(460%) hue-rotate(156deg) brightness(92%) contrast(88%);
}
@media(max-width:1100px){
  .hrm-topbar{padding:0 18px;gap:12px}
  .topbar-search{flex-basis:360px}
  .profile-copy strong{max-width:145px}
}
@media(max-width:860px){
  .hrm-topbar{height:64px;min-height:64px;padding:0 14px;gap:8px}
  .mobile-nav-trigger{display:grid}
  .topbar-search{flex:1 1 0;min-width:0;width:auto;max-width:none;margin-right:0}
  .profile-summary{display:none}
  .topbar-user{flex:none;gap:2px;margin-left:0}
  .locale-control select{width:48px;min-width:48px;padding:0 3px}
  .logout-button{width:37px;padding:0}
  .logout-button span{display:none}
}
@media(max-width:520px){
  .hrm-topbar{gap:7px;padding:0 10px}
  .topbar-search{gap:5px}
  .search-field{height:36px;padding:0 7px;gap:6px}
  .search-leading-icon{width:15px;height:15px}
  .search-submit{width:36px;height:36px;flex-basis:36px}
  .profile-summary{display:none}
  .topbar-icon{width:30px;height:32px;flex-basis:30px}
  .topbar-user{gap:0}
}
@media(prefers-reduced-motion:reduce){.search-field{scroll-behavior:auto}}
</style>
