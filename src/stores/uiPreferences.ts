import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type UiTheme = 'light' | 'dark'

function readTheme(): UiTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem('hrm-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Storage can be unavailable. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}

export const useUiPreferencesStore = defineStore('ui-preferences', () => {
  const theme = ref<UiTheme>(readTheme())
  const sidebarCollapsed = ref(readSidebarCollapsed())

  function applyTheme(value: UiTheme) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = value
    document.documentElement.style.colorScheme = value
  }

  function setTheme(value: UiTheme) {
    theme.value = value
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function resetInterface() {
    theme.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    sidebarCollapsed.value = false
  }

  watch(theme, value => {
    applyTheme(value)
    try { window.localStorage.setItem('hrm-theme', value) } catch { /* Storage can be unavailable. */ }
  }, { immediate: true })

  watch(sidebarCollapsed, value => {
    try { window.localStorage.setItem('hrm-sidebar-collapsed', String(value)) } catch { /* Storage can be unavailable. */ }
  })

  return {
    theme,
    sidebarCollapsed,
    setTheme,
    toggleTheme,
    setSidebarCollapsed,
    toggleSidebar,
    resetInterface,
  }
})
