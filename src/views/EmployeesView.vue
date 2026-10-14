<script setup lang="ts">
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Maximize2, Minimize2, Plus, Search } from 'lucide-vue-next'
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
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import EmployeeMobileList from '../components/EmployeeMobileList.vue'
import EmployeeRegistryTemplatesDrawer, { type RegistryTemplateState } from '../components/EmployeeRegistryTemplatesDrawer.vue'
import { downloadCsv } from '../utils/exportCsv'
import { listCompanies, listDepartments, type CompanyRecord } from '../api/organization'
import { getStaffingPlan, listStaffingPlans } from '../api/staffing'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'
import {
  listEmployees, type EmployeeRecord, type EmploymentFilter, type EmploymentStatus,
} from '../api/personnel'

const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

type EmployeeRow = EmployeeRecord & { full_name: string; status_label: string }
type GroupMode = 'none' | 'department' | 'category' | 'object'
const router = useRouter()
const route = useRoute()
const companies = ref<CompanyRecord[]>([])
const employees = ref<EmployeeRecord[]>([])
const selectedCompany = ref('')
const { preferCompany } = useActiveCompanySelection(selectedCompany)
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
const templatesOpen = ref(false)
const presetNotice = ref('')
const statusFilter = ref<EmploymentFilter>('active')
const groupMode = ref<GroupMode>('none')
const filtersOpen = ref(false)
const departmentFilter = ref('all')
const positionFilter = ref('all')
const objectFilter = ref('all')
const categoryFilter = ref('all')
const genderFilter = ref('all')
const personnelTypeFilter = ref('all')
const teamFilter = ref('all')
const hiredFrom = ref('')
const hiredTo = ref('')
const filterDraft = ref({
  status: 'active',
  department: 'all',
  position: 'all',
  personnelType: 'all',
  object: 'all',
  team: 'all',
  category: 'all',
  gender: 'all',
  hiredFrom: '',
  hiredTo: '',
})
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
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
let countersRequestedFor = ''

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
  { key: 'employee_category', label: 'Категория' },
  { key: 'personnel_type', label: 'Тип персонала' },
  { key: 'current_position_name', label: 'Должность' },
  { key: 'current_department_name', label: 'Подразделение' },
  { key: 'work_site', label: 'Объект' },
  { key: 'work_zone', label: 'Рабочая зона' },
  { key: 'work_team', label: 'Бригада / команда' },
  { key: 'supervisor_name', label: 'Руководитель' },
  { key: 'contract_type', label: 'Вид договора' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
  { key: 'status_label', label: 'Статус' },
  { key: 'details', label: 'Действие' },
]
const extendedRegistry = computed(() => ['company_admin', 'hr_specialist'].includes(currentCompany.value?.role_code ?? ''))
const privateColumns = ['birth_date', 'gender', 'email', 'phone']
const optionalColumns = computed(() => columns.filter(column =>
  !['full_name', 'details'].includes(column.key) &&
  (extendedRegistry.value || !privateColumns.includes(column.key))))
const columnKeys = [
  'birth_date', 'gender', 'personnel_number', 'employee_category', 'personnel_type',
  'current_position_name', 'current_department_name', 'current_assignment_valid_from',
  'work_site', 'work_zone', 'work_team', 'supervisor_name', 'contract_type',
  'email', 'phone', 'status_label',
]
function savedColumnPreferences(): Record<string, boolean> {
  const defaultVisible = new Set([
    'birth_date', 'gender', 'personnel_number', 'current_assignment_valid_from',
    'employee_category', 'current_position_name', 'current_department_name', 'status_label',
  ])
  const initial = Object.fromEntries(columnKeys.map(key => [key, defaultVisible.has(key)]))
  try {
    const saved = JSON.parse(localStorage.getItem('hrm-employee-columns-v1') || '{}') as Record<string, unknown>
    for (const key of columnKeys) if (typeof saved[key] === 'boolean') initial[key] = saved[key]
  } catch { /* A blocked or corrupt storage entry must not affect the register. */ }
  return initial
}
const visibleFields = ref<Record<string, boolean>>(savedColumnPreferences())
const visibleColumns = computed(() =>
  columns.filter(column => (extendedRegistry.value || !privateColumns.includes(column.key)) &&
    (['full_name', 'details'].includes(column.key) || visibleFields.value[column.key] !== false)))
const currentCompany = computed(() => companies.value.find(item => item.id === selectedCompany.value))

const allRegistryRows = computed<EmployeeRow[]>(() => employees.value.map(employee => {
  const state: EmploymentStatus = employee.employment_status
    ?? (employee.current_position_name ? 'active' : 'unassigned')
  return {
    ...employee,
    full_name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' '),
    status_label: tr(statusLabels[state]),
  }
}))
function uniqueOptions(values: Array<string | null | undefined>, allLabel: string) {
  const names = [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
    .sort((a, b) => a.localeCompare(b, 'ru'))
  return [{ id: 'all', name: allLabel }, ...names.map(name => ({ id: name, name }))]
}
const departmentFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.current_department_name), 'Все подразделения'))
const positionFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.current_position_name), 'Все должности'))
const objectFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.work_site), 'Все объекты'))
const categoryFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.employee_category), 'Все категории'))
const personnelTypeFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.personnel_type), 'Все виды персонала'))
const teamFilterOptions = computed(() =>
  uniqueOptions(allRegistryRows.value.map(row => row.work_team), 'Все бригады'))
const genderFilterOptions = [
  { id: 'all', name: 'Любой пол' },
  { id: 'male', name: 'Мужчина' },
  { id: 'female', name: 'Женщина' },
  { id: 'unset', name: 'Не указан' },
]
const filteredRegistryRows = computed(() => allRegistryRows.value.filter(row =>
  (departmentFilter.value === 'all' || row.current_department_name === departmentFilter.value) &&
  (positionFilter.value === 'all' || row.current_position_name === positionFilter.value) &&
  (objectFilter.value === 'all' || row.work_site === objectFilter.value) &&
  (categoryFilter.value === 'all' || row.employee_category === categoryFilter.value) &&
  (personnelTypeFilter.value === 'all' || row.personnel_type === personnelTypeFilter.value) &&
  (teamFilter.value === 'all' || row.work_team === teamFilter.value) &&
  (!hiredFrom.value || (row.current_assignment_valid_from ?? '') >= hiredFrom.value) &&
  (!hiredTo.value || (row.current_assignment_valid_from ?? '') <= hiredTo.value) &&
  (genderFilter.value === 'all' ||
    (genderFilter.value === 'unset' ? !row.gender : row.gender === genderFilter.value))
))
const registryRows = computed<EmployeeRow[]>(() => {
  if (!demoMode) return filteredRegistryRows.value
  const startIndex = (page.value - 1) * pageSize.value
  return filteredRegistryRows.value.slice(startIndex, startIndex + pageSize.value)
})
function displayDate(value: unknown): string {
  return typeof value === 'string' ? fmt.date(value) : '—'
}
const groupModeLabels: Record<GroupMode, string> = {
  none: 'Без группировки',
  department: 'По подразделениям',
  category: 'По категориям',
  object: 'По объектам',
}
const groupOptions = (Object.entries(groupModeLabels) as Array<[GroupMode, string]>)
  .map(([id, label]) => ({ id, label }))
function setGroupMode(id: string) {
  if (['none', 'department', 'category', 'object'].includes(id)) groupMode.value = id as GroupMode
}
const groupEmployees = (row: EmployeeRow) => {
  if (groupMode.value === 'department') return row.current_department_name || 'Без подразделения'
  if (groupMode.value === 'category') return row.employee_category || 'Без категории'
  if (groupMode.value === 'object') return row.work_site || 'Без объекта'
  return ''
}
const allPageSelected = computed(() => registryRows.value.length > 0 &&
  registryRows.value.every(row => selectedIds.value.includes(row.id)))
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

const registryChips = computed(() => [
  ...(search.value ? [{ id: 'search', label: 'Поиск: ' + search.value }] : []),
  ...(statusFilter.value !== 'active' ? [{ id: 'status', label: 'Статус: ' + (statusOptions.find(item => item.id === statusFilter.value)?.label ?? statusFilter.value) }] : []),
  ...(departmentFilter.value !== 'all' ? [{ id: 'department', label: 'Подразделение: ' + departmentFilter.value }] : []),
  ...(positionFilter.value !== 'all' ? [{ id: 'position', label: 'Должность: ' + positionFilter.value }] : []),
  ...(objectFilter.value !== 'all' ? [{ id: 'object', label: 'Объект: ' + objectFilter.value }] : []),
  ...(categoryFilter.value !== 'all' ? [{ id: 'category', label: 'Категория: ' + categoryFilter.value }] : []),
  ...(personnelTypeFilter.value !== 'all' ? [{ id: 'personnelType', label: 'Вид персонала: ' + personnelTypeFilter.value }] : []),
  ...(teamFilter.value !== 'all' ? [{ id: 'team', label: 'Бригада: ' + teamFilter.value }] : []),
  ...(hiredFrom.value ? [{ id: 'hiredFrom', label: 'Приём с: ' + hiredFrom.value }] : []),
  ...(hiredTo.value ? [{ id: 'hiredTo', label: 'Приём по: ' + hiredTo.value }] : []),
  ...(genderFilter.value !== 'all' ? [{ id: 'gender', label: 'Пол: ' + (genderFilterOptions.find(item => item.id === genderFilter.value)?.name ?? genderFilter.value) }] : []),
  ...(groupMode.value !== 'none' ? [{ id: 'group', label: 'Группировка: ' + groupModeLabels[groupMode.value] }] : []),
])
function clearChip(id: string) {
  if (id === 'search') clearSearch()
  if (id === 'status') setStatus('active')
  if (id === 'department') departmentFilter.value = 'all'
  if (id === 'position') positionFilter.value = 'all'
  if (id === 'object') objectFilter.value = 'all'
  if (id === 'category') categoryFilter.value = 'all'
  if (id === 'personnelType') personnelTypeFilter.value = 'all'
  if (id === 'team') teamFilter.value = 'all'
  if (id === 'hiredFrom') hiredFrom.value = ''
  if (id === 'hiredTo') hiredTo.value = ''
  if (id === 'gender') genderFilter.value = 'all'
  if (id === 'group') groupMode.value = 'none'
  page.value = 1
}
function clearRegistryFilters() {
  searchDraft.value = ''
  groupMode.value = 'none'
  departmentFilter.value = 'all'
  positionFilter.value = 'all'
  objectFilter.value = 'all'
  categoryFilter.value = 'all'
  personnelTypeFilter.value = 'all'
  teamFilter.value = 'all'
  hiredFrom.value = ''
  hiredTo.value = ''
  genderFilter.value = 'all'
  filtersOpen.value = false
  page.value = 1
  router.replace({
    name: 'employees',
    query: { ...route.query, q: undefined, status: undefined },
  })
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
function openFilters() {
  filterDraft.value = {
    status: statusFilter.value,
    department: departmentFilter.value,
    position: positionFilter.value,
    personnelType: personnelTypeFilter.value,
    object: objectFilter.value,
    team: teamFilter.value,
    category: categoryFilter.value,
    gender: genderFilter.value,
    hiredFrom: hiredFrom.value,
    hiredTo: hiredTo.value,
  }
  filtersOpen.value = true
}
function applyFilterDraft() {
  departmentFilter.value = filterDraft.value.department
  positionFilter.value = filterDraft.value.position
  personnelTypeFilter.value = filterDraft.value.personnelType
  objectFilter.value = filterDraft.value.object
  teamFilter.value = filterDraft.value.team
  categoryFilter.value = filterDraft.value.category
  genderFilter.value = filterDraft.value.gender
  hiredFrom.value = filterDraft.value.hiredFrom
  hiredTo.value = filterDraft.value.hiredTo
  filtersOpen.value = false
  setStatus(filterDraft.value.status as EmploymentFilter)
  page.value = 1
  selectedIds.value = []
}
function resetFilterDraft() {
  filterDraft.value = {
    status: 'active', department: 'all', position: 'all', personnelType: 'all',
    object: 'all', team: 'all', category: 'all', gender: 'all', hiredFrom: '', hiredTo: '',
  }
}
const registryTemplateState = computed<RegistryTemplateState>(() => ({
  columns: { ...visibleFields.value },
  groupMode: groupMode.value,
  status: statusFilter.value,
  department: departmentFilter.value,
  position: positionFilter.value,
  personnelType: personnelTypeFilter.value,
  object: objectFilter.value,
  team: teamFilter.value,
  category: categoryFilter.value,
  gender: genderFilter.value,
  hiredFrom: hiredFrom.value,
  hiredTo: hiredTo.value,
  perPage: pageSize.value,
}))
function applyRegistryTemplate(state: RegistryTemplateState) {
  visibleFields.value = { ...visibleFields.value, ...state.columns }
  if (['none','department','category','object'].includes(state.groupMode)) groupMode.value = state.groupMode
  departmentFilter.value = state.department || 'all'
  positionFilter.value = state.position || 'all'
  personnelTypeFilter.value = state.personnelType || 'all'
  objectFilter.value = state.object || 'all'
  teamFilter.value = state.team || 'all'
  categoryFilter.value = state.category || 'all'
  genderFilter.value = state.gender || 'all'
  hiredFrom.value = state.hiredFrom || ''
  hiredTo.value = state.hiredTo || ''
  if ([10,15,25,50].includes(state.perPage)) changePageSize(state.perPage)
  setStatus(['all','active','planned','archived','unassigned'].includes(state.status)
    ? state.status as EmploymentFilter : 'active')
  page.value = 1
  selectedIds.value = []
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
  templatesOpen.value = false
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
      selectedCompany.value = preferCompany(companies.value)
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
    const response = await listEmployees(
      company,
      demoMode ? 1 : page.value,
      search.value,
      statusFilter.value,
      demoMode ? 100 : pageSize.value,
    )
    if (current !== generation) return
    employees.value = response.data
    total.value = response.meta.total
    lastPage.value = response.meta.last_page
    employeeWritesEnabled.value = response.meta.employee_writes_enabled
    // Prioritize the interactive registry over expensive dashboard summaries.
    // A single-worker Windows PHP server would otherwise queue all KPI calls
    // ahead of the requested page, leaving the register empty for 20+ seconds.
    if (countersRequestedFor !== company) {
      countersRequestedFor = company
      void loadCounters()
    }
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
  countersRequestedFor = ''
  counterGeneration += 1
  counters.value = { active: null, archived: null, departments: null, vacancies: null, plannedUnits: null, expiring: null }
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
watch([departmentFilter, positionFilter, objectFilter, categoryFilter, genderFilter, personnelTypeFilter, teamFilter, hiredFrom, hiredTo], () => {
  page.value = 1
  selectedIds.value = []
})
watch([selectedCompany, page, search, statusFilter, pageSize], loadEmployees)
const displayTotal = computed(() => demoMode ? filteredRegistryRows.value.length : total.value)
const displayLastPage = computed(() => demoMode
  ? Math.max(1, Math.ceil(displayTotal.value / pageSize.value))
  : lastPage.value)
watch(displayLastPage, value => {
  if (page.value > value) page.value = value
})

onMounted(() => {
  loadCompanies()
  window.addEventListener('keydown', handleEscape)
})
</script>

<template>
  <section class="personnel-page">
    <div class="registry-breadcrumb"><img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" /><span>/</span><strong>{{ tr('Сотрудники') }}</strong><span>/</span><span>{{ activeTab === 'archive' ? tr('Архив сотрудников') : tr('Реестр сотрудников') }}</span></div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseViewTabs :model-value="activeTab" :options="tabOptions" :label="tr('Разделы реестра сотрудников')"
      @update:model-value="setTab" />

    <BaseKpiGrid class="registry-metrics" :label="tr('Сводка по персоналу')">
      <BaseRegistryMetricCard :title="tr('Сотрудники')" :value="counters.active"
        :description="tr('активных сотрудников работают в компании')"
        icon="/prototype-icons/Info.svg" />
      <BaseRegistryMetricCard :title="tr('Отделы')" :value="counters.departments"
        :description="tr('структурных подразделений в компании')"
        icon="/prototype-icons/Info.svg" to="/organization" />
      <BaseRegistryMetricCard :title="tr('Вакантные позиции')" :value="counters.vacancies"
        kind="ring" :percentage="vacancyPercent"
        :description="counters.plannedUnits === null ? tr('Нет данных утверждённого штата') : tr('из ')+counters.plannedUnits+tr(' штатных единиц')"
        icon="/prototype-icons/Link-External.svg" to="/staffing?view=vacant" />
      <BaseRegistryMetricCard :title="tr('Истекающие договоры')" :value="counters.expiring"
        :description="tr('сроки договоров пока не учитываются в API')"
        icon="/prototype-icons/Info.svg" tone="danger" />
    </BaseKpiGrid>

    <BaseCard class="registry-card" :class="{ 'registry-card--fullscreen': fullscreen }">
      <BaseLoadingState v-if="companyLoading" :label="tr('Загрузка доступных компаний')" />
      <template v-else-if="companies.length">
        <div class="register-heading">
          <div class="register-title">
            <h1>{{ activeTab === 'archive' ? tr('Архив сотрудников') : tr('Реестр сотрудников') }}
              <span>({{ employeeLoading ? '…' : fmt.number(registryRows.length, 0) }} {{ tr('из') }} {{ fmt.number(displayTotal, 0) }})</span>
            </h1>
            <p v-if="companies.length===1">{{ currentCompany?.name }}</p>
          </div>
          <div class="register-actions">
            <BaseActionDropdown :label="tr('Экспорт')" :options="exportOptions" @select="doExport" />
            <BaseActionDropdown :label="tr('Действия')" variant="primary"
              :options="registerActionOptions" @select="doTopAction" />
            <BaseButton type="button" variant="secondary" icon-only class="registry-fullscreen-toggle" :aria-label="fullscreen ? tr('Выйти из полноэкранного режима') : tr('На весь экран')"
              :title="fullscreen ? tr('Выйти из полноэкранного режима') : tr('На весь экран')"
              @click="toggleFullscreen">
              <Minimize2 v-if="fullscreen" :size="18" aria-hidden="true" />
              <Maximize2 v-else :size="18" aria-hidden="true" />
            </BaseButton>
            <BaseButton v-if="employeeWritesEnabled && activeTab === 'register'" @click="createOpen = true">
              <Plus :size="16" /> {{ tr('Добавить сотрудника') }}</BaseButton>
            <div class="company-select">
              <BaseSelectField v-model="selectedCompany" :label="tr('Компания')" :options="companies" />
            </div>
          </div>
        </div>

        <div class="registry-toolbar" :aria-label="tr('Настройки реестра')">
          <BaseButton type="button" variant="secondary" class="registry-tool-button"
            :aria-expanded="searchOpen" @click="toggleSearch">
            <Search :size="16" aria-hidden="true" /> {{ tr('Поиск') }}</BaseButton>
          <form class="registry-search" :class="{ 'registry-search--open': searchOpen }"
            role="search" @submit.prevent="applySearch">
            <Search :size="17" aria-hidden="true" />
            <input ref="searchInput" v-model="searchDraft" type="search" :aria-label="tr('Поиск в реестре')"
              :placeholder="tr('ФИО или табельный номер')" />
            <BaseButton type="submit" variant="secondary">{{ tr('Найти') }}</BaseButton>
            <BaseButton v-if="searchDraft || search" type="button" variant="secondary" icon-only class="registry-search-clear"
              :aria-label="tr('Очистить поиск')" @click="clearSearch">×</BaseButton>
          </form>
          <BaseButton variant="secondary" @click="openFilters" :aria-expanded="filtersOpen">
            <img src="/prototype-icons/Filter.svg" alt="" class="toolbar-icon" /> {{ tr('Фильтры') }}</BaseButton>
          <BaseActionDropdown
            :label="groupMode === 'none' ? tr('Группировка') : groupModeLabels[groupMode]"
            :options="groupOptions" @select="setGroupMode" />
          <BaseColumnPicker v-model="visibleFields" :columns="optionalColumns" :title="tr('Настройка колонок')" />
          <div class="registry-toolbar-spacer"></div>
          <BaseButton variant="secondary" @click="templatesOpen = true">{{ tr('Шаблоны') }}</BaseButton>
        </div>



        <BaseFilterSummary :items="registryChips" :label="tr('Активные фильтры реестра')"
          @remove="clearChip" @clear="clearRegistryFilters" />
        <p v-if="presetNotice" role="status" class="registry-preset-notice">{{ presetNotice }}</p>
        <BaseTableBulkActions :count="selectedOnPage.length" :subject="tr('сотрудников')"
          :options="selectedActions" @execute="executeSelectedAction" @clear="selectedIds = []" />
        <p v-if="groupMode !== 'none'" class="scope-hint">{{ tr('Группировка:') }} {{ tr(groupModeLabels[groupMode]) }}. {{ tr('Фильтры применены к текущему реестру.') }}</p>

        <div class="registry-desktop-table">
          <BaseDataTable :rows="registryRows" :columns="visibleColumns" :group-by="groupMode !== 'none' ? groupEmployees : undefined"
          selectable :selection-label="tr('Выбрать сотрудника')" v-model:selected-keys="selectedIds"
          row-key="id" :caption="tr('Реестр сотрудников выбранной компании')" :loading="employeeLoading"
          :empty-title="activeTab === 'archive' ? tr('В архиве сотрудников нет') : tr('Сотрудники не найдены')"
          :empty-description="search ? tr('Уточните поиск или сбросьте запрос.') : tr('Нет записей для выбранного фильтра.')">
          <template #cell-full_name="{ row }">
            <div class="name-cell">
              <RouterLink :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">{{ row.full_name }}</RouterLink>
              <span>{{ row.current_department_name || tr('Подразделение не назначено') }}</span>
            </div>
          </template>
          <template #cell-birth_date="{ value }">{{ displayDate(value) }}</template>
          <template #cell-gender="{ value }">{{ value === 'male' ? tr('М') : value === 'female' ? tr('Ж') : '—' }}</template>
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
                :aria-label="tr('Открыть карточку: ') + row.full_name" :title="tr('Открыть карточку: ') + row.full_name">
                <img src="/prototype-icons/Edit.svg" alt="" /><span class="sr-only">{{ tr('Открыть карточку') }}</span>
              </RouterLink>
              <BaseActionDropdown variant="icon" :label="tr('Действия сотрудника: ')+row.full_name"
                :options="rowActionOptions" @select="doRowAction($event, row)" />
            </div>
          </template>
          </BaseDataTable>
        </div>
        <div class="registry-mobile-list">
          <EmployeeMobileList :rows="registryRows" :company-id="selectedCompany" :selected-ids="selectedIds"
            :loading="employeeLoading" :grouped="groupMode === 'department'" @select="toggleSelection" />
        </div>
        <div class="registry-bottomline">
          <span class="registry-selection" aria-live="polite">
            {{ tr('Выбрано на странице:') }} {{ fmt.number(selectedOnPage.length, 0) }} {{ tr('из') }} {{ fmt.number(registryRows.length, 0) }}
          </span>
          <BasePagination :page="page" :last-page="displayLastPage" :loading="employeeLoading"
            :total="displayTotal" :page-size="pageSize"
            :caption="tr('Страницы реестра сотрудников')"
            @previous="page--" @next="page++" @select-page="page=$event"
            @change-page-size="changePageSize" />
        </div>
      </template>
      <BaseNotice v-else-if="!error" tone="info">{{ tr('Нет доступных компаний.') }}</BaseNotice>
    </BaseCard>

    <BaseDrawer :open="createOpen" :title="tr('Добавить сотрудника')"
      :description="tr('Основные данные новой карточки сотрудника')" @close="createOpen = false">
      <EmployeeRecordForm v-if="selectedCompany" :company-id="selectedCompany"
        @saved="employeeCreated" @cancelled="createOpen = false" />
    </BaseDrawer>

    <BaseDrawer :open="filtersOpen" :title="tr('Фильтры')"
      :description="tr('Организационные данные и период приёма')" @close="filtersOpen = false">
      <div class="registry-filter-drawer">
        <h3>{{ tr('Организационные данные') }}</h3>
        <BaseSelectField v-model="filterDraft.department" :label="tr('Отдел')" :options="departmentFilterOptions" />
        <BaseSelectField v-model="filterDraft.position" :label="tr('Должность')" :options="positionFilterOptions" />
        <BaseSelectField v-model="filterDraft.category" :label="tr('Категория')" :options="categoryFilterOptions" />
        <BaseSelectField v-model="filterDraft.personnelType" :label="tr('Вид персонала')" :options="personnelTypeFilterOptions" />
        <BaseSelectField v-model="filterDraft.object" :label="tr('Объект / место работы')" :options="objectFilterOptions" />
        <BaseSelectField v-model="filterDraft.team" :label="tr('Бригада')" :options="teamFilterOptions" />
        <BaseSelectField v-model="filterDraft.status" :label="tr('Статус сотрудника')" :options="statusSelectOptions" />
        <BaseSelectField v-model="filterDraft.gender" :label="tr('Пол')" :options="genderFilterOptions" />
        <label class="registry-date-filter"><span>{{ tr('Период приёма — с') }}</span><input v-model="filterDraft.hiredFrom" type="date" /></label>
        <label class="registry-date-filter"><span>{{ tr('Период приёма — по') }}</span><input v-model="filterDraft.hiredTo" type="date" /></label>
      </div>
      <template #footer>
        <BaseButton @click="applyFilterDraft">{{ tr('Применить') }}</BaseButton>
        <BaseButton variant="secondary" @click="filtersOpen = false">{{ tr('Отмена') }}</BaseButton>
        <BaseButton variant="secondary" @click="resetFilterDraft">{{ tr('Сбросить все фильтры') }}</BaseButton>
      </template>
    </BaseDrawer>

    <EmployeeRegistryTemplatesDrawer
      :open="templatesOpen"
      :columns="optionalColumns"
      :current="registryTemplateState"
      :status-options="statusSelectOptions"
      :department-options="departmentFilterOptions"
      :position-options="positionFilterOptions"
      :personnel-type-options="personnelTypeFilterOptions"
      :object-options="objectFilterOptions"
      :team-options="teamFilterOptions"
      :category-options="categoryFilterOptions"
      :gender-options="genderFilterOptions"
      @close="templatesOpen = false"
      @apply="applyRegistryTemplate"
      @notice="presetNotice = $event"
    />
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
.registry-filter-drawer{display:grid;gap:13px}
.registry-filter-drawer h3{margin:0 0 2px;font-size:17px;line-height:23px}
.registry-date-filter{display:grid;gap:7px}
.registry-date-filter span{font-size:12px;font-weight:650}
.registry-date-filter input{min-height:40px;padding:9px 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text);font:inherit}
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
