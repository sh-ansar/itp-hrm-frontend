<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FolderTree, Maximize2, Minimize2, Plus, Search } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import BaseRegistryMetricCard from '../components/ui/BaseRegistryMetricCard.vue'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseTableBulkActions from '../components/ui/BaseTableBulkActions.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import EmployeeMobileList from '../components/EmployeeMobileList.vue'
import { downloadCsv } from '../utils/exportCsv'
import { listCompanies, listDepartments, type CompanyRecord } from '../api/organization'
import { getStaffingPlan, listStaffingPlans } from '../api/staffing'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'
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
const searchInput = ref<HTMLInputElement | null>(null)
const searchOpen = ref(false)
const fullscreen = ref(false)
const pageSize = ref(10)
const presetAvailable = ref(false)
const presetNotice = ref('')
const statusFilter = ref<EmploymentFilter>('active')
const grouped = ref(false)
const filtersOpen = ref(false)
const selectedIds = ref<string[]>([])
const error = ref('')
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)
const counters = ref({
  active: null as number | null,
  archived: null as number | null,
  departments: null as number | null,
  vacancies: null as number | null,
  plannedUnits: null as number | null,
  expiring: null as number | null,
})
const vacancyPercent = computed(() =>
  counters.value.vacancies !== null && counters.value.plannedUnits !== null && counters.value.plannedUnits > 0
    ? 100 * counters.value.vacancies / counters.value.plannedUnits : null)
let generation = 0
let counterGeneration = 0

const tabOptions = [
  { id: 'register', label: 'Реестр сотрудников' },
  { id: 'development', label: 'Кадровый резерв и обучение' },
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
  { key: 'full_name', label: 'ФИО / Отдел' },
  { key: 'personnel_number', label: 'Таб. №' },
  { key: 'birth_date', label: 'Дата рождения' },
  { key: 'current_assignment_valid_from', label: 'Дата назначения' },
  { key: 'gender', label: 'Пол' },
  { key: 'current_position_name', label: 'Должность' },
  { key: 'current_department_name', label: 'Подразделение' },
  { key: 'status_label', label: 'Статус' },
  { key: 'details', label: 'Действие' },
]
const extendedRegistry = computed(() => ['company_admin', 'hr_specialist'].includes(currentCompany.value?.role_code ?? ''))
const privateColumns = ['birth_date', 'gender']
const optionalColumns = computed(() => columns.filter(column => !['full_name', 'details'].includes(column.key) && (extendedRegistry.value || !privateColumns.includes(column.key))))
const columnKeys = ['birth_date', 'gender', 'personnel_number', 'current_position_name', 'current_department_name', 'current_assignment_valid_from', 'status_label']
function savedColumnPreferences(): Record<string, boolean> {
  const initial = Object.fromEntries(columnKeys.map(key => [key, !['current_position_name', 'current_department_name'].includes(key)]))
  try {
    const saved = JSON.parse(localStorage.getItem('hrm-employee-columns-v1') || '{}') as Record<string, unknown>
    for (const key of columnKeys) if (typeof saved[key] === 'boolean') initial[key] = saved[key]
  } catch { /* A blocked or corrupt storage entry must not affect the register. */ }
  return initial
}
const visibleFields = ref<Record<string, boolean>>(savedColumnPreferences())
const visibleColumns = computed(() =>
  columns.filter(column => (extendedRegistry.value || !privateColumns.includes(column.key)) && (['full_name', 'details'].includes(column.key) || visibleFields.value[column.key] !== false)))
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
const selectedActions = computed(() => [
  { id: 'export_csv', label: 'Экспортировать выбранных в CSV' },
  ...(selectedOnPage.value.length === 1 ? [{ id: 'open_card', label: 'Открыть карточку сотрудника' }] : []),
])
async function executeSelectedAction(action: string) {
  if (action === 'export_csv') exportSelected()
  if (action === 'open_card' && selectedOnPage.value.length === 1) {
    await router.push({ name: 'employee-detail',
      params: { company: selectedCompany.value, employee: selectedOnPage.value[0]!.id } })
  }
}
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

const PRESET_KEY = 'hrm-employee-view-preset-v1'
const exportOptions = computed(() => [
  { id: 'page', label: 'Выгрузить загруженную страницу CSV', disabled: registryRows.value.length === 0 },
  { id: 'selected', label: 'Выгрузить выбранных CSV', disabled: selectedOnPage.value.length === 0 },
])
const registerActionOptions = computed(() => [
  { id: 'select_page', label: 'Выбрать текущую страницу', disabled: !registryRows.value.length },
  { id: 'clear_selection', label: 'Снять выделение', disabled: !selectedOnPage.value.length },
  { id: 'open_selected', label: 'Открыть выбранную карточку', disabled: selectedOnPage.value.length !== 1 },
  { id: 'export_selected', label: 'Экспортировать выбранных CSV', disabled: !selectedOnPage.value.length },
])
const templateOptions = computed(() => [
  { id: 'save', label: 'Сохранить текущий вид', description: 'Только в этом браузере' },
  { id: 'apply', label: 'Применить сохранённый вид', disabled: !presetAvailable.value },
  { id: 'delete', label: 'Удалить сохранённый вид', disabled: !presetAvailable.value },
])
const registryChips = computed(() => [
  ...(search.value ? [{ id: 'search', label: 'Поиск: ' + search.value }] : []),
  ...(statusFilter.value !== 'active' ? [{ id: 'status', label: 'Статус: ' + (statusOptions.find(item => item.id === statusFilter.value)?.label ?? statusFilter.value) }] : []),
  ...(grouped.value ? [{ id: 'group', label: 'По подразделениям' }] : []),
])
function clearChip(id: string) {
  if (id === 'search') clearSearch()
  if (id === 'status') setStatus('active')
  if (id === 'group') grouped.value = false
}
function exportPage() {
  if (!registryRows.value.length) return
  downloadCsv('employees-page-' + page.value + '.csv',
    ['ФИО', 'Табельный номер', 'Дата рождения', 'Дата назначения', 'Пол', 'Подразделение', 'Должность', 'Статус'],
    registryRows.value.map(row => [
      row.full_name, row.personnel_number, displayDate(row.birth_date),
      displayDate(row.current_assignment_valid_from),
      row.gender === 'male' ? 'М' : row.gender === 'female' ? 'Ж' : '—',
      row.current_department_name, row.current_position_name, row.status_label,
    ]),
  )
}
function doExport(id: string) {
  if (id === 'page') exportPage()
  if (id === 'selected') exportSelected()
}
async function doTopAction(id: string) {
  if (id === 'select_page') togglePageSelection(true)
  if (id === 'clear_selection') selectedIds.value = []
  if (id === 'export_selected') exportSelected()
  if (id === 'open_selected' && selectedOnPage.value.length === 1) {
    await router.push({ name: 'employee-detail',
      params: { company: selectedCompany.value, employee: selectedOnPage.value[0]!.id } })
  }
}
async function doRowAction(id: string, row: EmployeeRow) {
  if (id === 'open') await router.push({ name: 'employee-detail',
    params: { company: selectedCompany.value, employee: row.id } })
  if (id === 'select') toggleSelection(row.id, true)
  if (id === 'export') downloadCsv('employee-' + row.personnel_number + '.csv',
    ['ФИО', 'Табельный номер', 'Подразделение', 'Должность', 'Статус'],
    [[row.full_name, row.personnel_number, row.current_department_name, row.current_position_name, row.status_label]])
}
const rowActionOptions = [
  { id: 'open', label: 'Открыть карточку' },
  { id: 'select', label: 'Выбрать сотрудника' },
  { id: 'export', label: 'Экспортировать строку CSV' },
]
function savePreset() {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify({
      columns: visibleFields.value, grouped: grouped.value,
      status: statusFilter.value, perPage: pageSize.value,
    }))
    presetAvailable.value = true
    presetNotice.value = 'Вид сохранён только в этом браузере'
  } catch { presetNotice.value = 'Не удалось сохранить настройки в браузере' }
}
function applyPreset() {
  try {
    const raw = localStorage.getItem(PRESET_KEY)
    if (!raw) return
    const preset = JSON.parse(raw) as Record<string, unknown>
    if (typeof preset.grouped === 'boolean') grouped.value = preset.grouped
    if (typeof preset.columns === 'object' && preset.columns !== null) {
      const values = preset.columns as Record<string, unknown>
      visibleFields.value = {
        ...visibleFields.value,
        ...Object.fromEntries(columnKeys.filter(key => typeof values[key] === 'boolean')
          .map(key => [key, values[key]])),
      }
    }
    if (typeof preset.perPage === 'number' && [10, 15, 25, 50].includes(preset.perPage))
      changePageSize(preset.perPage)
    if (typeof preset.status === 'string' &&
      ['all', 'active', 'planned', 'archived', 'unassigned'].includes(preset.status))
      setStatus(preset.status as EmploymentFilter)
    presetNotice.value = 'Сохранённый вид применён'
  } catch { presetNotice.value = 'Не удалось прочитать сохранённый вид' }
}
function presetAction(id: string) {
  if (id === 'save') savePreset()
  if (id === 'apply') applyPreset()
  if (id === 'delete') {
    try {
      localStorage.removeItem(PRESET_KEY)
      presetAvailable.value = false
      presetNotice.value = 'Сохранённый вид удалён'
    } catch { presetNotice.value = 'Не удалось удалить сохранённый вид' }
  }
}
function changePageSize(size: number) {
  if (![10, 15, 25, 50].includes(size)) return
  pageSize.value = size
  page.value = 1
  selectedIds.value = []
}
async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInput.value?.focus()
  } else if (search.value) clearSearch()
}
function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreen.value) fullscreen.value = false
}
watch(fullscreen, value => document.body.classList.toggle('hrm-register-fullscreen', value))
onBeforeUnmount(() => {
  document.body.classList.remove('hrm-register-fullscreen')
  window.removeEventListener('keydown', handleEscape)
})

function setTab(next: string) {
  filtersOpen.value = false
  if (next === 'development') {
    router.push({ name: 'employees-development' })
    return
  }
  setStatus(next === 'archive' ? 'archived' : 'active')
}
function setStatus(status: EmploymentFilter) {
  page.value = 1
  router.replace({
    name: 'employees',
    query: { ...route.query, status: status === 'active' ? undefined : status },
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
  counters.value = { active: null, archived: null, departments: null, vacancies: null, plannedUnits: null, expiring: null }
  if (!company) return
  const [activeResult, archivedResult, departmentResult, plansResult] = await Promise.allSettled([
    listEmployees(company, 1, '', 'active', 1),
    listEmployees(company, 1, '', 'archived', 1),
    listDepartments(company),
    listStaffingPlans(company),
  ])
  if (current !== counterGeneration) return
  const currentCounters = {
    active: activeResult.status === 'fulfilled' ? activeResult.value.meta.total : null,
    archived: archivedResult.status === 'fulfilled' ? archivedResult.value.meta.total : null,
    departments: departmentResult.status === 'fulfilled' ? departmentResult.value.meta.total : null,
    vacancies: null as number | null,
    plannedUnits: null as number | null,
    // Contracts do not have an authoritative expiry-date API yet.
    expiring: null as number | null,
  }
  if (plansResult.status === 'fulfilled') {
    const approved = preferredApprovedStaffingPlan(plansResult.value.data)
    if (approved) {
      try {
        const detail = await getStaffingPlan(company, approved.id, localTodayISO())
        if (current !== counterGeneration) return
        currentCounters.vacancies = detail.lines.reduce((sum, row) => sum + Number(row.vacant_units || 0), 0)
        currentCounters.plannedUnits = detail.lines.reduce((sum, row) => sum + Number(row.planned_units || 0), 0)
      } catch { /* A staffing permission/error must not invent vacancy totals. */ }
    }
  }
  if (current === counterGeneration) counters.value = currentCounters
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
    const response = await listEmployees(company, page.value, search.value, statusFilter.value, pageSize.value)
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
  if (search.value) searchOpen.value = true
  page.value = 1
}, { immediate: true })
watch(() => route.query.status, value => {
  const candidate = typeof value === 'string' ? value : 'active'
  statusFilter.value = ['all', 'active', 'planned', 'archived', 'unassigned'].includes(candidate)
    ? candidate as EmploymentFilter : 'active'
  page.value = 1
}, { immediate: true })
watch([selectedCompany, page, search, statusFilter, pageSize], loadEmployees)
onMounted(() => {
  loadCompanies()
  window.addEventListener('keydown', handleEscape)
  try { presetAvailable.value = Boolean(localStorage.getItem(PRESET_KEY)) } catch { presetAvailable.value = false }
})
</script>

<template>
  <section class="personnel-page">
    <div class="registry-breadcrumb"><img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" /><span>/</span><strong>Сотрудники</strong><span>/</span><span>{{ activeTab === 'archive' ? 'Архив сотрудников' : 'Реестр сотрудников' }}</span></div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseViewTabs :model-value="activeTab" :options="tabOptions" label="Разделы реестра сотрудников"
      @update:model-value="setTab" />

    <BaseKpiGrid class="registry-metrics" label="Сводка по персоналу">
      <BaseRegistryMetricCard title="Сотрудники" :value="counters.active"
        description="активных сотрудников работают в компании"
        icon="/prototype-icons/Info.svg" />
      <BaseRegistryMetricCard title="Отделы" :value="counters.departments"
        description="структурных подразделений в компании"
        icon="/prototype-icons/Info.svg" to="/organization" />
      <BaseRegistryMetricCard title="Вакантные позиции" :value="counters.vacancies"
        kind="ring" :percentage="vacancyPercent"
        :description="counters.plannedUnits === null ? 'Нет данных утверждённого штата' : 'из '+counters.plannedUnits+' штатных единиц'"
        icon="/prototype-icons/Link-External.svg" to="/staffing?view=vacant" />
      <BaseRegistryMetricCard title="Истекающие договоры" :value="counters.expiring"
        description="сроки договоров пока не учитываются в API"
        icon="/prototype-icons/Info.svg" tone="danger" />
    </BaseKpiGrid>

    <BaseCard class="registry-card" :class="{ 'registry-card--fullscreen': fullscreen }">
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <template v-else-if="companies.length">
        <div class="register-heading">
          <div class="register-title">
            <h1>{{ activeTab === 'archive' ? 'Архив сотрудников' : 'Реестр сотрудников' }}
              <span>({{ employeeLoading ? '…' : registryRows.length }} из {{ total }})</span>
            </h1>
            <p v-if="companies.length===1">{{ currentCompany?.name }}</p>
          </div>
          <div class="register-actions">
            <BaseActionDropdown label="Экспорт" :options="exportOptions" @select="doExport" />
            <BaseActionDropdown label="Действия" variant="primary"
              :options="registerActionOptions" @select="doTopAction" />
            <button type="button" class="registry-fullscreen-toggle" :aria-label="fullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
              :title="fullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
              @click="toggleFullscreen">
              <Minimize2 v-if="fullscreen" :size="18" aria-hidden="true" />
              <Maximize2 v-else :size="18" aria-hidden="true" />
            </button>
            <BaseButton v-if="employeeWritesEnabled && activeTab === 'register'" @click="createOpen = true">
              <Plus :size="16" /> Добавить сотрудника
            </BaseButton>
            <div v-if="companies.length > 1" class="company-select">
              <BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" />
            </div>
          </div>
        </div>

        <div class="registry-toolbar" aria-label="Настройки реестра">
          <button type="button" class="registry-tool-button"
            :aria-expanded="searchOpen" @click="toggleSearch">
            <Search :size="16" aria-hidden="true" /> Поиск
          </button>
          <form class="registry-search" :class="{ 'registry-search--open': searchOpen }"
            role="search" @submit.prevent="applySearch">
            <Search :size="17" aria-hidden="true" />
            <input ref="searchInput" v-model="searchDraft" type="search" aria-label="Поиск в реестре"
              placeholder="ФИО или табельный номер" />
            <BaseButton type="submit" variant="secondary">Найти</BaseButton>
            <button v-if="searchDraft || search" type="button" class="registry-search-clear"
              aria-label="Очистить поиск" @click="clearSearch">×</button>
          </form>
          <BaseButton variant="secondary" @click="filtersOpen = !filtersOpen" :aria-expanded="filtersOpen">
            <img src="/prototype-icons/Filter.svg" alt="" class="toolbar-icon" /> Фильтры
          </BaseButton>
          <BaseButton variant="secondary" @click="grouped = !grouped" :aria-pressed="grouped">
            <FolderTree :size="16" /> {{ grouped ? 'Без группировки' : 'Группировка' }}
          </BaseButton>
          <BaseColumnPicker v-model="visibleFields" :columns="optionalColumns" title="Настройка колонок" />
          <div class="registry-toolbar-spacer"></div>
          <BaseActionDropdown label="Шаблоны" :options="templateOptions" @select="presetAction" />
        </div>

        <div v-if="filtersOpen" class="registry-filters">
          <BaseSelectField class="status-select"
            :model-value="statusFilter" label="Статус сотрудника" :options="statusSelectOptions"
            @update:model-value="setStatus($event as EmploymentFilter)" />
          <BaseButton v-if="statusFilter !== 'active'" variant="secondary" @click="setStatus('active')">Сбросить фильтр</BaseButton>
        </div>

        <div v-if="registryChips.length" class="registry-chips" aria-label="Активные фильтры реестра">
          <button v-for="chip in registryChips" :key="chip.id" type="button" class="registry-chip"
            :aria-label="'Сбросить: '+chip.label" @click="clearChip(chip.id)">
            {{ chip.label }} <span aria-hidden="true">×</span>
          </button>
        </div>
        <p v-if="presetNotice" role="status" class="registry-preset-notice">{{ presetNotice }}</p>
        <BaseTableBulkActions :count="selectedOnPage.length" subject="сотрудников"
          :options="selectedActions" @execute="executeSelectedAction" @clear="selectedIds = []" />
        <p v-if="grouped" class="scope-hint">Сгруппированы записи текущей страницы. Фильтры и количество сотрудников рассчитываются по всему реестру.</p>

        <div class="registry-desktop-table">
          <BaseDataTable :rows="registryRows" :columns="visibleColumns" :group-by="grouped ? groupEmployees : undefined"
          selectable selection-label="Выбрать сотрудника" v-model:selected-keys="selectedIds"
          row-key="id" caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
          :empty-title="activeTab === 'archive' ? 'В архиве сотрудников нет' : 'Сотрудники не найдены'"
          :empty-description="search ? 'Уточните поиск или сбросьте запрос.' : 'Нет записей для выбранного фильтра.'">
          <template #cell-full_name="{ row }">
            <div class="name-cell">
              <RouterLink :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">{{ row.full_name }}</RouterLink>
              <span>{{ row.current_department_name || 'Подразделение не назначено' }}</span>
            </div>
          </template>
          <template #cell-birth_date="{ value }">{{ displayDate(value) }}</template>
          <template #cell-gender="{ value }">{{ value === 'male' ? 'М' : value === 'female' ? 'Ж' : '—' }}</template>
          <template #cell-current_position_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-current_department_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-current_assignment_valid_from="{ value }">{{ displayDate(value) }}</template>
          <template #cell-status_label="{ row }">
            <BaseStatusPill :tone="row.employment_status === 'active' ? 'success'
              : row.employment_status === 'archived' ? 'danger'
              : row.employment_status === 'planned' ? 'info' : 'warning'">{{ row.status_label }}</BaseStatusPill>
          </template>
          <template #cell-details="{ row }">
            <div class="employee-row-actions">
              <RouterLink class="employee-link" :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }"
                :aria-label="'Открыть карточку: ' + row.full_name" :title="'Открыть карточку: ' + row.full_name">
                <img src="/prototype-icons/Edit.svg" alt="" /><span class="sr-only">Открыть карточку</span>
              </RouterLink>
              <BaseActionDropdown variant="icon" :label="'Действия сотрудника: '+row.full_name"
                :options="rowActionOptions" @select="doRowAction($event, row)" />
            </div>
          </template>
          </BaseDataTable>
        </div>
        <div class="registry-mobile-list">
          <EmployeeMobileList :rows="registryRows" :company-id="selectedCompany" :selected-ids="selectedIds"
            :loading="employeeLoading" :grouped="grouped" @select="toggleSelection" />
        </div>
        <div class="registry-bottomline">
          <span class="registry-selection" aria-live="polite">
            Выбрано на странице: {{ selectedOnPage.length }} из {{ registryRows.length }}
          </span>
          <BasePagination :page="page" :last-page="lastPage" :loading="employeeLoading"
            :total="total" :page-size="pageSize"
            caption="Страницы реестра сотрудников"
            @previous="page--" @next="page++" @select-page="page=$event"
            @change-page-size="changePageSize" />
        </div>
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
.personnel-page{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;max-width:100%;min-width:0}
.registry-breadcrumb{display:flex;align-items:center;gap:10px;color:var(--color-muted);font-size:12px;min-height:24px}
.registry-breadcrumb img{width:15px;height:15px}
.registry-breadcrumb strong{font-weight:500;color:var(--color-text)}
.registry-metrics{min-width:0;gap:12px}
.registry-card{min-width:0;background:transparent;border:0;box-shadow:none;padding:0}
.registry-card--fullscreen{
  position:fixed;z-index:220;inset:10px;display:block;
  max-width:none;overflow:auto;background:var(--color-page);
  border:1px solid var(--color-stroke);border-radius:10px;
  padding:18px;box-shadow:var(--shadow-float)
}
:global(body.hrm-register-fullscreen){overflow:hidden}
.register-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:2px 0 14px}
.register-title{display:grid;gap:3px;min-width:0}
.register-title h1{margin:0;color:var(--color-text);font-size:22px;line-height:29px;letter-spacing:-.022em;font-weight:700}
.register-title h1 span{color:var(--color-text);font-size:14px;line-height:20px;font-weight:400;white-space:nowrap}
.register-title p{margin:0;font-size:11px;color:var(--color-muted)}
.register-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.register-actions :deep(.base-button){min-height:36px;white-space:nowrap}
.registry-fullscreen-toggle,.registry-tool-button{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:36px;padding:7px 10px;border:1px solid var(--color-stroke);
  border-radius:8px;background:var(--color-surface);box-shadow:var(--shadow-control);
  font:inherit;font-size:12px;line-height:18px;font-weight:600;
  color:var(--color-text);cursor:pointer
}
.registry-fullscreen-toggle{width:36px;padding:6px;color:var(--color-muted)}
.registry-fullscreen-toggle:hover,.registry-tool-button:hover,
.registry-tool-button[aria-expanded="true"]{background:var(--color-soft);border-color:var(--color-primary-stroke)}
.company-select{min-width:175px;max-width:260px;flex:1}
.registry-toolbar{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  min-width:0;margin-bottom:10px
}
.registry-toolbar :deep(.base-button){min-height:36px;white-space:nowrap}
.registry-toolbar-spacer{flex:1 1 10px;min-width:4px}
.registry-search{
  display:none;align-items:center;gap:8px;flex:1 1 280px;
  min-width:min(280px,100%);max-width:490px;min-height:36px;
  padding:3px 5px 3px 10px;border:1px solid var(--color-stroke-strong);
  border-radius:8px;background:var(--color-surface);color:var(--color-muted)
}
.registry-search--open{display:flex}
.registry-search:focus-within{border-color:var(--color-primary)}
.registry-search input{border:0;outline:0;flex:1;min-width:0;width:100%;font-size:12px;color:var(--color-text);background:transparent}
.registry-search :deep(button){min-height:28px;padding:4px 9px}
.registry-search-clear{display:grid;place-items:center;width:25px;height:25px;padding:2px;border:0;background:transparent;color:var(--color-muted);font-size:19px;cursor:pointer}
.registry-toolbar .toolbar-icon{width:16px;height:16px;object-fit:contain}
.registry-filters{
  display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:0 0 12px;
  padding:11px 12px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface)
}
.status-select{flex:0 1 210px;min-width:165px}
.status-select :deep(label){position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.status-select :deep(select){font-size:12px}
.registry-chips{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:10px}
.registry-chip{
  display:inline-flex;align-items:center;gap:7px;min-height:29px;
  padding:4px 8px;border:1px solid var(--color-stroke);
  border-radius:7px;background:var(--color-surface);color:var(--color-muted);
  font-size:11px;line-height:16px;cursor:pointer
}
.registry-chip span{font-size:16px;line-height:12px}
.registry-chip:hover{color:var(--color-primary);border-color:var(--color-primary-stroke)}
.registry-preset-notice{margin:0 0 10px;color:var(--color-muted);font-size:11px}
.registry-desktop-table{
  min-width:0;max-width:100%;width:100%;overflow:clip
}
.registry-mobile-list{display:none}
.name-cell{min-width:180px;display:grid;gap:3px}
.name-cell a{font-size:12px;line-height:18px;font-weight:500;color:var(--color-text)}
.name-cell a:hover{color:var(--color-primary);text-decoration:underline}
.name-cell span{font-size:11px;line-height:16px;color:var(--color-muted)}
.employee-row-actions{display:flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
.employee-link{display:inline-flex;align-items:center;justify-content:center;width:29px;height:29px;border-radius:5px;color:var(--color-primary)}
.employee-link:hover{background:var(--color-accent-soft)}
.employee-link img{width:17px;height:17px}
.registry-bottomline{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.registry-selection{display:inline-flex;align-items:center;min-height:30px;font-size:11px;color:var(--color-muted)}
.registry-bottomline :deep(.base-pagination){flex:1;margin-top:12px}
.scope-hint{color:var(--color-muted);font-size:11px;line-height:16px;margin:0 0 10px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:1000px){
  .register-title h1{font-size:20px;line-height:27px}
  .register-actions{justify-content:flex-start}
}
@media(max-width:700px){
  .registry-desktop-table{display:none}
  .registry-mobile-list{display:block}
  .registry-toolbar :deep(.column-settings){display:none}
  .registry-search{display:flex;order:6;min-width:100%;max-width:none;flex-basis:100%}
  .registry-toolbar-spacer{display:none}
}
@media(max-width:600px){
  .register-heading{align-items:start}
  .register-title h1{font-size:19px}
  .register-actions{width:100%;gap:6px}
  .register-actions :deep(.base-button){flex:1}
  .registry-fullscreen-toggle{margin-left:auto}
  .company-select{min-width:100%;max-width:none}
  .registry-metrics{gap:9px}
  .registry-card--fullscreen{inset:0;border-radius:0;padding:12px}
}
</style>
