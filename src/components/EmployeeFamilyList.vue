<script setup lang="ts">
import { computed } from 'vue'
import { FileText, UsersRound } from 'lucide-vue-next'
import type { EmployeeFamilyMember } from '../api/personnel'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'

// Projection only: legacy reference families may lack revisions and optional
// dates; only normalized HR records are eligible for write API operations.
type FamilyDisplayRow = Pick<EmployeeFamilyMember, 'id' | 'relationship' | 'full_name'>
  & Partial<Pick<EmployeeFamilyMember, 'birth_date' | 'document_reference'>>
const props = defineProps<{ members: FamilyDisplayRow[] }>()
const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

// Records are private and authoritative only in HR-scoped responses.
// A document_reference is free-form metadata, never a claimed downloadable file.
const ordered = computed(() => props.members)
function age(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const born = new Date(iso + 'T12:00:00')
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let years = today.getFullYear() - born.getFullYear()
  const beforeBirthday = today.getMonth() < born.getMonth()
    || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())
  if (beforeBirthday) years--
  return years >= 0 ? String(years) : null
}
</script>

<template>
  <div class="employee-family-records" :aria-label="tr('Сведения о родственниках сотрудника')">
    <div v-if="!ordered.length" class="employee-family-empty">
      <UsersRound :size="18" aria-hidden="true" />
      <span>{{ tr('Семейные данные не внесены') }}</span>
    </div>
    <article v-for="member in ordered" :key="member.id" class="employee-family-row"
      :aria-label="member.full_name">
      <div class="employee-family-fields">
        <div class="employee-family-field">
          <span>{{ tr('Степень родства') }}</span>
          <strong>{{ member.relationship || '—' }}</strong>
        </div>
        <div class="employee-family-field">
          <span>{{ tr('ФИО') }}</span>
          <strong>{{ member.full_name || '—' }}</strong>
        </div>
        <div class="employee-family-field">
          <span>{{ tr('Дата рождения') }} / {{ tr('Возраст') }}</span>
          <strong>
            {{ member.birth_date ? fmt.date(member.birth_date) : '—' }}
            <template v-if="age(member.birth_date)"> · {{ tr('Возраст') }}: {{ age(member.birth_date) }}</template>
          </strong>
        </div>
      </div>
      <div v-if="member.document_reference" class="employee-family-evidence">
        <FileText :size="16" aria-hidden="true" />
        <span>{{ tr('Документ') }}: {{ member.document_reference }}</span>
      </div>
    </article>
  </div>
</template>

<style scoped>
.employee-family-records{display:grid;gap:0;min-width:0}
.employee-family-empty{display:flex;align-items:center;gap:9px;color:var(--color-muted);font-size:12px;min-height:36px}
.employee-family-empty svg{flex:none}
.employee-family-row{display:grid;gap:10px;padding:13px 0;border-bottom:1px solid var(--color-stroke);min-width:0}
.employee-family-row:first-of-type{padding-top:2px}
.employee-family-row:last-child{border-bottom:0;padding-bottom:0}
.employee-family-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px;min-width:0}
.employee-family-field{display:grid;align-content:start;gap:5px;min-width:0}
.employee-family-field>span{font-size:12px;color:var(--color-muted);line-height:17px;font-weight:500}
.employee-family-field>strong{font-size:13px;line-height:19px;color:var(--color-text);font-weight:500;overflow-wrap:anywhere}
.employee-family-evidence{display:flex;align-items:center;gap:7px;color:var(--color-muted);font-size:11px;line-height:17px;min-width:0}
.employee-family-evidence svg{flex:none}
.employee-family-evidence span{overflow-wrap:anywhere}
@media(max-width:980px){.employee-family-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.employee-family-fields{grid-template-columns:1fr;gap:10px}.employee-family-row{gap:9px;padding:12px 0}}
</style>
