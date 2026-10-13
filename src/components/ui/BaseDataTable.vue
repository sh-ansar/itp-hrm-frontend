<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue'
import BaseEmptyState from './BaseEmptyState.vue'
import BaseLoadingState from './BaseLoadingState.vue'

interface TableColumn {
  key: string
  label: string
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
type Entry = { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'record'; key: string; record: T }
const displayRows = computed<Entry[]>(() => {
  if (!props.groupBy) return props.rows.map(record => ({
    kind: 'record' as const, key: String(record[props.rowKey]), record,
  }))
  const groups = new Map<string, T[]>()
  for (const row of props.rows) {
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
        <tr><th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th></tr>
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
.table-scroll{width:100%;max-width:100%;overflow-x:auto;contain:paint;border:1px solid var(--color-stroke);border-radius:var(--radius-lg);background:var(--color-surface)}
.table-scroll:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
table{border-collapse:collapse;width:100%;min-width:540px;text-align:left;font-size:var(--font-table-size)}
th{position:sticky;top:0;background:var(--color-table-heading);color:var(--color-table-heading-text);font-weight:700;white-space:nowrap;padding:14px 16px;border-bottom:1px solid var(--color-stroke)}
td{padding:13px 16px;border-bottom:1px solid var(--color-stroke);color:var(--color-text);overflow-wrap:anywhere}
tbody tr:last-child td{border-bottom:0}
.table-group th{padding:10px 16px;background:var(--color-soft);font-size:12px;color:var(--color-text);border-top:1px solid var(--color-stroke);border-bottom:1px solid var(--color-stroke)}
.table-group th span{margin-left:10px;color:var(--color-muted);font-weight:400}
tbody tr:hover{background:var(--color-table-hover)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){th,td{padding:12px}}
</style>
