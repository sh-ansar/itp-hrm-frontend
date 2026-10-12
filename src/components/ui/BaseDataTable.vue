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
}>(), {
  loading: false,
  emptyTitle: 'Данные не найдены',
  emptyDescription: 'Для выбранного раздела пока нет записей.',
  caption: 'Таблица данных',
})

const hasRows = computed(() => !props.loading && props.rows.length > 0)
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
        <tr v-for="record in rows"  :key="String(record[rowKey])">
          <td v-for="column in columns" :key="column.key">
            <slot :name="`cell-${column.key}`" :row="record" :value="record[column.key]">
              {{ record[column.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll{width:100%;max-width:100%;overflow-x:auto;border:1px solid var(--color-stroke);border-radius:var(--radius-lg);background:var(--color-surface)}
.table-scroll:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
table{border-collapse:collapse;width:100%;min-width:540px;text-align:left;font-size:var(--font-table-size)}
th{position:sticky;top:0;background:var(--color-table-heading);color:var(--color-table-heading-text);font-weight:700;white-space:nowrap;padding:14px 16px;border-bottom:1px solid var(--color-stroke)}
td{padding:13px 16px;border-bottom:1px solid var(--color-stroke);color:var(--color-text);overflow-wrap:anywhere}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--color-table-hover)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){th,td{padding:12px}}
</style>
