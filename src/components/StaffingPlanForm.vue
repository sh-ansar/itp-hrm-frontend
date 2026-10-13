<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { createStaffingPlan, type StaffingPlanRecord } from '../api/staffing'

const props = defineProps<{ companyId: string }>()
const emit = defineEmits<{ saved: [plan: StaffingPlanRecord]; cancelled: [] }>()

const name = ref('')
const validFrom = ref('')
const validTo = ref('')
const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!name.value.trim() || !validFrom.value) {
    error.value = 'Укажите название и дату начала действия'
    return
  }
  if (validTo.value && validTo.value < validFrom.value) {
    error.value = 'Дата окончания не может быть раньше даты начала'
    return
  }

  saving.value = true
  try {
    const response = await createStaffingPlan(props.companyId, {
      name: name.value.trim(),
      valid_from: validFrom.value,
      valid_to: validTo.value || null,
    })
    emit('saved', response.data)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось создать версию штатного расписания'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="plan-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseFormField v-model="name" label="Название версии" placeholder="Например: Штатное расписание 2027" :disabled="saving" required />
    <div class="dates">
      <BaseFormField v-model="validFrom" label="Действует с" type="date" :disabled="saving" required />
      <BaseFormField v-model="validTo" label="Действует по" type="date" :disabled="saving" />
    </div>
    <p class="hint">Новая версия создаётся как черновик. Утверждённые версии не редактируются.</p>
    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Создание…' : 'Создать версию' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.plan-form{display:grid;gap:var(--space-4)}
.dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.hint{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.dates{grid-template-columns:1fr}.actions :deep(button){flex:1}}
</style>
