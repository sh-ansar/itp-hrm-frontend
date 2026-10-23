<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, Minus, Pencil, Plus, Trash2, Search, UserPlus, UsersRound } from 'lucide-vue-next'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectionToolbar from '../components/ui/BaseSelectionToolbar.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import BaseRegistryMetricCard from '../components/ui/BaseRegistryMetricCard.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import DepartmentTreeNode from '../components/DepartmentTreeNode.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { getStaffingPlan, listStaffingPlans } from '../api/staffing'
import { downloadCsv } from '../utils/exportCsv'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'
import OrgStaffingNav from '../components/OrgStaffingNav.vue'
import { buildDepartmentForest, filterDepartmentForest } from '../utils/departmentTree'
import DepartmentForm from '../components/DepartmentForm.vue'
import {
  deleteDepartment,
  listCompanies,
  listDepartments,
  type CompanyRecord,
  type DepartmentRecord,
} from '../api/organization'

const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

const router = useRouter()
const companies = ref<CompanyRecord[]>([])
const departments = ref<DepartmentRecord[]>([])
const selectedCompany = ref('')
const { preferCompany } = useActiveCompanySelection(selectedCompany)
const loadingCompanies = ref(false)
const loadingDepartments = ref(false)
const departmentWritesEnabled = ref(false)
const employeeWritesEnabled = ref(false)
const addEmployeeOpen = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const lastPage = ref(1)
const editorOpen = ref(false)
const editingDepartment = ref<DepartmentRecord | null>(null)
const deleteCandidate = ref<DepartmentRecord | null>(null)
const deleting = ref(false)
const viewMode = ref('diagram')
const searchQuery = ref('')
const selectedDepartmentIds = ref<string[]>([])
const chartZoom = ref(100)
const viewModes = [{ id: 'table', label: 'Таблица' }, { id: 'diagram', label: 'Схема' }]
const diagramEmployees = ref<EmployeeRecord[]>([])
// Show the root's direct reports by default, while keeping deeper levels collapsed.
const expandedLevels = ref(false)
const diagramDepartments = ref<DepartmentRecord[]>([])
const diagramLoading = ref(false)
const diagramError = ref('')
const diagramPartial = ref(false)
const orgMetrics = ref({
  employees: null as number | null,
  planned: null as number | null,
  occupied: null as number | null,
  vacant: null as number | null,
})
let orgMetricGeneration = 0
const occupancyDescription = computed(() => {
  if (orgMetrics.value.planned === null || orgMetrics.value.occupied === null || orgMetrics.value.planned <= 0)
    return tr('Нет утверждённого штатного среза')
  const percent = Math.round(100 * orgMetrics.value.occupied / orgMetrics.value.planned)
  return percent + tr('% от штатных единиц занято')
})
const departmentForest = computed(() => {
  const forest = buildDepartmentForest(diagramDepartments.value)
  function enrich(nodes: typeof forest): void {
    for (const node of nodes) {
      node.members = diagramEmployees.value.filter(employee => employee.current_department_id === node.id).map(employee => ({
        id: employee.id, name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' '), position: employee.current_position_name ?? null,
      }))
      enrich(node.children)
    }
  }
  enrich(forest)
  return forest
})
const visibleDepartmentForest = computed(() => filterDepartmentForest(departmentForest.value, searchQuery.value))

const departmentNames = computed(() => new Map(departments.value.map(item => [item.id, item.name])))
const currentCompany = computed(() => companies.value.find(item => item.id === selectedCompany.value) ?? null)

// Hierarchy is assembled only from visible rows on the current page. A missing parent
// is not treated as a root: it may be scoped out or on another page.
const hierarchyRows = computed(() => {
  const lookup = new Map(departments.value.map(item => [item.id, item]))
  const depths = new Map<string, number>()
  const visiting = new Set<string>()

  function depthOf(id: string): number {
    if (depths.has(id)) return depths.get(id)!
    if (visiting.has(id)) return 0
    visiting.add(id)
    const node = lookup.get(id)
    const depth = node?.parent_id && lookup.has(node.parent_id)
      ? Math.min(depthOf(node.parent_id) + 1, 12)
      : 0
    visiting.delete(id)
    depths.set(id, depth)
    return depth
  }

  const rows = departments.value.map(item => ({
    ...item,
    depth: depthOf(item.id),
    parentLabel: !item.parent_id
      ? tr('Верхний уровень')
      : (departmentNames.value.get(item.parent_id) ?? tr('Родитель вне текущего списка')),
  }))
  const byParent = new Map<string, typeof rows>()
  for (const row of rows) {
    const parentKey = row.parent_id && lookup.has(row.parent_id) ? row.parent_id : ''
    const siblings = byParent.get(parentKey) ?? []
    siblings.push(row)
    byParent.set(parentKey, siblings)
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => a.name.localeCompare(b.name, fmt.localeTag()))
  const ordered: typeof rows = []
  const visited = new Set<string>()
  function walk(parentId: string) {
    for (const row of byParent.get(parentId) ?? []) {
      if (visited.has(row.id)) continue
      visited.add(row.id)
      ordered.push(row)
      walk(row.id)
    }
  }
  walk('')
  // Retain cycle-corrupted and scope-truncated rows for inspection, never silently hide them.
  for (const row of rows) if (!visited.has(row.id)) ordered.push(row)
  return ordered
})

const filteredHierarchyRows = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase(fmt.localeTag())
  return !query ? hierarchyRows.value : hierarchyRows.value.filter(row =>
    (row.name + ' ' + row.parentLabel).toLocaleLowerCase(fmt.localeTag()).includes(query),
  )
})
// Selection is intentionally page-scoped; no implicit bulk mutation of departments.
const selectedDepartmentRows = computed(() => filteredHierarchyRows.value.filter(row => selectedDepartmentIds.value.includes(row.id)))

const extraColumns = [
  { key: 'parentLabel', label: 'Входит в' },
  { key: 'depth', label: 'Уровень' },
]
function orgColumnPreferences(): Record<string, boolean> {
  const initial = Object.fromEntries(extraColumns.map(column => [column.key, true]))
  try {
    const saved = JSON.parse(localStorage.getItem('hrm-org-columns-v1') || '{}') as Record<string, unknown>
    for (const column of extraColumns) {
      if (typeof saved[column.key] === 'boolean') initial[column.key] = saved[column.key] as boolean
    }
  } catch { /* Storage may be disabled. */ }
  return initial
}
const shownOrgColumns = ref<Record<string, boolean>>(orgColumnPreferences())
watch(shownOrgColumns, value => {
  try { localStorage.setItem('hrm-org-columns-v1', JSON.stringify(value)) }
  catch { /* Preferences remain available in the current session. */ }
}, { deep: true })
const columns = computed(() => [
  { key: 'name', label: 'Подразделение' },
  ...extraColumns.filter(column => shownOrgColumns.value[column.key] !== false),
  ...(departmentWritesEnabled.value ? [{ key: 'actions', label: 'Действие' }] : []),
])

let generation = 0

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === selectedCompany.value)) {
      selectedCompany.value = preferCompany(companies.value)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить организации'
    companies.value = []
    selectedCompany.value = ''
  } finally {
    loadingCompanies.value = false
  }
}

async function loadOrgMetrics() {
  const current = ++orgMetricGeneration
  const companyId = selectedCompany.value
  orgMetrics.value = { employees: null, planned: null, occupied: null, vacant: null }
  employeeWritesEnabled.value = false
  if (!companyId) return

  const [peopleResult, plansResult] = await Promise.allSettled([
    listEmployees(companyId, 1, '', 'active', 1),
    listStaffingPlans(companyId),
  ])
  if (current !== orgMetricGeneration || companyId !== selectedCompany.value) return

  if (peopleResult.status === 'fulfilled') {
    orgMetrics.value.employees = peopleResult.value.meta.total
    employeeWritesEnabled.value = peopleResult.value.meta.employee_writes_enabled
  }

  if (plansResult.status !== 'fulfilled') return
  const approved = preferredApprovedStaffingPlan(plansResult.value.data)
  if (!approved) return

  try {
    const detail = await getStaffingPlan(companyId, approved.id, localTodayISO())
    if (current !== orgMetricGeneration || companyId !== selectedCompany.value) return
    orgMetrics.value.planned = detail.lines.reduce((sum, line) => sum + Number(line.planned_units || 0), 0)
    orgMetrics.value.occupied = detail.lines.reduce((sum, line) => sum + Number(line.occupied_units || 0), 0)
    orgMetrics.value.vacant = detail.lines.reduce((sum, line) => sum + Number(line.vacant_units || 0), 0)
  } catch {
    // Organization remains usable when staffing detail is unavailable.
  }
}

async function loadDepartments() {
  const id = selectedCompany.value
  const currentPage = page.value
  const current = ++generation
  departments.value = []
  total.value = 0
  departmentWritesEnabled.value = false
  if (!id) return

  loadingDepartments.value = true
  error.value = ''
  try {
    const result = await listDepartments(id, currentPage)
    if (current !== generation) return
    departments.value = result.data
    total.value = result.meta.total
    lastPage.value = result.meta.last_page
    departmentWritesEnabled.value = result.meta.department_writes_enabled
  } catch (cause) {
    if (current === generation) {
      error.value = cause instanceof Error ? cause.message : 'Ошибка загрузки подразделений'
    }
  } finally {
    if (current === generation) loadingDepartments.value = false
  }
}

// The diagram represents every accessible department page. Table pagination stays separate.
let diagramGeneration = 0
async function loadDiagram() {
  const current = ++diagramGeneration
  const companyId = selectedCompany.value
  diagramDepartments.value = []
  diagramEmployees.value = []
  diagramError.value = ''
  diagramPartial.value = false
  diagramLoading.value = Boolean(companyId && viewMode.value === 'diagram')
  if (!companyId || viewMode.value !== 'diagram') return
  try {
    const [first, people] = await Promise.all([listDepartments(companyId, 1), listEmployees(companyId, 1, '', 'active')])
    const employees = [...people.data]
    const maxPeoplePage = Math.min(people.meta.last_page, 40)
    for (let start = 2; start <= maxPeoplePage; start += 4) {
      const end = Math.min(start + 3, maxPeoplePage)
      const pages = await Promise.all(Array.from({ length: end - start + 1 }, (_, index) => listEmployees(companyId, start + index, '', 'active')))
      if (current !== diagramGeneration || companyId !== selectedCompany.value) return
      for (const result of pages) employees.push(...result.data)
    }
    diagramEmployees.value = employees
    if (current !== diagramGeneration || companyId !== selectedCompany.value) return
    const rows = [...first.data]
    const maxPage = Math.min(first.meta.last_page, 100)
    // Small batches avoid hundreds of simultaneous calls on large organizations.
    for (let start = 2; start <= maxPage; start += 4) {
      const end = Math.min(start + 3, maxPage)
      const pages = await Promise.all(Array.from({ length: end - start + 1 }, (_, i) => listDepartments(companyId, start + i)))
      if (current !== diagramGeneration || companyId !== selectedCompany.value) return
      for (const pageResult of pages) rows.push(...pageResult.data)
    }
    diagramDepartments.value = rows
    diagramPartial.value = maxPage < first.meta.last_page || maxPeoplePage < people.meta.last_page
  } catch (cause) {
    if (current === diagramGeneration) {
      diagramError.value = cause instanceof Error ? cause.message : 'Не удалось загрузить схему подразделений'
    }
  } finally {
    if (current === diagramGeneration) diagramLoading.value = false
  }
}

function exportDepartments() {
  const selected = selectedDepartmentRows.value
  const rows = selected.length ? selected : filteredHierarchyRows.value
  downloadCsv(selected.length ? 'orgstructure-selected.csv' : 'orgstructure.csv',
    ['Подразделение', 'Родитель'], rows.map(row => [row.name, row.parentLabel]))
}

function createDepartmentRecord() {
  editingDepartment.value = null
  editorOpen.value = true
}

function editDepartmentRecord(row: DepartmentRecord) {
  editingDepartment.value = row
  editorOpen.value = true
}

async function departmentSaved() {
  editorOpen.value = false
  editingDepartment.value = null
  await Promise.all([loadDepartments(), loadDiagram()])
}

async function employeeCreated(employee: EmployeeRecord) {
  addEmployeeOpen.value = false
  await Promise.all([loadOrgMetrics(), loadDiagram()])
  await router.push({ name: 'employee-detail', params: { company: selectedCompany.value, employee: employee.id } })
}

async function confirmDelete() {
  if (!deleteCandidate.value || !selectedCompany.value) return
  deleting.value = true
  error.value = ''
  try {
    await deleteDepartment(
      selectedCompany.value,
      deleteCandidate.value.id,
      deleteCandidate.value.revision,
    )
    deleteCandidate.value = null
    await Promise.all([loadDepartments(), loadDiagram()])
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить подразделение'
    deleteCandidate.value = null
  } finally {
    deleting.value = false
  }
}

watch(selectedCompany, () => { page.value = 1; void loadOrgMetrics() })
watch([selectedCompany, page], () => { selectedDepartmentIds.value = []; void loadDepartments() })
watch([selectedCompany, viewMode], loadDiagram)
onMounted(loadCompanies)
</script>

<template>
  <section class="organization-page">
    <OrgStaffingNav />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseLoadingState v-if="loadingCompanies" :label="tr('Загрузка компаний')" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">{{ tr('Нет доступных компаний.') }}</BaseNotice>


    <section v-if="selectedCompany" class="org-content">
      <BaseKpiGrid class="org-metrics" :label="tr('Показатели организационной структуры')">
        <BaseRegistryMetricCard :title="tr('Подразделения')" :value="total"
          :description="tr('структурных подразделений в доступном контуре')"
          :icon="publicAsset('prototype-icons/Info.svg')" />
        <BaseRegistryMetricCard :title="tr('Штатные единицы')" :value="orgMetrics.planned"
          :description="tr('по утверждённому штатному расписанию')"
          :icon="publicAsset('prototype-icons/Info.svg')" to="/staffing" />
        <BaseRegistryMetricCard :title="tr('Занято')" :value="orgMetrics.occupied"
          :description="occupancyDescription"
          :icon="publicAsset('prototype-icons/Info.svg')" />
        <BaseRegistryMetricCard :title="tr('Вакантные позиции')" :value="orgMetrics.vacant"
          :description="tr('открытых штатных единиц на текущую дату')"
          :icon="publicAsset('prototype-icons/Link-External.svg')" to="/staffing?view=vacant" />
      </BaseKpiGrid>
      <div class="section-title">
        <h1>{{ tr('Организационная структура') }}<span class="structure-total">({{ fmt.number(total, 0) }})</span></h1>
        <div class="org-heading-actions">
          <BaseSelectField v-model="selectedCompany" :label="tr('Компания')" :options="companies" />
          <BaseButton v-if="filteredHierarchyRows.length" variant="secondary" @click="exportDepartments">{{ tr('Экспорт CSV') }}</BaseButton>
          <BaseButton v-if="employeeWritesEnabled" variant="secondary" @click="addEmployeeOpen = true">
            <UserPlus :size="17" /> {{ tr('Добавить сотрудника') }}</BaseButton>
          <BaseButton v-if="departmentWritesEnabled" @click="createDepartmentRecord">
            <Plus :size="17" /> {{ tr('Добавить подразделение') }}</BaseButton>
        </div>
      </div>

      <div class="structure-tools">
        <BaseViewTabs v-model="viewMode" class="structure-tabs"
        :options="viewModes" :label="tr('Представление организационной структуры')" />
        <label class="structure-search"><Search :size="17" aria-hidden="true" /><span class="visually-hidden">{{ tr('Поиск подразделений') }}</span><input v-model="searchQuery" type="search" :placeholder="tr('Поиск подразделений')" /></label>
        <BaseColumnPicker v-if="viewMode === 'table'" v-model="shownOrgColumns" :columns="extraColumns" :title="tr('Колонки')" />
        <div v-if="viewMode === 'diagram'" class="chart-zoom">
          <BaseButton icon-only variant="secondary" :aria-label="tr('Уменьшить схему')"
            :disabled="chartZoom <= 70" @click="chartZoom = Math.max(70, chartZoom - 10)"><Minus :size="16" /></BaseButton>
          <input v-model.number="chartZoom" type="range" min="70" max="130" step="10" :aria-label="tr('Масштаб схемы')" />
          <BaseButton icon-only variant="secondary" :aria-label="tr('Увеличить схему')"
            :disabled="chartZoom >= 130" @click="chartZoom = Math.min(130, chartZoom + 10)"><Plus :size="16" /></BaseButton>
        </div>
        <label v-if="viewMode === 'diagram'" class="expand-levels"><input v-model="expandedLevels" type="checkbox" /> {{ tr('Раскрыть нижестоящий уровень') }}</label>
      </div>
      <BaseNotice v-if="viewMode === 'table' && total > departments.length" tone="info">
        {{ tr('Показана текущая страница. Невидимые подразделения и родительские связи не раскрываются.') }}</BaseNotice>
      <BaseNotice v-if="viewMode === 'diagram' && diagramError" tone="error">{{ diagramError }}</BaseNotice>
      <BaseNotice v-if="viewMode === 'diagram' && diagramPartial" tone="warning">
        {{ tr('Схема слишком велика: показаны первые') }} {{ fmt.number(diagramDepartments.length, 0) }} {{ tr('подразделений из доступных') }} {{ fmt.number(total, 0) }}.
      </BaseNotice>

      <div v-if="viewMode === 'diagram'" class="structure-diagram" role="region" tabindex="0" :aria-label="tr('Схема подразделений компании')">
        <BaseLoadingState v-if="diagramLoading" :label="tr('Загрузка полной структуры')" />
        <div v-else-if="visibleDepartmentForest.length" class="organization-chart" :style="{ zoom: chartZoom + '%' }">
          <div class="chart-company" :aria-label="tr('Компания') + ': ' + (currentCompany?.name ?? '')">
            <div class="chart-company-title">
              <Building2 :size="20" aria-hidden="true" />
              <strong>{{ currentCompany?.name ?? tr('Компания') }}</strong>
            </div>
            <div v-if="orgMetrics.planned !== null || orgMetrics.vacant !== null" class="chart-company-metrics">
              <span v-if="orgMetrics.planned !== null"><UsersRound :size="15" aria-hidden="true" /> {{ tr('Штатные единицы') }}: {{ fmt.number(orgMetrics.planned, 0) }}</span>
              <span v-if="orgMetrics.vacant !== null" class="chart-company-vacant"><UserPlus :size="15" aria-hidden="true" /> {{ tr('Вакантные позиции') }}: {{ fmt.number(orgMetrics.vacant, 0) }}</span>
            </div>
            <span v-else class="chart-company-unavailable">{{ tr('Нет утверждённого штатного среза') }}</span>
          </div>
          <div class="chart-branches" :class="{ 'chart-branches--multi': visibleDepartmentForest.length > 1 }">
            <DepartmentTreeNode v-for="node in visibleDepartmentForest" :key="node.id + ':' + searchQuery" :node="node" :company-id="selectedCompany"
              :expand-all="expandedLevels || searchQuery.trim().length > 0" />
          </div>
        </div>
        <p v-else class="diagram-empty">{{ searchQuery.trim() ? tr('Подразделения по запросу не найдены.') : tr('Подразделений для отображения пока нет.') }}</p>
      </div>

      <div v-else class="org-table-view">
        <BaseLoadingState v-if="loadingDepartments" class="org-mobile-only" :label="tr('Загрузка подразделений')" />
        <div v-else class="org-mobile-list">
          <p v-if="!filteredHierarchyRows.length" class="diagram-empty">{{ tr('Подразделения не найдены.') }}</p>
          <article v-for="row in filteredHierarchyRows" :key="row.id" class="org-mobile-item">
            <div class="org-mobile-item-head">
              <strong>{{ row.name }}</strong>
              <span>{{ tr('Уровень') }} {{ fmt.number(Number(row.depth) + 1, 0) }}</span>
            </div>
            <p>{{ row.parentLabel }}</p>
            <div v-if="departmentWritesEnabled" class="org-mobile-actions">
              <BaseButton variant="secondary" @click="editDepartmentRecord(row)"><Pencil :size="15" /> {{ tr('Изменить') }}</BaseButton>
              <BaseButton variant="secondary" @click="deleteCandidate = row"><Trash2 :size="15" /> {{ tr('Удалить') }}</BaseButton>
            </div>
          </article>
        </div>
        <div class="org-desktop-table">
          <BaseSelectionToolbar :count="selectedDepartmentRows.length" :label="tr('Выбрано на странице:')" :clear-label="tr('Сбросить выбор')" @clear="selectedDepartmentIds = []" />
          <BaseDataTable
        v-model:selected-keys="selectedDepartmentIds"
        selectable
        row-key="id"

        :caption="tr('Подразделения компании')"
        :loading="loadingDepartments"
        :columns="columns"
        :rows="filteredHierarchyRows"
        :empty-title="tr('Подразделения не найдены')"
        :empty-description="tr('Для выбранной компании нет доступных подразделений.')"
      >
        <template #cell-name="{ row }">
          <span class="hierarchy-label" :style="{ '--depth': Math.min(Number(row.depth), 12) }">
            <span v-if="row.depth" class="branch-mark">↳</span>
            <strong>{{ row.name }}</strong>
          </span>
        </template>
        <template #cell-parentLabel="{ value }">{{ value }}</template>
        <template #cell-depth="{ row }">{{ Number(row.depth) + 1 }}</template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <BaseButton icon-only variant="secondary" :aria-label="tr('Изменить ') + row.name" @click="editDepartmentRecord(row)"><Pencil :size="16" /></BaseButton>
            <BaseButton icon-only variant="secondary" :aria-label="tr('Удалить ') + row.name" @click="deleteCandidate = row"><Trash2 :size="16" /></BaseButton>
          </div>
        </template>
          </BaseDataTable>
        </div>
      </div>

      <BasePagination
        :page="page"
        :last-page="lastPage"
        :loading="loadingDepartments"
        :caption="tr('Страницы подразделений')"
        @previous="page--"
        @next="page++"
      />
    </section>

    <BaseDrawer
      :open="editorOpen"
      :title="editingDepartment ? tr('Изменить подразделение') : tr('Новое подразделение')"
      :description="tr('Структурная единица организационной схемы')"
      @close="editorOpen = false"
    >
      <DepartmentForm
        v-if="selectedCompany"
        :key="editingDepartment?.id ?? 'new'"
        :company-id="selectedCompany"
        :departments="departments"
        :edit="editingDepartment"
        @saved="departmentSaved"
        @cancelled="editorOpen = false"
      />
    </BaseDrawer>

    <BaseDrawer :open="addEmployeeOpen" :title="tr('Добавить сотрудника')"
      :description="tr('Создание новой карточки сотрудника в выбранной компании')"
      @close="addEmployeeOpen = false">
      <EmployeeRecordForm v-if="selectedCompany" :company-id="selectedCompany"
        @saved="employeeCreated" @cancelled="addEmployeeOpen = false" />
    </BaseDrawer>

    <BaseDialog :open="!!deleteCandidate" :title="tr('Удалить подразделение')" @close="deleteCandidate = null">
      <div class="delete-copy">
        <BaseNotice tone="warning">
          {{ tr('Удаление доступно только для пустого подразделения без дочерних подразделений, истории назначений и строк штатного расписания.') }}</BaseNotice>
        <p v-if="deleteCandidate"><strong>{{ deleteCandidate.name }}</strong></p>
        <div class="delete-actions">
          <BaseButton variant="secondary" :disabled="deleting" @click="deleteCandidate = null">{{ tr('Отмена') }}</BaseButton>
          <BaseButton :disabled="deleting" @click="confirmDelete">{{ deleting ? tr('Удаление…') : tr('Удалить') }}</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.organization-page{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}
.org-heading-actions{display:flex;align-items:end;justify-content:flex-end;gap:10px;min-width:0;flex-wrap:nowrap}
.org-heading-actions :deep(.base-select-field){flex:0 1 200px;width:200px;max-width:200px;min-width:0}
.org-content{min-width:0;display:grid;gap:18px}
.org-metrics{min-width:0}
.org-mobile-list,.org-mobile-only{display:none}
.org-selection-toolbar{display:flex;align-items:center;justify-content:flex-start;gap:12px;margin-bottom:10px;color:var(--color-muted);font-size:12px}
.org-selection-toolbar :deep(.base-button){height:30px;min-height:30px;font-weight:500}

.section-title{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:16px;margin-bottom:0}
.section-title h1{font-size:24px;line-height:1.2;margin:0}
.structure-total{font-size:16px;font-weight:500}
.org-table-view{min-width:0}
.org-mobile-item{padding:16px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:8px}
.org-mobile-item-head{display:flex;justify-content:space-between;gap:10px;align-items:start}
.org-mobile-item-head strong{font-size:14px}
.org-mobile-item-head span{font-size:12px;white-space:nowrap;color:var(--color-muted)}
.org-mobile-item p{margin:6px 0;color:var(--color-muted);font-size:12px}
.org-mobile-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}

.structure-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.structure-tabs{flex:1;min-width:220px}
.structure-search{display:flex;align-items:center;gap:9px;padding:0 12px;min-height:40px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-muted)}
.structure-search:focus-within{outline:2px solid var(--color-focus)}
.structure-search input{width:220px;max-width:100%;border:0;background:transparent;color:var(--color-text);outline:none;font:inherit;font-size:13px}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.chart-zoom{display:flex;align-items:center;gap:7px}
.chart-zoom :deep(.base-button){width:32px;min-width:32px;height:32px;min-height:32px;color:var(--color-primary)}
.chart-zoom input{width:90px;accent-color:var(--color-primary)}
.structure-diagram:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}
.structure-diagram{min-height:320px;padding:28px 24px 36px;background:color-mix(in srgb,var(--color-primary) 4%,var(--color-page));border:1px solid var(--color-stroke);border-radius:var(--radius-md);overflow-x:auto;overflow-y:clip;overscroll-behavior-inline:contain}
.organization-chart{display:grid;justify-items:center;gap:42px;min-width:1320px;padding:4px 10px 12px}
.chart-company{position:relative;display:grid;justify-items:center;gap:6px;width:300px;padding:16px 18px;background:var(--color-surface);border:1px solid var(--color-stroke-strong);border-radius:var(--radius-md);box-shadow:var(--shadow-card);text-align:center}
.chart-company::after{content:'';position:absolute;left:50%;bottom:-37px;width:1px;height:36px;background:var(--color-primary-stroke)}
.chart-company-title{display:flex;align-items:center;justify-content:center;gap:10px;min-width:0}
.chart-company-title svg{flex:none;color:var(--color-primary)}
.chart-company strong{font-size:15px;line-height:1.4;font-weight:600;overflow-wrap:anywhere}
.chart-company-metrics{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px 18px;color:var(--color-primary);font-size:12px;line-height:1.4}
.chart-company-metrics>span{display:inline-flex;align-items:center;gap:5px}
.chart-company-metrics .chart-company-vacant{color:var(--color-warning)}
.chart-company-unavailable{font-size:12px;line-height:1.4;color:var(--color-muted)}
.chart-branches{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));align-items:start;justify-items:center;gap:28px;width:100%}
.chart-branches::before{content:'';position:absolute;left:50%;top:-28px;height:28px;width:1px;background:var(--color-primary-stroke)}
.chart-branches--multi::after{content:'';position:absolute;top:-13px;left:10%;right:10%;border-top:1px solid var(--color-primary-stroke)}
.chart-branches--multi>:deep(.tree-branch)::before{content:'';position:absolute;left:50%;top:-13px;height:13px;width:1px;background:var(--color-primary-stroke)}
@media(max-width:900px){
 .organization-chart{min-width:0;width:100%;gap:30px}
 .chart-branches{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
}
@media(max-width:640px){
 .structure-diagram{padding:16px 12px 22px}
 .organization-chart{min-width:0;gap:24px}
 .chart-company{width:min(100%,320px)}
 .chart-company::after{bottom:-25px;height:24px}
 .chart-branches{grid-template-columns:1fr;gap:12px}
 .chart-branches::before,.chart-branches :deep(.tree-branch)::before{display:none}
}
.diagram-empty{margin:0;color:var(--color-muted);font-size:13px}
.hierarchy-label{display:inline-flex;align-items:center;gap:6px;padding-inline-start:clamp(0px,calc(var(--depth) * 15px),180px);max-width:100%;min-width:160px;overflow-wrap:anywhere}
.branch-mark{color:var(--color-muted)}
.row-actions{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-width:max-content}
.row-actions :deep(.base-button){width:32px;min-width:32px;height:32px;min-height:32px;color:var(--color-muted)}
.row-actions :deep(.base-button:hover){color:var(--color-primary)}
.delete-copy{display:grid;gap:var(--space-4)}
.delete-copy p{margin:0}
.delete-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:1100px){
 .section-title{grid-template-columns:minmax(0,1fr)}
 .org-heading-actions{justify-content:flex-start;flex-wrap:wrap}
}

@media(max-width:700px){
 .org-heading-actions{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
 .org-heading-actions :deep(.base-select-field){width:100%;max-width:none;grid-column:1}
 .org-heading-actions :deep(button:last-child){grid-column:1/-1;width:100%}
 .section-title{display:grid;grid-template-columns:1fr;align-items:stretch}
 .section-title h1{font-size:20px}
 .org-mobile-list{display:grid;gap:10px}
 .org-mobile-only{display:block}
 .org-desktop-table{display:none}
 .structure-tabs{min-width:0;width:100%;flex-basis:100%}
 .structure-search{flex:1}
 .structure-search input{width:100%}
 .chart-zoom{width:100%;justify-content:center}
 .structure-tools :deep(.column-settings){display:none}
 .delete-actions :deep(button){flex:1}
}

</style>

<style scoped>
.expand-levels{display:flex;align-items:center;gap:8px;font-size:13px;white-space:nowrap}.expand-levels input{accent-color:var(--color-primary)}
</style>
