<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { createEmployee, updateEmployee, type EmployeeRecord } from '../api/personnel'

const props = defineProps<{
  companyId: string
  edit?: EmployeeRecord | null
}>()

const emit = defineEmits<{ saved: [employee: EmployeeRecord]; cancelled: [] }>()

const personnelNumber = ref(props.edit?.personnel_number ?? '')
const lastName = ref(props.edit?.last_name ?? '')
const firstName = ref(props.edit?.first_name ?? '')
const middleName = ref(props.edit?.middle_name ?? '')
const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!personnelNumber.value.trim() || !lastName.value.trim() || !firstName.value.trim()) {
    error.value = 'Заполните табельный номер, фамилию и имя'
    return
  }

  saving.value = true
  try {
    const payload = {
      personnel_number: personnelNumber.value.trim(),
      last_name: lastName.value.trim(),
      first_name: firstName.value.trim(),
      middle_name: middleName.value.trim() || null,
    }
    const response = props.edit
      ? await updateEmployee(props.companyId, props.edit.id, props.edit.revision, payload)
      : await createEmployee(props.companyId, payload)
    emit('saved', response.data)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить карточку сотрудника'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="employee-record-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div class="form-grid">
      <BaseFormField v-model="personnelNumber" label="Табельный номер" placeholder="Например: 001245" :disabled="saving" required />
      <BaseFormField v-model="lastName" label="Фамилия" :disabled="saving" required />
      <BaseFormField v-model="firstName" label="Имя" :disabled="saving" required />
      <BaseFormField v-model="middleName" label="Отчество" :disabled="saving" />
    </div>
    <p class="hint">Табельный номер уникален внутри выбранной компании. При одновременном редактировании система не перезапишет более свежую версию.</p>
    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : edit ? 'Сохранить карточку' : 'Добавить сотрудника' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.employee-record-form{display:grid;gap:var(--space-4)}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.hint{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.actions :deep(button){flex:1}}
</style>
