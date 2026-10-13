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
.table-scroll{
  width:100%;max-width:100%;overflow-x:auto;contain:paint;
  border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-surface-raised);box-shadow:var(--shadow-card);
}
.table-scroll:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
table{border-collapse:separate;border-spacing:0;width:100%;min-width:540px;text-align:left;font-size:var(--font-table-size);line-height:var(--line-caption)}
th{
  position:sticky;top:0;z-index:1;padding:10px 12px;
  background:var(--color-table-heading);color:var(--color-table-heading-text);
  font-size:var(--font-caption-size);font-weight:600;white-space:nowrap;
  border-bottom:1px solid var(--color-stroke);
}
td{padding:10px 12px;border-bottom:1px solid var(--color-stroke);color:var(--color-text);overflow-wrap:anywhere;vertical-align:middle}
tbody tr:last-child td{border-bottom:0}
.table-group th{
  position:static;padding:8px 12px;background:var(--color-soft);color:var(--color-text);
  font-size:var(--font-caption-size);font-weight:600;border-top:0;border-bottom:1px solid var(--color-stroke);
}
.table-group th span{margin-left:var(--space-2);color:var(--color-muted);font-weight:400}
tbody tr:not(.table-group):hover{background:var(--color-table-hover)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){th,td{padding:9px 10px}}
</style>
