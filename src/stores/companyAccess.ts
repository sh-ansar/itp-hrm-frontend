import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentAccess, type CapabilityKey, type CompanyAccess } from '../api/access'

/** Pinia cache is per browser session, not persisted to localStorage. */
const selectedCompanyKey = 'hrm-selected-company'
function readSelectedCompany(): string {
  try { return window.sessionStorage.getItem(selectedCompanyKey) || '' }
  catch { return '' }
}
function saveSelectedCompany(id: string) {
  try {
    if (id) window.sessionStorage.setItem(selectedCompanyKey, id)
    else window.sessionStorage.removeItem(selectedCompanyKey)
  } catch { /* Private browsing can restrict storage. */ }
}
export const useCompanyAccessStore = defineStore('companyAccess', () => {
  const companies = ref<CompanyAccess[]>([])
  const activeCompanyId = ref('')
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')
  let lastLoadedAt = 0
  let pending: Promise<void> | null = null

  const active = computed<CompanyAccess | null>(() =>
    companies.value.find(company => company.company_id === activeCompanyId.value) ?? null)
  const can = (key: CapabilityKey): boolean => active.value?.capabilities[key] === true

  async function refresh(force = false): Promise<void> {
    // Brief cache is strictly for UI; the Laravel API still denies stale grants.
    if (!force && loaded.value && Date.now() - lastLoadedAt < 15_000) return
    if (pending) return pending
    loading.value = true
    error.value = ''
    pending = (async () => {
      try {
        const response = await getCurrentAccess()
        if (response.meta.schema_version !== 1 || response.meta.source !== 'server') {
          throw new Error('Unsupported access contract')
        }
        companies.value = response.data.companies
        if (!companies.value.some(company => company.company_id === activeCompanyId.value)) {
          const remembered = readSelectedCompany()
          activeCompanyId.value = companies.value.some(item => item.company_id === remembered)
            ? remembered : (companies.value[0]?.company_id ?? '')
        }
        saveSelectedCompany(activeCompanyId.value)
        loaded.value = true
        lastLoadedAt = Date.now()
      } catch {
        // Fail closed: no cached right survives a failed authorization refresh.
        companies.value = []
        activeCompanyId.value = ''
        loaded.value = false
        error.value = 'Не удалось проверить права доступа'
      } finally {
        loading.value = false
        pending = null
      }
    })()
    return pending
  }
  function chooseCompany(companyId: string): boolean {
    if (!companies.value.some(item => item.company_id === companyId)) return false
    activeCompanyId.value = companyId
    saveSelectedCompany(companyId)
    return true
  }
  function clear() {
    companies.value = []
    activeCompanyId.value = ''
    saveSelectedCompany('')
    loaded.value = false
    lastLoadedAt = 0
    error.value = ''
  }
  return { companies, activeCompanyId, active, loaded, loading, error, can, refresh, chooseCompany, clear }
})
