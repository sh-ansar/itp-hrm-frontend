<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import type { EmployeeFieldEditGroup } from '../types/employeeFields'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'

const { tr } = useWorkspaceI18n()

interface EmployeeDisplayField {
  label: string
  value: string | number | null | undefined
  wide?: boolean
  muted?: boolean
  editGroup?: EmployeeFieldEditGroup
  /** Authoritative API key; projected fields without a writable key stay read-only. */
  editKey?: string
  rawValue?: string | null
  inputType?: 'text' | 'date' | 'email' | 'select'
}
const props = withDefaults(defineProps<{
  fields: EmployeeDisplayField[]
  editableGroups?: EmployeeFieldEditGroup[]
  saveField?: (key: string, value: string | null) => Promise<void>
}>(), { editableGroups: () => [] })
const emit = defineEmits<{ edit: [group: EmployeeFieldEditGroup]; dirty: [active: boolean, fieldKey: string] }>()
const activeKey = ref('')
const draft = ref('')
const original = ref('')
const busy = ref(false)
const error = ref('')
const dirty = computed(() => activeKey.value !== '' && draft.value !== original.value)
function isEditable(field: EmployeeDisplayField): boolean {
  // A pencil must always open a real single-field editor. Composite
  // identity/contract records have their own explicit management actions.
  return !!(field.editGroup && props.editableGroups.includes(field.editGroup)
    && ((field.editKey && props.saveField) || field.editGroup === 'contract'
      || field.editGroup === 'identity'))
}
function valueOf(field: EmployeeDisplayField): string | number {
  return field.value === null || field.value === undefined || field.value === '' ? '—' : field.value
}
function begin(field: EmployeeDisplayField) {
  if (!field.editKey || !props.saveField) {
    if (field.editGroup) emit('edit', field.editGroup)
    return
  }
  if (dirty.value && !window.confirm('Есть несохранённое изменение поля. Отменить его?')) return
  const previousKey = activeKey.value
  if (previousKey) emit('dirty', false, previousKey)
  activeKey.value = field.editKey
  original.value = field.rawValue ?? (field.value === '—' ? '' : String(field.value ?? ''))
  draft.value = original.value
  emit('dirty', false, activeKey.value)
  error.value = ''
}
function cancel() {
  if (busy.value) return
  const key = activeKey.value
  activeKey.value = ''
  draft.value = ''
  emit('dirty', false, key)
  error.value = ''
}
async function save() {
  if (!props.saveField || !activeKey.value || busy.value) return
  if (!dirty.value) { cancel(); return }
  busy.value = true
  error.value = ''
  try {
    const key = activeKey.value
    await props.saveField(key, draft.value.trim() || null)
    activeKey.value = ''
    emit('dirty', false, key)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить поле'
  } finally { busy.value = false }
}
</script>

<template>
  <div class="employee-data-grid">
    <div v-for="(field,index) in fields" :key="field.label + ':' + index"
      class="employee-data-field" :data-field-state="isEditable(field) ? 'editable' : 'informative'"
      :class="{ 'employee-data-field--wide': field.wide, 'employee-data-field--muted': field.muted }">
      <span class="employee-data-label">{{ tr(field.label) }}</span>
      <form v-if="field.editKey && activeKey === field.editKey" class="employee-inline-field-form"
        @submit.prevent="save">
        <select v-if="field.inputType === 'select'" v-model="draft" :disabled="busy"
          @change="emit('dirty', dirty, activeKey)"
          :aria-label="tr(field.label)">
          <option value="">Не указано</option>
          <option value="male">Мужчина</option>
          <option value="female">Женщина</option>
        </select>
        <input v-else v-model="draft" :type="field.inputType || 'text'" :disabled="busy"
          :aria-label="tr(field.label)" @input="emit('dirty', dirty, activeKey)" />
        <div class="employee-inline-field-actions">
          <BaseButton size="sm" type="submit" :disabled="busy || !dirty">
            {{ busy ? tr('Сохранение…') : tr('Сохранить') }}
          </BaseButton>
          <BaseButton size="sm" variant="secondary" type="button" :disabled="busy" @click="cancel">
            {{ tr('Отмена') }}
          </BaseButton>
        </div>
        <span v-if="error" class="employee-inline-field-error" role="alert">{{ error }}</span>
      </form>
      <div v-else-if="isEditable(field)" class="employee-data-editable">
        <strong>{{ valueOf(field) }}</strong>
        <BaseButton icon-only variant="secondary" class="employee-data-edit-button"
          :aria-label="tr('Изменить поле:') + ' ' + tr(field.label)" :title="tr('Изменить поле:') + ' ' + tr(field.label)"
          @click="begin(field)">
          <Pencil :size="14" aria-hidden="true" />
        </BaseButton>
      </div>
      <strong v-else class="employee-data-informative">{{ valueOf(field) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.employee-data-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:18px;row-gap:16px;min-width:0}
.employee-data-field{display:grid;align-content:start;gap:6px;min-width:0}
.employee-data-label{font-size:13px;line-height:18px;font-weight:500;color:var(--color-muted)}
.employee-data-field>strong,.employee-data-editable>strong{display:flex;align-items:center;min-width:0;min-height:30px;color:var(--color-text);font-size:13px;line-height:19px;font-weight:500;overflow-wrap:anywhere}
.employee-data-informative{border:0;background:transparent;box-shadow:none;padding:4px 0}
.employee-data-editable{display:flex;align-items:center;gap:5px;min-width:0;min-height:36px;padding:2px 0;border:0;background:transparent}
.employee-data-editable>strong{flex:0 1 auto;font-weight:500}
.employee-data-edit-button{flex:none;width:29px;height:29px;min-width:29px;min-height:29px;padding:0;border-color:transparent;background:transparent;box-shadow:none;color:var(--color-muted)}
.employee-data-edit-button:hover:not(:disabled){color:var(--color-primary);background:var(--color-accent-soft)}
.employee-data-edit-button :deep(svg){width:14px;height:14px}
.employee-data-field--wide{grid-column:span 2}
.employee-data-field--muted>strong,.employee-data-field--muted .employee-data-editable>strong{color:var(--color-muted)}
.employee-inline-field-form{display:grid;gap:7px;min-width:0}
.employee-inline-field-form input,.employee-inline-field-form select{min-height:35px;width:100%;padding:7px 9px;font:inherit;font-size:13px;color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-primary-stroke);border-radius:6px}
.employee-inline-field-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.employee-inline-field-error{font-size:11px;color:var(--color-danger);line-height:1.4}
@media(max-width:980px){.employee-data-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px}}
@media(max-width:640px){.employee-data-grid{grid-template-columns:1fr;row-gap:12px}.employee-data-field--wide{grid-column:auto}}
</style>
