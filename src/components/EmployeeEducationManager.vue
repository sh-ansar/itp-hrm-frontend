<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { ApiError } from '../api/client'
import { useEducationI18n, type EducationCopyKey } from '../i18n/employeeEducation'
import { useUiFormatters } from '../composables/useUiFormatters'
import {
  createEmployeeEducationRecord,
  updateEmployeeEducationRecord,
  archiveEmployeeEducationRecord,
  type EmployeeEducationRecord,
  type EducationRecordInput,
} from '../api/personnel'

const props = defineProps<{
  open: boolean
  companyId: string
  employeeId: string
  records: EmployeeEducationRecord[]
  truncated?: boolean
}>()
const emit = defineEmits<{ close: []; saved: []; refresh: [] }>()
const { t } = useEducationI18n()
const fmt = useUiFormatters()
type Field = { key: keyof EducationRecordInput; label: EducationCopyKey; required?: boolean; max: number; type?: 'text' | 'date' }
const fields: Field[] = [
  { key: 'education_type', label: 'education_type', required: true, max: 100 },
  { key: 'organization', label: 'organization', required: true, max: 255 },
  { key: 'started_on', label: 'started_on', type: 'date', max: 10 },
  { key: 'ended_on', label: 'ended_on', type: 'date', max: 10 },
  { key: 'specialization', label: 'specialization', max: 255 },
  { key: 'document_reference', label: 'document_reference', max: 255 },
]
const formOpen = ref(false)
const editing = ref<EmployeeEducationRecord | null>(null)
const busy = ref(false)
const error = ref('')
const form = ref<Record<string, string>>({})

const sorted = computed(() => [...props.records].sort((a, b) =>
  (b.ended_on ?? b.started_on ?? '').localeCompare(a.ended_on ?? a.started_on ?? '')))

function fill(item: EmployeeEducationRecord | null) {
  editing.value = item
  form.value = Object.fromEntries(fields.map(field => {
    const value = item?.[field.key]
    return [field.key, typeof value === 'string' ? value : '']
  }))
  error.value = ''
  formOpen.value = true
}
function changed(): boolean {
  if (!formOpen.value) return false
  if (!editing.value) return fields.some(field => !!form.value[field.key]?.trim())
  return fields.some(field =>
    (form.value[field.key]?.trim() || null) !== (editing.value?.[field.key] || null))
}
function reset() {
  formOpen.value = false
  editing.value = null
  form.value = {}
  error.value = ''
}
watch(() => [props.open, props.companyId, props.employeeId], reset, { immediate: true })
function close() {
  if (busy.value) return
  if (changed() && !window.confirm(t('unsaved'))) return
  reset()
  emit('close')
}
function back() {
  if (busy.value) return
  if (changed() && !window.confirm(t('unsaved'))) return
  reset()
}
function build(): EducationRecordInput | null {
  const values: Record<string, string | null> = {}
  for (const field of fields) {
    const raw = form.value[field.key]?.trim() ?? ''
    if (field.required && !raw) return null
    if (raw.length > field.max) return null
    values[field.key] = raw || null
  }
  if (values.started_on && values.ended_on && values.ended_on < values.started_on) return null
  return {
    education_type: values.education_type ?? '',
    organization: values.organization ?? '',
    started_on: values.started_on,
    ended_on: values.ended_on,
    specialization: values.specialization,
    document_reference: values.document_reference,
  }
}
function showError(cause: unknown) {
  error.value = cause instanceof ApiError && cause.status === 409 ? t('conflict')
    : cause instanceof ApiError && cause.status === 422 ? t('invalid')
    : t('failed')
}
async function save() {
  if (!formOpen.value || busy.value) return
  const data = build()
  if (!data) { error.value = t('invalid'); return }
  busy.value = true
  error.value = ''
  try {
    if (editing.value) {
      await updateEmployeeEducationRecord(
        props.companyId, props.employeeId, editing.value.id, editing.value.revision, data,
      )
    } else {
      await createEmployeeEducationRecord(props.companyId, props.employeeId, data)
    }
    emit('saved')
  } catch (cause) {
    showError(cause)
  } finally {
    busy.value = false
  }
}
async function archive(row: EmployeeEducationRecord) {
  if (busy.value || formOpen.value || !window.confirm(t('archiveConfirm'))) return
  busy.value = true
  error.value = ''
  try {
    await archiveEmployeeEducationRecord(props.companyId, props.employeeId, row.id, row.revision)
    emit('saved')
  } catch (cause) {
    showError(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseDrawer :open="open" :title="t('title')" :description="t('description')"
    :close-label="t('close')" @close="close">
    <div class="education-manager">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseButton v-if="error === t('conflict')" variant="secondary" :disabled="busy" @click="emit('refresh')">
        {{ t('refresh') }}
      </BaseButton>

      <template v-if="!formOpen">
        <BaseButton :disabled="busy" @click="fill(null)">
          <Plus :size="16" aria-hidden="true" /> {{ t('add') }}
        </BaseButton>
        <p v-if="sorted.length === 0" class="education-hint">{{ t('empty') }}</p>
        <div v-else class="education-list">
          <article v-for="row in sorted" :key="row.id" class="education-entry">
            <div class="education-entry-text">
              <strong>{{ row.organization }}</strong>
              <span>{{ row.education_type }} · {{ row.specialization || '—' }}</span>
              <small>
                {{ row.started_on ? fmt.date(row.started_on) : '—' }}
                —
                {{ row.ended_on ? fmt.date(row.ended_on) : '—' }}
              </small>
              <small v-if="row.document_reference">{{ row.document_reference }}</small>
            </div>
            <div class="education-actions">
              <BaseButton variant="secondary" :disabled="busy" @click="fill(row)">{{ t('edit') }}</BaseButton>
              <BaseButton variant="secondary" :disabled="busy" @click="archive(row)">{{ t('archive') }}</BaseButton>
            </div>
          </article>
        </div>
        <BaseNotice v-if="truncated" tone="warning">{{ t('truncated') }}</BaseNotice>
      </template>
      <form v-else class="education-form" @submit.prevent="save">
        <BaseFormField v-for="field in fields" :key="field.key"
          :model-value="form[field.key] ?? ''" :label="t(field.label)"
          :type="field.type ?? 'text'" :required="field.required"
          :disabled="busy" :placeholder="field.required ? undefined : t('optional')"
          @update:model-value="form[field.key] = $event" />
      </form>
      <p class="education-hint">{{ t('hint') }}</p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="formOpen ? back() : close()">
        {{ formOpen ? t('back') : t('close') }}
      </BaseButton>
      <BaseButton v-if="formOpen" :disabled="busy || !changed()" @click="save">
        {{ busy ? t('saving') : (editing ? t('save') : t('create')) }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.education-manager{display:grid;gap:14px;min-width:0}
.education-list,.education-form{display:grid;gap:10px;min-width:0}
.education-entry{display:grid;gap:10px;padding:12px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);min-width:0}
.education-entry-text{display:grid;gap:4px;min-width:0}
.education-entry-text strong{font-size:13px;color:var(--color-text);overflow-wrap:anywhere}
.education-entry-text span{font-size:12px;color:var(--color-muted);overflow-wrap:anywhere}
.education-entry-text small{font-size:11px;color:var(--color-muted);overflow-wrap:anywhere}
.education-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.education-hint{margin:0;font-size:11px;line-height:1.6;color:var(--color-muted)}
@media(max-width:500px){.education-entry{padding:9px}.education-actions :deep(button){flex:1}}
</style>
