<script setup lang="ts">
import { Pencil, Plus, UsersRound } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import type { EmployeeFamilyMember } from '../api/personnel'

withDefaults(defineProps<{
  members: EmployeeFamilyMember[]
  writable?: boolean
  truncated?: boolean
}>(), { writable: false, truncated: false })

const emit = defineEmits<{ create: []; edit: [recordId: string] }>()
const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

/** The stored relationship is a free-form HR value. Translate known codes only. */
const relationships: Record<string, string> = {
  parent: 'Родитель', mother: 'Мать', father: 'Отец',
  child: 'Ребёнок', son: 'Сын', daughter: 'Дочь',
  spouse: 'Супруг(а)', partner: 'Супруг(а)',
  sibling: 'Брат / сестра',
}
function relationName(value: string): string {
  return tr(relationships[value.trim().toLowerCase()] ?? value)
}
function birthDisplay(value: string | null): string {
  if (!value) return '—'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fmt.date(value)
  const today = new Date()
  const [year, month, day] = value.split('-').map(Number)
  let age = today.getFullYear() - year
  if ((today.getMonth() + 1) < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--
  if (!Number.isFinite(age) || age < 0 || age > 125) return fmt.date(value)
  return `${fmt.date(value)} · ${age} ${tr('лет')}`
}
</script>

<template>
  <div class="employee-family-list" role="group" :aria-label="tr('Сведения о родственниках сотрудника')">
    <BaseNotice v-if="truncated" tone="warning">
      {{ tr('Показана только часть родственников. Для полного списка обратитесь к HR.') }}
    </BaseNotice>
    <div v-if="members.length" class="employee-family-entries" role="list">
      <article v-for="member in members" :key="member.id" class="employee-family-entry" role="listitem">
        <div class="family-info-field family-relation">
          <span class="family-label">{{ tr('Степень родства') }}</span>
          <strong>{{ relationName(member.relationship) }}</strong>
        </div>
        <div class="family-info-field family-person">
          <span class="family-label">{{ tr('ФИО') }}</span>
          <strong>{{ member.full_name }}</strong>
        </div>
        <div class="family-info-field family-birth">
          <span class="family-label">{{ tr('Дата рождения / Возраст') }}</span>
          <strong>{{ birthDisplay(member.birth_date) }}</strong>
        </div>
        <BaseButton v-if="writable && !truncated" variant="secondary" icon-only class="family-edit"
          :title="tr('Изменить родственника')" :aria-label="tr('Изменить родственника') + ': ' + member.full_name"
          @click="emit('edit', member.id)">
          <Pencil :size="15" aria-hidden="true" />
        </BaseButton>
        <div v-if="member.document_reference" class="family-document">
          <span>{{ tr('Подтверждающий документ') }}:</span>
          <span>{{ member.document_reference }}</span>
        </div>
      </article>
    </div>
    <div v-else class="family-empty">
      <UsersRound :size="17" aria-hidden="true" />
      <span>{{ tr('Семейные данные не внесены') }}</span>
    </div>
    <div v-if="writable" class="employee-family-actions">
      <BaseButton variant="secondary" :disabled="truncated" class="family-create"
        @click="emit('create')">
        <Plus :size="16" aria-hidden="true" />{{ tr('Добавить родственника') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.employee-family-list{display:grid;gap:10px;min-width:0}
.employee-family-entries{display:grid;gap:0;min-width:0}
.employee-family-entry{display:grid;grid-template-columns:minmax(130px,1fr) minmax(170px,1.5fr) minmax(160px,1.2fr) 32px;gap:10px;align-items:center;min-width:0;padding:10px 0;border-bottom:1px solid var(--color-stroke)}
.employee-family-entry:last-child{border-bottom:0}
.family-info-field{display:grid;align-content:start;gap:6px;min-width:0}
.family-label{font-size:11px;line-height:15px;font-weight:500;color:var(--color-muted)}
.family-info-field strong{font-size:12px;line-height:18px;font-weight:500;overflow-wrap:anywhere;color:var(--color-text)}
.family-edit{width:30px;min-width:30px;height:30px;min-height:30px;padding:0;color:var(--color-muted)}
.family-edit :deep(svg){width:15px;height:15px}
.family-document{grid-column:1/-1;display:flex;align-items:baseline;gap:5px;min-width:0;font-size:11px;line-height:17px;overflow-wrap:anywhere;color:var(--color-muted)}
.family-document span:last-child{color:var(--color-text)}
.family-empty{display:flex;align-items:center;gap:9px;padding:8px 0;font-size:12px;color:var(--color-muted)}
.employee-family-actions{display:flex;justify-content:flex-start}
.family-create{min-height:30px;height:30px;font-size:12px;font-weight:500}
.family-create :deep(svg){width:15px;height:15px}
@media(max-width:760px){.employee-family-entry{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 32px}.family-birth{grid-column:1/3;grid-row:2}.family-edit{grid-column:3;grid-row:1}}
@media(max-width:490px){.employee-family-entry{grid-template-columns:minmax(0,1fr) 32px}.family-info-field{grid-column:1}.family-edit{grid-column:2;grid-row:1}.family-birth{grid-column:1;grid-row:auto}.family-document{grid-column:1/-1}}
</style>
