<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarDays, Clock3, TriangleAlert, UsersRound } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import ProductionCalendarEditor from '../components/ProductionCalendarEditor.vue'
import ProductionCalendarPeriodOverview from '../components/ProductionCalendarPeriodOverview.vue'
import TimesheetEntryEditor from '../components/TimesheetEntryEditor.vue'
import BulkTimesheetFillPanel from '../components/BulkTimesheetFillPanel.vue'
import TimesheetPeriodReview from '../components/TimesheetPeriodReview.vue'
import WorkScheduleEditor from '../components/WorkScheduleEditor.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseSelectionToolbar from '../components/ui/BaseSelectionToolbar.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import {
  getProductionCalendar,
  getWorkSchedules,
  getWorktimeAbsences,
  getWorktimeTimesheet,
  getEmployeeWorktimeMonth,
  type ProductionCalendarDay,
  type ProductionCalendarResponse,
  type WorkScheduleRow,
  type WorkScheduleResponse,
  type WorktimeAbsenceRow,
  type WorktimeTimesheetResponse,
  type WorktimeTimesheetRow,
  type WorktimePeriodStatus,
} from '../api/worktime'
import { localTodayISO } from '../utils/localDate'
import {
  buildDemoAbsences,
  buildDemoCalendar,
  buildDemoSchedules,
  buildDemoTimesheet,
  demoTimesheetSummary,
  type DemoTimesheetRow,
  type WorktimeTab,
} from '../mocks/timesheetDemo'

type RowStatus = 'missing' | 'complete' | 'attention'

interface TimesheetViewRow extends Record<string, unknown> {
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  position: string
  schedule: string
  planned_hours: number | null
  worked_hours: number | null
  absence_hours: number | null
  overtime_hours: number | null
  status: RowStatus
}

interface ScheduleViewRow extends Record<string, unknown> {
  id: string
  name: string
  type: string
  work_time: string
  week_hours: number | null
  employees: number
  source?: WorkScheduleRow
}

interface AbsenceViewRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  reason: string
  from: string
  to: string
  days: number
  hours: number | null
  status: string
}

interface CalendarViewDay {
  date: string
  day: number
  weekday: string
  type: string
  label: string | null
}

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const month = ref(localTodayISO().slice(0, 7))
const activeTab = ref<WorktimeTab>('timesheet')
const employees = ref<EmployeeRecord[]>([])
const productionTimesheet = ref<WorktimeTimesheetRow[]>([])
const productionSchedules = ref<WorkScheduleRow[]>([])
const productionCalendar = ref<ProductionCalendarDay[]>([])
const productionAbsences = ref<WorktimeAbsenceRow[]>([])
const productionTimesheetMeta = ref<WorktimeTimesheetResponse['meta'] | null>(null)
const periodStatus = ref<WorktimePeriodStatus | null>(null)
const periodEditable = ref(false)
const periodLocked = computed(() => periodStatus.value === 'submitted' || periodStatus.value === 'approved')
const productionCalendarMeta = ref<ProductionCalendarResponse['meta'] | null>(null)
const productionScheduleMeta = ref<WorkScheduleResponse['meta'] | null>(null)
const calendarEditorOpen = ref(false)
const calendarPeriodView = ref<'month' | 'quarter' | 'year'>('month')
const timesheetEditorOpen = ref(false)
const bulkTimesheetOpen = ref(false)
const selectedTimesheetIds = ref<string[]>([])
const timesheetPeriodView = ref<'month' | 'day'>('month')
const selectedDay = ref(localTodayISO())
type DayTotals = { planned_minutes:number|null;worked_minutes:number|null;absence_minutes:number|null;overtime_minutes:number|null }
const dailyEntries = ref(new Map<string,DayTotals>())
const dailyMonthlyCache = new Map<string, Map<string,DayTotals>>()
const dailyLoading = ref(false)
const dailyError = ref('')
let dailyGeneration = 0
async function loadDailyTimesheet() {
  const current = ++dailyGeneration
  dailyEntries.value = new Map()
  dailyError.value = ''
  if (timesheetPeriodView.value !== 'day' || !company.value || !productionTimesheet.value.length) return
  if (selectedDay.value.slice(0,7) !== month.value) return
  dailyLoading.value = true
  const companyId = company.value
  const monthKey = month.value
  const requestedDay = selectedDay.value
  try {
    const fetched = new Map<string,DayTotals>()
    for (let offset=0; offset<productionTimesheet.value.length; offset+=5) {
      const batch = await Promise.allSettled(productionTimesheet.value.slice(offset,offset+5).map(async employee => {
        const key = companyId + ':' + monthKey + ':' + employee.employee_id
        let days = dailyMonthlyCache.get(key)
        if (!days) {
          const result = await getEmployeeWorktimeMonth(companyId,employee.employee_id,monthKey)
          days = new Map(result.data.days.map(row => [row.date,{
            planned_minutes:row.planned_minutes,worked_minutes:row.worked_minutes,
            absence_minutes:row.absence_minutes,overtime_minutes:row.overtime_minutes,
          }]))
          dailyMonthlyCache.set(key,days)
        }
        return { employeeId:employee.employee_id, value:days.get(requestedDay) }
      }))
      if (current !== dailyGeneration || companyId !== company.value || monthKey !== month.value) return
      for (const item of batch) {
        if (item.status === 'fulfilled' && item.value.value) fetched.set(item.value.employeeId,item.value.value)
        if (item.status === 'rejected') dailyError.value = 'Не все дневные данные доступны. Неподтверждённые записи отображаются пустыми.'
      }
    }
    if (current === dailyGeneration) dailyEntries.value = fetched
  } finally {
    if (current === dailyGeneration) dailyLoading.value = false
  }
}
const visibleTimesheetRows = computed<TimesheetViewRow[]>(() => {
  if (timesheetPeriodView.value === 'month' || demoMode) return timesheetRows.value
  return timesheetRows.value.map(row => {
    const entry = dailyEntries.value.get(row.employee_id)
    return {
      ...row,
      planned_hours: entry ? hoursFromMinutes(entry.planned_minutes) : null,
      worked_hours: entry ? hoursFromMinutes(entry.worked_minutes) : null,
      absence_hours: entry ? hoursFromMinutes(entry.absence_minutes) : null,
      overtime_hours: entry ? hoursFromMinutes(entry.overtime_minutes) : null,
      status: entry ? (entry.absence_minutes ? 'attention' : 'complete') : 'missing',
    }
  })
})
watch([timesheetPeriodView,selectedDay], () => { void loadDailyTimesheet() })

const editingTimesheetEmployee = ref<TimesheetViewRow | null>(null)
const scheduleEditorOpen = ref(false)
const editingSchedule = ref<WorkScheduleRow | null>(null)
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
const warning = ref('')
let generation = 0

const tabs = [
  { id: 'timesheet', label: 'Табель учёта' },
  { id: 'schedules', label: 'Графики работы' },
  { id: 'calendar', label: 'Производственный календарь' },
  { id: 'absences', label: 'Невыходы' },
]

const demoTimesheetRows = computed(() => demoMode ? buildDemoTimesheet(employees.value, month.value) : [])
const demoAbsenceRows = computed(() => demoMode ? buildDemoAbsences(employees.value, month.value) : [])
const demoCalendarRows = computed(() => demoMode ? buildDemoCalendar(month.value) : [])

const timesheetRows = computed<TimesheetViewRow[]>(() => {
  if (demoMode) {
    return demoTimesheetRows.value.map(row => ({
      ...row,
      status: row.status,
    }))
  }
  return productionTimesheet.value.map(row => ({
    employee_id: row.employee_id,
    personnel_number: row.personnel_number,
    full_name: personName(row),
    department: row.department_name || 'Без подразделения',
    position: row.position_name || 'Без должности',
    schedule: row.schedule_name || '—',
    planned_hours: hoursFromMinutes(row.planned_minutes),
    worked_hours: hoursFromMinutes(row.worked_minutes),
    absence_hours: hoursFromMinutes(row.absence_minutes),
    overtime_hours: hoursFromMinutes(row.overtime_minutes),
    status: row.status,
  }))
})

const scheduleRows = computed<ScheduleViewRow[]>(() => {
  if (demoMode) return buildDemoSchedules(demoTimesheetRows.value)
  return productionSchedules.value.map(row => ({
    id: row.id,
    name: row.name,
    type: scheduleTypeLabel(row.schedule_type),
    work_time: row.work_time_label || '—',
    week_hours: hoursFromMinutes(row.weekly_minutes),
    employees: row.employees,
    source: row,
  }))
})

const absenceRows = computed<AbsenceViewRow[]>(() => {
  if (demoMode) return demoAbsenceRows.value
  return productionAbsences.value.map(row => ({
    id: row.id,
    employee_id: row.employee_id,
    personnel_number: row.personnel_number,
    full_name: personName(row),
    department: row.department_name || 'Без подразделения',
    reason: row.reason,
    from: row.started_on,
    to: row.ended_on,
    days: row.days,
    hours: hoursFromMinutes(row.absence_minutes),
    status: row.status,
  }))
})

const calendarDays = computed<CalendarViewDay[]>(() => {
  if (demoMode) {
    return demoCalendarRows.value.map(day => ({
      date: day.date,
      day: day.day,
      weekday: day.weekday,
      type: day.type,
      label: day.label ?? null,
    }))
  }

  const byDate = new Map(productionCalendar.value.map(day => [day.date, day]))
  return monthDateStrings(month.value).map(date => {
    const recorded = byDate.get(date)
    return {
      date,
      day: Number(date.slice(8, 10)),
      weekday: weekdayLabel(date),
      type: recorded?.day_type ?? 'missing',
      label: recorded?.label ?? null,
    }
  })
})

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const monthLabel = computed(() => {
  const [year, monthNumber] = month.value.split('-').map(Number)
  if (!year || !monthNumber) return ''
  const value = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
  return value.charAt(0).toUpperCase() + value.slice(1)
})

const summary = computed(() => {
  if (demoMode) {
    const value = demoTimesheetSummary(demoTimesheetRows.value)
    return {
      planned: value.planned,
      worked: value.worked,
      absence: value.absence,
      overtime: value.overtime,
    }
  }
  const value = productionTimesheetMeta.value?.summary
  return {
    planned: hoursFromMinutes(value?.planned_minutes ?? null),
    worked: hoursFromMinutes(value?.worked_minutes ?? null),
    absence: hoursFromMinutes(value?.absence_minutes ?? null),
    overtime: hoursFromMinutes(value?.overtime_minutes ?? null),
  }
})

const employeeCount = computed(() => demoMode
  ? timesheetRows.value.length
  : (productionTimesheetMeta.value?.total ?? timesheetRows.value.length))
const employeesWithEntries = computed(() => demoMode
  ? timesheetRows.value.length
  : (productionTimesheetMeta.value?.summary.employees_with_entries ?? 0))

const calendarOffset = computed(() => {
  const first = calendarDays.value[0]
  if (!first) return 0
  const weekday = new Date(first.date + 'T00:00:00Z').getUTCDay()
  return (weekday + 6) % 7
})
const workdayCount = computed(() => calendarDays.value.filter(day => ['workday', 'shortened'].includes(day.type)).length)
const weekendCount = computed(() => calendarDays.value.filter(day => day.type === 'weekend').length)
const holidayCount = computed(() => calendarDays.value.filter(day => day.type === 'holiday').length)
const missingCalendarCount = computed(() => calendarDays.value.filter(day => day.type === 'missing').length)

const timesheetColumns = [
  { key: 'employee', label: 'Сотрудник' },
  { key: 'schedule', label: 'График' },
  { key: 'planned_hours', label: 'План' },
  { key: 'worked_hours', label: 'Отработано' },
  { key: 'absence_hours', label: 'Неявки' },
  { key: 'overtime_hours', label: 'Сверхурочно' },
  { key: 'status', label: 'Состояние' },
  { key: 'actions', label: 'Действия' },
]
const scheduleColumns = [
  { key: 'name', label: 'График' },
  { key: 'type', label: 'Тип' },
  { key: 'work_time', label: 'Рабочее время' },
  { key: 'week_hours', label: 'Часов в неделю' },
  { key: 'employees', label: 'Сотрудников' },
  { key: 'actions', label: 'Действия' },
]
const absenceColumns = [
  { key: 'employee', label: 'Сотрудник' },
  { key: 'reason', label: 'Причина' },
  { key: 'period', label: 'Период' },
  { key: 'days', label: 'Дней' },
  { key: 'hours', label: 'Часов' },
  { key: 'status', label: 'Состояние' },
]

function setTab(value: string) {
  if (['timesheet', 'schedules', 'calendar', 'absences'].includes(value)) {
    activeTab.value = value as WorktimeTab
  }
}

function personName(row: { last_name: string; first_name: string; middle_name: string | null }): string {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}

function hoursFromMinutes(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined) return null
  return Math.round((minutes / 60) * 100) / 100
}

function hoursLabel(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
}

function displayDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value
  return value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4)
}

function absencePeriod(row: AbsenceViewRow): string {
  return row.from === row.to ? displayDate(row.from) : displayDate(row.from) + ' — ' + displayDate(row.to)
}

function statusLabel(row: TimesheetViewRow): string {
  if (row.status === 'missing') return 'Нет данных'
  return row.status === 'complete' ? 'Заполнено' : 'Требует внимания'
}

function absenceStatusLabel(status: string): string {
  if (status === 'planned') return 'Запланировано'
  if (status === 'recorded') return 'Учтено'
  if (status === 'historical') return 'Из кадровой истории'
  return status
}

function scheduleTypeLabel(type: string): string {
  return ({
    standard: 'Основной',
    shift: 'Сменный',
    individual: 'Индивидуальный',
    summarized: 'Суммированный',
  } as Record<string, string>)[type] ?? type
}

function calendarTypeLabel(day: CalendarViewDay): string {
  if (day.label) return day.label
  return ({
    workday: 'Рабочий день',
    shortened: 'Сокращённый день',
    weekend: 'Выходной',
    holiday: 'Праздничный день',
    missing: 'Нет данных',
  } as Record<string, string>)[day.type] ?? day.type
}

function weekdayLabel(date: string): string {
  return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(date + 'T00:00:00Z').getUTCDay()] ?? ''
}

function monthDateStrings(value: string): string[] {
  const [year, monthNumber] = value.split('-').map(Number)
  if (!year || !monthNumber) return []
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return Array.from({ length: days }, (_, index) =>
    `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)
}

function monthEnd(value: string): string {
  return monthDateStrings(value).at(-1) ?? localTodayISO()
}

function resetProductionData() {
  productionTimesheet.value = []
  productionSchedules.value = []
  productionCalendar.value = []
  productionAbsences.value = []
  productionTimesheetMeta.value = null
  productionCalendarMeta.value = null
  productionScheduleMeta.value = null
}

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value)) company.value = preferCompany(companies.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    loadingCompanies.value = false
  }
}

async function loadWorkspace() {
  const companyId = company.value
  const current = ++generation
  employees.value = []
  resetProductionData()
  warning.value = ''
  if (!companyId) return

  loading.value = true
  error.value = ''
  try {
    if (demoMode) {
      const first = await listEmployees(companyId, 1, '', 'active')
      if (current !== generation) return
      const rows = [...first.data]
      const lastPage = Math.min(first.meta.last_page, 20)
      for (let index = 2; index <= lastPage; index += 5) {
        const batch = Array.from({ length: Math.min(5, lastPage - index + 1) }, (_, offset) => index + offset)
        const results = await Promise.all(batch.map(page => listEmployees(companyId, page, '', 'active')))
        if (current !== generation) return
        for (const result of results) rows.push(...result.data)
      }
      employees.value = rows
      return
    }

    const [timesheet, schedules, calendar, absences] = await Promise.allSettled([
      getWorktimeTimesheet(companyId, month.value),
      getWorkSchedules(companyId, monthEnd(month.value)),
      getProductionCalendar(companyId, month.value),
      getWorktimeAbsences(companyId, month.value),
    ])
    if (current !== generation) return

    const unavailable: string[] = []
    if (timesheet.status === 'fulfilled') {
      productionTimesheet.value = timesheet.value.data
      productionTimesheetMeta.value = timesheet.value.meta
      if (timesheetPeriodView.value === 'day') void loadDailyTimesheet()
    } else unavailable.push('табель')

    if (schedules.status === 'fulfilled') {
      productionSchedules.value = schedules.value.data
      productionScheduleMeta.value = schedules.value.meta
    } else unavailable.push('графики работы')

    if (calendar.status === 'fulfilled') {
      productionCalendar.value = calendar.value.data
      productionCalendarMeta.value = calendar.value.meta
    } else unavailable.push('производственный календарь')

    if (absences.status === 'fulfilled') {
      productionAbsences.value = absences.value.data
    } else unavailable.push('невыходы')

    if (unavailable.length === 4) {
      throw new Error('Не удалось загрузить данные рабочего времени')
    }
    if (unavailable.length) {
      warning.value = 'Часть данных временно недоступна: ' + unavailable.join(', ') + '.'
    }
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить данные рабочего времени'
  } finally {
    if (current === generation) loading.value = false
  }
}

const canBulkFill = computed(() => !demoMode
  && productionTimesheetMeta.value?.worktime_bulk_fill_enabled === true
  && periodEditable.value && !periodLocked.value)

function bulkTimesheetSaved() {
  dailyMonthlyCache.clear()
  void loadWorkspace()
}
function selectTimesheetView(value: 'month' | 'day') {
  timesheetPeriodView.value = value
  selectedTimesheetIds.value = []
}

function openTimesheetEditor(row: TimesheetViewRow) {
  if (!productionTimesheetMeta.value?.worktime_writes_enabled || !periodEditable.value || periodLocked.value) return
  editingTimesheetEmployee.value = row
  timesheetEditorOpen.value = true
}

function closeTimesheetEditor() {
  timesheetEditorOpen.value = false
  editingTimesheetEmployee.value = null
}

function timesheetUpdated() {
  dailyMonthlyCache.clear()
  void loadWorkspace()
}

function openScheduleEditor(row?: ScheduleViewRow) {
  editingSchedule.value = row?.source ?? null
  scheduleEditorOpen.value = true
}

function closeScheduleEditor() {
  scheduleEditorOpen.value = false
  editingSchedule.value = null
}

function scheduleUpdated() {
  void loadWorkspace()
}

function calendarUpdated() {
  calendarEditorOpen.value = false
  void loadWorkspace()
}
watch([company, month], () => {
  periodStatus.value = null
  selectedTimesheetIds.value = []
  dailyMonthlyCache.clear()
  selectedDay.value = month.value + '-01'
  periodEditable.value = false
  calendarEditorOpen.value = false
  bulkTimesheetOpen.value = false
  closeTimesheetEditor()
  closeScheduleEditor()
  void loadWorkspace()
})
onMounted(loadCompanies)
</script>

<template>
  <section class="timesheets-page">
    <div class="timesheets-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Графики и табель</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="warning" tone="warning">{{ warning }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="timesheets-heading">
        <div>
          <h1>Графики и табель</h1>
          <p>{{ selectedCompany?.name }} · {{ monthLabel }}</p>
        </div>
        <div class="timesheets-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseFormField v-model="month" label="Период" type="month" />
        </div>
      </div>

      <BaseNotice v-if="!demoMode && productionTimesheetMeta && employeesWithEntries === 0" tone="info">
        За выбранный период табельные записи ещё не загружены. Сотрудники показаны без подстановки нулевых часов.
      </BaseNotice>

      <BaseViewTabs :model-value="activeTab" :options="tabs" label="Разделы табельного учёта"
        @update:model-value="setTab" />

      <div class="worktime-summary" aria-label="Сводка рабочего времени">
        <BaseCard class="summary-card">
          <UsersRound :size="19" aria-hidden="true" />
          <span>Сотрудники</span>
          <strong>{{ loading ? '…' : employeeCount }}</strong>
          <small>{{ demoMode ? 'в табеле периода' : employeesWithEntries + ' с табельными данными' }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <CalendarDays :size="19" aria-hidden="true" />
          <span>Плановые часы</span>
          <strong>{{ loading ? '…' : hoursLabel(summary.planned) }}</strong>
          <small>{{ demoMode ? 'по графикам работы' : 'по загруженным данным' }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <Clock3 :size="19" aria-hidden="true" />
          <span>Отработано</span>
          <strong>{{ loading ? '…' : hoursLabel(summary.worked) }}</strong>
          <small>часов за период</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <TriangleAlert :size="19" aria-hidden="true" />
          <span>Неявки</span>
          <strong>{{ loading ? '…' : hoursLabel(summary.absence) }}</strong>
          <small>часов учтено</small>
        </BaseCard>
      </div>

      <TimesheetPeriodReview v-if="!demoMode && activeTab === 'timesheet' && productionTimesheetMeta?.worktime_writes_enabled"
        :company-id="company" :month="month" @status="periodStatus = $event" @editable="periodEditable = $event" />
      <section v-if="activeTab === 'timesheet'" class="worktime-register worktime-register--flat">
        <div class="section-heading">
          <div>
            <h2>Табель учёта рабочего времени</h2>
            <p>Плановые и фактически отработанные часы сотрудников.</p>
          </div>
          <span>{{ employeeCount }} сотрудников</span>
        </div>

        <div class="timesheet-table-toolbar">
          <div class="timesheet-period-tabs" role="tablist" aria-label="Режим просмотра табеля">
            <BaseButton variant="secondary" type="button" role="tab" :aria-selected="timesheetPeriodView === 'month'"
              :class="{ active:timesheetPeriodView==='month' }" @click="selectTimesheetView('month')">Месяц</BaseButton>
            <BaseButton variant="secondary" type="button" role="tab" :aria-selected="timesheetPeriodView === 'day'"
              :class="{ active:timesheetPeriodView==='day' }" @click="selectTimesheetView('day')">День</BaseButton>
          </div>
          <BaseFormField v-if="timesheetPeriodView === 'day'" v-model="selectedDay" label="Дата" type="date"
            :min="month + '-01'" :max="monthEnd(month)" />
          <span v-if="dailyLoading" role="status">Загрузка записей дня…</span>
          <span v-if="dailyError" role="status">{{ dailyError }}</span>
        </div>
        <BaseSelectionToolbar :count="selectedTimesheetIds.length" label="Выбрано сотрудников"
          clear-label="Снять выделение" @clear="selectedTimesheetIds = []" />
        <div v-if="canBulkFill" class="worktime-bulk-toolbar">
          <BaseButton variant="secondary" type="button" @click="bulkTimesheetOpen = true">Массовое заполнение табеля</BaseButton>
          <span>С предпросмотром, без перезаписи уже введённых явок, отпусков и неявок</span>
        </div>
        <div class="worktime-desktop">
          <BaseDataTable v-model:selected-keys="selectedTimesheetIds" selectable
            :rows="visibleTimesheetRows" :columns="timesheetColumns" row-key="employee_id"
            :loading="loading" caption="Табель учёта рабочего времени"
            empty-title="Табельных данных нет" empty-description="Для выбранного периода данные не найдены.">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                  {{ row.full_name }}
                </RouterLink>
                <span>{{ row.personnel_number }} · {{ row.department }}</span>
              </div>
            </template>
            <template #cell-planned_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-worked_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-absence_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-overtime_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-status="{ row }">
              <BaseStatusPill :tone="row.status === 'attention' ? 'warning' : row.status === 'missing' ? 'neutral' : 'success'">
                {{ statusLabel(row) }}
              </BaseStatusPill>
            </template>
            <template #cell-actions="{ row }">
              <BaseButton v-if="!demoMode && productionTimesheetMeta?.worktime_writes_enabled && periodEditable && !periodLocked"
                variant="secondary" type="button" @click="openTimesheetEditor(row)">
                Заполнить
              </BaseButton>
              <span v-else>—</span>
            </template>
          </BaseDataTable>
        </div>

        <div class="worktime-mobile">
          <article v-for="row in visibleTimesheetRows" :key="row.employee_id" class="worktime-card">
            <header>
              <div>
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                  {{ row.full_name }}
                </RouterLink>
                <span>{{ row.personnel_number }} · {{ row.position }}</span>
              </div>
              <BaseStatusPill :tone="row.status === 'attention' ? 'warning' : row.status === 'missing' ? 'neutral' : 'success'">
                {{ statusLabel(row) }}
              </BaseStatusPill>
            </header>
            <p>{{ row.schedule }} · {{ row.department }}</p>
            <dl>
              <div><dt>План</dt><dd>{{ hoursLabel(row.planned_hours) }}<template v-if="row.planned_hours !== null"> ч</template></dd></div>
              <div><dt>Отработано</dt><dd>{{ hoursLabel(row.worked_hours) }}<template v-if="row.worked_hours !== null"> ч</template></dd></div>
              <div><dt>Неявки</dt><dd>{{ hoursLabel(row.absence_hours) }}<template v-if="row.absence_hours !== null"> ч</template></dd></div>
              <div><dt>Сверхурочно</dt><dd>{{ hoursLabel(row.overtime_hours) }}<template v-if="row.overtime_hours !== null"> ч</template></dd></div>
            </dl>
            <BaseButton v-if="!demoMode && productionTimesheetMeta?.worktime_writes_enabled && periodEditable && !periodLocked"
              variant="secondary" type="button" @click="openTimesheetEditor(row)">
              Заполнить табель
            </BaseButton>
          </article>
        </div>
      </section>

      <BaseCard v-else-if="activeTab === 'schedules'" class="worktime-register">
        <div class="section-heading">
          <div>
            <h2>Графики работы</h2>
            <p>Основные, сменные, индивидуальные и суммированные графики.</p>
          </div>
          <div class="section-actions">
            <BaseButton v-if="!demoMode && productionScheduleMeta?.can_manage_schedules"
              type="button" @click="openScheduleEditor()">Новый график</BaseButton>
            <span>{{ scheduleRows.length }} графика</span>
          </div>
        </div>
        <div class="worktime-desktop">
          <BaseDataTable :rows="scheduleRows" :columns="scheduleColumns" row-key="id"
            :loading="loading" caption="Графики работы"
            empty-title="Графики не найдены" empty-description="Для выбранной компании графики отсутствуют.">
            <template #cell-week_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-actions="{ row }">
              <BaseButton v-if="!demoMode && productionScheduleMeta?.can_manage_schedules"
                variant="secondary" type="button" @click="openScheduleEditor(row)">
                Управление
              </BaseButton>
              <span v-else>—</span>
            </template>
          </BaseDataTable>
        </div>
        <div class="worktime-mobile">
          <article v-for="row in scheduleRows" :key="row.id" class="schedule-card">
            <header><strong>{{ row.name }}</strong><span>{{ row.type }}</span></header>
            <dl>
              <div><dt>Рабочее время</dt><dd>{{ row.work_time }}</dd></div>
              <div><dt>Неделя</dt><dd>{{ hoursLabel(row.week_hours) }}<template v-if="row.week_hours !== null"> ч</template></dd></div>
              <div><dt>Сотрудники</dt><dd>{{ row.employees }}</dd></div>
            </dl>
            <BaseButton v-if="!demoMode && productionScheduleMeta?.can_manage_schedules"
              variant="secondary" type="button" @click="openScheduleEditor(row)">
              Управление графиком
            </BaseButton>
          </article>
        </div>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'calendar'" class="calendar-card">
        <div class="section-heading">
          <div>
            <h2>Производственный календарь</h2>
            <p>{{ monthLabel }} · рабочие и выходные дни периода.</p>
          </div>
          <BaseButton v-if="!demoMode && productionCalendarMeta?.can_edit_calendar" variant="secondary" :disabled="loading || calendarPeriodView !== 'month'" @click="calendarEditorOpen = true">Редактировать календарь</BaseButton>
          <span v-if="calendarPeriodView === 'month'">
            {{ workdayCount }} рабочих · {{ weekendCount }} выходных · {{ holidayCount }} праздничных
            <template v-if="missingCalendarCount"> · {{ missingCalendarCount }} без данных</template>
          </span>
        </div>
        <ProductionCalendarPeriodOverview :company-id="company" :month="month" :view="calendarPeriodView"
          :demo-mode="demoMode" :active="activeTab === 'calendar'"
          @view="calendarPeriodView = $event" @navigate="month = $event" @select-month="month = $event; calendarPeriodView = 'month'" />
        <BaseNotice v-if="calendarPeriodView === 'month' && !demoMode && productionCalendarMeta && !productionCalendarMeta.calendar_complete" tone="warning">
          Календарь заполнен частично: {{ productionCalendarMeta.recorded_days }} из {{ productionCalendarMeta.expected_days }} дней.
          Незагруженные даты не классифицируются автоматически.
        </BaseNotice>
        <div v-if="calendarPeriodView === 'month'" class="calendar-legend" role="list" aria-label="Обозначения типов дней">
          <span role="listitem"><i class="calendar-key calendar-key--workday" aria-hidden="true" /> Рабочие</span>
          <span role="listitem"><i class="calendar-key calendar-key--weekend" aria-hidden="true" /> Выходные</span>
          <span role="listitem"><i class="calendar-key calendar-key--holiday" aria-hidden="true" /> Праздничные</span>
          <span v-if="missingCalendarCount" role="listitem"><i class="calendar-key calendar-key--missing" aria-hidden="true" /> Не заполнены</span>
        </div>
        <div v-if="calendarPeriodView === 'month'" class="calendar-weekdays" aria-hidden="true">
          <span v-for="label in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="label">{{ label }}</span>
        </div>
        <div v-if="calendarPeriodView === 'month'" class="calendar-grid" :aria-label="'Производственный календарь: ' + monthLabel">
          <span v-for="blank in calendarOffset" :key="'blank-' + blank" class="calendar-blank" aria-hidden="true" />
          <article v-for="day in calendarDays" :key="day.date" class="calendar-day"
            :aria-label="day.date + ' — ' + calendarTypeLabel(day)"
            :class="{
              'calendar-day--workday': ['workday','shortened'].includes(day.type),
              'calendar-day--shortened': day.type === 'shortened',
              'calendar-day--weekend': day.type === 'weekend',
              'calendar-day--holiday': day.type === 'holiday',
              'calendar-day--missing': day.type === 'missing',
            }">
            <strong>{{ day.day }}</strong>
            <span>{{ day.weekday }}</span>
            <small>{{ calendarTypeLabel(day) }}</small>
          </article>
        </div>
      </BaseCard>

      <BaseCard v-else class="worktime-register">
        <div class="section-heading">
          <div>
            <h2>Невыходы и отсутствия</h2>
            <p>Больничные, командировки, отпуска и другие причины отсутствия.</p>
          </div>
          <span>{{ absenceRows.length }} записей</span>
        </div>
        <div class="worktime-desktop">
          <BaseDataTable :rows="absenceRows" :columns="absenceColumns" row-key="id"
            :loading="loading" caption="Невыходы и отсутствия"
            empty-title="Невыходов нет" empty-description="Для выбранного периода отсутствия не зарегистрированы.">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                  {{ row.full_name }}
                </RouterLink>
                <span>{{ row.personnel_number }} · {{ row.department }}</span>
              </div>
            </template>
            <template #cell-period="{ row }">{{ absencePeriod(row) }}</template>
            <template #cell-days="{ value }">{{ value }} дн.</template>
            <template #cell-hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
            <template #cell-status="{ row }">
              <BaseStatusPill :tone="row.status === 'planned' ? 'info' : row.status === 'historical' ? 'neutral' : 'success'">
                {{ absenceStatusLabel(row.status) }}
              </BaseStatusPill>
            </template>
          </BaseDataTable>
        </div>
        <div class="worktime-mobile">
          <article v-for="row in absenceRows" :key="row.id" class="absence-card">
            <header>
              <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                {{ row.full_name }}
              </RouterLink>
              <BaseStatusPill :tone="row.status === 'planned' ? 'info' : row.status === 'historical' ? 'neutral' : 'success'">
                {{ absenceStatusLabel(row.status) }}
              </BaseStatusPill>
            </header>
            <p>{{ row.reason }}</p>
            <dl>
              <div><dt>Период</dt><dd>{{ absencePeriod(row) }}</dd></div>
              <div><dt>Дней</dt><dd>{{ row.days }}</dd></div>
              <div><dt>Часов</dt><dd>{{ hoursLabel(row.hours) }}<template v-if="row.hours !== null"> ч</template></dd></div>
            </dl>
          </article>
        </div>
      </BaseCard>
    </template>
  </section>
  <ProductionCalendarEditor :open="calendarEditorOpen" :company-id="company" :month="month"
    :days="productionCalendar" @close="calendarEditorOpen = false" @saved="calendarUpdated" @refresh="calendarUpdated" />
  <BulkTimesheetFillPanel :open="bulkTimesheetOpen" :company-id="company" :month="month"
    :initial-date="timesheetPeriodView === 'day' ? selectedDay : undefined"
    :employees="timesheetRows.filter(row => !selectedTimesheetIds.length || selectedTimesheetIds.includes(row.employee_id))
      .map(row => ({ employee_id: row.employee_id, full_name: row.full_name, department: row.department }))"
    @close="bulkTimesheetOpen = false" @saved="bulkTimesheetSaved" />
  <TimesheetEntryEditor v-if="editingTimesheetEmployee"
    :open="timesheetEditorOpen"
    :company-id="company"
    :employee-id="editingTimesheetEmployee.employee_id"
    :employee-name="editingTimesheetEmployee.full_name"
    :month="month"
    :focus-date="timesheetPeriodView === 'day' ? selectedDay : undefined"
    @close="closeTimesheetEditor"
    @saved="timesheetUpdated" />
  <WorkScheduleEditor
    :open="scheduleEditorOpen"
    :company-id="company"
    :schedule="editingSchedule"
    @close="closeScheduleEditor"
    @saved="scheduleUpdated" />
</template>

<style scoped>
.worktime-register--flat{border:0;border-radius:0;padding:0;background:transparent;box-shadow:none;min-width:0}
.timesheet-table-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}
.timesheet-table-toolbar>span{font-size:12px;color:var(--color-muted)}
.timesheet-period-tabs{display:flex;align-items:center;gap:3px;border-bottom:1px solid var(--color-stroke)}
.timesheet-period-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--color-muted);padding:9px 14px;cursor:pointer;font:inherit;font-size:13px}
.timesheet-period-tabs button.active{color:var(--color-primary);font-weight:600;border-color:var(--color-primary)}

.worktime-bulk-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:0 0 14px}
.worktime-bulk-toolbar span{font-size:12px;color:var(--color-muted)}
.timesheets-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.timesheets-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.timesheets-breadcrumb img{width:15px;height:15px}
.timesheets-breadcrumb strong{color:var(--color-text);font-weight:500}
.timesheets-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.timesheets-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.timesheets-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.timesheets-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.timesheets-controls :deep(.base-select-field),.timesheets-controls :deep(.field){width:220px;max-width:220px}
.worktime-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.summary-card{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:start;gap:5px 9px;min-height:104px}
.summary-card svg{grid-column:2;grid-row:1;color:var(--color-primary);justify-self:end}
.summary-card>span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;font-weight:600}
.summary-card>strong{grid-column:1/-1;color:var(--color-primary);font-size:24px;line-height:1.1}
.summary-card>small{grid-column:1/-1;color:var(--color-muted);font-size:10px;line-height:1.4}
.worktime-register,.calendar-card{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-heading>span{color:var(--color-muted);font-size:11px}
.section-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.section-actions>span{color:var(--color-muted);font-size:11px}
.employee-cell{display:grid;gap:3px;min-width:180px}
.employee-cell a{color:var(--color-text);font-size:13px;font-weight:600}
.employee-cell a:hover{color:var(--color-primary)}
.employee-cell span{color:var(--color-muted);font-size:10px}
.worktime-mobile{display:none}
.worktime-card,.schedule-card,.absence-card{
  display:grid;gap:10px;padding:13px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.worktime-card header,.absence-card header{display:flex;align-items:start;justify-content:space-between;gap:10px}
.worktime-card header>div{display:grid;gap:3px;min-width:0}
.worktime-card header a,.absence-card header a{color:var(--color-text);font-size:13px;font-weight:600}
.worktime-card header a:hover,.absence-card header a:hover{color:var(--color-primary)}
.worktime-card header span:not(.status-pill){color:var(--color-muted);font-size:10px}
.worktime-card>p,.absence-card>p{margin:0;color:var(--color-muted);font-size:11px;line-height:1.4}
.worktime-card dl,.schedule-card dl,.absence-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}
.worktime-card dl div,.schedule-card dl div,.absence-card dl div{display:grid;gap:3px;padding:8px;background:var(--color-soft);border-radius:var(--radius-sm)}
.worktime-card dt,.schedule-card dt,.absence-card dt{color:var(--color-muted);font-size:9px}
.worktime-card dd,.schedule-card dd,.absence-card dd{margin:0;color:var(--color-text);font-size:12px;font-weight:600}
.schedule-card header{display:flex;align-items:center;justify-content:space-between;gap:10px}
.schedule-card header strong{color:var(--color-text);font-size:13px}
.schedule-card header span{color:var(--color-primary);font-size:10px;font-weight:700}

.calendar-legend{display:flex;align-items:center;gap:9px 18px;flex-wrap:wrap;margin:0 0 15px;color:var(--color-text);font-size:12px}
.calendar-legend span{display:inline-flex;align-items:center;gap:7px}
.calendar-key{display:inline-block;flex:0 0 13px;width:13px;height:13px;border-radius:4px;border:1px solid var(--color-stroke-strong)}
.calendar-key--workday{background:var(--calendar-work-bg);border-color:var(--calendar-work-border)}
.calendar-key--weekend{background:var(--calendar-weekend-bg);border-color:var(--calendar-weekend-border)}
.calendar-key--holiday{background:var(--calendar-holiday-bg);border-color:var(--calendar-holiday-border)}
.calendar-key--missing{background:var(--color-surface-raised);border-style:dashed}
.calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
.calendar-weekdays{margin-bottom:7px}
.calendar-weekdays span{text-align:center;color:var(--color-muted);font-size:10px;font-weight:600}
.calendar-day{display:grid;gap:5px;min-height:84px;padding:10px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface-raised);color:var(--color-text)}
.calendar-day strong{color:inherit;font-size:15px}
.calendar-day span{color:inherit;opacity:.83;font-size:10px}
.calendar-day small{align-self:end;color:inherit;font-size:10px;line-height:1.3;font-weight:650;overflow-wrap:anywhere}
.calendar-day--workday{background:var(--calendar-work-bg);border-color:var(--calendar-work-border);color:var(--calendar-work-text)}
.calendar-day--shortened{border-style:dashed}
.calendar-day--weekend{background:var(--calendar-weekend-bg);border-color:var(--calendar-weekend-border);color:var(--calendar-weekend-text)}
.calendar-day--holiday{background:var(--calendar-holiday-bg);border-color:var(--calendar-holiday-border);color:var(--calendar-holiday-text)}
.calendar-day--missing{border-style:dashed;color:var(--color-muted);background:var(--color-surface-raised)}
.calendar-blank{min-height:1px}
@media(max-width:1000px){.worktime-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){
  .worktime-desktop{display:none}
  .worktime-mobile{display:grid;gap:9px}
  .calendar-day{min-height:68px;padding:7px}
  .calendar-day small{display:none}
}
@media(max-width:650px){
  .timesheets-controls{display:grid;grid-template-columns:1fr;width:100%}
  .timesheets-controls :deep(.base-select-field),.timesheets-controls :deep(.field){width:100%;max-width:none}
  .worktime-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .summary-card{min-height:94px}
  .summary-card>strong{font-size:21px}
  .calendar-weekdays,.calendar-grid{gap:4px}
  .calendar-day{min-height:54px;padding:6px}
  .calendar-day strong{font-size:13px}
  .calendar-day span{font-size:8px}
}
</style>
