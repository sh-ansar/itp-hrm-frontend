<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FolderTree, Plus, Search } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import EmployeeMobileList from '../components/EmployeeMobileList.vue'
import { downloadCsv } from '../utils/exportCsv'
import { listCompanies, listDepartments, type CompanyRecord } from '../api/organization'
import {
  listEmployees, type EmployeeRecord, type EmploymentFilter, type EmploymentStatus,
} from '../api/personnel'

type EmployeeRow = EmployeeRecord & { full_name: string; status_label: string }
const router = useRouter()
const route = useRoute()
const companies = ref<CompanyRecord[]>([])
const employees = ref<EmployeeRecord[]>([])
const selectedCompany = ref('')
const companyLoading = ref(false)
const employeeLoading = ref(false)
const employeeWritesEnabled = ref(false)
const createOpen = ref(false)
const search = ref('')
const searchDraft = ref('')
const statusFilter = ref<EmploymentFilter>('all')
const grouped = ref(false)
const filtersOpen = ref(false)
const selectedIds = ref<string[]>([])
const error = ref('')
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)
const counters = ref({ active: null as number | null, archived: null as number | null, departments: null as number | null, vacancies: null as number | null, expiring: null as number | null })
let generation = 0
let counterGeneration = 0

const tabOptions = [
  { id: 'register', label: 'Реестр сотрудников' },
  { id: 'reserve', label: 'Кадровый резерв и обучение' },
  { id: 'archive', label: 'Архив сотрудников' },
]
const activeTab = computed(() => statusFilter.value === 'archived' ? 'archive' : 'register')
const statusOptions: Array<{ id: EmploymentFilter; label: string }> = [
  { id: 'all', label: 'Все статусы' },
  { id: 'active', label: 'Работает' },
  { id: 'planned', label: 'Приём запланирован' },
  { id: 'unassigned', label: 'Без назначения' },
]
const statusSelectOptions = statusOptions.map(option => ({ id: option.id, name: option.label }))
const statusLabels: Record<EmploymentStatus, string> = {
  active: 'Работает', planned: 'Запланирован', archived: 'В архиве', unassigned: 'Без назначения',
}
const columns = [
  { key: 'selection', label: 'Выбор' },
  { key: 'full_name', label: 'ФИО / Отдел' },
  { key: 'personnel_number', label: 'Таб. №' },
  { key: 'current_position_name', label: 'Должность' },
  { key: 'current_department_name', label: 'Подразделение' },
  { key: 'current_assignment_valid_from', label: 'Дата назначения' },
  { key: 'status_label', label: 'Статус' },
  { key: 'details', label: 'Действие' },
]
const optionalColumns = columns.filter(column => !['full_name', 'details'].includes(column.key))
const columnKeys = ['personnel_number', 'current_position_name', 'current_department_name', 'current_assignment_valid_from', 'status_label']
function savedColumnPreferences(): Record<string, boolean> {
  const initial = Object.fromEntries(columnKeys.map(key => [key, true]))
  try {
    const saved = JSON.parse(localStorage.getItem('hrm-employee-columns-v1') || '{}') as Record<string, unknown>
    for (const key of columnKeys) if (typeof saved[key] === 'boolean') initial[key] = saved[key]
  } catch { /* A blocked or corrupt storage entry must not affect the register. */ }
  return initial
}
const visibleFields = ref<Record<string, boolean>>(savedColumnPreferences())
const visibleColumns = computed(() =>
  columns.filter(column => ['selection', 'full_name', 'details'].includes(column.key) || visibleFields.value[column.key] !== false))
const currentCompany = computed(() => companies.value.find(item => item.id === selectedCompany.value))
const registryRows = computed<EmployeeRow[]>(() => employees.value.map(employee => {
  const state: EmploymentStatus = employee.employment_status
    ?? (employee.current_position_name ? 'active' : 'unassigned')
  return {
    ...employee,
    full_name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' '),
    status_label: statusLabels[state],
  }
}))
function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return day + '.' + month + '.' + year
}
const groupEmployees = (row: EmployeeRow) => row.current_department_name || 'Без подразделения'
const allPageSelected = computed(() => registryRows.value.length > 0 && registryRows.value.every(row => selectedIds.value.includes(row.id)))
const selectedOnPage = computed(() => registryRows.value.filter(row => selectedIds.value.includes(row.id)))
function toggleSelection(id: string, checked: boolean) {
  selectedIds.value = checked ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter(item => item !== id)
}
function togglePageSelection(checked: boolean) {
  const currentIds = registryRows.value.map(row => row.id)
  selectedIds.value = checked ? [...new Set([...selectedIds.value, ...currentIds])] : selectedIds.value.filter(id => !currentIds.includes(id))
}
function exportSelected() {
  const rows = selectedOnPage.value
  if (!rows.length) return
  downloadCsv('employees-selected.csv',
    ['ФИО', 'Табельный номер', 'Должность', 'Подразделение', 'Статус'],
    rows.map(row => [
      row.full_name, row.personnel_number, row.current_position_name,
      row.current_department_name, row.status_label,
    ]),
  )
}

function setTab(next: string) {
  filtersOpen.value = false
  if (next === 'reserve') {
    router.push({ name: 'reserve' })
    return
  }
  setStatus(next === 'archive' ? 'archived' : 'all')
}
function setStatus(status: EmploymentFilter) {
  page.value = 1
  router.replace({
    name: 'employees',
    query: { ...route.query, status: status === 'all' ? undefined : status },
  })
}
function applySearch() {
  page.value = 1
  router.replace({
    name: 'employees',
    query: { ...route.query, q: searchDraft.value.trim() || undefined },
  })
}
function clearSearch() {
  searchDraft.value = ''
  applySearch()
}

async function loadCounters() {
  const company = selectedCompany.value
  const current = ++counterGeneration
  counters.value = { active: null, archived: null, departments: null, vacancies: null, expiring: null }
  if (!company) return
  const result = await Promise.allSettled([
    listEmployees(company, 1, '', 'active'),
    listEmployees(company, 1, '', 'archived'),
    listDepartments(company),
  ])
  if (current !== counterGeneration) return
  const summary = result[0].status === 'fulfilled' ? result[0].value.meta.registry_summary : undefined
  counters.value = {
    active: result[0].status === 'fulfilled' ? result[0].value.meta.total : null,
    archived: result[1].status === 'fulfilled' ? result[1].value.meta.total : null,
    departments: result[2].status === 'fulfilled' ? result[2].value.meta.total : null,
    vacancies: summary?.vacancies ?? null,
    expiring: summary?.expiring_contracts ?? null,
  }
}

async function loadCompanies() {
  companyLoading.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === selectedCompany.value))
      selectedCompany.value = companies.value[0]?.id ?? ''
  } catch (cause) {
    companies.value = []
    selectedCompany.value = ''
    error.value = cause instanceof Error ? cause.message : 'Не удалось получить компании'
  } finally {
    companyLoading.value = false
  }
}
async function loadEmployees() {
  const company = selectedCompany.value
  const current = ++generation
  employees.value = []
  selectedIds.value = []
  total.value = 0
  lastPage.value = 1
  employeeWritesEnabled.value = false
  if (!company) { employeeLoading.value = false; return }
  employeeLoading.value = true
  error.value = ''
  try {
    const response = await listEmployees(company, page.value, search.value, statusFilter.value)
    if (current !== generation) return
    employees.value = response.data
    total.value = response.meta.total
    lastPage.value = response.meta.last_page
    employeeWritesEnabled.value = response.meta.employee_writes_enabled
  } catch (cause) {
    if (current === generation)
      error.value = cause instanceof Error ? cause.message : 'Не удалось получить сотрудников'
  } finally {
    if (current === generation) employeeLoading.value = false
  }
}
async function employeeCreated(employee: EmployeeRecord) {
  createOpen.value = false
  await router.push({ name: 'employee-detail', params: { company: selectedCompany.value, employee: employee.id } })
}

watch(visibleFields, next => {
  try { localStorage.setItem('hrm-employee-columns-v1', JSON.stringify(next)) }
  catch { /* Preferences can remain in memory. */ }
}, { deep: true })
watch(selectedCompany, () => {
  page.value = 1
  loadCounters()
})
watch(() => route.query.q, value => {
  search.value = typeof value === 'string' ? value.trim() : ''
  searchDraft.value = search.value
  page.value = 1
}, { immediate: true })
watch(() => route.query.status, value => {
  const candidate = typeof value === 'string' ? value : 'all'
  statusFilter.value = ['all', 'active', 'planned', 'archived', 'unassigned'].includes(candidate)
    ? candidate as EmploymentFilter : 'all'
  page.value = 1
}, { immediate: true })
watch([selectedCompany, page, search, statusFilter], loadEmployees)
onMounted(loadCompanies)
</script>

<template>
  <section class="personnel-page">
    <div class="registry-breadcrumb"><img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" /><span>/</span><strong>Сотрудники</strong><span>/</span><span>{{ activeTab === 'archive' ? 'Архив сотрудников' : 'Реестр сотрудников' }}</span></div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseViewTabs :model-value="activeTab" :options="tabOptions" label="Разделы реестра сотрудников"
      @update:model-value="setTab" />

    <div class="registry-metrics" aria-label="Сводка по персоналу">
      <BaseCard class="registry-metric">
        <span>Сотрудники</span>
        <img src="/prototype-icons/Info.svg" class="registry-info-icon" alt="" aria-hidden="true" />
        <strong>{{ counters.active ?? '—' }}</strong>
        <small>активных сотрудников</small>
      </BaseCard>
      <BaseCard class="registry-metric">
        <span>Отделы</span>
        <img src="/prototype-icons/Info.svg" class="registry-info-icon" alt="" aria-hidden="true" />
        <strong>{{ counters.departments ?? '—' }}</strong>
        <small>структурных подразделений</small>
      </BaseCard>
      <BaseCard v-if="counters.vacancies !== null" class="registry-metric">
        <span>Вакантные позиции</span>
        <img src="/prototype-icons/Link-External.svg" class="registry-info-icon" alt="" aria-hidden="true" />
        <strong>{{ counters.vacancies }}</strong>
        <small>открытых штатных единиц</small>
      </BaseCard>
      <BaseCard v-if="counters.expiring !== null" class="registry-metric">
        <span>Истекающие договоры</span>
        <img src="/prototype-icons/Filter.svg" class="registry-info-icon" alt="" aria-hidden="true" />
        <strong>{{ counters.expiring }}</strong>
        <small>требуют внимания</small>
      </BaseCard>
    </div>

    <BaseCard class="registry-card">
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <template v-else-if="companies.length">
        <div class="register-heading">
          <div>
            <h1>{{ activeTab === 'archive' ? 'Архив сотрудников' : 'Реестр сотрудников' }} <span>({{ employeeLoading ? '…' : total }})</span></h1>
            <p>{{ currentCompany?.name }} · {{ employeeLoading ? 'Загрузка записей…' : 'отображается ' + registryRows.length + ' из ' + total }}</p>
          </div>
          <div class="register-actions">
            <BaseButton v-if="employeeWritesEnabled && activeTab === 'register'" @click="createOpen = true"><Plus :size="16" /> Добавить сотрудника</BaseButton>
            <div class="company-select"><BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" /></div>
          </div>
        </div>

        <div class="registry-toolbar" aria-label="Настройки реестра">
          <form class="registry-search" role="search" @submit.prevent="applySearch">
            <Search :size="17" aria-hidden="true" />
            <input v-model="searchDraft" type="search" aria-label="Поиск в реестре"
              placeholder="Поиск по ФИО или табельному номеру" />
            <BaseButton type="submit" variant="secondary">Найти</BaseButton>
          </form>
          <BaseButton v-if="activeTab !== 'archive'" variant="secondary" @click="filtersOpen = !filtersOpen" :aria-expanded="filtersOpen">
            <img src="/prototype-icons/Filter.svg" alt="" class="toolbar-icon" /> Фильтры
          </BaseButton>
          <BaseButton variant="secondary" @click="grouped = !grouped">
            <FolderTree :size="16" /> {{ grouped ? 'Без группировки' : 'Группировка' }}
          </BaseButton>
          <BaseColumnPicker v-model="visibleFields" :columns="optionalColumns" title="Настройка колонок" />
          <BaseButton v-if="search" variant="secondary" @click="clearSearch">Сбросить поиск</BaseButton>
        </div>

        <div v-if="filtersOpen" class="registry-filters">
          <BaseSelectField v-if="activeTab !== 'archive'" class="status-select"
            :model-value="statusFilter" label="Статус сотрудника" :options="statusSelectOptions"
            @update:model-value="setStatus($event as EmploymentFilter)" />
          <BaseButton v-if="statusFilter !== 'all'" variant="secondary" @click="setStatus('all')">Сбросить фильтр</BaseButton>
        </div>
        <div class="registry-selection" aria-label="Выбор сотрудников текущей страницы">
          <label><input type="checkbox" :checked="allPageSelected" :disabled="!registryRows.length" @change="togglePageSelection(($event.target as HTMLInputElement).checked)" /> Выбрать страницу</label>
          <span>Выбрано на странице: {{ selectedOnPage.length }} из {{ registryRows.length }}</span>
          <BaseButton v-if="selectedOnPage.length" variant="secondary" @click="exportSelected">Экспорт выбранных CSV</BaseButton>
          <BaseButton v-if="selectedOnPage.length" variant="secondary" @click="selectedIds = []">Снять выделение</BaseButton>
        </div>
        <p v-if="grouped" class="scope-hint">Сгруппированы записи текущей страницы. Фильтры и количество сотрудников рассчитываются по всему реестру.</p>

        <div class="registry-desktop-table">
          <BaseDataTable :rows="registryRows" :columns="visibleColumns" :group-by="grouped ? groupEmployees : undefined"
          row-key="id" caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
          :empty-title="activeTab === 'archive' ? 'В архиве сотрудников нет' : 'Сотрудники не найдены'"
          :empty-description="search ? 'Уточните поиск или сбросьте запрос.' : 'Нет записей для выбранного фильтра.'">
          <template #cell-selection="{ row }">
            <input type="checkbox" :checked="selectedIds.includes(row.id)" :aria-label="'Выбрать сотрудника: ' + row.full_name"
              @change="toggleSelection(row.id, ($event.target as HTMLInputElement).checked)" />
          </template>
          <template #cell-full_name="{ row }">
            <div class="name-cell">
              <RouterLink :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">{{ row.full_name }}</RouterLink>
              <span>{{ row.current_department_name || 'Подразделение не назначено' }}</span>
            </div>
          </template>
          <template #cell-current_position_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-current_department_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-current_assignment_valid_from="{ value }">{{ displayDate(value) }}</template>
          <template #cell-status_label="{ row }">
            <span class="status-pill" :class="'status-pill--' + (row.employment_status ?? 'unassigned')">
              {{ row.status_label }}
            </span>
          </template>
          <template #cell-details="{ row }">
            <RouterLink class="employee-link" :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }" :aria-label="'Открыть карточку: ' + row.full_name" :title="'Открыть карточку: ' + row.full_name"><img src="/prototype-icons/Edit.svg" alt="" /><span class="sr-only">Открыть карточку</span></RouterLink>
          </template>
          </BaseDataTable>
        </div>
        <div class="registry-mobile-list">
          <EmployeeMobileList :rows="registryRows" :company-id="selectedCompany" :selected-ids="selectedIds"
            :loading="employeeLoading" :grouped="grouped" @select="toggleSelection" />
        </div>
        <BasePagination :page="page" :last-page="lastPage" :loading="employeeLoading"
          caption="Страницы реестра сотрудников" @previous="page--" @next="page++" />
      </template>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>

    <BaseDialog :open="createOpen" title="Добавить сотрудника" @close="createOpen = false">
      <EmployeeRecordForm v-if="selectedCompany" :company-id="selectedCompany"
        @saved="employeeCreated" @cancelled="createOpen = false" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.personnel-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;max-width:100%;min-width:0}
.personnel-page :deep(.base-card){border-radius:6px;box-shadow:none}
.personnel-page :deep(table){font-size:13px}
.personnel-page :deep(th){font-weight:600;padding:11px 13px}
.personnel-page :deep(td){vertical-align:middle;padding:10px 13px}
.personnel-page :deep(.table-scroll){border-radius:6px;contain:layout paint}
.registry-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:var(--space-3)}
.registry-metric{display:grid;grid-template-columns:minmax(0,1fr) auto;align-content:start;gap:5px 9px;align-items:start;min-height:122px}
.registry-metric span{font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.01em;color:var(--color-muted);grid-column:1;grid-row:1;line-height:1.4}
.registry-metric :deep(svg){color:var(--color-primary);grid-column:2;grid-row:1}
.registry-metric strong{font-size:25px;color:var(--color-primary);grid-column:1/-1;line-height:1.18}
.registry-metric small{grid-column:1/-1;color:var(--color-muted);font-size:11px;line-height:1.4}
.registry-info-icon{grid-column:2;grid-row:1;width:15px;height:15px;object-fit:contain}
.registry-card{min-width:0;box-shadow:none;background:transparent;border:0;padding:0}
.registry-mobile-list{display:none}
.register-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:var(--space-4);flex-wrap:wrap}
.register-heading h1{font-size:21px;letter-spacing:-.025em;margin:0;line-height:1.25}
.register-heading h1 span{color:var(--color-text);font-size:15px;font-weight:400}
.register-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.register-actions{display:flex;gap:10px;align-items:end;flex-wrap:wrap;justify-content:flex-end}
.company-select{min-width:175px;max-width:260px;flex:1}
.registry-breadcrumb{display:flex;align-items:center;gap:10px;color:var(--color-muted);font-size:12px;min-height:24px}
.registry-breadcrumb img{width:15px;height:15px}
.registry-breadcrumb strong{font-weight:500;color:var(--color-text)}
.registry-toolbar{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)}
.registry-search{display:flex;align-items:center;gap:8px;min-width:260px;flex:1 1 300px;min-height:var(--control-height);padding:3px 4px 3px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);color:var(--color-muted)}
.registry-search:focus-within{border-color:var(--color-primary)}
.registry-search input{border:0;outline:0;flex:1;min-width:0;width:100%;font-size:13px;color:var(--color-text);background:transparent}
.registry-search :deep(button){min-height:36px;padding:7px 12px}
.status-select{flex:0 1 175px;min-width:145px}
.status-select :deep(label){position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.status-select :deep(select){font-size:13px}
.name-cell{min-width:180px;display:grid;gap:3px}
.name-cell a{font-weight:600;color:var(--color-text)}
.name-cell a:hover{color:var(--color-primary);text-decoration:underline}
.name-cell span{font-size:11px;color:var(--color-muted)}
.status-pill{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:var(--color-soft);font-size:11px;font-weight:700;white-space:nowrap}
.status-pill--active{background:var(--color-success-surface);color:var(--color-success)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--archived{background:var(--color-danger-surface);color:var(--color-danger)}
.status-pill--unassigned{background:var(--color-warning-surface);color:var(--color-warning)}
.employee-link{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:4px;color:var(--color-primary)}
.employee-link:hover{background:var(--color-accent-soft)}
.employee-link img{width:17px;height:17px}
.registry-selection{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;min-height:34px;font-size:12px;color:var(--color-muted)}
.registry-selection label{display:inline-flex;align-items:center;gap:8px;font-weight:600;color:var(--color-text);cursor:pointer}
.registry-selection input,.personnel-page :deep(td input[type=checkbox]){accent-color:var(--color-primary);width:15px;height:15px;cursor:pointer}
.registry-selection :deep(button){min-height:30px;padding:5px 10px}
.personnel-page :deep(th:first-child),.personnel-page :deep(td:first-child){width:45px;text-align:center;padding-left:10px;padding-right:10px}
.registry-filters{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:-2px 0 14px;padding:12px 14px;border:1px solid var(--color-stroke);border-radius:6px;background:var(--color-surface)}
.registry-toolbar .toolbar-icon{width:16px;height:16px;object-fit:contain}
.scope-hint{color:var(--color-muted);font-size:12px;line-height:1.5;margin:0 0 12px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:1100px){.registry-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){
  .registry-desktop-table{display:none}
  .registry-mobile-list{display:block}
  .registry-toolbar :deep(.column-settings){display:none}
}
@media(max-width:650px){
  .registry-metrics{gap:8px}
  .registry-metric{min-height:118px}
  .registry-metric strong{font-size:22px}
  .registry-search{min-width:100%;width:100%}
  .registry-toolbar>:deep(button){flex:1 1 auto}
  .status-select{flex:1}.status-select :deep(select){width:100%}
  .company-select{max-width:none;width:100%}
  .register-actions{width:100%;justify-content:stretch}
  .register-actions :deep(button){flex:1}
}
</style>
