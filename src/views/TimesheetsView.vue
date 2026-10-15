<script setup lang="ts">
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarDays, Clock3, TriangleAlert, UsersRound } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import ProductionCalendarEditor from '../components/ProductionCalendarEditor.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
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
  type ProductionCalendarDay,
  type ProductionCalendarResponse,
  type WorkScheduleRow,
  type WorktimeAbsenceRow,
  type WorktimeTimesheetResponse,
  type WorktimeTimesheetRow,
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
const productionCalendarMeta = ref<ProductionCalendarResponse['meta'] | null>(null)
const calendarEditorOpen = ref(false)
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
      label: null,
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
const weekendCount = computed(() => calendarDays.value.filter(day => ['weekend', 'holiday'].includes(day.type)).length)
const missingCalendarCount = computed(() => calendarDays.value.filter(day => day.type === 'missing').length)

const timesheetColumns = [
  { key: 'employee', label: 'Сотрудник' },
  { key: 'schedule', label: 'График' },
  { key: 'planned_hours', label: 'План' },
  { key: 'worked_hours', label: 'Отработано' },
  { key: 'absence_hours', label: 'Неявки' },
  { key: 'overtime_hours', label: 'Сверхурочно' },
  { key: 'status', label: 'Состояние' },
]
const scheduleColumns = [
  { key: 'name', label: 'График' },
  { key: 'type', label: 'Тип' },
  { key: 'work_time', label: 'Рабочее время' },
  { key: 'week_hours', label: 'Часов в неделю' },
  { key: 'employees', label: 'Сотрудников' },
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
    } else unavailable.push('табель')

    if (schedules.status === 'fulfilled') {
      productionSchedules.value = schedules.value.data
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

function calendarUpdated() {
  calendarEditorOpen.value = false
  void loadWorkspace()
}
watch([company, month], () => {
  calendarEditorOpen.value = false
  void loadWorkspace()
})
onMounted(loadCompanies)
</script>

<template>
  <section class="timesheets-page">
    <div class="timesheets-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
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

      <BaseCard v-if="activeTab === 'timesheet'" class="worktime-register">
        <div class="section-heading">
          <div>
            <h2>Табель учёта рабочего времени</h2>
            <p>Плановые и фактически отработанные часы сотрудников.</p>
          </div>
          <span>{{ employeeCount }} сотрудников</span>
        </div>

        <div class="worktime-desktop">
          <BaseDataTable :rows="timesheetRows" :columns="timesheetColumns" row-key="employee_id"
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
          </BaseDataTable>
        </div>

        <div class="worktime-mobile">
          <article v-for="row in timesheetRows" :key="row.employee_id" class="worktime-card">
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
          </article>
        </div>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'schedules'" class="worktime-register">
        <div class="section-heading">
          <div>
            <h2>Графики работы</h2>
            <p>Основные, сменные, индивидуальные и суммированные графики.</p>
          </div>
          <span>{{ scheduleRows.length }} графика</span>
        </div>
        <div class="worktime-desktop">
          <BaseDataTable :rows="scheduleRows" :columns="scheduleColumns" row-key="id"
            :loading="loading" caption="Графики работы"
            empty-title="Графики не найдены" empty-description="Для выбранной компании графики отсутствуют.">
            <template #cell-week_hours="{ value }">{{ hoursLabel(value) }}<template v-if="typeof value === 'number'"> ч</template></template>
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
          </article>
        </div>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'calendar'" class="calendar-card">
        <div class="section-heading">
          <div>
            <h2>Производственный календарь</h2>
            <p>{{ monthLabel }} · рабочие и выходные дни периода.</p>
          </div>
          <BaseButton v-if="!demoMode && productionCalendarMeta?.can_edit_calendar" variant="secondary" :disabled="loading" @click="calendarEditorOpen = true">Редактировать календарь</BaseButton>
          <span>
            {{ workdayCount }} рабочих · {{ weekendCount }} выходных
            <template v-if="missingCalendarCount"> · {{ missingCalendarCount }} без данных</template>
          </span>
        </div>
        <BaseNotice v-if="!demoMode && productionCalendarMeta && !productionCalendarMeta.calendar_complete" tone="warning">
          Календарь заполнен частично: {{ productionCalendarMeta.recorded_days }} из {{ productionCalendarMeta.expected_days }} дней.
          Незагруженные даты не классифицируются автоматически.
        </BaseNotice>
        <div class="calendar-weekdays" aria-hidden="true">
          <span v-for="label in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="label">{{ label }}</span>
        </div>
        <div class="calendar-grid" :aria-label="'Производственный календарь: ' + monthLabel">
          <span v-for="blank in calendarOffset" :key="'blank-' + blank" class="calendar-blank" aria-hidden="true" />
          <article v-for="day in calendarDays" :key="day.date" class="calendar-day"
            :class="{
              'calendar-day--weekend': ['weekend','holiday'].includes(day.type),
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
              <BaseStatusPill :tone="row.status === 'planned' ? 'info' : 'success'">
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
              <BaseStatusPill :tone="row.status === 'planned' ? 'info' : 'success'">
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
</template>

<style scoped>
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
.calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
.calendar-weekdays{margin-bottom:7px}
.calendar-weekdays span{text-align:center;color:var(--color-muted);font-size:10px;font-weight:600}
.calendar-day{display:grid;gap:5px;min-height:84px;padding:10px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface-raised)}
.calendar-day strong{color:var(--color-text);font-size:15px}
.calendar-day span{color:var(--color-muted);font-size:10px}
.calendar-day small{align-self:end;color:var(--color-success);font-size:9px;font-weight:600}
.calendar-day--weekend{background:var(--color-soft)}
.calendar-day--weekend small{color:var(--color-muted)}\n.calendar-day--missing{border-style:dashed;background:transparent}\n.calendar-day--missing strong,.calendar-day--missing span,.calendar-day--missing small{color:var(--color-muted)}
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
