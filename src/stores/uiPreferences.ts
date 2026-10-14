import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type UiTheme = 'light' | 'dark'
export type UiLocale = 'ru' | 'kk' | 'en'
export type UiDateFormat = 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'dd/mm/yyyy'
export type UiTimeFormat = '24h' | '12h'
export type UiNumberFormat = 'space' | 'comma'
export type UiStartScreen = '/' | '/employees' | '/organization' | '/staffing'

function readStorage<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(key) as T | null
    return saved !== null && allowed.includes(saved) ? saved : fallback
  } catch { return fallback }
}

function readTheme(): UiTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = readStorage<UiTheme>('hrm-theme', ['light', 'dark'], 'light')
  try {
    if (window.localStorage.getItem('hrm-theme')) return stored
  } catch { /* Storage can be unavailable. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem('hrm-sidebar-collapsed') === 'true' }
  catch { return false }
}

function readTimeZone(): string {
  if (typeof window === 'undefined') return 'Asia/Almaty'
  try {
    return window.localStorage.getItem('hrm-time-zone')
      || Intl.DateTimeFormat().resolvedOptions().timeZone
      || 'Asia/Almaty'
  } catch { return 'Asia/Almaty' }
}

export const useUiPreferencesStore = defineStore('ui-preferences', () => {
  const theme = ref<UiTheme>(readTheme())
  const sidebarCollapsed = ref(readSidebarCollapsed())
  const locale = ref<UiLocale>(readStorage<UiLocale>('hrm-locale', ['ru', 'kk', 'en'], 'ru'))
  const timeZone = ref(readTimeZone())
  const dateFormat = ref<UiDateFormat>(
    readStorage<UiDateFormat>('hrm-date-format', ['dd.mm.yyyy', 'yyyy-mm-dd', 'dd/mm/yyyy'], 'dd.mm.yyyy'),
  )
  const timeFormat = ref<UiTimeFormat>(readStorage<UiTimeFormat>('hrm-time-format', ['24h', '12h'], '24h'))
  const numberFormat = ref<UiNumberFormat>(readStorage<UiNumberFormat>('hrm-number-format', ['space', 'comma'], 'space'))
  const startScreen = ref<UiStartScreen>(
    readStorage<UiStartScreen>('hrm-start-screen', ['/', '/employees', '/organization', '/staffing'], '/'),
  )

  function applyTheme(value: UiTheme) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.theme = value
    document.documentElement.style.colorScheme = value
  }

  function applyLocale(value: UiLocale) {
    if (typeof document === 'undefined') return
    document.documentElement.lang = value
  }

  function setTheme(value: UiTheme) { theme.value = value }
  function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
  function setSidebarCollapsed(value: boolean) { sidebarCollapsed.value = value }
  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setLocale(value: UiLocale) { locale.value = value }
  function setTimeZone(value: string) { timeZone.value = value || 'Asia/Almaty' }
  function setDateFormat(value: UiDateFormat) { dateFormat.value = value }
  function setTimeFormat(value: UiTimeFormat) { timeFormat.value = value }
  function setNumberFormat(value: UiNumberFormat) { numberFormat.value = value }
  function setStartScreen(value: UiStartScreen) { startScreen.value = value }

  function resetInterface() {
    theme.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    sidebarCollapsed.value = false
    locale.value = 'ru'
    timeZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Almaty'
    dateFormat.value = 'dd.mm.yyyy'
    timeFormat.value = '24h'
    numberFormat.value = 'space'
    startScreen.value = '/'
  }

  watch(theme, value => {
    applyTheme(value)
    try { window.localStorage.setItem('hrm-theme', value) } catch { /* Storage can be unavailable. */ }
  }, { immediate: true })

  watch(sidebarCollapsed, value => {
    try { window.localStorage.setItem('hrm-sidebar-collapsed', String(value)) } catch { /* Storage can be unavailable. */ }
  })

  watch(locale, value => {
    applyLocale(value)
    try { window.localStorage.setItem('hrm-locale', value) } catch { /* Storage can be unavailable. */ }
  }, { immediate: true })

  watch(timeZone, value => {
    try { window.localStorage.setItem('hrm-time-zone', value) } catch { /* Storage can be unavailable. */ }
  })
  watch(dateFormat, value => {
    try { window.localStorage.setItem('hrm-date-format', value) } catch { /* Storage can be unavailable. */ }
  })
  watch(timeFormat, value => {
    try { window.localStorage.setItem('hrm-time-format', value) } catch { /* Storage can be unavailable. */ }
  })
  watch(numberFormat, value => {
    try { window.localStorage.setItem('hrm-number-format', value) } catch { /* Storage can be unavailable. */ }
  })
  watch(startScreen, value => {
    try { window.localStorage.setItem('hrm-start-screen', value) } catch { /* Storage can be unavailable. */ }
  })

  return {
    theme,
    sidebarCollapsed,
    locale,
    timeZone,
    dateFormat,
    timeFormat,
    numberFormat,
    startScreen,
    setTheme,
    toggleTheme,
    setSidebarCollapsed,
    toggleSidebar,
    setLocale,
    setTimeZone,
    setDateFormat,
    setTimeFormat,
    setNumberFormat,
    setStartScreen,
    resetInterface,
  }
})
