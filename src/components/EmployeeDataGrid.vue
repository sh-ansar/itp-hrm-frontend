<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import type { EmployeeFieldEditGroup } from '../types/employeeFields'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'

const { tr } = useWorkspaceI18n()

/**
 * The card uses two intentionally distinct field states:
 * - informative: an unfocusable value, never an input-shaped placeholder;
 * - editable: a visible, keyboard-accessible action opening an authorized editor.
 *
 * Edits happen only through the existing domain API forms. Do not turn projections,
 * calculations or sensitive fields into locally mutable inputs.
 */
interface EmployeeDisplayField {
  label: string
  value: string | number | null | undefined
  wide?: boolean
  muted?: boolean
  editGroup?: EmployeeFieldEditGroup
}
const props = withDefaults(defineProps<{
  fields: EmployeeDisplayField[]
  editableGroups?: EmployeeFieldEditGroup[]
}>(), { editableGroups: () => [] })
const emit = defineEmits<{ edit: [group: EmployeeFieldEditGroup] }>()
function isEditable(field: EmployeeDisplayField): boolean {
  return !!field.editGroup && props.editableGroups.includes(field.editGroup)
}
function valueOf(field: EmployeeDisplayField): string | number {
  return field.value === null || field.value === undefined || field.value === '' ? '—' : field.value
}
</script>

<template>
  <div class="employee-data-grid">
    <div v-for="(field,index) in fields" :key="field.label + ':' + index"
      class="employee-data-field" :data-field-state="isEditable(field) ? 'editable' : 'informative'"
      :class="{ 'employee-data-field--wide': field.wide, 'employee-data-field--muted': field.muted }">
      <span class="employee-data-label">{{ tr(field.label) }}</span>
      <div v-if="isEditable(field)" class="employee-data-editable">
        <strong>{{ valueOf(field) }}</strong>
        <BaseButton icon-only variant="secondary" class="employee-data-edit-button"
          :aria-label="tr('Изменить поле:') + ' ' + tr(field.label)" :title="tr('Изменить поле:') + ' ' + tr(field.label)"
          @click="emit('edit', field.editGroup!)">
          <Pencil :size="14" aria-hidden="true" />
        </BaseButton>
      </div>
      <strong v-else class="employee-data-informative">{{ valueOf(field) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.employee-data-grid{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  column-gap:18px;row-gap:16px;min-width:0;
}
.employee-data-field{
  display:grid;align-content:start;gap:6px;min-width:0;
}
.employee-data-label{
  font-size:13px;line-height:18px;font-weight:500;color:var(--color-muted);
}
.employee-data-field > strong,
.employee-data-editable > strong{
  display:flex;align-items:center;min-width:0;min-height:30px;
  color:var(--color-text);font-size:13px;line-height:19px;
  font-weight:500;overflow-wrap:anywhere;
}
/* Informative data is never framed as an enabled form input. */
.employee-data-informative{
  border:0;background:transparent;box-shadow:none;
  padding:4px 0;
}
.employee-data-editable{
  display:flex;align-items:center;gap:5px;min-width:0;min-height:36px;
  padding:2px 0;border:0;
  border-radius:0;background:transparent;
}
.employee-data-editable > strong{flex:0 1 auto;font-weight:500}
.employee-data-edit-button{
  flex:none;width:29px;height:29px;min-width:29px;min-height:29px;
  padding:0;border-color:transparent;background:transparent;box-shadow:none;
  color:var(--color-muted);
}
.employee-data-edit-button:hover:not(:disabled){color:var(--color-primary);background:var(--color-accent-soft)}
.employee-data-edit-button :deep(svg){width:14px;height:14px}
.employee-data-field--wide{grid-column:span 2}
.employee-data-field--muted > strong,.employee-data-field--muted .employee-data-editable > strong{color:var(--color-muted)}
@media(max-width:980px){.employee-data-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px}}
@media(max-width:640px){.employee-data-grid{grid-template-columns:1fr;row-gap:12px}.employee-data-field--wide{grid-column:auto}}
</style>
