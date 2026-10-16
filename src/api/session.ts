import { ApiError, requestJson } from './client'
import { readXsrfCookie } from './csrf'

export interface SessionUser {
  id: number
  name: string
}

export interface SessionResponse {
  data: SessionUser
}

// Shared platform.itpmining.kz hosts other apps. Their /auth and /api belong to them,
// so HRM calls are mounted under a dedicated /hrm-api path without cross-origin requests.
const backendPrefix = import.meta.env.VITE_BACKEND_PREFIX || ''
if (backendPrefix && !/^\/[a-z0-9-]+$/.test(backendPrefix)) {
  throw new Error('VITE_BACKEND_PREFIX must contain one same-origin path segment')
}
const sessionPath = (path: string): string => backendPrefix + path

const SESSION_CHECK_TIMEOUT_MS = 60_000

export async function currentSession(): Promise<SessionUser> {
  // A local Windows PHP development server processes requests serially.
  // After a hard reload, /auth/me can sit behind in-flight dashboard requests,
  // so it needs a wider timeout than ordinary data reads. A timeout must not
  // be mistaken for an invalid browser session.
  const result = await requestJson<SessionResponse>(sessionPath('/auth/me'), {
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })
  return result.data
}

export async function loginSession(email: string, password: string): Promise<SessionUser> {
  // Sanctum issues the XSRF-TOKEN cookie; do not persist tokens to storage.
  await requestJson<void>(sessionPath('/sanctum/csrf-cookie'))

  if (!readXsrfCookie()) {
    throw new ApiError('invalid-response', 419, 'Сервер не выдал CSRF-токен')
  }

  const result = await requestJson<SessionResponse>(sessionPath('/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })

  return result.data
}

/** Authenticated, CSRF-protected password rotation. Never persist credentials in browser storage. */
export async function changePasswordSession(currentPassword: string, newPassword: string, confirmation: string): Promise<void> {
  await requestJson<void>(sessionPath('/auth/password'), {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: confirmation,
    }),
  })
}

export async function logoutSession(): Promise<void> {
  await requestJson<void>(sessionPath('/auth/logout'), {
    method: 'POST',
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })
}
