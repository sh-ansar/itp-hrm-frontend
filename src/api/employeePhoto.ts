import { apiRequest, ApiError } from './client'
import { readXsrfCookie } from './csrf'
import { getDemoEmployeePhoto, setDemoEmployeePhoto } from '../mocks/employeePhotos'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
function path(company: string, employee: string): string {
  if (![company, employee].every(id => uuid.test(id))) throw new Error('Некорректная карточка сотрудника')
  return `/companies/${company}/employees/${employee}/photo`
}
export function validateEmployeePhoto(file: File): void {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
    throw new Error('Выберите JPG или PNG размером до 5 МБ')
  }
}
export async function readEmployeePhoto(company: string, employee: string, signal: AbortSignal): Promise<Blob> {
  const endpoint = path(company, employee)
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const photo = getDemoEmployeePhoto(employee)
    if (!photo) throw new Error('Фото не найдено')
    return photo
  }
  const response = await fetch(base + endpoint, { credentials: 'same-origin', signal, headers: { Accept: 'image/jpeg' } })
  if (!response.ok) throw new Error(response.status === 404 ? 'Фото не найдено' : 'Не удалось загрузить фото')
  if (!response.headers.get('Content-Type')?.startsWith('image/jpeg')) throw new Error('Сервер вернул некорректное фото')
  return response.blob()
}
export async function uploadEmployeePhoto(company: string, employee: string, revision: number, file: File): Promise<void> {
  validateEmployeePhoto(file)
  const endpoint = path(company, employee)
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Обновите карточку перед загрузкой')
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    // Validate revision before changing the isolated in-memory image; no PII is persisted in browser storage.
    await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ revision }) })
    setDemoEmployeePhoto(employee, file)
    return
  }
  const csrf = readXsrfCookie()
  if (!csrf) throw new ApiError('http', 419, 'Сессия истекла. Обновите страницу.')
  const body = new FormData()
  body.append('file', file)
  body.append('revision', String(revision))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch(base + endpoint, {
      method: 'POST', credentials: 'same-origin', body, signal: controller.signal,
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': csrf },
    })
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Требуется вход в систему', 403: 'Недостаточно прав', 404: 'Загрузка фото недоступна',
        409: 'Карточка уже изменена. Обновите её перед загрузкой', 419: 'Сессия истекла. Обновите страницу.',
        413: 'Фото слишком большое', 422: 'Выберите JPG/PNG до 5 МБ, не более 4096 px и 8 мегапикселей',
      }
      throw new ApiError('http', response.status, messages[response.status] ?? 'Не удалось сохранить фото')
    }
  } catch (cause) {
    if (cause instanceof ApiError) throw cause
    throw new Error(controller.signal.aborted ? 'Время загрузки истекло' : 'Не удалось связаться с сервером')
  } finally { clearTimeout(timer) }
}
export async function removeEmployeePhoto(company: string, employee: string, revision: number): Promise<void> {
  const endpoint = path(company, employee)
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Обновите карточку')
  await apiRequest(endpoint, { method: 'DELETE', body: JSON.stringify({ revision }) })
  if (import.meta.env.VITE_DEMO_MODE === 'true') setDemoEmployeePhoto(employee, null)
}
