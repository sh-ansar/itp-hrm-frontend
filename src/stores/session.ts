import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '../api/client'
import { useCompanyAccessStore } from './companyAccess'
import { currentSession, loginSession, logoutSession } from '../api/session'
import type { SessionUser } from '../api/session'

export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const checked = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      user.value = await currentSession()
    } catch (cause) {
      user.value = null
      useCompanyAccessStore().clear()
      if (!(cause instanceof ApiError && [401, 404].includes(cause.status ?? 0))) {
        error.value = cause instanceof Error ? cause.message : 'Не удалось проверить сессию'
      }
    } finally {
      checked.value = true
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      useCompanyAccessStore().clear()
      user.value = await loginSession(email, password)
      checked.value = true
    } catch (cause) {
      user.value = null
      error.value = cause instanceof Error ? cause.message : 'Не удалось выполнить вход'
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await logoutSession()
      user.value = null
      checked.value = true
      useCompanyAccessStore().clear()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Не удалось завершить сеанс'
      throw cause
    } finally {
      loading.value = false
    }
  }

  return { user, checked, loading, error, refresh, login, logout }
})
