import { apiRequest, ApiError } from './client'
import { readXsrfCookie } from './csrf'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
if (!base.startsWith('/') || base.startsWith('//')) {
  throw new Error('API base path must be same-origin')
}
export type DocumentType = 'order' | 'contract' | 'basis' | 'other'
export const documentTypes: { id: DocumentType; name: string }[] = [
  { id: 'order', name: 'Приказ' },
  { id: 'contract', name: 'Трудовой договор' },
  { id: 'basis', name: 'Основание' },
  { id: 'other', name: 'Прочий документ' },
]
export function documentTypeLabel(type: DocumentType): string {
  return documentTypes.find(item => item.id === type)?.name ?? 'Документ'
}

export interface DocumentRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_action_id: string | null
  document_type: DocumentType
  document_number: string | null
  title: string
  issued_on: string | null
  status: string
  revision: number
  created_at: string
  personnel_number: string
  first_name: string
  last_name: string
  has_file: boolean
}
export interface DocumentListResponse {
  data: DocumentRow[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    document_writes_enabled: boolean
  }
}
export interface DocumentDraft {
  employee_id: string
  document_type: DocumentType
  document_number: string | null
  title: string
  issued_on: string | null
}
export interface DocumentCreated {
  data: { id: string; employee_id: string; document_type: DocumentType; status: 'draft'; revision: number }
}

function validateId(value: string) {
  if (!uuid.test(value)) throw new Error('Некорректный идентификатор')
}

export function listDocuments(
  companyId: string,
  page = 1,
  documentType: DocumentType | '' = '',
  employeeId = '',
): Promise<DocumentListResponse> {
  validateId(companyId)
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  if (employeeId) validateId(employeeId)
  if (documentType && !documentTypes.some(type => type.id === documentType)) throw new Error('Некорректный тип документа')
  const params = new URLSearchParams({ page: String(page), per_page: '25' })
  if (documentType) params.set('document_type', documentType)
  if (employeeId) params.set('employee_id', employeeId)
  return apiRequest<DocumentListResponse>(`/companies/${companyId}/documents?${params.toString()}`)
}

export function createDocumentDraft(companyId: string, data: DocumentDraft): Promise<DocumentCreated> {
  validateId(companyId)
  validateId(data.employee_id)
  if (!documentTypes.some(type => type.id === data.document_type)) throw new Error('Выберите тип документа')
  if (!data.title.trim()) throw new Error('Укажите название документа')
  return apiRequest<DocumentCreated>(`/companies/${companyId}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function documentFileUrl(companyId: string, documentId: string): string {
  validateId(companyId)
  validateId(documentId)
  if (import.meta.env.VITE_DEMO_MODE === 'true') return '#demo-document'
  // Same-origin authenticated download; never expose physical storage paths.
  return `${base}/companies/${companyId}/documents/${documentId}/file`
}

export async function uploadDocumentPdf(
  companyId: string,
  documentId: string,
  revision: number,
  file: File,
): Promise<{ data: { id: string; has_file: true; revision: number } }> {
  validateId(companyId)
  validateId(documentId)
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Обновите документ перед прикреплением файла')
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    await new Promise(resolve => setTimeout(resolve, 120))
    return { data: { id: documentId, has_file: true, revision: revision + 1 } }
  }
  if (file.size < 1 || file.size > 5 * 1024 * 1024 || file.type !== 'application/pdf') {
    throw new Error('Выберите PDF-файл размером до 5 МБ')
  }
  const csrf = readXsrfCookie()
  if (!csrf) throw new ApiError('invalid-response', 419, 'Сессия истекла. Обновите страницу.')
  const body = new FormData()
  body.append('file', file, file.name)
  body.append('revision', String(revision))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    let response: Response
    try {
      response = await fetch(documentFileUrl(companyId, documentId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-XSRF-TOKEN': csrf },
        body,
        signal: controller.signal,
      })
    } catch {
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', null,
        controller.signal.aborted ? 'Время загрузки PDF истекло' : 'Не удалось загрузить PDF')
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Требуется вход в систему',
        403: 'Нет прав на загрузку документа',
        404: 'Документ или функция загрузки недоступны',
        409: 'Документ уже изменён или к нему прикреплён файл. Обновите реестр.',
        413: 'PDF слишком большой',
        419: 'Сессия истекла. Обновите страницу.',
        422: 'Файл отклонён. Допускается PDF до 5 МБ.',
      }
      throw new ApiError('http', response.status, messages[response.status] ?? 'Не удалось прикрепить PDF')
    }
    try {
      return await response.json() as { data: { id: string; has_file: true; revision: number } }
    } catch {
      throw new ApiError('invalid-response', response.status, 'Сервер вернул некорректный ответ')
    }
  } finally {
    clearTimeout(timer)
  }
}
