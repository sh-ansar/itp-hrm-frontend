<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { listDepartments, listPositions, type DepartmentRecord, type PositionRecord } from '../api/organization'
import {
  createStaffingLine,
  updateStaffingLine,
  type StaffingPlanLine,
} from '../api/staffing'

const props = defineProps<{
  companyId: string
  planId: string
  edit?: StaffingPlanLine | null
}>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()

const departments = ref<DepartmentRecord[]>([])
const positions = ref<PositionRecord[]>([])
const departmentId = ref(props.edit?.department_id ?? '')
const positionId = ref(props.edit?.position_id ?? '')
const plannedUnits = ref(props.edit ? String(props.edit.planned_units) : '1')
const baseSalary = ref(props.edit?.base_salary != null ? String(props.edit.base_salary) : '')
const currency = ref(props.edit?.currency ?? 'KZT')
const notes = ref(props.edit?.notes ?? '')
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const currencies = [
  { id: 'KZT', name: 'KZT' },
  { id: 'USD', name: 'USD' },
  { id: 'EUR', name: 'EUR' },
  { id: 'GEL', name: 'GEL' },
  { id: 'RUB', name: 'RUB' },
]

async function loadDirectories() {
  loading.value = true
  error.value = ''
  try {
    const [departmentResult, positionResult] = await Promise.all([
      listDepartments(props.companyId),
      listPositions(props.companyId),
    ])
    departments.value = departmentResult.data
    positions.value = positionResult.data
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить подразделения и должности'
  } finally {
    loading.value = false
  }
}

async function submit() {
  error.value = ''
  const units = Number(plannedUnits.value)
  const salary = baseSalary.value === '' ? null : Number(baseSalary.value)
  if (!departmentId.value || !positionId.value || !Number.isFinite(units) || units <= 0) {
    error.value = 'Выберите подразделение и должность и укажите количество ставок больше нуля'
    return
  }
  if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
    error.value = 'Оклад не может быть отрицательным'
    return
  }

  saving.value = true
  try {
    const payload = {
      department_id: departmentId.value,
      position_id: positionId.value,
      planned_units: units,
      base_salary: salary,
      currency: salary === null ? null : currency.value,
      notes: notes.value.trim() || null,
    }
    if (props.edit) {
      await updateStaffingLine(props.companyId, props.planId, props.edit.id, props.edit.revision, payload)
    } else {
      await createStaffingLine(props.companyId, props.planId, payload)
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить штатную единицу'
  } finally {
    saving.value = false
  }
}

onMounted(loadDirectories)
</script>

<template>
  <form class="line-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div class="form-grid">
      <BaseSelectField v-model="departmentId" label="Подразделение" placeholder="Выберите подразделение"
        :options="departments" :disabled="loading || saving" required />
      <BaseSelectField v-model="positionId" label="Должность" placeholder="Выберите должность"
        :options="positions" :disabled="loading || saving" required />
      <BaseFormField v-model="plannedUnits" label="Количество ставок" placeholder="1" :disabled="saving" required />
      <BaseFormField v-model="baseSalary" label="Базовый оклад" placeholder="Например: 450000" :disabled="saving" />
      <BaseSelectField v-model="currency" label="Валюта" :options="currencies" :disabled="saving || !baseSalary" />
      <BaseFormField v-model="notes" label="Примечание" placeholder="Необязательно" :disabled="saving" />
    </div>
    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving || loading">{{ saving ? 'Сохранение…' : edit ? 'Сохранить' : 'Добавить в штат' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.line-form{display:grid;gap:var(--space-4)}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}.actions :deep(button){flex:1}}
</style>
