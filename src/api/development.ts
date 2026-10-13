import { apiRequest } from './client'

export type DevelopmentSection = 'training' | 'reserve'
export type TrainingStatus = 'all' | 'planned' | 'ongoing' | 'completed'
export type ReserveStatus = 'all' | 'active' | 'alumni'
export type DevelopmentStatus = TrainingStatus | ReserveStatus

export interface DevelopmentPerson {
  id: string
  employee_id: string
  revision: number
  personnel_number: string
  first_name: string
  last_name: string
  middle_name: string | null
  development_status: string
}

export interface TrainingRow extends DevelopmentPerson, Record<string, unknown> {
  training_type: string
  training_mode: 'in_person' | 'remote' | 'on_the_job'
  topic: string
  provider: string | null
  city: string | null
  started_on: string
  ended_on: string | null
  document_reference: string | null
}

export interface ReserveRow extends DevelopmentPerson, Record<string, unknown> {
  target_position: string
  reserve_level: string
  reserve_type: string
  joined_year: number
  left_year: number | null
}

export type DevelopmentRow = TrainingRow | ReserveRow

export interface DevelopmentMeta {
  section: DevelopmentSection
  status_filter: string
  summary: Record<string, number>
  current_page: number
  last_page: number
  per_page: number
  total: number
  profile_writes_enabled: boolean
}

export interface DevelopmentResponse<T extends DevelopmentRow> {
  data: T[]
  meta: DevelopmentMeta
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

export function getCompanyDevelopment<T extends DevelopmentRow>(
  companyId: string,
  section: DevelopmentSection,
  filters: { page?: number; search?: string; status?: DevelopmentStatus } = {},
): Promise<DevelopmentResponse<T>> {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  if (!['training', 'reserve'].includes(section)) throw new Error('Неизвестный раздел развития')
  const page = filters.page ?? 1
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const allowed = section === 'training'
    ? ['all', 'planned', 'ongoing', 'completed']
    : ['all', 'active', 'alumni']
  const status = filters.status ?? 'all'
  if (!allowed.includes(status)) throw new Error('Некорректный фильтр состояния')

  const params = new URLSearchParams({ page: String(page), per_page: '25' })
  const query = filters.search?.trim() ?? ''
  if (query) params.set('search', query.slice(0, 100))
  if (status !== 'all') params.set('status', status)
  return apiRequest<DevelopmentResponse<T>>(`/companies/${companyId}/development/${section}?${params.toString()}`)
}

export function trainingModeName(value: string): string {
  return ({
    in_person: 'Очное',
    remote: 'Дистанционное',
    on_the_job: 'На рабочем месте',
  } as Record<string, string>)[value] ?? value
}

export function developmentStatusName(section: DevelopmentSection, status: string): string {
  const training = { planned: 'Запланировано', ongoing: 'В процессе', completed: 'Завершено' }
  const reserve = { active: 'В резерве', alumni: 'Выбыл' }
  return (section === 'training' ? training : reserve as Record<string, string>)[status as keyof typeof training] ?? status
}
