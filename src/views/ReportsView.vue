<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BriefcaseBusiness, GraduationCap, UserRoundCheck, UsersRound } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import {
  listPersonnelActions,
  type PersonnelActionRow,
  type PersonnelActionType,
} from '../api/personnelActions'
import {
  getStaffingPlan,
  listStaffingPlans,
  type StaffingPlanLine,
  type StaffingPlanRecord,
} from '../api/staffing'
import {
  developmentStatusName,
  getCompanyDevelopment,
  trainingModeName,
  type TrainingRow,
} from '../api/development'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'
import { buildDemoTimesheet, demoTimesheetSummary } from '../mocks/timesheetDemo'

type ReportTab = 'overview' | 'movement' | 'staffing' | 'training' | 'worktime'

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const month = ref(localTodayISO().slice(0, 7))
const activeTab = ref<ReportTab>('overview')
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
const warning = ref('')
const activeEmployees = ref<EmployeeRecord[]>([])
const activeTotal = ref<number | null>(null)
const archivedTotal = ref<number | null>(null)
const activeEmployeesTruncated = ref(false)
const actionRows = ref<PersonnelActionRow[]>([])
const actionTotal = ref<number | null>(null)
const actionSummary = ref<{ hire: number | null; transfer: number | null; termination: number | null }>({ hire: null, transfer: null, termination: null })
const staffingPlan = ref<StaffingPlanRecord | null>(null)
const staffingLines = ref<StaffingPlanLine[]>([])
const trainingRows = ref<TrainingRow[]>([])
const trainingSummary = ref<Record<string, number>>({ total: 0, planned: 0, ongoing: 0, completed: 0 })
const staffingResolved = ref(false)
const trainingResolved = ref(false)

const tabs = [
  { id: 'overview', label: 'Сводка' },
  { id: 'movement', label: 'Движение персонала' },
  { id: 'staffing', label: 'Штат и вакансии' },
  { id: 'training', label: 'Обучение' },
  { id: 'worktime', label: 'Рабочее время' },
]

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

const vacancyTotal = computed(() => staffingLines.value.reduce((sum, row) => sum + Number(row.vacant_units || 0), 0))
const plannedTotal = computed(() => staffingLines.value.reduce((sum, row) => sum + Number(row.planned_units || 0), 0))
const occupiedTotal = computed(() => staffingLines.value.reduce((sum, row) => sum + Number(row.occupied_units || 0), 0))
const trainingTotal = computed(() => trainingResolved.value ? Number(trainingSummary.value.total ?? trainingRows.value.length) : null)

const departmentRows = computed(() => {
  const grouped = new Map<string, number>()
  for (const employee of activeEmployees.value) {
    const name = employee.current_department_name || 'Без подразделения'
    grouped.set(name, (grouped.get(name) ?? 0) + 1)
  }
  const max = Math.max(1, ...grouped.values())
  return [...grouped.entries()]
    .map(([department, employees]) => ({ department, employees, percent: Math.round((employees / max) * 100) }))
    .sort((a, b) => b.employees - a.employees || a.department.localeCompare(b.department, 'ru'))
})

const staffingDepartmentRows = computed(() => {
  const grouped = new Map<string, { department: string; planned: number; occupied: number; vacant: number }>()
  for (const line of staffingLines.value) {
    const current = grouped.get(line.department_name) ?? {
      department: line.department_name,
      planned: 0,
      occupied: 0,
      vacant: 0,
    }
    current.planned += Number(line.planned_units || 0)
    current.occupied += Number(line.occupied_units || 0)
    current.vacant += Number(line.vacant_units || 0)
    grouped.set(line.department_name, current)
  }
  return [...grouped.values()]
    .map(row => ({
      ...row,
      fill_rate: row.planned ? Math.round((row.occupied / row.planned) * 100) : 0,
    }))
    .sort((a, b) => b.vacant - a.vacant || a.department.localeCompare(b.department, 'ru'))
})

const demoTimesheetRows = computed(() => demoMode ? buildDemoTimesheet(activeEmployees.value, month.value) : [])
const worktimeSummary = computed(() => demoTimesheetSummary(demoTimesheetRows.value))
const worktimeDepartmentRows = computed(() => {
  const grouped = new Map<string, {
    department: string
    employees: number
    planned: number
    worked: number
    absence: number
    overtime: number
  }>()
  for (const row of demoTimesheetRows.value) {
    const current = grouped.get(row.department) ?? {
      department: row.department,
      employees: 0,
      planned: 0,
      worked: 0,
      absence: 0,
      overtime: 0,
    }
    current.employees += 1
    current.planned += row.planned_hours
    current.worked += row.worked_hours
    current.absence += row.absence_hours
    current.overtime += row.overtime_hours
    grouped.set(row.department, current)
  }
  return [...grouped.values()].sort((a, b) => b.absence - a.absence || b.overtime - a.overtime)
})

const movementColumns = [
  { key: 'effective_on', label: 'Дата' },
  { key: 'action_type', label: 'Действие' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'transition', label: 'Изменение' },
  { key: 'basis_reference', label: 'Основание' },
]
const staffingColumns = [
  { key: 'department', label: 'Подразделение' },
  { key: 'planned', label: 'Ставок' },
  { key: 'occupied', label: 'Занято' },
  { key: 'vacant', label: 'Вакантно' },
  { key: 'fill_rate', label: 'Заполнение' },
]
const trainingColumns = [
  { key: 'employee', label: 'Сотрудник' },
  { key: 'topic', label: 'Тема' },
  { key: 'training_mode', label: 'Формат' },
  { key: 'started_on', label: 'Начало' },
  { key: 'ended_on', label: 'Окончание' },
  { key: 'development_status', label: 'Статус' },
]
const worktimeColumns = [
  { key: 'department', label: 'Подразделение' },
  { key: 'employees', label: 'Сотрудников' },
  { key: 'planned', label: 'План' },
  { key: 'worked', label: 'Отработано' },
  { key: 'absence', label: 'Неявки' },
  { key: 'overtime', label: 'Сверхурочно' },
]

function setTab(value: string) {
  if (['overview', 'movement', 'staffing', 'training', 'worktime'].includes(value)) {
    activeTab.value = value as ReportTab
  }
}
function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  return value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4)
}
function actionLabel(type: PersonnelActionType): string {
  return type === 'hire' ? 'Приём' : type === 'transfer' ? 'Перевод' : 'Увольнение'
}
function actionTransition(row: PersonnelActionRow): string {
  const from = [row.source_position_name, row.source_department_name].filter(Boolean).join(' · ')
  const to = [row.target_position_name, row.target_department_name].filter(Boolean).join(' · ')
  if (row.action_type === 'hire') return to || 'Назначение'
  if (row.action_type === 'termination') return from ? from + ' → прекращено' : 'Назначение прекращено'
  return (from || '—') + ' → ' + (to || '—')
}
function employeeName(row: PersonnelActionRow | TrainingRow): string {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}

async function allEmployees(companyId: string, status: 'active' | 'archived') {
  const first = await listEmployees(companyId, 1, '', status)
  const rows = [...first.data]
  const maxAnalyticsPages = 20
  const lastPage = Math.min(first.meta.last_page, maxAnalyticsPages)
  const remainingPages = Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) => index + 2)
  for (let index = 0; index < remainingPages.length; index += 5) {
    const batch = remainingPages.slice(index, index + 5)
    const results = await Promise.all(batch.map(page => listEmployees(companyId, page, '', status)))
    for (const result of results) rows.push(...result.data)
  }
  return {
    rows,
    total: first.meta.total,
    truncated: first.meta.last_page > maxAnalyticsPages,
  }
}

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value)) company.value = result.data[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    loadingCompanies.value = false
  }
}

let generation = 0
async function loadReport() {
  const companyId = company.value
  const current = ++generation
  activeEmployees.value = []
  activeTotal.value = null
  archivedTotal.value = null
  activeEmployeesTruncated.value = false
  actionRows.value = []
  actionTotal.value = null
  actionSummary.value = { hire: null, transfer: null, termination: null }
  staffingPlan.value = null
  staffingLines.value = []
  staffingResolved.value = false
  trainingRows.value = []
  trainingSummary.value = { total: 0, planned: 0, ongoing: 0, completed: 0 }
  trainingResolved.value = false
  warning.value = ''
  if (!companyId) return

  loading.value = true
  error.value = ''
  try {
    const [
      activeResult,
      archivedResult,
      actionsResult,
      hiresResult,
      transfersResult,
      terminationsResult,
      plansResult,
      trainingResult,
    ] = await Promise.allSettled([
      allEmployees(companyId, 'active'),
      allEmployees(companyId, 'archived'),
      listPersonnelActions(companyId, 1),
      listPersonnelActions(companyId, 1, 'hire'),
      listPersonnelActions(companyId, 1, 'transfer'),
      listPersonnelActions(companyId, 1, 'termination'),
      listStaffingPlans(companyId),
      getCompanyDevelopment<TrainingRow>(companyId, 'training', { page: 1, status: 'all' }),
    ])
    if (current !== generation) return

    const missing: string[] = []
    if (activeResult.status === 'fulfilled') {
      activeEmployees.value = activeResult.value.rows
      activeTotal.value = activeResult.value.total
      activeEmployeesTruncated.value = activeResult.value.truncated
    } else {
      missing.push('активные сотрудники')
    }
    if (archivedResult.status === 'fulfilled') archivedTotal.value = archivedResult.value.total
    else missing.push('архив сотрудников')

    if (actionsResult.status === 'fulfilled') {
      actionRows.value = actionsResult.value.data
      actionTotal.value = actionsResult.value.meta.total
    } else {
      missing.push('журнал кадровых действий')
    }
    actionSummary.value = {
      hire: hiresResult.status === 'fulfilled' ? hiresResult.value.meta.total : null,
      transfer: transfersResult.status === 'fulfilled' ? transfersResult.value.meta.total : null,
      termination: terminationsResult.status === 'fulfilled' ? terminationsResult.value.meta.total : null,
    }
    if ([hiresResult, transfersResult, terminationsResult].some(result => result.status === 'rejected')) {
      missing.push('сводка движения персонала')
    }

    if (trainingResult.status === 'fulfilled') {
      trainingRows.value = trainingResult.value.data
      trainingSummary.value = {
        total: trainingResult.value.meta.total,
        ...trainingResult.value.meta.summary,
      }
      trainingResolved.value = true
    } else {
      missing.push('обучение')
    }

    if (plansResult.status === 'fulfilled') {
      const preferred = preferredApprovedStaffingPlan(plansResult.value.data)
      staffingResolved.value = true
      if (preferred) {
        staffingPlan.value = preferred
        try {
          const detail = await getStaffingPlan(companyId, preferred.id)
          if (current === generation) staffingLines.value = detail.lines
        } catch {
          staffingResolved.value = false
          staffingLines.value = []
          missing.push('детали штатного расписания')
        }
      }
    } else {
      missing.push('штатное расписание')
    }

    if (activeEmployeesTruncated.value) {
      missing.push(`распределение по подразделениям ограничено первыми ${activeEmployees.value.length} сотрудниками`)
    }
    warning.value = missing.length
      ? 'Часть аналитики недоступна или ограничена: ' + [...new Set(missing)].join(', ') + '.'
      : ''
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось собрать кадровую аналитику'
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(company, loadReport)
onMounted(loadCompanies)
</script>

<template>
  <section class="reports-page">
    <div class="reports-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Отчёты и аналитика</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="warning" tone="warning">{{ warning }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="reports-heading">
        <div>
          <h1>Отчёты и аналитика</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="reports-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseFormField v-if="activeTab === 'worktime'" v-model="month" label="Период рабочего времени" type="month" />
        </div>
      </div>

      <BaseViewTabs :model-value="activeTab" :options="tabs" label="Разделы кадровой аналитики"
        @update:model-value="setTab" />

      <div class="reports-summary" aria-label="Кадровая аналитика">
        <BaseCard class="summary-card">
          <UsersRound :size="19" aria-hidden="true" />
          <span>Сотрудники</span>
          <strong>{{ loading ? '…' : (activeTotal ?? '—') }}</strong>
          <small>{{ archivedTotal === null ? 'архив недоступен' : archivedTotal + ' в архиве' }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <BriefcaseBusiness :size="19" aria-hidden="true" />
          <span>Вакантные ставки</span>
          <strong>{{ loading ? '…' : (staffingResolved && staffingPlan ? vacancyTotal : '—') }}</strong>
          <small>{{ staffingResolved && staffingPlan ? occupiedTotal + ' из ' + plannedTotal + ' занято' : 'нет доступного утверждённого плана' }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <UserRoundCheck :size="19" aria-hidden="true" />
          <span>Кадровые действия</span>
          <strong>{{ loading ? '…' : (actionTotal ?? '—') }}</strong>
          <small>{{ actionTotal === null ? 'журнал недоступен' : 'в журнале компании' }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <GraduationCap :size="19" aria-hidden="true" />
          <span>Обучение</span>
          <strong>{{ loading ? '…' : (trainingTotal ?? '—') }}</strong>
          <small>{{ trainingResolved ? 'зарегистрированных записей' : 'данные обучения недоступны' }}</small>
        </BaseCard>
      </div>

      <template v-if="activeTab === 'overview'">
        <div class="overview-grid">
          <BaseCard class="report-card">
            <div class="section-heading">
              <div><h2>Численность по подразделениям</h2><p>Активные сотрудники.</p></div>
              <span>{{ activeTotal ?? '—' }} сотрудников<span v-if="activeEmployeesTruncated"> · показано {{ activeEmployees.length }}</span></span>
            </div>
            <div v-if="departmentRows.length" class="department-bars">
              <div v-for="row in departmentRows" :key="row.department" class="department-bar-row">
                <div class="bar-label"><span>{{ row.department }}</span><strong>{{ row.employees }}</strong></div>
                <div class="bar-track" aria-hidden="true"><span :style="{ width: row.percent + '%' }" /></div>
              </div>
            </div>
            <p v-else class="empty-copy">Нет данных по подразделениям.</p>
          </BaseCard>

          <BaseCard class="report-card">
            <div class="section-heading">
              <div><h2>Последние кадровые действия</h2><p>Приём, перевод и увольнение.</p></div>
              <RouterLink to="/personnel-actions">Открыть журнал</RouterLink>
            </div>
            <BaseDataTable :rows="actionRows.slice(0, 6)" row-key="id" :loading="loading"
              caption="Последние кадровые действия"
              :columns="[{key:'effective_on',label:'Дата'},{key:'employee',label:'Сотрудник'},{key:'action_type',label:'Действие'}]"
              empty-title="Действий нет" empty-description="Кадровые события ещё не зарегистрированы.">
              <template #cell-effective_on="{ value }">{{ displayDate(value) }}</template>
              <template #cell-employee="{ row }">{{ employeeName(row) }}</template>
              <template #cell-action_type="{ row }">{{ actionLabel(row.action_type) }}</template>
            </BaseDataTable>
          </BaseCard>
        </div>
      </template>

      <BaseCard v-else-if="activeTab === 'movement'" class="report-card">
        <div class="section-heading">
          <div><h2>Движение персонала</h2><p>Последние кадровые действия и точные итоги по типам событий.</p></div>
          <span>Показано {{ actionRows.length }} из {{ actionTotal ?? '—' }}</span>
        </div>
        <div class="inline-metrics">
          <div><span>Приём</span><strong>{{ actionSummary.hire ?? '—' }}</strong></div>
          <div><span>Перевод</span><strong>{{ actionSummary.transfer ?? '—' }}</strong></div>
          <div><span>Увольнение</span><strong>{{ actionSummary.termination ?? '—' }}</strong></div>
        </div>
        <BaseDataTable :rows="actionRows" :columns="movementColumns" row-key="id" :loading="loading"
          caption="Движение персонала" empty-title="Кадровых действий нет"
          empty-description="В журнале компании нет доступных событий.">
          <template #cell-effective_on="{ value }">{{ displayDate(value) }}</template>
          <template #cell-action_type="{ row }">
            <span class="action-pill" :class="'action-pill--' + row.action_type">{{ actionLabel(row.action_type) }}</span>
          </template>
          <template #cell-employee="{ row }">
            <RouterLink class="employee-link"
              :to="{ name:'employee-detail', params:{ company, employee:row.employee_id } }">
              {{ employeeName(row) }}
            </RouterLink>
          </template>
          <template #cell-transition="{ row }">{{ actionTransition(row) }}</template>
        </BaseDataTable>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'staffing'" class="report-card">
        <div class="section-heading">
          <div>
            <h2>Штат и вакансии</h2>
            <p>{{ staffingPlan?.name || 'Действующее штатное расписание' }}</p>
          </div>
          <span>{{ vacancyTotal }} вакансий</span>
        </div>
        <div class="inline-metrics">
          <div><span>Плановых ставок</span><strong>{{ plannedTotal }}</strong></div>
          <div><span>Занято</span><strong>{{ occupiedTotal }}</strong></div>
          <div><span>Вакантно</span><strong>{{ vacancyTotal }}</strong></div>
        </div>
        <BaseDataTable :rows="staffingDepartmentRows" :columns="staffingColumns" row-key="department"
          :loading="loading" caption="Штат и вакансии по подразделениям"
          empty-title="Штатных данных нет" empty-description="Нет доступного утверждённого штатного расписания.">
          <template #cell-fill_rate="{ value }">{{ value }}%</template>
        </BaseDataTable>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'training'" class="report-card">
        <div class="section-heading">
          <div><h2>Обучение сотрудников</h2><p>Состояние зарегистрированных программ обучения; таблица показывает последнюю доступную страницу.</p></div>
          <span>{{ trainingTotal ?? '—' }} записей</span>
        </div>
        <div class="inline-metrics">
          <div><span>Запланировано</span><strong>{{ trainingSummary.planned ?? 0 }}</strong></div>
          <div><span>В процессе</span><strong>{{ trainingSummary.ongoing ?? 0 }}</strong></div>
          <div><span>Завершено</span><strong>{{ trainingSummary.completed ?? 0 }}</strong></div>
        </div>
        <BaseDataTable :rows="trainingRows" :columns="trainingColumns" row-key="id" :loading="loading"
          caption="Аналитика обучения" empty-title="Обучение не зарегистрировано"
          empty-description="В компании нет доступных записей обучения.">
          <template #cell-employee="{ row }">
            <RouterLink class="employee-link"
              :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'development' } }">
              {{ employeeName(row) }}
            </RouterLink>
          </template>
          <template #cell-training_mode="{ value }">{{ trainingModeName(String(value)) }}</template>
          <template #cell-started_on="{ value }">{{ displayDate(value) }}</template>
          <template #cell-ended_on="{ value }">{{ displayDate(value) }}</template>
          <template #cell-development_status="{ row }">
            {{ developmentStatusName('training', row.development_status) }}
          </template>
        </BaseDataTable>
      </BaseCard>

      <BaseCard v-else class="report-card">
        <div class="section-heading">
          <div><h2>Использование рабочего времени</h2><p>{{ monthLabel }} · по подразделениям.</p></div>
          <RouterLink to="/timesheets">Открыть табель</RouterLink>
        </div>
        <BaseNotice v-if="!demoMode" tone="info">
          Показатели рабочего времени не формируются до подключения рабочего источника табельного учёта.
        </BaseNotice>
        <template v-else>
          <div class="inline-metrics">
            <div><span>План</span><strong>{{ worktimeSummary.planned.toLocaleString('ru-RU') }} ч</strong></div>
            <div><span>Отработано</span><strong>{{ worktimeSummary.worked.toLocaleString('ru-RU') }} ч</strong></div>
            <div><span>Неявки</span><strong>{{ worktimeSummary.absence.toLocaleString('ru-RU') }} ч</strong></div>
            <div><span>Сверхурочно</span><strong>{{ worktimeSummary.overtime.toLocaleString('ru-RU') }} ч</strong></div>
          </div>
          <BaseDataTable :rows="worktimeDepartmentRows" :columns="worktimeColumns" row-key="department"
            :loading="loading" caption="Рабочее время по подразделениям"
            empty-title="Данных рабочего времени нет"
            empty-description="Для выбранного периода аналитика рабочего времени недоступна.">
            <template #cell-planned="{ value }">{{ value }} ч</template>
            <template #cell-worked="{ value }">{{ value }} ч</template>
            <template #cell-absence="{ value }">{{ value }} ч</template>
            <template #cell-overtime="{ value }">{{ value }} ч</template>
          </BaseDataTable>
        </template>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
.reports-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.reports-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.reports-breadcrumb img{width:15px;height:15px}
.reports-breadcrumb strong{color:var(--color-text);font-weight:500}
.reports-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.reports-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.reports-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.reports-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.reports-controls :deep(.base-select-field),.reports-controls :deep(.field){width:220px;max-width:220px}
.reports-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.summary-card{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:start;gap:5px 9px;min-height:104px}
.summary-card svg{grid-column:2;grid-row:1;color:var(--color-primary);justify-self:end}
.summary-card>span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;font-weight:600}
.summary-card>strong{grid-column:1/-1;color:var(--color-primary);font-size:24px;line-height:1.1}
.summary-card>small{grid-column:1/-1;color:var(--color-muted);font-size:10px;line-height:1.4}
.overview-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:12px;align-items:start}
.report-card{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-heading>span{color:var(--color-muted);font-size:11px}
.section-heading>a{color:var(--color-primary);font-size:11px;font-weight:700}
.department-bars{display:grid;gap:12px}
.department-bar-row{display:grid;gap:6px}
.bar-label{display:flex;align-items:center;justify-content:space-between;gap:10px}
.bar-label span{min-width:0;color:var(--color-text);font-size:11px;overflow-wrap:anywhere}
.bar-label strong{flex:none;color:var(--color-primary);font-size:12px}
.bar-track{height:7px;overflow:hidden;border-radius:999px;background:var(--color-soft)}
.bar-track span{display:block;height:100%;border-radius:inherit;background:var(--color-primary)}
.empty-copy{margin:0;padding:20px 0;color:var(--color-muted);text-align:center;font-size:11px}
.inline-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:14px}
.inline-metrics>div{display:grid;gap:4px;padding:10px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-soft)}
.inline-metrics span{color:var(--color-muted);font-size:10px}
.inline-metrics strong{color:var(--color-text);font-size:17px;line-height:1.2}
.employee-link{color:var(--color-text);font-weight:600}
.employee-link:hover{color:var(--color-primary)}
.action-pill{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}
.action-pill--hire{background:var(--color-success-surface);color:var(--color-success)}
.action-pill--transfer{background:var(--color-accent-soft);color:var(--color-primary)}
.action-pill--termination{background:var(--color-warning-surface);color:var(--color-warning)}
@media(max-width:1050px){
  .reports-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .overview-grid{grid-template-columns:1fr}
}
@media(max-width:760px){
  .inline-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:650px){
  .reports-controls{display:grid;grid-template-columns:1fr;width:100%}
  .reports-controls :deep(.base-select-field),.reports-controls :deep(.field){width:100%;max-width:none}
  .reports-summary{gap:8px}
  .summary-card{min-height:94px}
  .summary-card>strong{font-size:21px}
}
</style>
