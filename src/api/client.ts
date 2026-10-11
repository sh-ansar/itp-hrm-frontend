import { readXsrfCookie, requiresCsrf } from './csrf'

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response'

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status: number | null,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const requestedBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
const baseUrl = requestedBaseUrl.startsWith('/') && !requestedBaseUrl.startsWith('//')
  ? requestedBaseUrl
  : '/api/v1'
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
        : response.status === 419 ? 'Сессия истекла или CSRF-токен устарел'
        : response.status === 422 ? 'Проверьте данные для входа'
        : response.status === 429 ? 'Слишком много попыток. Повторите позже'
        : response.status >= 500 ? 'Ошибка сервера. Повторите позже'
        : 'Не удалось выполнить запрос'

      throw new ApiError('http', response.status, message)
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
  return requestJson<T>(`${baseUrl}${path}`, options)
}

export interface HealthResponse {
  status: 'ok'
  service: 'itp-hrm-api'
}

export const getApiHealth = () => apiRequest<HealthResponse>('/health')
