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

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '')
const DEFAULT_TIMEOUT_MS = 15_000

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API path must begin with a single slash')
  }
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...request } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...request,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(request.body ? { 'Content-Type': 'application/json' } : {}),
          ...request.headers,
        },
      })
    } catch (error) {
      if (controller.signal.aborted) throw new ApiError('timeout', null, 'Превышено время ожидания сервера')
      throw new ApiError('network', null, 'Не удалось связаться с сервером')
    }

    if (!response.ok) {
      const message = response.status === 401 ? 'Требуется вход в систему'
        : response.status === 403 ? 'Недостаточно прав доступа'
        : response.status === 404 ? 'Запрошенные данные не найдены'
        : response.status === 422 ? 'Проверьте введённые данные'
        : response.status >= 500 ? 'Ошибка сервера. Попробуйте повторить позже'
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

export interface HealthResponse {
  status: 'ok'
  service: 'itp-hrm-api'
}

export const getApiHealth = () => apiRequest<HealthResponse>('/health')
