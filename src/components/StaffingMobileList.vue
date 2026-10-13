<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import type { StaffingPlanLine } from '../api/staffing'

defineProps<{
  rows: StaffingPlanLine[]
  canEdit: boolean
  filtered: boolean
  vacantOnly: boolean
  grouped?: boolean
}>()
const emit = defineEmits<{ edit: [row: StaffingPlanLine] }>()
const format = (value: number) => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
function salary(row: StaffingPlanLine): string {
  if (row.base_salary == null) return 'Не указан'
  return [Number(row.base_salary).toLocaleString('ru-RU'), row.currency].filter(Boolean).join(' ')
}
</script>

<template>
  <div class="staffing-mobile-list" aria-label="Штатные позиции">
    <p v-if="!rows.length" class="staffing-mobile-empty">
      {{ filtered ? 'По вашему запросу ничего не найдено.' : vacantOnly ? 'Вакантных позиций нет.' : 'Штатных позиций нет.' }}
    </p>
    <template v-for="(row, index) in rows" :key="row.id">
      <h3 v-if="grouped && (index === 0 || rows[index - 1]?.department_name !== row.department_name)"
        class="staffing-group-heading">{{ row.department_name }}</h3>
    <article class="staffing-mobile-card">
      <header>
        <div>
          <h3>{{ row.position_name }}</h3>
          <p>{{ row.department_name }}</p>
        </div>
        <span class="staffing-mobile-status"
          :class="{ 'is-vacant': row.vacant_units > 0, 'is-over': row.overstaffed_units > 0 }">
          {{ row.overstaffed_units > 0 ? 'Сверх штата' : row.vacant_units > 0 ? 'Есть вакансии' : 'Укомплектовано' }}
        </span>
      </header>
      <dl>
        <div><dt>Ставок</dt><dd>{{ format(row.planned_units) }}</dd></div>
        <div><dt>Занято</dt><dd>{{ format(row.occupied_units) }}</dd></div>
        <div><dt>Вакантно</dt><dd>{{ format(row.vacant_units) }}</dd></div>
      </dl>
      <footer>
        <span>Оклад: <strong>{{ salary(row) }}</strong></span>
        <BaseButton v-if="canEdit" type="button" variant="secondary"
          :aria-label="'Изменить ' + row.position_name" @click="emit('edit', row)">
          <Pencil :size="15" /> Изменить
        </BaseButton>
      </footer>
    </article>
    </template>
  </div>
</template>

<style scoped>
.staffing-mobile-list{display:grid;gap:10px}
.staffing-group-heading{margin:10px 0 0;padding:0 3px;color:var(--color-text);font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:600}
.staffing-mobile-empty{margin:0;padding:26px 12px;text-align:center;color:var(--color-muted);font-size:var(--font-caption-size);line-height:var(--line-caption)}
.staffing-mobile-card{min-width:0;padding:14px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
.staffing-mobile-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.staffing-mobile-card h3{margin:0;color:var(--color-text);font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:600;overflow-wrap:anywhere}
.staffing-mobile-card header p{margin:5px 0 0;color:var(--color-muted);font-size:var(--font-caption-size);line-height:var(--line-caption)}
.staffing-mobile-status{display:inline-flex;flex-shrink:0;align-items:center;padding:5px 7px;border-radius:12px;font-size:10px;font-weight:600;background:var(--color-success-surface);color:var(--color-success)}
.staffing-mobile-status.is-vacant{background:var(--color-warning-surface);color:var(--color-warning)}
.staffing-mobile-status.is-over{background:var(--color-danger-surface);color:var(--color-danger)}
.staffing-mobile-card dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 0}
.staffing-mobile-card dl div{display:grid;gap:5px;min-width:0;padding:10px 9px;border-radius:var(--radius-sm);background:var(--color-soft)}
.staffing-mobile-card dt{font-size:11px;color:var(--color-muted)}
.staffing-mobile-card dd{margin:0;color:var(--color-text);font-size:17px;font-weight:700;line-height:1}
.staffing-mobile-card footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:1px solid var(--color-stroke);font-size:12px;color:var(--color-muted)}
.staffing-mobile-card footer strong{color:var(--color-text);font-weight:600}
.staffing-mobile-card footer :deep(.base-button){height:36px;min-height:36px}
</style>
