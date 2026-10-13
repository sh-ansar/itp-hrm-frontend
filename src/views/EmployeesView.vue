<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Archive, Columns3, FolderTree, Plus, Search, Users } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
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
const error = ref('')
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)
const counters = ref({ active: null as number | null, archived: null as number | null, departments: null as number | null })
let generation = 0
let counterGeneration = 0

const tabOptions = [
  { id: 'register', label: 'Реестр сотрудников' },
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
  { key: 'current_position_name', label: 'Должность' },
  { key: 'current_department_name', label: 'Подразделение' },
  { key: 'status_label', label: 'Статус' },
  { key: 'details', label: 'Действие' },
]
const optionalColumns = columns.filter(column => !['full_name', 'details'].includes(column.key))
const visibleFields = ref<Record<string, boolean>>({
  personnel_number: true, current_position_name: true,
  current_department_name: true, status_label: true,
})
const visibleColumns = computed(() =>
  columns.filter(column => column.key === 'full_name' || column.key === 'details' || visibleFields.value[column.key] !== false))
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
const groupEmployees = (row: EmployeeRow) => row.current_department_name || 'Без подразделения'

function setTab(next: string) {
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
  counters.value = { active: null, archived: null, departments: null }
  if (!company) return
  const result = await Promise.allSettled([
    listEmployees(company, 1, '', 'active'),
    listEmployees(company, 1, '', 'archived'),
    listDepartments(company),
  ])
  if (current !== counterGeneration) return
  counters.value = {
    active: result[0].status === 'fulfilled' ? result[0].value.meta.total : null,
    archived: result[1].status === 'fulfilled' ? result[1].value.meta.total : null,
    departments: result[2].status === 'fulfilled' ? result[2].value.meta.total : null,
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
    <BasePageHeading title="Реестр сотрудников" description="Кадровый состав и личные карточки">
      <BaseButton v-if="employeeWritesEnabled" @click="createOpen = true"><Plus :size="16" /> Добавить сотрудника</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseViewTabs :model-value="activeTab" :options="tabOptions" label="Разделы реестра сотрудников"
      @update:model-value="setTab" />

    <div class="registry-metrics" aria-label="Сводка по персоналу">
      <BaseCard class="registry-metric"><Users :size="17" /><span>Сотрудников по фильтру</span><strong>{{ employeeLoading ? '…' : total }}</strong></BaseCard>
      <BaseCard class="registry-metric"><Users :size="17" /><span>Работают</span><strong>{{ counters.active ?? '—' }}</strong></BaseCard>
      <BaseCard class="registry-metric"><Archive :size="17" /><span>В архиве</span><strong>{{ counters.archived ?? '—' }}</strong></BaseCard>
      <BaseCard class="registry-metric"><FolderTree :size="17" /><span>Подразделений</span><strong>{{ counters.departments ?? '—' }}</strong></BaseCard>
    </div>

    <BaseCard class="registry-card">
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <template v-else-if="companies.length">
        <div class="register-heading">
          <div>
            <h2>{{ activeTab === 'archive' ? 'Архив сотрудников' : 'Список сотрудников' }} <span>({{ total }})</span></h2>
            <p>{{ currentCompany?.name }} · отображается {{ registryRows.length }} из {{ total }}</p>
          </div>
          <div class="company-select"><BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" /></div>
        </div>

        <div class="registry-toolbar" aria-label="Настройки реестра">
          <form class="registry-search" role="search" @submit.prevent="applySearch">
            <Search :size="17" aria-hidden="true" />
            <input v-model="searchDraft" type="search" aria-label="Поиск в реестре"
              placeholder="Поиск по ФИО или табельному номеру" />
            <BaseButton type="submit" variant="secondary">Найти</BaseButton>
          </form>
          <BaseSelectField v-if="activeTab !== 'archive'" class="status-select"
            :model-value="statusFilter" label="Фильтр статуса" :options="statusSelectOptions"
            @update:model-value="setStatus($event as EmploymentFilter)" />
          <BaseButton variant="secondary" @click="grouped = !grouped">
            <FolderTree :size="16" /> {{ grouped ? 'Без группировки' : 'Группировка' }}
          </BaseButton>
          <details class="column-settings">
            <summary><Columns3 :size="16" /> Колонки</summary>
            <div class="column-options">
              <strong>Показывать колонки</strong>
              <label v-for="column in optionalColumns" :key="column.key">
                <input v-model="visibleFields[column.key]" type="checkbox" /> {{ column.label }}
              </label>
            </div>
          </details>
          <BaseButton v-if="search" variant="secondary" @click="clearSearch">Сбросить поиск</BaseButton>
        </div>

        <p v-if="grouped" class="scope-hint">Сгруппированы записи текущей страницы. Фильтры и количество сотрудников рассчитываются по всему реестру.</p>

        <BaseDataTable :rows="registryRows" :columns="visibleColumns" :group-by="grouped ? groupEmployees : undefined"
          row-key="id" caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
          :empty-title="activeTab === 'archive' ? 'В архиве сотрудников нет' : 'Сотрудники не найдены'"
          :empty-description="search ? 'Уточните поиск или сбросьте запрос.' : 'Нет записей для выбранного фильтра.'">
          <template #cell-full_name="{ row }">
            <div class="name-cell">
              <RouterLink :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">{{ row.full_name }}</RouterLink>
              <span>{{ row.current_department_name || 'Подразделение не назначено' }}</span>
            </div>
          </template>
          <template #cell-current_position_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-current_department_name="{ value }">{{ value ?? '—' }}</template>
          <template #cell-status_label="{ row }">
            <span class="status-pill" :class="'status-pill--' + (row.employment_status ?? 'unassigned')">
              {{ row.status_label }}
            </span>
          </template>
          <template #cell-details="{ row }">
            <RouterLink class="employee-link" :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">Открыть</RouterLink>
          </template>
        </BaseDataTable>
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
.personnel-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);max-width:100%;min-width:0}
.registry-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3)}
.registry-metric{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;min-height:114px}
.registry-metric span{font-size:12px;color:var(--color-muted);grid-column:1;grid-row:1;line-height:1.4}
.registry-metric :deep(svg){color:var(--color-primary);grid-column:2;grid-row:1}
.registry-metric strong{font-size:26px;grid-column:1/-1;line-height:1.15}
.registry-card{min-width:0}
.register-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:var(--space-4);flex-wrap:wrap}
.register-heading h2{font-size:20px;letter-spacing:-.025em;margin:0}
.register-heading h2 span{color:var(--color-muted);font-size:15px;font-weight:500}
.register-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.company-select{min-width:200px;max-width:320px;flex:1}
.registry-toolbar{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)}
.registry-search{display:flex;align-items:center;gap:8px;min-width:260px;flex:1 1 300px;min-height:var(--control-height);padding:3px 4px 3px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);color:var(--color-muted)}
.registry-search:focus-within{border-color:var(--color-primary)}
.registry-search input{border:0;outline:0;flex:1;min-width:0;width:100%;font-size:13px;color:var(--color-text);background:transparent}
.registry-search :deep(button){min-height:36px;padding:7px 12px}
.status-select{flex:0 1 175px;min-width:145px}
.status-select :deep(label){position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.status-select :deep(select){font-size:13px}
.column-settings{position:relative}
.column-settings summary{list-style:none;display:inline-flex;align-items:center;gap:8px;min-height:var(--control-height);padding:9px 14px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);font-size:13px;font-weight:600;cursor:pointer}
.column-settings summary::-webkit-details-marker{display:none}
.column-settings[open] summary{border-color:var(--color-primary)}
.column-options{position:absolute;top:calc(100% + 6px);right:0;z-index:12;display:grid;gap:12px;width:min(240px,85vw);padding:16px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);box-shadow:var(--shadow-card);background:var(--color-surface)}
.column-options strong{font-size:13px}
.column-options label{display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer}
.column-options input{accent-color:var(--color-primary)}
.name-cell{min-width:180px;display:grid;gap:4px}
.name-cell a{font-weight:600;color:var(--color-text)}
.name-cell a:hover{color:var(--color-primary);text-decoration:underline}
.name-cell span{font-size:11px;color:var(--color-muted)}
.status-pill{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:var(--color-soft);font-size:11px;font-weight:700;white-space:nowrap}
.status-pill--active{background:var(--color-success-surface);color:var(--color-success)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--archived{background:var(--color-danger-surface);color:var(--color-danger)}
.status-pill--unassigned{background:var(--color-warning-surface);color:var(--color-warning)}
.employee-link{color:var(--color-primary);font-weight:700;font-size:12px;text-decoration:underline;text-underline-offset:3px}
.scope-hint{color:var(--color-muted);font-size:12px;line-height:1.5;margin:0 0 12px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:1100px){.registry-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){
  .registry-metrics{gap:8px}
  .registry-metric{min-height:100px}
  .registry-metric strong{font-size:22px}
  .registry-search{min-width:100%;width:100%}
  .registry-toolbar>:deep(button){flex:1 1 auto}
  .status-select{flex:1}.status-select :deep(select){width:100%}
  .company-select{max-width:none;width:100%}
}
</style>
