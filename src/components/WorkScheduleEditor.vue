<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  assignWorkSchedule,
  createWorkSchedule,
  updateWorkSchedule,
  type WorkSchedulePayload,
  type WorkScheduleRow,
} from '../api/worktime'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { localTodayISO } from '../utils/localDate'

const props = defineProps<{
  open: boolean
  companyId: string
  schedule: WorkScheduleRow | null
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const saving = ref(false)
const assigning = ref(false)
const loadingEmployees = ref(false)
const error = ref('')
const success = ref('')
const code = ref('')
const name = ref('')
const scheduleType = ref<WorkSchedulePayload['schedule_type']>('standard')
const workTimeLabel = ref('')
const weeklyHours = ref('40')
const employees = ref<EmployeeRecord[]>([])
const employeeId = ref('')
const validFrom = ref(localTodayISO())

const title = computed(() => props.schedule ? 'Редактировать график' : 'Новый график')
const typeOptions = [
  { id: 'standard', name: 'Основной' },
  { id: 'shift', name: 'Сменный' },
  { id: 'individual', name: 'Индивидуальный' },
  { id: 'summarized', name: 'Суммированный' },
]
const employeeOptions = computed(() => employees.value.map(employee => ({
  id: employee.id,
  name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' ') +
    ' · ' + employee.personnel_number,
})))

function resetForm() {
  error.value = ''
  success.value = ''
  code.value = props.schedule?.code ?? ''
  name.value = props.schedule?.name ?? ''
  scheduleType.value = (props.schedule?.schedule_type as WorkSchedulePayload['schedule_type']) ?? 'standard'
  workTimeLabel.value = props.schedule?.work_time_label ?? ''
  weeklyHours.value = props.schedule?.weekly_minutes != null
    ? String(Math.round((props.schedule.weekly_minutes / 60) * 100) / 100)
    : '40'
  employeeId.value = ''
  validFrom.value = localTodayISO()
}

function payload(): WorkSchedulePayload {
  const parsed = weeklyHours.value.trim() === '' ? null : Number(weeklyHours.value.replace(',', '.'))
  if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0 || parsed > 168)) {
    throw new Error('Укажите корректное количество часов в неделю')
  }
  return {
    code: code.value.trim(),
    name: name.value.trim(),
    schedule_type: scheduleType.value,
    work_time_label: workTimeLabel.value.trim() || null,
    weekly_minutes: parsed === null ? null : Math.round(parsed * 60),
  }
}

async function loadEmployees() {
  if (!props.open || !props.companyId || !props.schedule) return
  loadingEmployees.value = true
  try {
    const first = await listEmployees(props.companyId, 1, '', 'active')
    const rows = [...first.data]
    for (let page = 2; page <= Math.min(first.meta.last_page, 20); page++) {
      const result = await listEmployees(props.companyId, page, '', 'active')
      rows.push(...result.data)
    }
    employees.value = rows
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сотрудников'
    employees.value = []
  } finally {
    loadingEmployees.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const data = payload()
    if (!data.code || !data.name) throw new Error('Заполните код и наименование графика')
    if (props.schedule) {
      await updateWorkSchedule(props.companyId, props.schedule.id, {
        ...data,
        revision: props.schedule.revision,
      })
      success.value = 'График обновлён.'
    } else {
      await createWorkSchedule(props.companyId, data)
      success.value = 'График создан.'
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить график'
  } finally {
    saving.value = false
  }
}

async function assign() {
  if (!props.schedule || !employeeId.value || assigning.value) return
  assigning.value = true
  error.value = ''
  success.value = ''
  try {
    await assignWorkSchedule(props.companyId, props.schedule.id, employeeId.value, validFrom.value)
    success.value = 'График назначен сотруднику.'
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось назначить график'
  } finally {
    assigning.value = false
  }
}

watch(() => [props.open, props.companyId, props.schedule?.id, props.schedule?.revision], () => {
  if (!props.open) return
  resetForm()
  employees.value = []
  void loadEmployees()
}, { immediate: true })
</script>

<template>
  <BaseDrawer :open="open" :title="title"
    :description="schedule ? 'Измените параметры графика или назначьте его сотруднику.' : 'Создайте график рабочего времени.'"
    @close="$emit('close')">
    <div class="schedule-editor">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

      <section class="editor-section">
        <h3>Параметры графика</h3>
        <div class="form-grid">
          <BaseFormField v-model="code" label="Код" placeholder="STD-5X2" :disabled="saving" required />
          <BaseFormField v-model="name" label="Наименование" placeholder="Стандарт 5/2" :disabled="saving" required />
          <BaseSelectField v-model="scheduleType" label="Тип графика" :options="typeOptions" :disabled="saving" required />
          <BaseFormField v-model="workTimeLabel" label="Рабочее время" placeholder="09:00–18:00" :disabled="saving" />
          <BaseFormField v-model="weeklyHours" label="Часов в неделю" type="number" :disabled="saving" />
        </div>
      </section>

      <section v-if="schedule" class="editor-section assignment-section">
        <div>
          <h3>Назначить сотруднику</h3>
          <p>Предыдущее активное назначение будет закрыто днём перед новой датой начала.</p>
        </div>
        <BaseSelectField v-model="employeeId" label="Сотрудник" :options="employeeOptions"
          :disabled="assigning || loadingEmployees" placeholder="Выберите сотрудника" />
        <BaseFormField v-model="validFrom" label="Дата начала" type="date" :disabled="assigning" required />
        <BaseButton type="button" variant="secondary" :disabled="assigning || loadingEmployees || !employeeId"
          @click="assign">
          {{ assigning ? 'Назначение…' : 'Назначить график' }}
        </BaseButton>
      </section>
    </div>

    <template #footer>
      <BaseButton type="button" variant="secondary" :disabled="saving || assigning" @click="$emit('close')">Закрыть</BaseButton>
      <BaseButton type="button" :disabled="saving || assigning" @click="save">
        {{ saving ? 'Сохранение…' : (schedule ? 'Сохранить изменения' : 'Создать график') }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.schedule-editor{display:grid;gap:18px}
.editor-section{display:grid;gap:12px}
.editor-section h3{margin:0;color:var(--color-text);font-size:14px;line-height:1.35}
.editor-section p{margin:4px 0 0;color:var(--color-muted);font-size:11px;line-height:1.5}
.form-grid{display:grid;grid-template-columns:1fr;gap:11px}
.assignment-section{padding-top:16px;border-top:1px solid var(--color-stroke)}
.assignment-section :deep(.base-button){justify-self:start}
</style>
