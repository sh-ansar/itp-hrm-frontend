<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { createStaffingPlan, type StaffingPlanRecord } from '../api/staffing'

const props = defineProps<{ companyId: string; plans?: StaffingPlanRecord[]; cloneSupported?: boolean }>()
const emit = defineEmits<{ saved: [plan: StaffingPlanRecord]; cancelled: [] }>()

const name = ref('')
const sourcePlanId = ref('')
const sourcePlans = computed(() => [
  { id: '', name: 'Пустой черновик (без копирования)' },
  ...(props.plans ?? []).map(plan => ({
    id: plan.id,
    name: plan.name + (plan.status === 'approved' ? ' · утверждено' : ' · черновик'),
  })),
])

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
      ...(sourcePlanId.value ? {
        source_plan_id: sourcePlanId.value,
        source_plan_revision: props.plans?.find(plan => plan.id === sourcePlanId.value)?.revision,
      } : {}),
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
    <BaseSelectField v-if="cloneSupported && (plans?.length ?? 0) > 0"
      v-model="sourcePlanId" label="Взять за основу штатное расписание"
      :options="sourcePlans" :disabled="saving" />
    <p v-if="cloneSupported && sourcePlanId" class="hint">
      Все позиции, количество ставок, оклады и валюты выбранной версии будут скопированы в новый черновик.
      Исходная версия останется неизменной. После создания можно отредактировать ставки и отдельно утвердить новую версию.
    </p>
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
