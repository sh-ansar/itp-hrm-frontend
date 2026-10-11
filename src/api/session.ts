import { ApiError, requestJson } from './client'
import { readXsrfCookie } from './csrf'

export interface SessionUser {
  id: number
  name: string
}

export interface SessionResponse {
  data: SessionUser
}

export async function currentSession(): Promise<SessionUser> {
  const result = await requestJson<SessionResponse>('/auth/me')
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
  })

  return result.data
}

export async function logoutSession(): Promise<void> {
  await requestJson<void>('/auth/logout', { method: 'POST' })
}
