<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, ref } from 'vue'
import BaseEmptyState from './BaseEmptyState.vue'
import BaseLoadingState from './BaseLoadingState.vue'

interface TableColumn {
  key: string
  label: string
  sortable?: boolean
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
}>(), {
  loading: false,
  emptyTitle: 'Данные не найдены',
  emptyDescription: 'Для выбранного раздела пока нет записей.',
  caption: 'Таблица данных',
})

const hasRows = computed(() => !props.loading && props.rows.length > 0)
const activeSort = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const collation = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
function sortBy(key: string) {
  if (activeSort.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { activeSort.value = key; sortDirection.value = 'asc' }
}
const orderedRows = computed(() => {
  if (!activeSort.value) return props.rows
  const key = activeSort.value
  return [...props.rows].sort((a, b) => {
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
</script>

<template>
  <BaseLoadingState v-if="loading" :label="`Загрузка: ${caption}`" />
  <BaseEmptyState v-else-if="!hasRows" :title="emptyTitle" :description="emptyDescription" />
  <div v-else class="table-scroll" tabindex="0" role="region" :aria-label="caption">
    <table>
      <caption class="sr-only">{{ caption }}</caption>
      <thead>
        <tr><th v-for="column in columns" :key="column.key" scope="col"
          :aria-sort="column.sortable ? (activeSort === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none') : undefined">
          <button v-if="column.sortable" class="sortable-heading" type="button" :aria-label="'Сортировать: '+column.label" @click="sortBy(column.key)">
            <span>{{ column.label }}</span><img src="/prototype-icons/Sort.svg" alt="" aria-hidden="true" />
          </button>
          <template v-else>{{ column.label }}</template>
        </th></tr>
      </thead>
      <tbody>
        <template v-for="entry in displayRows" :key="entry.key">
          <tr v-if="entry.kind === 'group'" class="table-group">
            <th scope="rowgroup" :colspan="columns.length">
              {{ entry.label }} <span>{{ entry.count }} на странице</span>
            </th>
          </tr>
          <tr v-else>
            <td v-for="column in columns" :key="column.key">
              <slot :name="`cell-${column.key}`" :row="entry.record" :value="entry.record[column.key]">
                {{ entry.record[column.key] ?? '—' }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll{
  width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;contain:paint;
  border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-surface-raised);box-shadow:var(--shadow-card);
}
.table-scroll:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
table{border-collapse:separate;border-spacing:0;width:100%;min-width:540px;text-align:left;font-size:var(--font-table-size);line-height:var(--line-caption)}
th{
  position:sticky;top:0;z-index:1;padding:10px 12px;
  background:var(--color-table-heading);color:var(--color-table-heading-text);
  font-size:var(--font-table-size);font-weight:500;white-space:nowrap;
  border-bottom:1px solid var(--color-stroke);
}
.sortable-heading{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.sortable-heading:hover{color:var(--color-primary)}
.sortable-heading img{width:15px;height:15px;flex:none;opacity:.72}
:root[data-theme="dark"] .sortable-heading img{filter:brightness(0) invert(.8)}
td{padding:10px 12px;border-bottom:1px solid var(--color-stroke);border-right:1px solid var(--color-stroke);color:var(--color-text);overflow-wrap:anywhere;vertical-align:middle}
tbody tr:last-child td{border-bottom:0}
th:not(:last-child){border-right:1px solid var(--color-stroke)}
td:last-child{border-right:0}
.table-group th{
  position:static;padding:8px 12px;background:var(--color-soft);color:var(--color-text);
  font-size:var(--font-caption-size);font-weight:600;border-top:0;border-bottom:1px solid var(--color-stroke);
}
.table-group th span{margin-left:var(--space-2);color:var(--color-muted);font-weight:400}
tbody tr:not(.table-group):hover{background:var(--color-table-hover)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){th,td{padding:9px 10px}}
</style>
