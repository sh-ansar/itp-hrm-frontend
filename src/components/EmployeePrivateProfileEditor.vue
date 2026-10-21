<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseTextareaField from './ui/BaseTextareaField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { usePrivateProfileI18n, type PrivateProfileKey } from '../i18n/privateProfile'
import {
  saveEmployeePrivateSection,
  type EmployeePrivateProfile,
  type EmployeePrivateSection,
  type EmployeePrivateWritePayload,
} from '../api/personnel'
import { ApiError } from '../api/client'

const props = defineProps<{
  open: boolean
  companyId: string
  employeeId: string
  section: EmployeePrivateSection
  profile?: EmployeePrivateProfile
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = usePrivateProfileI18n()
const personalKeys: PrivateProfileKey[] = [
  'login', 'iin', 'nationality', 'citizenship', 'marital_status',
  'residence_address', 'registration_address', 'address_entrance',
  'address_floor', 'address_apartment', 'place_of_birth',
  'emergency_contact_name', 'emergency_contact_phone',
]
const militaryKeys: PrivateProfileKey[] = ['status', 'category', 'document_reference', 'comment']
const fields = computed(() => props.section === 'personal' ? personalKeys : militaryKeys)
const source = computed(() => props.section === 'personal' ? props.profile?.personal : props.profile?.military)
const form = ref<Record<string,string>>({})
const saving = ref(false)
const error = ref('')

function existingValue(key: string): string {
  const value = (source.value as unknown as Record<string,unknown> | undefined)?.[key]
  return typeof value === 'string' ? value : ''
}
function initialize() {
  if (!props.open) return
  form.value = Object.fromEntries(fields.value.map(key => [key, existingValue(key)]))
  error.value = ''
}
watch(() => [props.open, props.section, props.companyId, props.employeeId, props.profile], initialize,
  { immediate: true, deep: true })
const dirty = computed(() => fields.value.some(key => (form.value[key]?.trim() || null) !== (existingValue(key).trim() || null)))
function close() {
  if (saving.value) return
  if (dirty.value && !window.confirm(t('unsaved'))) return
  emit('close')
}
async function save() {
  if (saving.value || !dirty.value) return
  const payload: EmployeePrivateWritePayload = { revision: source.value?.revision ?? null }
  for (const key of fields.value) payload[key] = form.value[key]?.trim() || null
  saving.value = true
  error.value = ''
  try {
    await saveEmployeePrivateSection(props.companyId, props.employeeId, props.section, payload)
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof ApiError && cause.status === 409 ? t('conflict')
      : cause instanceof ApiError && cause.status === 422 ? t('invalid')
      : t('failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDrawer :open="open"
    :title="section === 'personal' ? t('personalTitle') : t('militaryTitle')"
    :description="t('description')" :close-label="t('close')" @close="close">
    <form class="private-profile-form" @submit.prevent="save">
      <BaseNotice v-if="section === 'military'" tone="info">{{ t('militaryNotice') }}</BaseNotice>
      <template v-for="field in fields" :key="field">
        <BaseTextareaField v-if="section === 'military' && field === 'comment'"
          v-model="form[field]" :label="t(field)" :disabled="saving"
          :max-length="2000" :rows="5" show-count />
        <BaseFormField v-else v-model="form[field]"
          :label="t(field)" :disabled="saving"
          :autocomplete="field === 'iin' ? 'off' : undefined" />
      </template>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <p class="privacy-hint">{{ t('confidentiality') }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="saving" @click="close">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="saving || !dirty" @click="save">{{ saving ? t('saving') : t('save') }}</BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.private-profile-form{display:grid;gap:14px;min-width:0}
.private-profile-form :deep(.field){min-width:0}
.privacy-hint{margin:0;font-size:11px;line-height:1.5;color:var(--color-muted)}
@media(max-width:480px){.private-profile-form{gap:12px}}
</style>
