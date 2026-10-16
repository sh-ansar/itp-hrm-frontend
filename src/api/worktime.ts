import { apiRequest } from './client'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function assertCompany(companyId: string) {
  if (!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
}
function assertMonth(month: string) {
  if (!monthPattern.test(month)) throw new Error('Некорректный период')
}
function assertDate(value: string) {
  if (!datePattern.test(value)) throw new Error('Некорректная дата')
}

export type WorktimeStatus = 'missing' | 'complete' | 'attention'

export interface WorktimeTimesheetRow extends Record<string, unknown> {
  employee_id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
  department_name: string | null
  position_name: string | null
  schedule_name: string | null
  days_recorded: number
  planned_minutes: number | null
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
  status: WorktimeStatus
}

export interface WorktimeTimesheetResponse {
  data: WorktimeTimesheetRow[]
  meta: {
    month: string
    summary: {
      employees_with_entries: number
      planned_minutes: number | null
      worked_minutes: number | null
      absence_minutes: number | null
      overtime_minutes: number | null
    }
    worktime_writes_enabled: boolean
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface WorkScheduleRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  schedule_type: string
  work_time_label: string | null
  weekly_minutes: number | null
  revision: number
  employees: number
}

export interface WorkScheduleResponse {
  data: WorkScheduleRow[]
  meta: {
    as_of: string
    total: number
    worktime_writes_enabled: boolean
    can_manage_schedules?: boolean
  }
}

export interface ProductionCalendarDay extends Record<string, unknown> {
  id: string
  date: string
  day_type: ProductionCalendarDayType
  planned_minutes: number | null
  label: string | null
  revision: number
}

export interface ProductionCalendarResponse {
  data: ProductionCalendarDay[]
  meta: {
    month: string
    recorded_days: number
    expected_days: number
    calendar_complete: boolean
    worktime_writes_enabled: boolean
    can_edit_calendar?: boolean
  }
}

export interface WorktimeAbsenceRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_number: string
  last_name: string
  first_name: string
  middle_name: string | null
  department_name: string | null
  absence_type: string
  reason: string
  started_on: string
  ended_on: string
  days: number
  absence_minutes: number | null
  status: string
  revision: number
}

export interface WorktimeAbsenceResponse {
  data: WorktimeAbsenceRow[]
  meta: {
    month: string
    worktime_writes_enabled: boolean
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export function getWorktimeTimesheet(
  companyId: string,
  month: string,
  page = 1,
): Promise<WorktimeTimesheetResponse> {
  assertCompany(companyId)
  assertMonth(month)
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const params = new URLSearchParams({ month, page: String(page), per_page: '100' })
  return apiRequest<WorktimeTimesheetResponse>(`/companies/${companyId}/worktime/timesheet?${params.toString()}`)
}

export function getWorkSchedules(
  companyId: string,
  asOf: string,
): Promise<WorkScheduleResponse> {
  assertCompany(companyId)
  assertDate(asOf)
  const params = new URLSearchParams({ as_of: asOf })
  return apiRequest<WorkScheduleResponse>(`/companies/${companyId}/worktime/schedules?${params.toString()}`)
}

export function getProductionCalendar(
  companyId: string,
  month: string,
): Promise<ProductionCalendarResponse> {
  assertCompany(companyId)
  assertMonth(month)
  const params = new URLSearchParams({ month })
  return apiRequest<ProductionCalendarResponse>(`/companies/${companyId}/worktime/calendar?${params.toString()}`)
}

export function getWorktimeAbsences(
  companyId: string,
  month: string,
  page = 1,
): Promise<WorktimeAbsenceResponse> {
  assertCompany(companyId)
  assertMonth(month)
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('Некорректная страница')
  const params = new URLSearchParams({ month, page: String(page), per_page: '100' })
  return apiRequest<WorktimeAbsenceResponse>(`/companies/${companyId}/worktime/absences?${params.toString()}`)
}


/** Mutation payload matches Laravel UpsertCalendarDaysRequest. No implicit overwrite. */
export type ProductionCalendarDayType = 'workday' | 'weekend' | 'holiday' | 'shortened'
export interface CalendarDayChange {
  date: string
  day_type: ProductionCalendarDayType
  planned_minutes: number | null
  label: string | null
  /** null = unrecorded day; integer = expected current revision. */
  revision: number | null
}
export interface CalendarWriteResponse {
  data: ProductionCalendarDay[]
  meta: { month: string; created_count: number; updated_count: number }
}

export function putProductionCalendar(
  companyId: string,
  month: string,
  days: CalendarDayChange[],
): Promise<CalendarWriteResponse> {
  assertCompany(companyId)
  assertMonth(month)
  if (!days.length || days.length > 31) throw new Error('Expected 1–31 calendar dates')
  if (new Set(days.map(day => day.date)).size !== days.length) {
    throw new Error('Duplicate calendar dates')
  }
  for (const day of days) {
    assertDate(day.date)
    if (!day.date.startsWith(month + '-')) throw new Error('Date is outside the selected month')
  }
  return apiRequest<CalendarWriteResponse>('/companies/' + companyId + '/worktime/calendar', {
    method: 'PUT',
    body: JSON.stringify({ month, days }),
  })
}


export interface WorktimeDayEntry {
  date: string
  day_type: ProductionCalendarDayType
  label: string | null
  planned_minutes: number
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
  revision: number | null
}

export interface WorktimeDayEntryResponse {
  data: WorktimeDayEntry[]
  meta: {
    month: string
    can_edit: boolean
  }
}

export interface WorktimeDayChange {
  date: string
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
  revision: number | null
}

export function getEmployeeTimesheet(
  companyId: string,
  employeeId: string,
  month: string,
): Promise<WorktimeDayEntryResponse> {
  assertCompany(companyId)
  if (!uuid.test(employeeId)) throw new Error('Некорректный идентификатор сотрудника')
  assertMonth(month)
  const params = new URLSearchParams({ month })
  return apiRequest<WorktimeDayEntryResponse>(
    `/companies/${companyId}/worktime/timesheet/${employeeId}?${params.toString()}`,
  )
}

export function putEmployeeTimesheet(
  companyId: string,
  employeeId: string,
  month: string,
  days: WorktimeDayChange[],
): Promise<{ data: WorktimeDayEntry[]; meta: { month: string; created_count: number; updated_count: number } }> {
  assertCompany(companyId)
  if (!uuid.test(employeeId)) throw new Error('Некорректный идентификатор сотрудника')
  assertMonth(month)
  if (!days.length || days.length > 31) throw new Error('Ожидается от 1 до 31 дней табеля')
  return apiRequest(`/companies/${companyId}/worktime/timesheet/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify({ month, days }),
  })
}


export interface WorkSchedulePayload {
  code: string
  name: string
  schedule_type: 'standard' | 'shift' | 'individual' | 'summarized'
  work_time_label: string | null
  weekly_minutes: number | null
}

export function createWorkSchedule(
  companyId: string,
  payload: WorkSchedulePayload,
): Promise<{ data: WorkScheduleRow }> {
  assertCompany(companyId)
  return apiRequest<{ data: WorkScheduleRow }>(`/companies/${companyId}/worktime/schedules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateWorkSchedule(
  companyId: string,
  scheduleId: string,
  payload: WorkSchedulePayload & { revision: number },
): Promise<{ data: WorkScheduleRow }> {
  assertCompany(companyId)
  if (!uuid.test(scheduleId)) throw new Error('Некорректный идентификатор графика')
  return apiRequest<{ data: WorkScheduleRow }>(`/companies/${companyId}/worktime/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function assignWorkSchedule(
  companyId: string,
  scheduleId: string,
  employeeId: string,
  validFrom: string,
): Promise<{ data: {
  id: string
  employee_id: string
  valid_from: string
  valid_to: string | null
  revision: number
  schedule_id: string
  schedule_code: string
  schedule_name: string
} }> {
  assertCompany(companyId)
  if (!uuid.test(scheduleId)) throw new Error('Некорректный идентификатор графика')
  if (!uuid.test(employeeId)) throw new Error('Некорректный идентификатор сотрудника')
  assertDate(validFrom)
  return apiRequest(`/companies/${companyId}/worktime/schedules/${scheduleId}/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify({ valid_from: validFrom }),
  })
}
