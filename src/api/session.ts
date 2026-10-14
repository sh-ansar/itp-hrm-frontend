import { ApiError, requestJson } from './client'
import { readXsrfCookie } from './csrf'

export interface SessionUser {
  id: number
  name: string
}

export interface SessionResponse {
  data: SessionUser
}

const SESSION_CHECK_TIMEOUT_MS = 60_000

export async function currentSession(): Promise<SessionUser> {
  // A local Windows PHP development server processes requests serially.
  // After a hard reload, /auth/me can sit behind in-flight dashboard requests,
  // so it needs a wider timeout than ordinary data reads. A timeout must not
  // be mistaken for an invalid browser session.
  const result = await requestJson<SessionResponse>('/auth/me', {
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })
  return result.data
}

export async function loginSession(email: string, password: string): Promise<SessionUser> {
  // Sanctum issues the XSRF-TOKEN cookie; do not persist tokens to storage.
  await requestJson<void>('/sanctum/csrf-cookie')

  if (!readXsrfCookie()) {
    throw new ApiError('invalid-response', 419, 'Сервер не выдал CSRF-токен')
  }

  const result = await requestJson<SessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })

  return result.data
}

export async function logoutSession(): Promise<void> {
  await requestJson<void>('/auth/logout', {
    method: 'POST',
    timeoutMs: SESSION_CHECK_TIMEOUT_MS,
  })
}
