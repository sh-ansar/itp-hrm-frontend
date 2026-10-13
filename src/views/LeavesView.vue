<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarDays, Clock3, TriangleAlert, UsersRound } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { getLeaves, type LeaveResponse, type LeaveRow } from '../api/leaves'
import { localTodayISO } from '../utils/localDate'
import {
  buildDemoLeaves,
  leaveMonths,
  leaveSummary,
  leaveTypeRows,
  type DemoLeaveRow,
  type DemoLeaveStatus,
} from '../mocks/leavesDemo'

type LeaveTab = 'schedule' | 'months' | 'types'

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const year = ref(localTodayISO().slice(0, 4))
const activeTab = ref<LeaveTab>('schedule')
const employees = ref<EmployeeRecord[]>([])
const productionLeaves = ref<LeaveRow[]>([])
const productionMeta = ref<LeaveResponse['meta'] | null>(null)
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
let generation = 0

const tabs = [
  { id: 'schedule', label: 'График отпусков' },
  { id: 'months', label: 'По месяцам' },
  { id: 'types', label: 'Категории' },
]
const currentYear = Number(localTodayISO().slice(0, 4))
const yearOptions = Array.from({ length: 5 }, (_, index) => {
  const value = currentYear - 2 + index
  return { id: String(value), name: String(value) }
})

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const rows = computed<DemoLeaveRow[]>(() => {
  if (demoMode) return buildDemoLeaves(employees.value, Number(year.value))
  return productionLeaves.value.map(row => ({
    id: row.id,
    employee_id: row.employee_id,
    personnel_number: row.personnel_number,
    full_name: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' '),
    department: row.department_name || 'Без подразделения',
    position: row.position_name || 'Без должности',
    leave_type: row.leave_type_name,
    started_on: row.started_on,
    ended_on: row.ended_on,
    days: row.days,
    status: row.status,
    schedule_state: row.schedule_state,
  }))
})
const summary = computed(() => {
  if (demoMode) {
    const value = leaveSummary(rows.value)
    return {
      ...value,
      employees: new Set(rows.value.map(row => row.employee_id)).size,
    }
  }
  return productionMeta.value?.summary ?? {
    total: 0,
    employees: 0,
    days: 0,
    planned: 0,
    ongoing: 0,
    completed: 0,
    shifted: 0,
  }
})
const monthRows = computed(() => leaveMonths(rows.value))
const typeRows = computed(() => leaveTypeRows(rows.value))
const maxMonthEmployees = computed(() => Math.max(1, ...monthRows.value.map(row => row.employees)))

const scheduleColumns = [
  { key: 'employee', label: 'Сотрудник' },
  { key: 'leave_type', label: 'Вид отпуска' },
  { key: 'period', label: 'Период' },
  { key: 'days', label: 'Дней' },
  { key: 'status', label: 'Статус' },
  { key: 'schedule_state', label: 'Исполнение графика' },
]
const monthColumns = [
  { key: 'label', label: 'Месяц' },
  { key: 'employees', label: 'Сотрудников' },
  { key: 'days', label: 'Дней' },
  { key: 'planned', label: 'Запланировано' },
  { key: 'ongoing', label: 'Сейчас' },
  { key: 'completed', label: 'Завершено' },
]
const typeColumns = [
  { key: 'type', label: 'Категория' },
  { key: 'employees', label: 'Сотрудников' },
  { key: 'days', label: 'Дней' },
]

function setTab(value: string) {
  if (['schedule', 'months', 'types'].includes(value)) activeTab.value = value as LeaveTab
}
function displayDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4)
    : value
}
function period(row: DemoLeaveRow): string {
  return displayDate(row.started_on) + ' — ' + displayDate(row.ended_on)
}
function statusLabel(status: DemoLeaveStatus): string {
  return status === 'planned' ? 'Запланирован'
    : status === 'ongoing' ? 'В отпуске'
    : 'Завершён'
}
function statusClass(status: DemoLeaveStatus): string {
  return 'status-pill--' + status
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

async function loadAllLeaves(companyId: string, selectedYear: number) {
  const first = await getLeaves(companyId, selectedYear, 1)
  const resultRows = [...first.data]
  const remainingPages = Array.from(
    { length: Math.max(0, first.meta.last_page - 1) },
    (_, index) => index + 2,
  )
  for (let index = 0; index < remainingPages.length; index += 5) {
    const batch = remainingPages.slice(index, index + 5)
    const results = await Promise.all(batch.map(page => getLeaves(companyId, selectedYear, page)))
    for (const result of results) resultRows.push(...result.data)
  }
  return { rows: resultRows, meta: first.meta }
}

async function loadWorkspace() {
  const companyId = company.value
  const current = ++generation
  employees.value = []
  productionLeaves.value = []
  productionMeta.value = null
  if (!companyId) return

  loading.value = true
  error.value = ''
  try {
    if (demoMode) {
      const first = await listEmployees(companyId, 1, '', 'active')
      if (current !== generation) return
      const resultRows = [...first.data]
      const lastPage = Math.min(first.meta.last_page, 20)
      for (let index = 2; index <= lastPage; index += 5) {
        const batch = Array.from(
          { length: Math.min(5, lastPage - index + 1) },
          (_, offset) => index + offset,
        )
        const results = await Promise.all(batch.map(page => listEmployees(companyId, page, '', 'active')))
        if (current !== generation) return
        for (const result of results) resultRows.push(...result.data)
      }
      employees.value = resultRows
      return
    }

    const selectedYear = Number(year.value)
    const result = await loadAllLeaves(companyId, selectedYear)
    if (current !== generation) return
    productionLeaves.value = result.rows
    productionMeta.value = result.meta
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить график отпусков'
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(company, loadWorkspace)
watch(year, () => {
  if (!demoMode) loadWorkspace()
})
onMounted(loadCompanies)
</script>

<template>
  <section class="leaves-page">
    <div class="leaves-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Отпуска</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="leaves-heading">
        <div>
          <h1>Отпуска</h1>
          <p>{{ selectedCompany?.name }} · график на {{ year }} год</p>
        </div>
        <div class="leaves-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseSelectField v-model="year" label="Год" :options="yearOptions" />
        </div>
      </div>

      <BaseNotice v-if="demoMode" tone="info">
        Демонстрационный график формируется из доступных сотрудников и не записывается в production.
      </BaseNotice>
      <BaseNotice v-else-if="productionMeta && productionMeta.total === 0" tone="info">
        На {{ year }} год записи графика отпусков ещё не загружены. Система не формирует плановые даты автоматически.
      </BaseNotice>

      <BaseViewTabs :model-value="activeTab" :options="tabs" label="Разделы графика отпусков"
        @update:model-value="setTab" />

      <div class="leaves-summary" aria-label="Сводка графика отпусков">
        <BaseCard class="summary-card">
          <UsersRound :size="19" aria-hidden="true" />
          <span>Сотрудники</span>
          <strong>{{ loading ? '…' : summary.employees }}</strong>
          <small>уникальных сотрудников</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <CalendarDays :size="19" aria-hidden="true" />
          <span>Дни отпуска</span>
          <strong>{{ loading ? '…' : summary.days }}</strong>
          <small>по всем записям</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <Clock3 :size="19" aria-hidden="true" />
          <span>В отпуске</span>
          <strong>{{ loading ? '…' : summary.ongoing }}</strong>
          <small>на текущий период</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <TriangleAlert :size="19" aria-hidden="true" />
          <span>Перенесено</span>
          <strong>{{ loading ? '…' : summary.shifted }}</strong>
          <small>отклонений от графика</small>
        </BaseCard>
      </div>

      <BaseCard v-if="activeTab === 'schedule'" class="leaves-register">
        <div class="section-heading">
          <div>
            <h2>График отпусков</h2>
            <p>Плановые периоды и контроль исполнения по сотрудникам.</p>
          </div>
          <span>{{ rows.length }} записей</span>
        </div>

        <div class="leaves-desktop">
          <BaseDataTable :rows="rows" :columns="scheduleColumns" row-key="id" :loading="loading"
            caption="График отпусков" empty-title="График пуст"
            empty-description="Для выбранного периода отпусков нет данных.">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                  {{ row.full_name }}
                </RouterLink>
                <span>{{ row.personnel_number }} · {{ row.department }}</span>
              </div>
            </template>
            <template #cell-period="{ row }">{{ period(row) }}</template>
            <template #cell-days="{ value }">{{ value }} дн.</template>
            <template #cell-status="{ row }">
              <span class="status-pill" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </template>
            <template #cell-schedule_state="{ row }">
              <span class="schedule-state" :class="{ 'schedule-state--shifted': row.schedule_state === 'shifted' }">
                {{ row.schedule_state === 'shifted' ? 'Перенесён' : 'По графику' }}
              </span>
            </template>
          </BaseDataTable>
        </div>

        <div class="leaves-mobile">
          <article v-for="row in rows" :key="row.id" class="leave-card">
            <header>
              <div>
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'schedule' } }">
                  {{ row.full_name }}
                </RouterLink>
                <span>{{ row.personnel_number }} · {{ row.position }}</span>
              </div>
              <span class="status-pill" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </header>
            <p>{{ row.leave_type }}</p>
            <dl>
              <div><dt>Период</dt><dd>{{ period(row) }}</dd></div>
              <div><dt>Дней</dt><dd>{{ row.days }}</dd></div>
              <div><dt>График</dt><dd>{{ row.schedule_state === 'shifted' ? 'Перенесён' : 'По графику' }}</dd></div>
            </dl>
          </article>
        </div>
      </BaseCard>

      <BaseCard v-else-if="activeTab === 'months'" class="leaves-register">
        <div class="section-heading">
          <div><h2>Распределение по месяцам</h2><p>Нагрузка графика отпусков в течение года.</p></div>
          <span>{{ year }} год</span>
        </div>
        <div class="month-bars">
          <div v-for="row in monthRows" :key="row.month" class="month-row">
            <span>{{ row.label }}</span>
            <div class="month-track" aria-hidden="true">
              <span :style="{ width: (row.employees / maxMonthEmployees * 100) + '%' }" />
            </div>
            <strong>{{ row.employees }}</strong>
          </div>
        </div>
        <BaseDataTable :rows="monthRows" :columns="monthColumns" row-key="month" :loading="loading"
          caption="График отпусков по месяцам" empty-title="Данных нет"
          empty-description="Нет отпусков для выбранного года.">
          <template #cell-days="{ value }">{{ value }} дн.</template>
        </BaseDataTable>
      </BaseCard>

      <BaseCard v-else class="leaves-register">
        <div class="section-heading">
          <div><h2>Категории отпусков</h2><p>Распределение графика по видам отпусков.</p></div>
          <span>{{ typeRows.length }} категории</span>
        </div>
        <BaseDataTable :rows="typeRows" :columns="typeColumns" row-key="type" :loading="loading"
          caption="Категории отпусков" empty-title="Категорий нет"
          empty-description="Для выбранного года данные отсутствуют.">
          <template #cell-days="{ value }">{{ value }} дн.</template>
        </BaseDataTable>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
.leaves-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.leaves-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.leaves-breadcrumb img{width:15px;height:15px}
.leaves-breadcrumb strong{color:var(--color-text);font-weight:500}
.leaves-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.leaves-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.leaves-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.leaves-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.leaves-controls :deep(.base-select-field){width:220px;max-width:220px}
.leaves-controls :deep(.base-select-field:last-child){width:120px}
.leaves-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.summary-card{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:start;gap:5px 9px;min-height:104px}
.summary-card svg{grid-column:2;grid-row:1;color:var(--color-primary);justify-self:end}
.summary-card>span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;font-weight:600}
.summary-card>strong{grid-column:1/-1;color:var(--color-primary);font-size:24px;line-height:1.1}
.summary-card>small{grid-column:1/-1;color:var(--color-muted);font-size:10px;line-height:1.4}
.leaves-register{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-heading>span{color:var(--color-muted);font-size:11px}
.employee-cell{display:grid;gap:3px;min-width:190px}
.employee-cell a{color:var(--color-text);font-size:12px;font-weight:600}
.employee-cell a:hover{color:var(--color-primary)}
.employee-cell span{color:var(--color-muted);font-size:10px}
.status-pill,.schedule-state{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--ongoing{background:var(--color-warning-surface);color:var(--color-warning)}
.status-pill--completed{background:var(--color-success-surface);color:var(--color-success)}
.schedule-state{background:var(--color-success-surface);color:var(--color-success)}
.schedule-state--shifted{background:var(--color-warning-surface);color:var(--color-warning)}
.leaves-mobile{display:none}
.leave-card{display:grid;gap:10px;padding:13px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
.leave-card header{display:flex;align-items:start;justify-content:space-between;gap:10px}
.leave-card header>div{display:grid;gap:3px;min-width:0}
.leave-card header a{color:var(--color-text);font-size:13px;font-weight:600}
.leave-card header a:hover{color:var(--color-primary)}
.leave-card header span:not(.status-pill){color:var(--color-muted);font-size:10px}
.leave-card>p{margin:0;color:var(--color-muted);font-size:11px}
.leave-card dl{display:grid;grid-template-columns:2fr 1fr 1fr;gap:7px;margin:0}
.leave-card dl div{display:grid;gap:3px;padding:8px;background:var(--color-soft);border-radius:var(--radius-sm)}
.leave-card dt{color:var(--color-muted);font-size:9px}
.leave-card dd{margin:0;color:var(--color-text);font-size:11px;font-weight:600}
.month-bars{display:grid;gap:9px;margin-bottom:16px}
.month-row{display:grid;grid-template-columns:90px minmax(0,1fr) 28px;align-items:center;gap:8px}
.month-row>span{color:var(--color-text);font-size:10px}
.month-row>strong{text-align:right;color:var(--color-primary);font-size:11px}
.month-track{height:7px;overflow:hidden;border-radius:999px;background:var(--color-soft)}
.month-track span{display:block;height:100%;border-radius:inherit;background:var(--color-primary)}
@media(max-width:1000px){.leaves-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.leaves-desktop{display:none}.leaves-mobile{display:grid;gap:9px}}
@media(max-width:650px){
  .leaves-controls{display:grid;grid-template-columns:1fr;width:100%}
  .leaves-controls :deep(.base-select-field),.leaves-controls :deep(.base-select-field:last-child){width:100%;max-width:none}
  .leaves-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .summary-card{min-height:94px}
  .summary-card>strong{font-size:21px}
  .leave-card dl{grid-template-columns:1fr 1fr}
  .leave-card dl div:first-child{grid-column:1/-1}
  .month-row{grid-template-columns:75px minmax(0,1fr) 24px}
}
</style>
