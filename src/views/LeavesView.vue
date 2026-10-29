<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarDays, Download, RefreshCw } from 'lucide-vue-next'
import { publicAsset } from '../utils/publicAsset'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import LeaveManagementPanel from '../components/LeaveManagementPanel.vue'
import LeaveBalanceRegistryPanel from '../components/LeaveBalanceRegistryPanel.vue'
import LeaveCategoriesPanel from '../components/LeaveCategoriesPanel.vue'
import LeaveActualReviewDialog from '../components/LeaveActualReviewDialog.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { getLeaves, type LeaveResponse, type LeaveRow } from '../api/leaves'
import { getLeaveBalanceRegistry, type LeaveBalanceRegistryItem } from '../api/leaveBalances'
import { localTodayISO } from '../utils/localDate'
import { buildDemoLeaves } from '../mocks/leavesDemo'

type Tab = 'schedule' | 'balances' | 'management' | 'types'
const tabs = [
  { id: 'schedule', label: 'График отпусков' },
  { id: 'balances', label: 'Остатки отпусков' },
  { id: 'management', label: 'Управление отпусками' },
  { id: 'types', label: 'Категории отпусков' },
]
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const access = useCompanyAccessStore()
void access.refresh()
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const year = ref(localTodayISO().slice(0, 4))
const tab = ref<Tab>('schedule')
const search = ref('')
const department = ref('')
const status = ref('all')
const actualReviewTarget = ref<LeaveRow | null>(null)
const page = ref(1)
const employees = ref<EmployeeRecord[]>([])
const productionLeaves = ref<LeaveRow[]>([])
const demoLeaves = ref<ReturnType<typeof buildDemoLeaves>>([])
const registry = ref<LeaveBalanceRegistryItem[]>([])
const productionMeta = ref<LeaveResponse['meta'] | null>(null)
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
let generation = 0

const years = Array.from({ length: 9 }, (_, index) => {
  const value = Number(localTodayISO().slice(0, 4)) - 5 + index
  return { id: String(value), name: String(value) }
})
const departments = computed(() => {
  const seen = new Map<string, string>()
  for (const employee of employees.value) {
    if (employee.current_department_id && employee.current_department_name)
      seen.set(employee.current_department_id, employee.current_department_name)
  }
  return [{ id: '', name: 'Все подразделения' }, ...[...seen.entries()]
    .map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name, 'ru'))]
})
const statuses = [
  { id: 'all', name: 'Все статусы' },
  { id: 'planned', name: 'Запланирован' },
  { id: 'ongoing', name: 'В отпуске' },
  { id: 'completed', name: 'Завершён' },
  { id: 'shifted', name: 'Перенесён' },
  { id: 'no-plan', name: 'Без утверждённого плана' },
  { id: 'unverified', name: 'Факт не подтверждён' },
  { id: 'not_taken', name: 'Не использован' },
]
const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
const isHr = computed(() => access.companies.some(row =>
  row.company_id === company.value && ['company_admin', 'hr_specialist'].includes(row.role_code)))
const canManage = computed(() => !demoMode && (productionMeta.value?.can_manage_leave_requests
  || access.companies.some(item => item.company_id === company.value &&
    item.capabilities['leave.requests.review'] === true)))
interface LeavePeriod {
  id: string
  type: string; planned: string; actual: string
  plannedDays: number; actualDays: number | null
  actualUnknown: boolean
  shifted: boolean; status: string
}
interface ScheduleRow extends Record<string, unknown> {
  employee_id: string; full_name: string; personnel_number: string; department: string
  department_id: string; position: string; entitlement: number | null
  carry: number | null; remaining: number | null; plannedDays: number; actualDays: number | null
  unknownActual: boolean; periods: LeavePeriod[]; status: string; transfer: string
}
function date(value: string | null): string {
  if (!value) return '—'
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4) : value
}
function period(start: string | null, end: string | null) {
  return start && end ? date(start) + ' — ' + date(end) : '—'
}
const balanceByEmployee = computed(() => new Map(registry.value.map(e => [e.employee_id, e])))
const visibleLeaveRecords = computed<LeaveRow[]>(() => {
  if (!demoMode) return productionLeaves.value
  return demoLeaves.value.map(item => ({
    id: item.id, employee_id: item.employee_id, personnel_number: item.personnel_number,
    last_name: item.full_name, first_name: '', middle_name: null,
    department_name: item.department, position_name: item.position,
    leave_type_id: '', leave_type_code: '', leave_type_name: item.leave_type,
    annual_days: null, balance_method: null, planned_started_on: item.started_on,
    planned_ended_on: item.ended_on, planned_days: item.days,
    actual_started_on: null, actual_ended_on: null, actual_days: null,
    started_on: item.started_on, ended_on: item.ended_on, days: item.days,
    status: item.status, schedule_state: item.schedule_state, revision: 1,
  }))
})
const scheduleRows = computed<ScheduleRow[]>(() => {
  const grouped = new Map<string, LeaveRow[]>()
  for (const leave of visibleLeaveRecords.value) {
    grouped.set(leave.employee_id, [...(grouped.get(leave.employee_id) ?? []), leave])
  }
  const roster = new Map<string, {
    id: string; full_name: string; number: string; department: string; departmentId: string; position: string
  }>()
  for (const employee of employees.value) {
    roster.set(employee.id, {
      id: employee.id,
      full_name: [employee.last_name,employee.first_name,employee.middle_name].filter(Boolean).join(' '),
      number: employee.personnel_number,
      department: employee.current_department_name ?? 'Без подразделения',
      departmentId: employee.current_department_id ?? '',
      position: employee.current_position_name ?? 'Без должности',
    })
  }
  for (const leave of visibleLeaveRecords.value) {
    if (roster.has(leave.employee_id)) continue
    roster.set(leave.employee_id, {
      id: leave.employee_id,
      full_name: [leave.last_name,leave.first_name,leave.middle_name].filter(Boolean).join(' '),
      number: leave.personnel_number, department: leave.department_name ?? 'Без подразделения',
      departmentId: '', position: leave.position_name ?? 'Без должности',
    })
  }
  const today = localTodayISO()
  return [...roster.values()].map(employee => {
    const periods = (grouped.get(employee.id) ?? []).map(leave => {
      const notTaken = leave.actual_review_state === 'not_taken'
      const confirmed = !!leave.actual_started_on && !!leave.actual_ended_on
        && leave.actual_ended_on <= today && leave.actual_days !== null
      const actualUnknown = !notTaken && !confirmed && leave.planned_ended_on < today
      return {
        id: leave.id, type: leave.leave_type_name,
        planned: period(leave.planned_started_on,leave.planned_ended_on),
        actual: notTaken ? 'Не использован' : confirmed ? period(leave.actual_started_on,leave.actual_ended_on)
          : actualUnknown ? 'Не подтверждён' : '—',
        plannedDays: leave.planned_days, actualDays: notTaken ? 0 : confirmed ? leave.actual_days : null,
        actualUnknown, shifted: leave.schedule_state === 'shifted', status: leave.status,
      }
    })
    const ordinary = balanceByEmployee.value.get(employee.id)?.balances ?? []
    const configured = ordinary.length > 0 && ordinary.every(b => b.granted_days !== null)
    const verified = ordinary.length > 0 && ordinary.every(b => b.unspent_entitlement_days !== null)
    const total = (key: 'granted_days' | 'carried_days' | 'unspent_entitlement_days') =>
      ordinary.reduce((v, b) => v + (b[key] ?? 0), 0)
    const missing = periods.some(p => p.actualUnknown)
    const confirmed = periods.filter(p => p.actualDays !== null)
    const hasShift = periods.some(p => p.shifted)
    const status = !periods.length ? 'no-plan' : periods.every(p => p.status === 'not_taken') ? 'not_taken' : hasShift ? 'shifted'
      : missing ? 'unverified' : periods.some(p => p.status === 'ongoing') ? 'ongoing'
        : periods.every(p => p.status === 'completed') ? 'completed' : 'planned'
    return {
      employee_id: employee.id, full_name: employee.full_name, personnel_number: employee.number,
      department: employee.department, department_id: employee.departmentId,
      position: employee.position, entitlement: configured ? total('granted_days') : null,
      carry: configured ? total('carried_days') : null,
      remaining: verified ? total('unspent_entitlement_days') : null,
      plannedDays: periods.reduce((v,p) => v + p.plannedDays, 0),
      actualDays: confirmed.length ? confirmed.reduce((v,p) => v + (p.actualDays ?? 0), 0)
        : missing ? null : 0,
      unknownActual: missing, periods, status,
      transfer: hasShift ? 'Дата отличается от плана' : '—',
    }
  }).sort((a,b) => a.department.localeCompare(b.department,'ru') ||
    a.full_name.localeCompare(b.full_name,'ru'))
})
const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('ru')
  return scheduleRows.value.filter(row =>
    (!term || [row.full_name,row.personnel_number,row.department,row.position]
      .join(' ').toLocaleLowerCase('ru').includes(term))
    && (!department.value || row.department_id === department.value)
    && (status.value === 'all' || row.status === status.value
      || (status.value === 'shifted' && row.periods.some(p => p.shifted))
      || (status.value === 'unverified' && row.unknownActual)))
})
const pageRows = computed(() => filteredRows.value.slice((page.value - 1) * 25, page.value * 25))
const lastPage = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / 25)))
const columns = [
  { key: 'full_name', label: 'Сотрудник', minWidth: 185 },
  { key: 'department', label: 'Подразделение', minWidth: 160 },
  { key: 'position', label: 'Должность', minWidth: 155 },
  { key: 'entitlement', label: 'Начислено', minWidth: 92 },
  { key: 'carry', label: 'С прошлого года', minWidth: 115 },
  { key: 'plannedDays', label: 'План (дни / даты)', minWidth: 215 },
  { key: 'actualDays', label: 'Факт (дни / даты)', minWidth: 215 },
  { key: 'remaining', label: 'Не использовано', minWidth: 120 },
  { key: 'transfer', label: 'Перенос', minWidth: 140 },
  { key: 'status', label: 'Статус', minWidth: 140 },
]
const stats = computed(() => ({
  people: filteredRows.value.length,
  planned: filteredRows.value.reduce((n,r) => n + r.plannedDays, 0),
  verified: filteredRows.value.reduce((n,r) => n + (r.actualDays ?? 0), 0),
  unverified: filteredRows.value.filter(r => r.unknownActual).length,
}))
function groupDepartment(row: ScheduleRow) { return row.department }
function setTab(value: string) {
  if (tabs.some(item => item.id === value)) tab.value = value as Tab
}
async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!response.data.some(row => row.id === company.value)) company.value = preferCompany(response.data)
  } catch (cause) {
    companies.value = []
    error.value = cause instanceof Error ? cause.message : 'Не удалось получить компании'
  } finally { loadingCompanies.value = false }
}
async function allLeaves(companyId: string, yearNumber: number) {
  const first = await getLeaves(companyId, yearNumber, 1)
  const all = [...first.data]
  for (let next = 2; next <= first.meta.last_page; next += 5) {
    const pages = await Promise.all(Array.from({ length: Math.min(5,first.meta.last_page-next+1) },
      (_, i) => getLeaves(companyId, yearNumber, next + i)))
    for (const result of pages) all.push(...result.data)
  }
  return { data: all, meta: first.meta }
}
async function allEmployees(companyId: string) {
  const first = await listEmployees(companyId, 1, '', 'all', 100)
  const all = [...first.data]
  for (let next = 2; next <= first.meta.last_page; next += 5) {
    const pages = await Promise.all(Array.from({ length: Math.min(5,first.meta.last_page-next+1) },
      (_, i) => listEmployees(companyId, next + i, '', 'all', 100)))
    for (const result of pages) all.push(...result.data)
  }
  return all
}
async function allBalances(companyId: string, selectedYear: number) {
  const first = await getLeaveBalanceRegistry(companyId, selectedYear, 1)
  const all = [...first.data]
  for (let next = 2; next <= first.meta.last_page; next += 5) {
    const pages = await Promise.all(Array.from({ length: Math.min(5,first.meta.last_page-next+1) },
      (_, i) => getLeaveBalanceRegistry(companyId, selectedYear, next + i)))
    for (const result of pages) all.push(...result.data)
  }
  return all
}
async function loadWorkspace() {
  const companyId = company.value
  const token = ++generation
  if (!companyId) return
  loading.value = true
  error.value = ''
  employees.value = []
  registry.value = []
  productionLeaves.value = []
  productionMeta.value = null
  try {
    const employeeLoad = await allEmployees(companyId)
    if (token !== generation) return
    employees.value = employeeLoad
    if (demoMode) {
      demoLeaves.value = buildDemoLeaves(employeeLoad, Number(year.value))
      return
    }
    const leaveResult = await allLeaves(companyId, Number(year.value))
    if (token !== generation) return
    productionLeaves.value = leaveResult.data
    productionMeta.value = leaveResult.meta
    if (isHr.value) {
      // The HR registry is optional for scopes where a leave ledger is private.
      try {
        const balances = await allBalances(companyId, Number(year.value))
        if (token === generation) registry.value = balances
      } catch (cause) {
        if (token === generation) error.value = 'Остатки не загружены: ' +
          (cause instanceof Error ? cause.message : 'нет доступа')
      }
    }
  } catch (cause) {
    if (token === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить график'
  } finally { if (token === generation) loading.value = false }
}
watch([company, year], () => { page.value = 1; search.value = ''; department.value = ''; status.value = 'all'; void loadWorkspace() })
watch([search, department, status], () => { page.value = 1 })
onMounted(loadCompanies)

function safeCsv(value: unknown): string {
  let text = String(value ?? '')
  if (/^[=+@\-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}
function exportCsv() {
  const headers = ['Табельный №','ФИО','Подразделение','Должность','Год',
    'Начислено','Перенос остатка','План (дни)','Плановые даты',
    'Факт (дни)','Фактические даты','Не использовано','Основание переноса','Статус']
  const records = filteredRows.value.map(row => [
    row.personnel_number,row.full_name,row.department,row.position,year.value,
    row.entitlement,row.carry,row.plannedDays,
    row.periods.map(p => p.planned).join(' ; '),row.actualDays,
    row.periods.map(p => p.actual).join(' ; '),row.remaining,
    row.transfer === '—' ? '' : 'Требует подтверждённого основания',
    row.status,
  ])
  const text = '\uFEFF' + [headers,...records].map(row => row.map(safeCsv).join(';')).join('\r\n')
  const href = URL.createObjectURL(new Blob([text],{ type:'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = href
  link.download = 'График_отпусков_' + year.value + '.csv'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 3000)
}
</script>

<template>
  <section class="leaves-page">
    <div class="leaves-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Отпуска</strong>
    </div>
    <div class="leaves-heading">
      <div>
        <h1>Отпуска</h1>
        <p>График, подтверждённое использование и переходящие остатки.</p>
      </div>
      <BaseButton variant="secondary" :disabled="loading" @click="loadWorkspace">
        <RefreshCw :size="15" aria-hidden="true" /> Обновить
      </BaseButton>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>
    <template v-else-if="companies.length">
      <BaseViewTabs :model-value="tab" :options="tabs" label="Разделы отпусков"
        @update:model-value="setTab" />
      <div class="leave-filters" role="search" aria-label="Поиск и фильтры отпусков">
        <BaseFormField v-model="search" label="Поиск сотрудника"
          placeholder="ФИО или табельный номер" />
        <BaseSelectField v-model="company" label="Компания" :options="companies" />
        <BaseSelectField v-model="year" label="Год" :options="years" />
        <BaseSelectField v-model="department" label="Подразделение" :options="departments" />
        <BaseSelectField v-if="tab === 'schedule'" v-model="status" label="Статус" :options="statuses" />
      </div>

      <template v-if="tab === 'schedule'">
        <div class="leave-metrics" aria-label="Сводка графика отпусков">
          <div><span>Сотрудники</span><strong>{{ loading ? '…' : stats.people }}</strong></div>
          <div><span>Запланировано дней</span><strong>{{ loading ? '…' : stats.planned }}</strong></div>
          <div><span>Подтверждено фактически</span><strong>{{ loading ? '…' : stats.verified }}</strong></div>
          <div><span>Факт требует проверки</span><strong>{{ loading ? '…' : stats.unverified }}</strong></div>
        </div>
        <div class="leave-register-toolbar">
          <div><h2>График отпусков · {{ year }}</h2>
            <p>План и факт отдельно. Сотрудники без утверждённых отпусков тоже видны.</p></div>
          <BaseButton variant="secondary" :disabled="!filteredRows.length || loading" @click="exportCsv">
            <Download :size="16" aria-hidden="true" /> Экспорт CSV
          </BaseButton>
        </div>
        <BaseNotice v-if="!demoMode && !loading && !productionLeaves.length" tone="info">
          На выбранный год нет утверждённых периодов. График не создаётся автоматически.
        </BaseNotice>
        <BaseDataTable :rows="pageRows" :columns="columns" row-key="employee_id"
          :loading="loading" :min-table-width="1740" :group-by="groupDepartment"
          caption="График отпусков по образцу Мин и Сол"
          empty-title="Сотрудники не найдены"
          empty-description="Измените поиск, год или фильтры.">
          <template #cell-full_name="{ row }">
            <div class="leave-person">
              <RouterLink :to="{ name:'employee-detail',
                params:{ company, employee:row.employee_id } }">{{ row.full_name }}</RouterLink>
              <span>{{ row.personnel_number }}</span>
            </div>
          </template>
          <template #cell-entitlement="{ row }">{{ row.entitlement ?? '—' }}</template>
          <template #cell-carry="{ row }">{{ row.carry ?? '—' }}</template>
          <template #cell-plannedDays="{ row }">
            <div v-if="row.periods.length" class="leave-intervals">
              <span v-for="item in row.periods" :key="item.id">
                <strong>{{ item.plannedDays }} дн.</strong> · {{ item.planned }}
                <BaseButton v-if="isHr && canManage && !demoMode &&
                  productionLeaves.some(record => record.id === item.id &&
                    (record.planned_ended_on < localTodayISO() || !!record.actual_started_on))"
                  variant="secondary" size="sm" class="leave-actual-edit"
                  :aria-label="'Подтвердить факт отпуска: ' + row.full_name"
                  @click="actualReviewTarget = productionLeaves.find(record => record.id === item.id) ?? null">
                  Подтвердить факт
                </BaseButton>
              </span>
            </div>
            <span v-else>Не запланирован</span>
          </template>
          <template #cell-actualDays="{ row }">
            <div v-if="row.periods.length" class="leave-intervals">
              <span v-for="item in row.periods" :key="item.id">
                <template v-if="item.actualUnknown">Факт не подтверждён</template>
                <template v-else-if="item.actualDays !== null">
                  <strong>{{ item.actualDays }} дн.</strong> · {{ item.actual }}
                </template>
                <template v-else>—</template>
              </span>
            </div>
            <span v-else>—</span>
          </template>
          <template #cell-remaining="{ row }">
            <strong v-if="row.remaining !== null">{{ row.remaining }}</strong>
            <span v-else class="leave-unknown">Не подтверждён</span>
          </template>
          <template #cell-transfer="{ row }">{{ row.transfer }}</template>
          <template #cell-status="{ row }">
            {{ statuses.find(item => item.id === row.status)?.name || row.status }}
          </template>
        </BaseDataTable>
        <BasePagination :page="page" :last-page="lastPage" :total="filteredRows.length"
          :page-size="25" :page-sizes="[25]" :loading="loading"
          caption="Страницы графика отпусков"
          @previous="page--" @next="page++" @select-page="page = $event" />
        <LeaveActualReviewDialog v-if="actualReviewTarget" :record="actualReviewTarget"
          :company-id="company" @close="actualReviewTarget = null"
          @saved="actualReviewTarget = null; loadWorkspace()" />
        <div class="leave-footnote">
          <CalendarDays :size="16" aria-hidden="true" />
          График использует утверждённые периоды. Указанные в старом Excel значения не импортировались в кадровые остатки.
          Перенос с основанием и фактические даты фиксируются отдельно.
        </div>
      </template>
      <LeaveBalanceRegistryPanel v-else-if="tab === 'balances' && isHr && !demoMode"
        :company-id="company" :year="Number(year)" :search="search" :department-id="department" />
      <BaseNotice v-else-if="tab === 'balances'" tone="info">
        Книга отпускных остатков доступна кадровым ролям. Сотрудник видит свои остатки в личном кабинете.
      </BaseNotice>
      <LeaveManagementPanel v-else-if="tab === 'management' && canManage"
        :company-id="company" :year="Number(year)" :search="search"
        :show-category-action="false" @published="loadWorkspace" />
      <BaseNotice v-else-if="tab === 'management'" tone="info">
        Управление заявлениями доступно HR и назначенным руководителям в пределах их полномочий.
      </BaseNotice>
      <LeaveCategoriesPanel v-else-if="tab === 'types' && isHr && !demoMode"
        :company-id="company" :search="search" />
      <BaseNotice v-else-if="tab === 'types'" tone="info">
        Справочник категорий доступен HR и администратору компании.
      </BaseNotice>
    </template>
  </section>
</template>

<style scoped>
.leaves-page{display:grid;gap:15px;min-width:0;max-width:100%;overflow-x:clip}
.leaves-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.leaves-breadcrumb img{width:15px;height:15px}
.leaves-breadcrumb strong{color:var(--color-text);font-weight:500}
.leaves-heading{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap}
.leaves-heading h1{margin:0;color:var(--color-text);font-size:21px;font-weight:700;letter-spacing:-.02em}
.leaves-heading p{margin:5px 0 0;color:var(--color-muted);font-size:12px}
.leave-filters{display:grid;grid-template-columns:minmax(220px,2fr) minmax(170px,1fr)
  105px minmax(170px,1fr) minmax(140px,1fr);align-items:end;gap:10px}
.leave-filters :deep(.field),.leave-filters :deep(.base-select-field){min-width:0;max-width:none}
.leave-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;border-bottom:1px solid var(--color-stroke);padding:2px 0 12px}
.leave-metrics>div{display:grid;gap:5px;min-width:0}
.leave-metrics span{font-size:11px;color:var(--color-muted)}
.leave-metrics strong{font-size:21px;font-weight:650;color:var(--color-text)}
.leave-register-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap}
.leave-register-toolbar h2{margin:0;font-size:16px;font-weight:650}
.leave-register-toolbar p{margin:5px 0 0;color:var(--color-muted);font-size:12px}
.leave-person{display:grid;gap:5px}
.leave-person a{font-size:12px;font-weight:600;color:var(--color-text);text-decoration:underline;text-underline-offset:3px}
.leave-person span{font-size:11px;color:var(--color-muted)}
.leave-intervals{display:grid;gap:6px;min-width:200px;white-space:normal}
.leave-intervals span{font-size:11px;line-height:1.45;color:var(--color-text)}
.leave-intervals strong{font-weight:650}
.leave-unknown{color:var(--color-warning);font-size:11px}
.leave-actual-edit{border:0;background:transparent;padding:2px 0;color:var(--color-primary);font:inherit;font-size:11px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;justify-self:start}
.leave-footnote{display:flex;align-items:start;gap:9px;color:var(--color-muted);font-size:11px;line-height:1.55}
.leave-footnote svg{flex:none;color:var(--color-primary)}
@media(max-width:1160px){.leave-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.leave-filters>div:first-child{grid-column:span 2}}
@media(max-width:700px){.leave-filters{grid-template-columns:1fr 1fr;gap:8px}.leave-filters>div:first-child{grid-column:1/-1}.leave-metrics{grid-template-columns:1fr 1fr}}
@media(max-width:450px){.leave-filters{grid-template-columns:1fr}.leave-filters>div:first-child{grid-column:auto}}
</style>
