<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { usePrivateRecordsI18n, type PrivateRecordsKey } from '../i18n/privateRecords'
import { useUiFormatters } from '../composables/useUiFormatters'
import {
  createEmployeePrivateRecord,
  updateEmployeePrivateRecord,
  archiveEmployeePrivateRecord,
  type EmployeePrivateRecordSection,
  type EmployeeFamilyMember,
  type EmployeeIdentityDocument,
  type EmployeeEducationRecord,
  type FamilyMemberPayload,
  type IdentityDocumentPayload,
  type EducationRecordPayload,
} from '../api/personnel'
import { ApiError } from '../api/client'

type PrivateRecord = EmployeeFamilyMember | EmployeeIdentityDocument | EmployeeEducationRecord
type Field = {
  key: string
  label: PrivateRecordsKey
  type?: 'date' | 'text'
  required?: boolean
  max: number
}

const props = defineProps<{
  open: boolean
  companyId: string
  employeeId: string
  section: EmployeePrivateRecordSection
  family: EmployeeFamilyMember[]
  identities: EmployeeIdentityDocument[]
  education: EmployeeEducationRecord[]
  /** Optional direct-edit target, always resolved inside the authorized list. */
  initialRecordId?: string | null
  truncated?: boolean
}>()
const emit = defineEmits<{ close: []; saved: []; refresh: [] }>()
const { t } = usePrivateRecordsI18n()
const fmt = useUiFormatters()

const familyFields: Field[] = [
  { key: 'relationship', label: 'familyRelationship', required: true, max: 100 },
  { key: 'full_name', label: 'familyName', required: true, max: 255 },
  { key: 'birth_date', label: 'birthDate', type: 'date', max: 10 },
  { key: 'document_reference', label: 'documentReference', max: 255 },
]
const identityFields: Field[] = [
  { key: 'type', label: 'documentType', required: true, max: 100 },
  { key: 'number', label: 'documentNumber', required: true, max: 100 },
  { key: 'personal_number', label: 'personalNumber', max: 100 },
  { key: 'country_of_issue', label: 'country', max: 100 },
  { key: 'issued_by', label: 'issuer', max: 255 },
  { key: 'issued_on', label: 'issuedOn', type: 'date', max: 10 },
  { key: 'expires_on', label: 'expiresOn', type: 'date', max: 10 },
]
const educationFields: Field[] = [
  { key: 'education_type', label: 'educationType', required: true, max: 100 },
  { key: 'organization', label: 'organization', required: true, max: 255 },
  { key: 'started_on', label: 'startedOn', type: 'date', max: 10 },
  { key: 'ended_on', label: 'endedOn', type: 'date', max: 10 },
  { key: 'specialization', label: 'specialization', max: 255 },
  { key: 'document_reference', label: 'documentReference', max: 255 },
]
const fields = computed(() => props.section === 'family' ? familyFields
  : props.section === 'education' ? educationFields : identityFields)
const titleKey = computed<PrivateRecordsKey>(() => props.section === 'family' ? 'familyTitle'
  : props.section === 'identity' ? 'identityTitle' : 'educationTitle')
const addKey = computed<PrivateRecordsKey>(() => props.section === 'family' ? 'addFamily'
  : props.section === 'identity' ? 'addIdentity' : 'addEducation')
const emptyKey = computed<PrivateRecordsKey>(() => props.section === 'family' ? 'familyEmpty'
  : props.section === 'identity' ? 'identityEmpty' : 'educationEmpty')
const heading = computed(() => t(titleKey.value))
const entries = computed(() => {
  if (props.section === 'family') return props.family.map(item => ({
    record: item as PrivateRecord, title: item.full_name,
    detail: item.relationship + (item.birth_date ? ' · ' + fmt.date(item.birth_date) : ''),
    primary: false,
  }))
  if (props.section === 'education') return props.education.map(item => ({
    record: item as PrivateRecord, title: item.organization,
    detail: item.education_type + (item.ended_on ? ' · ' + fmt.date(item.ended_on) : ''),
    primary: false,
  }))
  return props.identities.map(item => ({
    record: item as PrivateRecord, title: item.type,
    detail: item.number.length > 4 ? '••••' + item.number.slice(-4) : '••••',
    primary: item.is_primary,
  }))
})

const editing = ref<PrivateRecord | null>(null)
const formOpen = ref(false)
const form = ref<Record<string, string>>({})
const primary = ref(false)
const busy = ref(false)
const error = ref('')

function beginCreate() {
  editing.value = null
  form.value = Object.fromEntries(fields.value.map(field => [field.key, '']))
  primary.value = props.section === 'identity' && props.identities.length === 0
  formOpen.value = true
  error.value = ''
}
function beginEdit(item: PrivateRecord) {
  editing.value = item
  form.value = Object.fromEntries(fields.value.map(field => {
    const value = (item as unknown as Record<string, unknown>)[field.key]
    return [field.key, typeof value === 'string' ? value : '']
  }))
  primary.value = 'is_primary' in item ? Boolean(item.is_primary) : false
  formOpen.value = true
  error.value = ''
}
function hasUnsavedChanges(): boolean {
  if (!formOpen.value) return false
  if (editing.value === null) {
    return fields.value.some(field => Boolean(form.value[field.key]?.trim()))
      || (props.section === 'identity' && primary.value)
  }
  const previous = editing.value as unknown as Record<string, unknown>
  return fields.value.some(field =>
    (form.value[field.key]?.trim() || null) !== (previous[field.key] || null))
    || (props.section === 'identity' && primary.value !== Boolean(previous.is_primary))
}
function close() {
  if (busy.value) return
  if (hasUnsavedChanges() && !window.confirm(t('unsaved'))) return
  formOpen.value = false
  emit('close')
}
function back() {
  if (busy.value) return
  if (hasUnsavedChanges() && !window.confirm(t('unsaved'))) return
  formOpen.value = false
  editing.value = null
  error.value = ''
}
function reset() {
  formOpen.value = false
  editing.value = null
  error.value = ''
  primary.value = false
  form.value = {}
}
watch(() => [props.open, props.companyId, props.employeeId, props.section, props.initialRecordId], () => {
  reset()
  if (props.open && props.section === 'identity' && props.initialRecordId) {
    const record = props.identities.find(item => item.id === props.initialRecordId)
    if (record) beginEdit(record)
  }
}, { immediate: true })

function fail(cause: unknown) {
  error.value = cause instanceof ApiError && cause.status === 409 ? t('stale')
    : cause instanceof ApiError && cause.status === 422 ? t('invalid')
    : t('failed')
}
function buildPayload(): FamilyMemberPayload | IdentityDocumentPayload | EducationRecordPayload | null {
  const values: Record<string, string | null> = {}
  for (const field of fields.value) {
    const raw = form.value[field.key]?.trim() ?? ''
    if (field.required && !raw) return null
    if (raw.length > field.max) return null
    values[field.key] = raw || null
  }
  if (props.section === 'family') {
    return {
      relationship: values.relationship ?? '',
      full_name: values.full_name ?? '',
      birth_date: values.birth_date,
      document_reference: values.document_reference,
    }
  }
  if (props.section === 'education') {
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
  if ((values.number?.length ?? 0) < 2) return null
  if (values.issued_on && values.expires_on && values.expires_on < values.issued_on) return null
  return {
    type: values.type ?? '',
    number: values.number ?? '',
    personal_number: values.personal_number,
    country_of_issue: values.country_of_issue,
    issued_by: values.issued_by,
    issued_on: values.issued_on,
    expires_on: values.expires_on,
    is_primary: primary.value,
  }
}
async function save() {
  if (busy.value || !formOpen.value) return
  const payload = buildPayload()
  if (!payload) { error.value = t('invalid'); return }
  error.value = ''
  busy.value = true
  try {
    if (editing.value === null) {
      await createEmployeePrivateRecord(props.companyId, props.employeeId, props.section, payload)
    } else {
      await updateEmployeePrivateRecord(
        props.companyId, props.employeeId, props.section,
        editing.value.id, editing.value.revision, payload,
      )
    }
    emit('saved')
  } catch (cause) {
    fail(cause)
  } finally {
    busy.value = false
  }
}
async function archive(item: PrivateRecord) {
  if (busy.value || formOpen.value || !window.confirm(t('archiveConfirm'))) return
  busy.value = true
  error.value = ''
  try {
    await archiveEmployeePrivateRecord(
      props.companyId, props.employeeId, props.section, item.id, item.revision,
    )
    emit('saved')
  } catch (cause) {
    fail(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseDrawer :open="open" :title="heading" :description="t('description')"
    :close-label="t('close')" @close="close">
    <div class="private-records">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseButton v-if="error === t('stale')" variant="secondary"
        :disabled="busy" @click="emit('refresh')">{{ t('refresh') }}</BaseButton>

      <template v-if="!formOpen">
        <BaseButton :disabled="busy" class="record-create" @click="beginCreate">
          <Plus :size="16" aria-hidden="true" />
          {{ t(addKey) }}
        </BaseButton>
        <p v-if="!entries.length" class="record-hint">
          {{ t(emptyKey) }}
        </p>
        <div v-else class="records-list">
          <article v-for="item in entries" :key="item.record.id" class="record-row">
            <div class="record-details">
              <strong>{{ item.title }}</strong>
              <span>{{ item.detail }}</span>
              <small v-if="item.primary">{{ t('primaryMarker') }}</small>
            </div>
            <div class="record-actions">
              <BaseButton variant="secondary" :disabled="busy"
                @click="beginEdit(item.record)">{{ t('edit') }}</BaseButton>
              <BaseButton variant="secondary" :disabled="busy"
                @click="archive(item.record)">{{ t('archive') }}</BaseButton>
            </div>
          </article>
        </div>
        <BaseNotice v-if="truncated" tone="warning">{{ t('truncated') }}</BaseNotice>
      </template>

      <form v-else class="records-form" @submit.prevent="save">
        <BaseFormField v-for="field in fields" :key="field.key"
          :model-value="form[field.key] ?? ''" :label="t(field.label)"
          :type="field.type ?? 'text'" :required="field.required"
          :disabled="busy" :placeholder="field.required ? undefined : t('optional')"
          :autocomplete="['number','personal_number'].includes(field.key) ? 'off' : undefined"
          @update:model-value="form[field.key] = $event" />
        <label v-if="section === 'identity'" class="record-primary">
          <input v-model="primary" type="checkbox" :disabled="busy" />
          {{ t('primary') }}
        </label>
        <p v-if="section === 'identity'" class="record-hint">{{ t('documentHint') }}</p>
        <p class="record-hint">{{ t(section === 'education' ? 'educationNote' : 'confidentiality') }}</p>
      </form>
    </div>
    <template #footer>
      <BaseButton v-if="formOpen" variant="secondary" :disabled="busy" @click="back">
        {{ t('back') }}
      </BaseButton>
      <BaseButton v-else variant="secondary" :disabled="busy" @click="close">
        {{ t('close') }}
      </BaseButton>
      <BaseButton v-if="formOpen" :disabled="busy || !hasUnsavedChanges()" @click="save">
        {{ busy ? t('saving') : (editing ? t('save') : t('create')) }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.private-records{display:grid;gap:14px;min-width:0}
.private-records :deep(.record-create){justify-self:start}
.record-hint{margin:0;font-size:11px;line-height:1.5;color:var(--color-muted)}
.records-list{display:grid;gap:8px}
.record-row{display:grid;gap:9px;min-width:0;border:1px solid var(--color-stroke);background:var(--color-surface-raised);border-radius:8px;padding:10px}
.record-details{display:grid;gap:4px;min-width:0}
.record-details strong{font-size:13px;overflow-wrap:anywhere;color:var(--color-text)}
.record-details span{font-size:12px;color:var(--color-muted);overflow-wrap:anywhere}
.record-details small{font-size:11px;color:var(--color-primary);font-weight:600}
.record-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.records-form{display:grid;gap:12px;min-width:0}
.record-primary{display:flex;align-items:center;gap:9px;color:var(--color-text);font-size:12px}
.record-primary input{width:16px;height:16px;accent-color:var(--color-primary)}
@media(max-width:500px){.record-actions :deep(.base-button){flex:1}.record-row{padding:9px}}
</style>
