<script setup lang="ts">
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { EmployeeRecord } from '../api/personnel'
import BaseStatusPill from './ui/BaseStatusPill.vue'

const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

type EmployeeRow = EmployeeRecord & { full_name: string; status_label: string }

const props = defineProps<{
  rows: EmployeeRow[]
  companyId: string
  selectedIds: string[]
  loading?: boolean
  grouped?: boolean
}>()
const emit = defineEmits<{ select: [id: string, checked: boolean] }>()

const hasRows = computed(() => !props.loading && props.rows.length > 0)
const groupedRows = computed(() => {
  if (!props.grouped) return [{ label: '', rows: props.rows }]
  const groups = new Map<string, EmployeeRow[]>()
  for (const row of props.rows) {
    const label = row.current_department_name || tr('Без подразделения')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(row)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .map(([label, rows]) => ({ label, rows }))
})
function displayDate(value: unknown): string {
  return typeof value === 'string' ? fmt.date(value) : '—'
}
</script>

<template>
  <div class="employee-mobile-list">
    <div v-if="loading" class="employee-mobile-loading" aria-live="polite">{{ tr('Загрузка сотрудников…') }}</div>
    <p v-else-if="!hasRows" class="employee-mobile-empty">{{ tr('Сотрудники не найдены.') }}</p>

    <template v-for="group in groupedRows" :key="group.label || 'all'">
      <div v-if="grouped && group.label" class="employee-mobile-group">
        <strong>{{ group.label }}</strong><span>{{ group.rows.length }}</span>
      </div>
      <article v-for="row in group.rows" :key="row.id" class="employee-mobile-card">
      <header>
        <label class="employee-select">
          <input type="checkbox" :checked="selectedIds.includes(row.id)"
            :aria-label="tr('Выбрать сотрудника: ') + row.full_name"
            @change="emit('select', row.id, ($event.target as HTMLInputElement).checked)" />
        </label>
        <div class="employee-mobile-heading">
          <RouterLink :to="{ name: 'employee-detail', params: { company: companyId, employee: row.id } }">
            {{ row.full_name }}
          </RouterLink>
          <span>{{ row.current_position_name ?? tr('Должность не назначена') }}</span>
        </div>
        <RouterLink class="employee-mobile-open"
          :to="{ name: 'employee-detail', params: { company: companyId, employee: row.id } }"
          :aria-label="tr('Открыть карточку: ') + row.full_name">
          <ChevronRight :size="18" />
        </RouterLink>
      </header>

      <dl>
        <div>
          <dt>{{ tr('Табельный №') }}</dt>
          <dd>{{ row.personnel_number }}</dd>
        </div>
        <div>
          <dt>{{ tr('Подразделение') }}</dt>
          <dd>{{ row.current_department_name ?? '—' }}</dd>
        </div>
        <div>
          <dt>{{ tr('Дата назначения') }}</dt>
          <dd>{{ displayDate(row.current_assignment_valid_from) }}</dd>
        </div>
      </dl>

      <footer>
        <BaseStatusPill :tone="row.employment_status === 'active' ? 'success'
          : row.employment_status === 'archived' ? 'danger'
          : row.employment_status === 'planned' ? 'info' : 'warning'">{{ row.status_label }}</BaseStatusPill>
      </footer>
      </article>
    </template>
  </div>
</template>

<style scoped>
.employee-mobile-list{display:grid;gap:10px}
.employee-mobile-loading,.employee-mobile-empty{
  margin:0;padding:22px 12px;text-align:center;color:var(--color-muted);
  font-size:var(--font-caption-size);line-height:var(--line-caption)
}
.employee-mobile-group{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 3px 1px}
.employee-mobile-group strong{min-width:0;color:var(--color-text);font-size:12px;line-height:1.4;font-weight:600;overflow-wrap:anywhere}
.employee-mobile-group span{flex:0 0 auto;color:var(--color-muted);font-size:11px}
.employee-mobile-card{
  min-width:0;padding:13px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.employee-mobile-card header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:10px}
.employee-select{display:grid;place-items:center;width:22px;height:28px}
.employee-select input{width:15px;height:15px;accent-color:var(--color-primary)}
.employee-mobile-heading{display:grid;gap:3px;min-width:0}
.employee-mobile-heading a{
  min-width:0;color:var(--color-text);font-size:14px;line-height:1.35;
  font-weight:600;overflow-wrap:anywhere
}
.employee-mobile-heading a:hover{color:var(--color-primary)}
.employee-mobile-heading span{
  color:var(--color-muted);font-size:11px;line-height:1.4;overflow-wrap:anywhere
}
.employee-mobile-open{
  display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-sm);color:var(--color-muted)
}
.employee-mobile-open:hover{background:var(--color-hover);color:var(--color-primary)}
.employee-mobile-card dl{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0
}
.employee-mobile-card dl div{
  min-width:0;padding:9px;background:var(--color-soft);border-radius:var(--radius-sm)
}
.employee-mobile-card dl div:nth-child(2){grid-column:span 2}
.employee-mobile-card dt{
  color:var(--color-muted);font-size:10px;line-height:1.3
}
.employee-mobile-card dd{
  margin:4px 0 0;color:var(--color-text);font-size:12px;line-height:1.4;
  font-weight:500;overflow-wrap:anywhere
}
.employee-mobile-card footer{
  display:flex;align-items:center;justify-content:flex-end;margin-top:10px;padding-top:10px;
  border-top:1px solid var(--color-stroke)
}
@media(max-width:420px){
  .employee-mobile-card dl{grid-template-columns:1fr}
  .employee-mobile-card dl div:nth-child(2){grid-column:auto}
}
</style>
