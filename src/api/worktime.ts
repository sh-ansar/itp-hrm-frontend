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

/** Read-only monthly projection of a single employee's recorded timesheet.
 * Independently authorized by EmployeeVisibility on the backend. */
export interface EmployeeWorktimeMonthDay extends Record<string, unknown> {
  date: string
  planned_minutes: number | null
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
}
export interface EmployeeWorktimeMonthResponse {
  data: {
    employee_id: string
    month: string
    summary: {
      days_recorded: number
      present_days: number | null
      planned_minutes: number | null
      worked_minutes: number | null
      absence_minutes: number | null
      overtime_minutes: number | null
      lateness_minutes: null
    }
    days: EmployeeWorktimeMonthDay[]
  }
  meta: {
    source: 'worktime_entries'
    read_only: true
    recorded_days: number
    calendar_days: number
  }
}
export function getEmployeeWorktimeMonth(
  companyId: string, employeeId: string, month: string,
): Promise<EmployeeWorktimeMonthResponse> {
  assertCompany(companyId)
  if (!uuid.test(employeeId)) throw new Error('Некорректный идентификатор сотрудника')
  assertMonth(month)
  const params = new URLSearchParams({ month })
  return apiRequest<EmployeeWorktimeMonthResponse>(
    `/companies/${companyId}/worktime/employees/${employeeId}/monthly-summary?${params.toString()}`,
  )
}

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
    worktime_bulk_fill_enabled?: boolean
    worktime_matrix_enabled?: boolean
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
    can_plan_schedules?: boolean
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


export interface BulkTimesheetFillRequest {
  month: string
  employee_ids: string[]
  dates: string[]
  apply: boolean
  confirm?: boolean
  /** Preview snapshot from the immediately preceding read-only validation. */
  preview_token?: string
}

export interface BulkTimesheetFillResponse {
  data: {
    candidate_count: number
    already_recorded: number
    outside_employment: number
    approved_leave: number
    recorded_absence: number
    nonworking_date: number
    /** Nonstandard or overlapping schedules without verified daily shift attendance. */
    unknown_shift_schedule?: number
    future_date?: number
  }
  meta: {
    month: string
    employee_count: number
    date_count: number
    mode: 'preview' | 'applied'
    created_count: number
    period_locked: boolean
    preview_token?: string
  }
}

export function fillMissingTimesheetBulk(companyId: string, payload: BulkTimesheetFillRequest): Promise<BulkTimesheetFillResponse> {
  assertCompany(companyId)
  assertMonth(payload.month)
  if (payload.employee_ids.length < 1 || payload.employee_ids.length > 100
    || payload.dates.length < 1 || payload.dates.length > 31) throw new Error('Invalid bulk selection size')
  if (payload.employee_ids.some(id => !uuid.test(id))) throw new Error('Invalid employee ID')
  if (payload.apply && (!payload.confirm || !/^[a-f0-9]{64}$/.test(payload.preview_token ?? ''))) {
    throw new Error('A matching preview is required before applying attendance')
  }
  return apiRequest<BulkTimesheetFillResponse>(`/companies/${companyId}/worktime/timesheet/bulk-fill`, {
    method: 'POST',
    body: JSON.stringify(payload),
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

/** Authoritative month-wide approval state; 404 when the separate release gate is disabled. */
export type WorktimePeriodStatus = 'draft' | 'submitted' | 'approved'
export interface WorktimePeriod {
  company_id: string
  month: string
  status: WorktimePeriodStatus
  revision: number
  submitted_at?: string | null
  approved_at?: string | null
  reopen_reason?: string | null
}
export interface WorktimePeriodResponse {
  data: WorktimePeriod
  meta: {
    can_submit: boolean
    can_approve: boolean
    can_reopen: boolean
  }
}
export function getWorktimePeriod(companyId: string, month: string): Promise<WorktimePeriodResponse> {
  assertCompany(companyId)
  assertMonth(month)
  return apiRequest<WorktimePeriodResponse>(
    `/companies/${companyId}/worktime/periods?month=${encodeURIComponent(month)}`,
  )
}
export function transitionWorktimePeriod(
  companyId: string, month: string, revision: number,
  action: 'submit' | 'approve' | 'reopen', reason?: string,
): Promise<{ data: WorktimePeriod }> {
  assertCompany(companyId)
  assertMonth(month)
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Некорректная версия периода')
  if (action === 'reopen' && (!reason || reason.trim().length < 5)) {
    throw new Error('Укажите причину повторного открытия (минимум 5 символов)')
  }
  return apiRequest<{ data: WorktimePeriod }>(`/companies/${companyId}/worktime/periods/transition`, {
    method: 'POST',
    body: JSON.stringify({ month, revision, action, reason: reason?.trim() ?? null }),
  })
}

/** Year-long, version-pinned planning (not actual attendance). */
export interface WorkScheduleTemplate {
  id: string
  code: string
  name: string
  schedule_type: string
  revision: number
}
export interface WorkScheduleCycleDay {
  minutes: number
  shift_code: string | null
}
export interface WorkSchedulePattern {
  id: string
  schedule_id: string
  version: number
  calendar_policy: 'company' | 'cycle'
  days: WorkScheduleCycleDay[]
}
export interface WorkScheduleTemplateList {
  data: WorkScheduleTemplate[]
  meta: { can_edit_patterns: boolean }
}
export function listWorkScheduleTemplates(companyId: string): Promise<WorkScheduleTemplateList> {
  assertCompany(companyId)
  return apiRequest(`/companies/${companyId}/worktime/schedule-templates`)
}
export function getWorkSchedulePattern(companyId: string, scheduleId: string): Promise<{
  data: WorkSchedulePattern | null
  meta: { schedule_revision: number; can_edit: boolean }
}> {
  assertCompany(companyId)
  if (!uuid.test(scheduleId)) throw new Error('Некорректный график')
  return apiRequest(`/companies/${companyId}/worktime/schedules/${scheduleId}/pattern`)
}
export function saveWorkSchedulePattern(
  companyId: string, scheduleId: string, revision: number,
  calendarPolicy: WorkSchedulePattern['calendar_policy'], days: WorkScheduleCycleDay[],
): Promise<{ data: WorkSchedulePattern }> {
  assertCompany(companyId)
  if (!uuid.test(scheduleId)) throw new Error('Некорректный график')
  return apiRequest(`/companies/${companyId}/worktime/schedules/${scheduleId}/pattern`, {
    method: 'PUT',
    body: JSON.stringify({ revision, calendar_policy: calendarPolicy, days }),
  })
}
export interface BulkWorktimePlanRequest {
  employee_ids: string[]
  from: string
  to: string
  schedule_revision: number
  cycle_offset: number
  replace_future_plans: boolean
  apply: boolean
  confirm?: boolean
  preview_token?: string
}
export interface BulkWorktimePlanResponse {
  data: {
    employee_count: number
    date_count: number
    planned_workdays: number
    planned_rest_days: number
    planned_minutes: number
    missing_calendar: number
    outside_employment: number
    locked_days: number
    recorded_actual: number
    overlapping_leave: number
    overlapping_absence: number
    existing_plans: number
    existing_assignments: number
    new_days: number
    blocking_count: number
    sample: { employee_id: string; date: string; planned_minutes: number; day_kind: 'work' | 'rest' }[]
  }
  meta: {
    mode: 'preview' | 'applied'
    preview_token: string
    pattern_version: number
    schedule_revision: number
    can_apply: boolean
  }
}
export function bulkPlanWorkSchedule(
  companyId: string, scheduleId: string, payload: BulkWorktimePlanRequest,
): Promise<BulkWorktimePlanResponse> {
  assertCompany(companyId)
  if (!uuid.test(scheduleId)) throw new Error('Некорректный график')
  assertDate(payload.from)
  assertDate(payload.to)
  if (payload.employee_ids.length < 1 || payload.employee_ids.length > 200) {
    throw new Error('Выберите от 1 до 200 сотрудников')
  }
  if (payload.employee_ids.some(id => !uuid.test(id))) throw new Error('Некорректные сотрудники')
  if (payload.apply && (!payload.confirm || !/^[a-f0-9]{64}$/.test(payload.preview_token ?? ''))) {
    throw new Error('Требуется предварительная проверка и подтверждение')
  }
  return apiRequest(`/companies/${companyId}/worktime/schedules/${scheduleId}/bulk-plan`, {
    method: 'POST', body: JSON.stringify(payload),
  })
}
export interface WorktimePlannedDay {
  id: string
  employee_id: string
  work_date: string
  planned_minutes: number
  day_kind: 'work' | 'rest'
  shift_code: string | null
  source: string
  revision: number
  schedule_name: string
  pattern_version: number
}
export function listWorktimePlannedDays(
  companyId: string, employeeIds: string[], from: string, to: string, page = 1,
): Promise<{ data: WorktimePlannedDay[]; meta: { total: number; current_page: number; last_page: number } }> {
  assertCompany(companyId)
  if (!employeeIds.length || employeeIds.length > 200 || employeeIds.some(id => !uuid.test(id))) {
    throw new Error('Некорректная выборка сотрудников')
  }
  assertDate(from)
  assertDate(to)
  const params = new URLSearchParams({ from, to, page: String(page), per_page: '500' })
  employeeIds.forEach(id => params.append('employee_ids[]', id))
  return apiRequest(`/companies/${companyId}/worktime/plans?${params.toString()}`)
}

/** Worktime matrix: a read-only planned/actual projection until explicitly bulk-edited. */
export type WorktimeMatrixState = 'recorded' | 'leave' | 'absence' | 'rest'
  | 'missing' | 'future' | 'unknown_shift' | 'unconfigured'
export interface WorktimeMatrixDay {
  date: string
  day_type: string
  label: string | null
  locked: boolean
}
export interface WorktimeMatrixCell {
  date: string
  planned_minutes: number | null
  worked_minutes: number | null
  absence_minutes: number | null
  overtime_minutes: number | null
  shift_code: string | null
  revision: number | null
  state: WorktimeMatrixState
  locked: boolean
  editable: boolean
}
export interface WorktimeMatrixRow {
  employee_id: string
  personnel_number: string
  full_name: string
  department_name: string | null
  department_id: string | null
  position_name: string | null
  schedule_name: string | null
  summary: { planned_minutes: number; worked_minutes: number | null; recorded_days: number; missing_days: number }
  days: WorktimeMatrixCell[]
}
export interface WorktimeMatrixResponse {
  data: { dates: WorktimeMatrixDay[]; rows: WorktimeMatrixRow[] }
  meta: {
    from: string
    to: string
    group_by: 'department' | 'schedule' | 'none'
    can_edit: boolean
    calendar_complete: boolean
    current_page: number
    last_page: number
    per_page: number
    total: number
    manager_scope_policy: string
    filters: {
      departments: { id: string; name: string }[]
      schedules: { id: string; name: string }[]
    }
  }
}
export interface WorktimeMatrixFilters {
  from: string
  to: string
  q?: string
  department_id?: string
  schedule_id?: string
  status?: 'all' | 'recorded' | 'unrecorded'
  group_by?: 'department' | 'schedule' | 'none'
  page?: number
  per_page?: number
}
export function getWorktimeMatrix(companyId: string, filters: WorktimeMatrixFilters): Promise<WorktimeMatrixResponse> {
  assertCompany(companyId)
  assertDate(filters.from)
  assertDate(filters.to)
  const p = new URLSearchParams({ from: filters.from, to: filters.to })
  for (const name of ['q', 'department_id', 'schedule_id', 'status', 'group_by'] as const) {
    if (filters[name]) p.set(name, String(filters[name]))
  }
  p.set('page', String(filters.page ?? 1))
  p.set('per_page', String(filters.per_page ?? 30))
  return apiRequest(`/companies/${companyId}/worktime/matrix?${p.toString()}`)
}
export interface WorktimeMatrixBulkInput {
  cells: { employee_id: string; date: string }[]
  operation: 'fill_missing' | 'set_worked'
  worked_minutes?: number
  overwrite_existing?: boolean
  apply: boolean
  confirm?: boolean
  preview_token?: string
}
export interface WorktimeMatrixBulkResponse {
  data: {
    candidate_count: number
    new_entries: number
    updates: number
    skipped_recorded: number
    skipped_leave: number
    skipped_absence: number
    skipped_nonworking: number
    skipped_future: number
    missing_calendar: number
    outside_employment: number
    ambiguous_employment: number
    unknown_shift: number
    locked_cells: number
    existing_requires_overwrite: number
    protected_actual: number
    blocking_count: number
  }
  meta: { mode: 'preview' | 'applied'; from: string; to: string;
    preview_token: string; can_apply: boolean }
}
export function bulkEditWorktimeMatrix(companyId: string, payload: WorktimeMatrixBulkInput): Promise<WorktimeMatrixBulkResponse> {
  assertCompany(companyId)
  if (payload.cells.length < 1 || payload.cells.length > 2500
    || payload.cells.some(cell => !uuid.test(cell.employee_id) || !datePattern.test(cell.date))) {
    throw new Error('Выберите корректные ячейки табеля (не более 2500).')
  }
  if (payload.operation === 'set_worked' && (!Number.isInteger(payload.worked_minutes)
    || (payload.worked_minutes ?? -1) < 0 || (payload.worked_minutes ?? 1441) > 1440)) {
    throw new Error('Укажите от 0 до 24 часов.')
  }
  if (payload.apply && (!payload.confirm || !/^[a-f0-9]{64}$/.test(payload.preview_token ?? ''))) {
    throw new Error('Перед изменением табеля выполните проверку и подтверждение.')
  }
  return apiRequest(`/companies/${companyId}/worktime/matrix/bulk-edit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}