import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type InterfaceTheme = 'light' | 'dark'

function systemTheme(): InterfaceTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedTheme(): InterfaceTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem('hrm-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Storage can be disabled. */ }
  return systemTheme()
}

function storedCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}

export const useUiPreferencesStore = defineStore('ui-preferences', () => {
  const theme = ref<InterfaceTheme>(storedTheme())
  const sidebarCollapsed = ref(storedCollapsed())

  function applyTheme(value: InterfaceTheme) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = value
    document.documentElement.style.colorScheme = value
  }

  function setTheme(value: InterfaceTheme) {
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
    theme.value = systemTheme()
    sidebarCollapsed.value = false
  }

  watch(theme, value => {
    applyTheme(value)
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem('hrm-theme', value) }
    catch { /* Privacy settings can disable local storage. */ }
  }, { immediate: true })

  watch(sidebarCollapsed, value => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem('hrm-sidebar-collapsed', String(value)) }
    catch { /* Privacy settings can disable local storage. */ }
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
