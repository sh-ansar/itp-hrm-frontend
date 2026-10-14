<script setup lang="ts">
import { computed, ref } from 'vue'
import { Maximize2, Minimize2, Search } from 'lucide-vue-next'
import BaseActionDropdown from './ui/BaseActionDropdown.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseColumnPicker from './ui/BaseColumnPicker.vue'
import BaseDataTable from './ui/BaseDataTable.vue'
import BaseFilterSummary from './ui/BaseFilterSummary.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseStatusPill from './ui/BaseStatusPill.vue'
import BaseTableBulkActions from './ui/BaseTableBulkActions.vue'
import { downloadCsv } from '../utils/exportCsv'

type EmployeeDocument = {
  id: string
  title: string
  number: string
  issued_on: string | null
  status: string
  document_type?: string | null
  file_name?: string | null
}
type DocumentRow = EmployeeDocument & { folder: string }
type GroupMode = 'folder' | 'type' | 'none'

const props = defineProps<{ documents: EmployeeDocument[] }>()

const search = ref('')
const typeFilter = ref('all')
const statusFilter = ref('all')
const groupMode = ref<GroupMode>('folder')
const selectedIds = ref<string[]>([])
const fullscreen = ref(false)
const visibleFields = ref<Record<string, boolean>>({
  file_name: true,
  number: true,
  document_type: true,
  issued_on: true,
  status: true,
})

const allColumns = [
  { key: 'title', label: 'Папка / Название документа' },
  { key: 'file_name', label: 'Файл' },
  { key: 'number', label: '№ документа' },
  { key: 'document_type', label: 'Тип документа' },
  { key: 'issued_on', label: 'Дата' },
  { key: 'status', label: 'Статус' },
]
const optionalColumns = allColumns.filter(column => column.key !== 'title')
const columns = computed(() => allColumns.filter(column =>
  column.key === 'title' || visibleFields.value[column.key] !== false))

function folderFor(document: EmployeeDocument): string {
  const haystack = [document.document_type, document.title].filter(Boolean).join(' ').toLowerCase()
  if (/паспорт|удостовер|идентиф|рожд|личн|identity|passport|birth/.test(haystack)) return 'Личные документы'
  if (/договор|приказ|труд|назнач|employment|contract|order/.test(haystack)) return 'Трудовые документы'
  if (/обуч|сертифик|диплом|education|training|certificate/.test(haystack)) return 'Образование и развитие'
  return 'Прочие документы'
}
function displayDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return day + '.' + month + '.' + year
}
const rows = computed<DocumentRow[]>(() => props.documents.map(document => ({
  ...document,
  folder: folderFor(document),
})))
const typeOptions = computed(() => [
  { id: 'all', name: 'Все типы' },
  ...[...new Set(rows.value.map(row => row.document_type).filter((value): value is string => Boolean(value)))]
    .sort((a,b)=>a.localeCompare(b,'ru')).map(name => ({ id: name, name })),
])
const statusOptions = computed(() => [
  { id: 'all', name: 'Все статусы' },
  ...[...new Set(rows.value.map(row => row.status).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'ru')).map(name => ({ id: name, name })),
])
const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(row =>
    (typeFilter.value === 'all' || row.document_type === typeFilter.value)
    && (statusFilter.value === 'all' || row.status === statusFilter.value)
    && (!q || [row.title,row.file_name,row.number,row.document_type,row.status,row.folder]
      .filter(Boolean).join(' ').toLowerCase().includes(q)))
})
const selectedRows = computed(() => filteredRows.value.filter(row => selectedIds.value.includes(row.id)))
const filterChips = computed(() => [
  ...(search.value ? [{ id:'search', label:'Поиск: ' + search.value }] : []),
  ...(typeFilter.value !== 'all' ? [{ id:'type', label:'Тип: ' + typeFilter.value }] : []),
  ...(statusFilter.value !== 'all' ? [{ id:'status', label:'Статус: ' + statusFilter.value }] : []),
  ...(groupMode.value !== 'none' ? [{ id:'group', label:'Группировка: ' + (groupMode.value === 'folder' ? 'по папкам' : 'по типу') }] : []),
])
const groupOptions = [
  { id:'folder', label:'По папкам' },
  { id:'type', label:'По типу документа' },
  { id:'none', label:'Без группировки' },
]
const exportOptions = computed(() => [
  { id:'filtered', label:'Экспортировать текущую выборку', disabled: filteredRows.value.length === 0 },
  { id:'selected', label:'Экспортировать выбранные', disabled: selectedRows.value.length === 0 },
])
const bulkOptions = [{ id:'export', label:'Экспортировать выбранные в CSV' }]

function groupBy(row: DocumentRow): string {
  if (groupMode.value === 'folder') return row.folder
  if (groupMode.value === 'type') return row.document_type || 'Без типа'
  return ''
}
function clearFilter(id: string) {
  if (id === 'search') search.value = ''
  if (id === 'type') typeFilter.value = 'all'
  if (id === 'status') statusFilter.value = 'all'
  if (id === 'group') groupMode.value = 'none'
}
function clearFilters() {
  search.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  groupMode.value = 'none'
}
function exportRows(items: DocumentRow[], fileName: string) {
  if (!items.length) return
  downloadCsv(fileName,
    ['Папка','Название документа','Файл','Номер','Тип','Дата','Статус'],
    items.map(row => [
      row.folder,row.title,row.file_name,row.number,row.document_type,
      displayDate(row.issued_on),row.status,
    ]))
}
function doExport(id: string) {
  if (id === 'filtered') exportRows(filteredRows.value,'employee-documents.csv')
  if (id === 'selected') exportRows(selectedRows.value,'employee-documents-selected.csv')
}
function doBulk(id: string) {
  if (id === 'export') exportRows(selectedRows.value,'employee-documents-selected.csv')
}
function setGrouping(id: string) {
  if (id === 'folder' || id === 'type' || id === 'none') groupMode.value = id
}
function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const value=status.toLowerCase()
  if (/прикреп|действ|active|attached|signed/.test(value)) return 'success'
  if (/чернов|draft|ожида/.test(value)) return 'warning'
  if (/истек|отмен|expired|cancel/.test(value)) return 'danger'
  return 'info'
}
</script>

<template>
  <div class="employee-documents-panel" :class="{ 'is-fullscreen': fullscreen }">
    <div class="documents-actions">
      <BaseActionDropdown label="Экспорт" :options="exportOptions" @select="doExport" />
      <RouterLink class="documents-link-button documents-link-button--primary" to="/documents">Действия</RouterLink>
      <BaseButton variant="secondary" icon-only
        :aria-label="fullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
        @click="fullscreen=!fullscreen">
        <Minimize2 v-if="fullscreen" :size="17" aria-hidden="true" />
        <Maximize2 v-else :size="17" aria-hidden="true" />
      </BaseButton>
    </div>

    <div class="documents-toolbar">
      <label class="documents-search">
        <Search :size="16" aria-hidden="true" />
        <input v-model="search" type="search" aria-label="Поиск документов" placeholder="Поиск" />
      </label>
      <BaseSelectField v-model="typeFilter" label="Тип документа" :options="typeOptions" />
      <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
      <BaseActionDropdown
        :label="groupMode === 'none' ? 'Группировка' : groupMode === 'folder' ? 'По папкам' : 'По типу'"
        :options="groupOptions" @select="setGrouping" />
      <BaseColumnPicker v-model="visibleFields" :columns="optionalColumns" title="Настройка колонок" />
      <RouterLink class="documents-link-button" to="/documents?view=templates">Шаблоны</RouterLink>
    </div>

    <BaseFilterSummary :items="filterChips" label="Активные фильтры документов"
      @remove="clearFilter" @clear="clearFilters" />

    <BaseTableBulkActions :count="selectedRows.length" subject="документов"
      :options="bulkOptions" @execute="doBulk" @clear="selectedIds=[]" />

    <BaseDataTable density="compact" :rows="filteredRows" :columns="columns" row-key="id"
      selectable selection-label="Выбрать документ" v-model:selected-keys="selectedIds"
      :group-by="groupMode !== 'none' ? groupBy : undefined"
      caption="Документы сотрудника" empty-title="Документы не добавлены"
      empty-description="В карточке пока нет документов для выбранных фильтров.">
      <template #cell-title="{ row }">
        <div class="document-title-cell">
          <strong>{{ row.title }}</strong>
          <span>{{ row.folder }}</span>
        </div>
      </template>
      <template #cell-file_name="{ value }"><span class="document-file">{{ value || '—' }}</span></template>
      <template #cell-number="{ value }">{{ value || '—' }}</template>
      <template #cell-document_type="{ value }">{{ value || '—' }}</template>
      <template #cell-issued_on="{ value }">{{ displayDate(typeof value === 'string' ? value : null) }}</template>
      <template #cell-status="{ value }">
        <BaseStatusPill :tone="statusTone(String(value||''))">{{ value || '—' }}</BaseStatusPill>
      </template>
    </BaseDataTable>

    <RouterLink class="related-module-link" to="/documents">Открыть общий реестр документов</RouterLink>
  </div>
</template>

<style scoped>
.employee-documents-panel{display:grid;gap:10px;min-width:0}
.documents-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.documents-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap;min-width:0}
.documents-toolbar :deep(.base-select-field){width:190px;max-width:220px}
.documents-search{display:flex;align-items:center;gap:8px;flex:1 1 220px;min-width:min(220px,100%);height:40px;padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-muted);box-shadow:var(--shadow-control)}
.documents-search:focus-within{border-color:var(--color-primary-stroke);outline:1px solid var(--color-primary-stroke)}
.documents-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.documents-link-button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-control);font-size:12px;line-height:18px;font-weight:600;white-space:nowrap}
.documents-link-button:hover{border-color:var(--color-primary-stroke);background:var(--color-soft)}
.documents-link-button--primary{background:var(--color-primary);border-color:var(--color-primary);color:var(--color-on-primary)}
.documents-link-button--primary:hover{background:var(--color-primary-hover);border-color:var(--color-primary-hover)}
.document-title-cell{display:grid;gap:2px;min-width:170px}.document-title-cell strong{font-size:12px}.document-title-cell span{color:var(--color-muted);font-size:10px}
.document-file{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.related-module-link{justify-self:start;color:var(--color-primary);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:2px}
.is-fullscreen{position:fixed;z-index:240;inset:10px;overflow:auto;padding:18px;border:1px solid var(--color-stroke);border-radius:10px;background:var(--color-page);box-shadow:var(--shadow-float)}
@media(max-width:720px){
  .documents-actions{justify-content:flex-start}
  .documents-toolbar{display:grid;grid-template-columns:1fr}
  .documents-toolbar :deep(.base-select-field){width:100%;max-width:none}
  .documents-search{width:100%}
  .documents-link-button{width:100%}
}
</style>
