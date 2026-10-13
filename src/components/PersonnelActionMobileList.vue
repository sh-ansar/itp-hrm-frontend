<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { PersonnelActionRow, PersonnelActionType } from '../api/personnelActions'

defineProps<{
  rows: PersonnelActionRow[]
  companyId: string
  loading?: boolean
}>()

function actionLabel(type: PersonnelActionType) {
  return type === 'hire' ? 'Приём' : type === 'transfer' ? 'Перевод' : 'Увольнение'
}
function employeeName(row: PersonnelActionRow) {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}
function transitionText(row: PersonnelActionRow) {
  const from = [row.source_position_name, row.source_department_name].filter(Boolean).join(' · ')
  const to = [row.target_position_name, row.target_department_name].filter(Boolean).join(' · ')
  if (row.action_type === 'hire') return to || 'Назначение не найдено'
  if (row.action_type === 'termination') return from ? from + ' → прекращено' : 'Назначение прекращено'
  return `${from || '—'} → ${to || '—'}`
}
function displayDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value
  return value.slice(8,10) + '.' + value.slice(5,7) + '.' + value.slice(0,4)
}
</script>

<template>
  <div class="action-mobile-list">
    <p v-if="loading" class="action-mobile-empty">Загрузка кадровых действий…</p>
    <p v-else-if="!rows.length" class="action-mobile-empty">Кадровых действий пока нет.</p>

    <article v-for="row in rows" :key="row.id" class="action-mobile-card">
      <header>
        <span class="action-pill" :class="'action-pill--' + row.action_type">{{ actionLabel(row.action_type) }}</span>
        <time>{{ displayDate(row.effective_on) }}</time>
      </header>

      <RouterLink class="action-person" :to="{ name:'employee-detail', params:{ company:companyId, employee:row.employee_id } }">
        <span>
          <strong>{{ employeeName(row) }}</strong>
          <small>{{ row.personnel_number }}</small>
        </span>
        <ArrowRight :size="17" />
      </RouterLink>

      <dl>
        <div>
          <dt>Изменение</dt>
          <dd>{{ transitionText(row) }}</dd>
        </div>
        <div>
          <dt>Основание</dt>
          <dd>{{ row.basis_reference || '—' }}</dd>
        </div>
      </dl>
    </article>
  </div>
</template>

<style scoped>
.action-mobile-list{display:grid;gap:10px}
.action-mobile-empty{margin:0;padding:22px 10px;text-align:center;color:var(--color-muted);font-size:var(--font-caption-size)}
.action-mobile-card{
  display:grid;gap:11px;min-width:0;padding:13px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.action-mobile-card header{display:flex;align-items:center;justify-content:space-between;gap:10px}
.action-mobile-card time{color:var(--color-muted);font-size:11px;white-space:nowrap}
.action-pill{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:10px;line-height:1;font-weight:700;white-space:nowrap}
.action-pill--hire{background:var(--color-success-surface);color:var(--color-success)}
.action-pill--transfer{background:var(--color-accent-soft);color:var(--color-primary)}
.action-pill--termination{background:var(--color-warning-surface);color:var(--color-warning)}
.action-person{
  display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;
  border-radius:var(--radius-sm);background:var(--color-soft);color:var(--color-text)
}
.action-person:hover{color:var(--color-primary)}
.action-person>span{display:grid;gap:3px;min-width:0}
.action-person strong{font-size:13px;line-height:1.35;overflow-wrap:anywhere}
.action-person small{color:var(--color-muted);font-size:10px}
.action-person svg{flex:none}
.action-mobile-card dl{display:grid;gap:8px;margin:0}
.action-mobile-card dl div{display:grid;gap:4px;min-width:0}
.action-mobile-card dt{color:var(--color-muted);font-size:10px}
.action-mobile-card dd{margin:0;color:var(--color-text);font-size:12px;line-height:1.45;overflow-wrap:anywhere}
</style>
