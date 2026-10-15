import { watch, type Ref } from 'vue'
import { useCompanyAccessStore } from '../stores/companyAccess'

/**
 * Synchronize a module's company selector with the authenticated access
 * context. IDs are never trusted as permissions: Laravel checks every query.
 * Demo remains independent of connected company memberships.
 */
export function useActiveCompanySelection(selection: Ref<string>) {
  const access = useCompanyAccessStore()
  const connected = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'
    && import.meta.env.VITE_DEMO_MODE !== 'true'

  watch(selection, (companyId) => {
    if (connected && companyId && companyId !== access.activeCompanyId) {
      access.chooseCompany(companyId)
    }
  })

  function preferCompany<T extends { id: string }>(available: T[]): string {
    const current = access.activeCompanyId
    if (connected && available.some(item => item.id === current)) return current
    return available[0]?.id ?? ''
  }

  return { preferCompany }
}
