<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, nextTick, ref, watch } from 'vue'
import BaseEmptyState from './BaseEmptyState.vue'
import BaseLoadingState from './BaseLoadingState.vue'

/**
 * HRM table standard: the same structure, typography, selection and working
 * column controls on every screen. Search/sort operate on the LOADED rows only.
 * Server-side search/pagination still belong to the calling module.
 */
export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: T[]
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  caption?: string
  rowKey: keyof T & string
  groupBy?: (row: T) => string
  selectable?: boolean
  selectedKeys?: string[]
  minTableWidth?: number
}>(), {
  loading: false,
  emptyTitle: 'Данные не найдены',
  emptyDescription: 'Для выбранного раздела пока нет записей.',
  caption: 'Таблица данных',
  selectable: false,
  selectedKeys: () => [],
})

const emit = defineEmits<{ 'update:selectedKeys': [keys: string[]] }>()
const activeSort = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const activeFilters = ref<Record<string, string>>({})
const editingColumn = ref<string | null>(null)
const filterDraft = ref('')
const filterInput = ref<HTMLInputElement | null>(null)
const collation = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
const forbiddenActionKeys = new Set(['selection', 'select', 'actions', 'action', 'details', 'detail', 'edit', 'file'])

const visibleColumns = computed(() => props.columns.filter(column => column.key !== 'selection'))
const showSelection = computed(() => props.selectable)
const headerColumnsCount = computed(() => visibleColumns.value.length + (showSelection.value ? 1 : 0))
const tableWidth = computed(() => {
  if (props.minTableWidth && props.minTableWidth >= 320) return props.minTableWidth
  return Math.max(620, visibleColumns.value.reduce((width, column) => {
    if (column.width) return width + column.width
    if (column.minWidth) return width + column.minWidth
    if (column.key === 'full_name' || column.key === 'employee' || column.key === 'name' || column.key === 'title') return width + 205
    if (column.key === 'status' || column.key === 'status_label') return width + 134
    if (column.key.includes('date') || column.key.endsWith('_on')) return width + 148
    if (forbiddenActionKeys.has(column.key)) return width + 90
    return width + 130
  }, showSelection.value ? 44 : 0))
})
const selectedSet = computed(() => new Set(props.selectedKeys))
function hasValue(column: TableColumn) {
  return props.rows.some(row => {
    const value = row[column.key]
    return value !== undefined && value !== null && typeof value !== 'object'
  })
}
function canSort(column: TableColumn) {
  if (forbiddenActionKeys.has(column.key)) return false
  return column.sortable === true || (column.sortable !== false && hasValue(column))
}
function canFilter(column: TableColumn) {
  if (forbiddenActionKeys.has(column.key)) return false
  return column.filterable === true || (column.filterable !== false && hasValue(column))
}
function sortBy(key: string) {
  if (activeSort.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { activeSort.value = key; sortDirection.value = 'asc' }
}
function filterValue(row: T, column: string): string {
  const value = row[column]
  if (value !== null && value !== undefined) return String(value).toLocaleLowerCase('ru')
  // Some views render a composite 'employee' slot rather than a native property.
  if (column === 'employee' || column === 'full_name') {
    return [row.last_name, row.first_name, row.middle_name, row.personnel_number]
      .filter(Boolean).join(' ').toLocaleLowerCase('ru')
  }
  return ''
}
const filteredRows = computed(() => {
  const filters = Object.entries(activeFilters.value).filter(([key, value]) =>
    value.trim() && visibleColumns.value.some(column => column.key === key))
  if (!filters.length) return props.rows
  return props.rows.filter(row => filters.every(([key, value]) =>
    filterValue(row, key).includes(value.toLocaleLowerCase('ru').trim())))
})
const orderedRows = computed(() => {
  if (!activeSort.value || !visibleColumns.value.some(column => column.key === activeSort.value && canSort(column)))
    return filteredRows.value
  const key = activeSort.value
  return [...filteredRows.value].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === right) return 0
    if (left === null || left === undefined) return 1
    if (right === null || right === undefined) return -1
    const compare = typeof left === 'number' && typeof right === 'number'
      ? left - right : collation.compare(String(left), String(right))
    return sortDirection.value === 'asc' ? compare : -compare
  })
})
type Entry = { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'record'; key: string; record: T }
const displayRows = computed<Entry[]>(() => {
  if (!props.groupBy) return orderedRows.value.map(record => ({
    kind: 'record' as const, key: String(record[props.rowKey]), record,
  }))
  const groups = new Map<string, T[]>()
  for (const row of orderedRows.value) {
    const label = props.groupBy(row) || 'Без подразделения'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(row)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru')).flatMap(([label, records]) => [
    { kind: 'group' as const, key: 'group:' + label, label, count: records.length },
    ...records.map(record => ({
      kind: 'record' as const, key: String(record[props.rowKey]), record,
    })),
  ])
})
const hasRows = computed(() => !props.loading && orderedRows.value.length > 0)
const anyFilters = computed(() => Object.values(activeFilters.value).some(Boolean))
const selectedVisible = computed(() => orderedRows.value.filter(row => selectedSet.value.has(String(row[props.rowKey]))))
const allSelected = computed(() => orderedRows.value.length > 0 && selectedVisible.value.length === orderedRows.value.length)
const someSelected = computed(() => selectedVisible.value.length > 0 && !allSelected.value)
const filterColumn = computed(() => visibleColumns.value.find(col => col.key === editingColumn.value))
function selectAll(checked: boolean) {
  const keys = new Set(props.selectedKeys)
  for (const row of orderedRows.value) {
    const key = String(row[props.rowKey])
    if (checked) keys.add(key)
    else keys.delete(key)
  }
  emit('update:selectedKeys', [...keys])
}
function selectRow(row: T, checked: boolean) {
  const keys = new Set(props.selectedKeys)
  const key = String(row[props.rowKey])
  if (checked) keys.add(key)
  else keys.delete(key)
  emit('update:selectedKeys', [...keys])
}
function rowName(row: T) {
  const value = row.full_name ?? row.name ?? row.personnel_number ?? row[props.rowKey]
  return String(value ?? '')
}
async function toggleFilter(key: string) {
  editingColumn.value = editingColumn.value === key ? null : key
  if (editingColumn.value) {
    filterDraft.value = activeFilters.value[key] ?? ''
    await nextTick()
    filterInput.value?.focus()
  }
}
function applyFilter() {
  const key = editingColumn.value
  if (!key) return
  const text = filterDraft.value.trim()
  const next = { ...activeFilters.value }
  if (text) next[key] = text
  else delete next[key]
  activeFilters.value = next
  editingColumn.value = null
}
function clearColumnFilter(key: string) {
  const next = { ...activeFilters.value }
  delete next[key]
  activeFilters.value = next
  filterDraft.value = ''
  editingColumn.value = null
}
function clearFilters() {
  activeFilters.value = {}
  editingColumn.value = null
  filterDraft.value = ''
}
watch(() => props.columns.map(column => column.key).join(','), () => {
  if (activeSort.value && !visibleColumns.value.some(column => column.key === activeSort.value)) activeSort.value = null
  activeFilters.value = Object.fromEntries(
    Object.entries(activeFilters.value).filter(([key]) => visibleColumns.value.some(column => column.key === key)))
  if (editingColumn.value && !visibleColumns.value.some(column => column.key === editingColumn.value))
    editingColumn.value = null
})
</script>

<template>
  <div class="base-data-table">
    <div v-if="filterColumn" class="table-filter-panel" role="group"
      :aria-label="'Фильтр столбца: ' + filterColumn.label">
      <label class="filter-field">
        <span>Фильтр: {{ filterColumn.label }}</span>
        <input ref="filterInput" v-model="filterDraft" type="search"
          :aria-label="'Значение фильтра: ' + filterColumn.label"
          placeholder="Введите значение" @keydown.enter.prevent="applyFilter" @keydown.esc="editingColumn=null" />
      </label>
      <button class="filter-apply" type="button" @click="applyFilter">Применить</button>
      <button v-if="activeFilters[filterColumn.key]" class="filter-clear" type="button"
        @click="clearColumnFilter(filterColumn.key)">Сбросить</button>
      <button class="filter-close" type="button" aria-label="Закрыть фильтр" @click="editingColumn=null">×</button>
      <span class="filter-hint">Поиск по загруженным строкам</span>
    </div>
    <div v-if="anyFilters" class="filter-summary" role="status">
      <span>Фильтр: {{ orderedRows.length }} из {{ rows.length }} загруженных строк</span>
      <button type="button" @click="clearFilters">Сбросить фильтры</button>
    </div>
    <BaseLoadingState v-if="loading" :label="`Загрузка: ${caption}`" />
    <BaseEmptyState v-else-if="!hasRows" :title="anyFilters ? 'По фильтру ничего не найдено' : emptyTitle"
      :description="anyFilters ? 'Измените значение фильтра или сбросьте его.' : emptyDescription" />
    <div v-else class="table-scroll" tabindex="0" role="region" :aria-label="caption">
      <table :style="{ minWidth: tableWidth + 'px' }">
        <caption class="sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th v-if="showSelection" class="selection-column" scope="col">
              <input type="checkbox" :checked="allSelected" :indeterminate="someSelected"
                :aria-label="'Выбрать все строки на странице: ' + caption"
                :disabled="orderedRows.length === 0"
                @change="selectAll(($event.target as HTMLInputElement).checked)" />
            </th>
            <th v-for="column in visibleColumns" :key="column.key" scope="col"
              :class="['column-heading', 'table-align--' + (column.align ?? 'left')]"
              :style="{ width: column.width ? column.width + 'px' : undefined, minWidth: column.minWidth ? column.minWidth + 'px' : undefined }"
              :aria-sort="canSort(column) ? (activeSort === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none') : undefined">
              <div class="heading-content">
                <button v-if="canSort(column)" class="sort-heading" type="button"
                  :aria-label="'Упорядочить по столбцу: ' + column.label"
                  :title="'Сортировать загруженные строки: ' + column.label"
                  @click="sortBy(column.key)">
                  <span>{{ column.label }}</span>
                </button>
                <span v-else class="heading-label">{{ column.label }}</span>
                <div class="heading-actions">
                  <button v-if="canFilter(column)" type="button" class="heading-icon"
                    :class="{ 'heading-icon--active': !!activeFilters[column.key] }"
                    :aria-label="'Фильтр: ' + column.label" :aria-pressed="!!activeFilters[column.key]"
                    :title="'Фильтр по загруженным строкам: ' + column.label"
                    @click="toggleFilter(column.key)">
                    <img src="/prototype-icons/Filter.svg" alt="" aria-hidden="true" />
                  </button>
                  <button v-if="canSort(column)" type="button" class="heading-icon"
                    :aria-label="'Сортировать: ' + column.label"
                    :title="'Сортировка загруженных строк: ' + column.label"
                    @click="sortBy(column.key)">
                    <img src="/prototype-icons/Sort.svg" alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in displayRows" :key="entry.key">
            <tr v-if="entry.kind === 'group'" class="table-group">
              <th scope="rowgroup" :colspan="headerColumnsCount">
                {{ entry.label }} <span>{{ entry.count }} на странице</span>
              </th>
            </tr>
            <tr v-else :data-row-key="entry.key" :class="{ 'table-row--selected': selectedSet.has(entry.key) }">
              <td v-if="showSelection" class="selection-column">
                <input type="checkbox" :checked="selectedSet.has(entry.key)"
                  :aria-label="'Выбрать сотрудника: ' + rowName(entry.record)"
                  @change="selectRow(entry.record, ($event.target as HTMLInputElement).checked)" />
              </td>
              <td v-for="column in visibleColumns" :key="column.key"
                :class="'table-align--' + (column.align ?? 'left')">
                <slot :name="`cell-${column.key}`" :row="entry.record" :value="entry.record[column.key]">
                  {{ entry.record[column.key] ?? '—' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.base-data-table{min-width:0;max-width:100%;font-size:var(--font-table-size);line-height:19px}
.table-scroll{
  width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;
  border:1px solid var(--color-table-border,var(--color-stroke-strong));border-radius:var(--radius-md);
  background:var(--color-surface);box-shadow:var(--shadow-card);scrollbar-width:thin;
  scrollbar-color:var(--color-primary-stroke) transparent;
}
.table-scroll:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px}
table{
  width:100%;border-collapse:separate;border-spacing:0;table-layout:auto;
  text-align:left;font-size:var(--font-table-size);line-height:19px;
  color:var(--color-text);
}
thead th{
  padding:0;height:46px;min-height:46px;vertical-align:middle;
  background:var(--color-table-heading);color:var(--color-table-heading-text);
  font-size:12px;font-weight:600;line-height:17px;
  border-bottom:1px solid var(--color-table-border,var(--color-stroke));
}
thead th:not(:last-child),tbody td:not(:last-child){border-right:1px solid var(--color-table-border,var(--color-stroke))}
.heading-content{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:45px;padding:8px 11px}
.heading-label,.sort-heading{
  display:block;min-width:0;max-width:100%;color:inherit;
  font-size:12px;font-weight:600;line-height:17px;white-space:normal;
  overflow-wrap:normal;text-align:left;
}
.sort-heading{padding:0;border:0;background:transparent;cursor:pointer}
.sort-heading:hover{color:var(--color-primary)}
.heading-actions{display:flex;align-items:center;gap:6px;flex:none}
.heading-icon{
  display:grid;place-items:center;width:19px;height:22px;padding:0;border:0;
  border-radius:4px;background:transparent;color:var(--color-muted);
}
.heading-icon:hover,.heading-icon--active{background:var(--color-accent-soft)}
.heading-icon img{width:15px;height:15px;object-fit:contain;opacity:.85}
.heading-icon--active img{filter:brightness(0) saturate(100%) invert(44%) sepia(95%) saturate(1518%) hue-rotate(167deg) brightness(96%) contrast(100%)}
tbody tr:not(.table-group){height:50px}
tbody td{
  min-height:50px;padding:9px 12px;
  color:var(--color-text);font-size:var(--font-table-size);line-height:19px;
  vertical-align:middle;border-bottom:1px solid var(--color-table-border,var(--color-stroke));
  overflow-wrap:break-word;
}
tbody tr:last-child td{border-bottom:0}
tbody tr:not(.table-group):hover{background:var(--color-table-hover)}
tbody tr.table-row--selected{background:var(--color-accent-soft)}
.table-group th{
  padding:8px 12px;background:var(--color-soft);color:var(--color-text);
  font-size:12px;font-weight:700;line-height:18px;border-bottom:1px solid var(--color-table-border,var(--color-stroke));
}
.table-group th span{margin-left:9px;color:var(--color-muted);font-size:11px;font-weight:400}
.selection-column{width:45px;min-width:45px;max-width:45px;text-align:center;padding:9px 8px!important}
.selection-column input{
  display:inline-block;width:16px;height:16px;margin:0;
  accent-color:var(--color-primary);vertical-align:middle;cursor:pointer;
}
.table-align--right{text-align:right}
.table-align--center{text-align:center}
.table-filter-panel{
  display:flex;align-items:end;gap:9px;flex-wrap:wrap;
  min-height:64px;margin-bottom:8px;padding:10px 12px;
  border:1px solid var(--color-table-border,var(--color-stroke-strong));
  border-radius:var(--radius-md);background:var(--color-surface);
}
.filter-field{display:grid;gap:4px;flex:1 1 175px;min-width:125px}
.filter-field span{color:var(--color-text);font-size:11px;line-height:16px;font-weight:600}
.filter-field input{
  width:100%;min-height:33px;padding:6px 9px;
  border:1px solid var(--color-stroke-strong);border-radius:var(--radius-sm);
  background:var(--color-surface);color:var(--color-text);font-size:12px;
}
.filter-apply,.filter-clear,.filter-close,.filter-summary button{
  min-height:33px;padding:6px 11px;border:1px solid var(--color-stroke-strong);
  border-radius:var(--radius-sm);background:var(--color-surface);
  color:var(--color-text);font-size:12px;line-height:18px;cursor:pointer;
}
.filter-apply{background:var(--color-primary);border-color:var(--color-primary);color:var(--color-on-primary)}
.filter-close{font-size:19px;padding:5px 10px}
.filter-hint{align-self:center;color:var(--color-muted);font-size:11px}
.filter-summary{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 8px;color:var(--color-muted);font-size:11px}
.filter-summary button{min-height:27px;padding:3px 9px;color:var(--color-primary)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
:root[data-theme="dark"] .heading-icon:not(.heading-icon--active) img{filter:brightness(0) invert(.78)}
@media(max-width:650px){
  .heading-content{min-height:43px;padding:7px 9px;gap:5px}
  tbody td{padding:8px 10px}
  .heading-actions{gap:3px}
  .filter-hint{flex-basis:100%}
}
</style>
