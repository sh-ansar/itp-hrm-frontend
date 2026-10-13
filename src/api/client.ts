import { readXsrfCookie, requiresCsrf } from './csrf'
import { mockApiRequest } from '../mocks/mockApi'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response'

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status: number | null,
    message: string,
    public readonly code: string | null = null,
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
if (!baseUrl.startsWith('/') || baseUrl.startsWith('//')) {
  throw new Error('VITE_API_BASE_URL must be a same-origin relative path (e.g. /api/v1)')
}
const DEFAULT_TIMEOUT_MS = 15_000

/** Only accept relative same-origin paths; never forward CSRF tokens to an external URL. */
export async function requestJson<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Requests must use relative first-party paths')
  }
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...request } = options
  const method = (request.method || 'GET').toUpperCase()
  const csrf = requiresCsrf(method) ? readXsrfCookie() : null

  if (requiresCsrf(method) && !csrf) {
    throw new ApiError('invalid-response', 419, 'Не получен CSRF-токен. Обновите страницу и повторите.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch(path, {
        ...request,
        credentials: 'same-origin',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(request.body ? { 'Content-Type': 'application/json' } : {}),
          ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
          ...request.headers,
        },
      })
    } catch {
      if (controller.signal.aborted) {
        throw new ApiError('timeout', null, 'Превышено время ожидания сервера')
      }
      throw new ApiError('network', null, 'Не удалось связаться с сервером')
    }

    if (!response.ok) {
      const message = response.status === 401 ? 'Требуется вход в систему'
        : response.status === 403 ? 'Недостаточно прав доступа'
        : response.status === 404 ? 'Запрошенная функция пока недоступна'
        : response.status === 409 ? 'Запись уже изменена. Обновите карточку перед сохранением'
        : response.status === 419 ? 'Сессия истекла или CSRF-токен устарел'
        : response.status === 422 ? 'Проверьте данные для входа'
        : response.status === 429 ? 'Слишком много попыток. Повторите позже'
        : response.status >= 500 ? 'Ошибка сервера. Повторите позже'
        : 'Не удалось выполнить запрос'

      // Metadata is optional: old backends and /auth endpoints keep working.
      // Never display untrusted server text or identifiers as user messages.
      let code: string | null = null
      try {
        const payload: unknown = await response.clone().json()
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const candidate = (payload as Record<string, unknown>).code
          if (typeof candidate === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(candidate)) {
            code = candidate
          }
        }
      } catch {
        // A malformed error payload must not replace the original HTTP error.
      }

      const requestIdHeader = response.headers.get('X-Request-ID')
      const requestId = requestIdHeader && /^[a-f0-9-]{36}$/i.test(requestIdHeader)
        ? requestIdHeader : null
      throw new ApiError('http', response.status, message, code, requestId)
    }

    if (response.status === 204) return undefined as T

    try {
      return await response.json() as T
    } catch {
      throw new ApiError('invalid-response', response.status, 'Сервер вернул некорректный ответ')
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function apiRequest<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API path must begin with one slash')
  }
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return mockApiRequest<T>(path, options)
  }
  return requestJson<T>(`${baseUrl}${path}`, options)
}

export interface HealthResponse {
  status: 'ok'
  service: 'itp-hrm-api'
}

export const getApiHealth = () => apiRequest<HealthResponse>('/health')
