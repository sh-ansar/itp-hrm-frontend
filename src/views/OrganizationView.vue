<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import DepartmentForm from '../components/DepartmentForm.vue'
import {
  deleteDepartment,
  listCompanies,
  listDepartments,
  type CompanyRecord,
  type DepartmentRecord,
} from '../api/organization'

const companies = ref<CompanyRecord[]>([])
const departments = ref<DepartmentRecord[]>([])
const selectedCompany = ref('')
const loadingCompanies = ref(false)
const loadingDepartments = ref(false)
const departmentWritesEnabled = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const lastPage = ref(1)
const editorOpen = ref(false)
const editingDepartment = ref<DepartmentRecord | null>(null)
const deleteCandidate = ref<DepartmentRecord | null>(null)
const deleting = ref(false)

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

  return departments.value
    .map(item => ({
      ...item,
      depth: depthOf(item.id),
      parentLabel: !item.parent_id
        ? 'Верхний уровень'
        : (departmentNames.value.get(item.parent_id) ?? 'Родитель вне текущего списка'),
    }))
    .sort((a, b) => {
      const aPath = [a.parentLabel, a.name].join('/')
      const bPath = [b.parentLabel, b.name].join('/')
      return aPath.localeCompare(bPath, 'ru')
    })
})

const columns = computed(() => [
  { key: 'name', label: 'Подразделение' },
  { key: 'parentLabel', label: 'Родитель' },
  ...(departmentWritesEnabled.value ? [{ key: 'actions', label: '' }] : []),
])

let generation = 0

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === selectedCompany.value)) {
      selectedCompany.value = companies.value[0]?.id ?? ''
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить организации'
    companies.value = []
    selectedCompany.value = ''
  } finally {
    loadingCompanies.value = false
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
  await loadDepartments()
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
    await loadDepartments()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить подразделение'
    deleteCandidate.value = null
  } finally {
    deleting.value = false
  }
}

watch(selectedCompany, () => { page.value = 1 })
watch([selectedCompany, page], loadDepartments)
onMounted(loadCompanies)
</script>

<template>
  <section class="organization-page">
    <BasePageHeading
      title="Организационная структура"
      description="Иерархия подразделений компании с безопасным управлением родительскими связями."
    >
      <BaseButton v-if="departmentWritesEnabled" @click="createDepartmentRecord"><Plus :size="17" /> Добавить подразделение</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="selector-row">
        <BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" />
        <div class="structure-stat">
          <span>Подразделений</span>
          <strong>{{ total }}</strong>
          <small>{{ currentCompany?.name }}</small>
        </div>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>

    <BaseCard v-if="selectedCompany">
      <div class="section-title">
        <div>
          <p class="kicker">Структура компании</p>
          <h2>Подразделения</h2>
        </div>
        <span class="muted">Страница {{ page }} из {{ lastPage }}</span>
      </div>

      <BaseNotice v-if="total > departments.length" tone="info">
        Отображена только текущая страница. Скрытые или недоступные подразделения не раскрываются.
      </BaseNotice>

      <BaseDataTable
        row-key="id"
        caption="Подразделения компании"
        :loading="loadingDepartments"
        :columns="columns"
        :rows="hierarchyRows"
        empty-title="Подразделения не найдены"
        empty-description="Для выбранной компании нет доступных подразделений."
      >
        <template #cell-name="{ row }">
          <span class="hierarchy-label" :style="{ '--depth': Math.min(Number(row.depth), 12) }">
            <span v-if="row.depth" class="branch-mark">↳</span>
            <strong>{{ row.name }}</strong>
          </span>
        </template>
        <template #cell-parentLabel="{ value }">{{ value }}</template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <BaseButton variant="secondary" @click="editDepartmentRecord(row)"><Pencil :size="15" /> Изменить</BaseButton>
            <BaseButton variant="secondary" @click="deleteCandidate = row"><Trash2 :size="15" /> Удалить</BaseButton>
          </div>
        </template>
      </BaseDataTable>

      <BasePagination
        :page="page"
        :last-page="lastPage"
        :loading="loadingDepartments"
        caption="Страницы подразделений"
        @previous="page--"
        @next="page++"
      />
    </BaseCard>

    <BaseDialog
      :open="editorOpen"
      :title="editingDepartment ? 'Изменить подразделение' : 'Новое подразделение'"
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
    </BaseDialog>

    <BaseDialog :open="!!deleteCandidate" title="Удалить подразделение" @close="deleteCandidate = null">
      <div class="delete-copy">
        <BaseNotice tone="warning">
          Удаление доступно только для пустого подразделения без дочерних подразделений, истории назначений и строк штатного расписания.
        </BaseNotice>
        <p v-if="deleteCandidate"><strong>{{ deleteCandidate.name }}</strong></p>
        <div class="delete-actions">
          <BaseButton variant="secondary" :disabled="deleting" @click="deleteCandidate = null">Отмена</BaseButton>
          <BaseButton :disabled="deleting" @click="confirmDelete">{{ deleting ? 'Удаление…' : 'Удалить' }}</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.organization-page{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
.selector-row{display:flex;align-items:end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.selector-row :deep(.base-select-field){flex:1;min-width:min(100%,320px)}
.structure-stat{display:grid;gap:2px;min-width:160px;padding:10px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.structure-stat span,.structure-stat small{font-size:11px;color:var(--color-muted)}
.structure-stat strong{font-size:20px}
.section-title{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.section-title h2{font-size:var(--font-section-heading);margin:0}
.kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.hierarchy-label{display:inline-flex;align-items:center;gap:6px;padding-inline-start:clamp(0px,calc(var(--depth) * 15px),180px);max-width:100%;overflow-wrap:anywhere}
.branch-mark{color:var(--color-muted)}
.row-actions{display:flex;gap:8px;flex-wrap:wrap}
.delete-copy{display:grid;gap:var(--space-4)}
.delete-copy p{margin:0}
.delete-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.delete-actions :deep(button){flex:1}}
</style>
