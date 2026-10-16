<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseLoadingState from './ui/BaseLoadingState.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { getEmployeeTimesheet, putEmployeeTimesheet, type WorktimeDayEntry } from '../api/worktime'

const props = defineProps<{
  open: boolean
  companyId: string
  employeeId: string
  employeeName: string
  month: string
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

type DraftDay = WorktimeDayEntry & {
  worked_hours: string
  absence_hours: string
  overtime_hours: string
}

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const rows = ref<DraftDay[]>([])

const recordedCount = computed(() => rows.value.filter(row =>
  row.worked_hours !== '' || row.absence_hours !== '' || row.overtime_hours !== '').length)

function hours(minutes: number | null): string {
  if (minutes === null) return ''
  return String(Math.round((minutes / 60) * 100) / 100)
}

function minutes(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 24) return null
  return Math.round(parsed * 60)
}

function dayLabel(row: DraftDay): string {
  const value = new Date(row.date + 'T00:00:00Z')
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(value)
}

function typeLabel(row: DraftDay): string {
  if (row.label) return row.label
  if (row.day_type === 'workday') return 'Рабочий'
  if (row.day_type === 'shortened') return 'Сокращённый'
  if (row.day_type === 'weekend') return 'Выходной'
  if (row.day_type === 'holiday') return 'Праздник'
  return row.day_type
}

async function load() {
  if (!props.open || !props.companyId || !props.employeeId) return
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const response = await getEmployeeTimesheet(props.companyId, props.employeeId, props.month)
    rows.value = response.data.map(row => ({
      ...row,
      worked_hours: hours(row.worked_minutes),
      absence_hours: hours(row.absence_minutes),
      overtime_hours: hours(row.overtime_minutes),
    }))
  } catch (cause) {
    rows.value = []
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить табель сотрудника'
  } finally {
    loading.value = false
  }
}

function fillByPlan() {
  rows.value = rows.value.map(row => ({
    ...row,
    worked_hours: row.planned_minutes > 0 ? hours(row.planned_minutes) : '0',
    absence_hours: '0',
    overtime_hours: '0',
  }))
}

async function save() {
  if (saving.value || !rows.value.length) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await putEmployeeTimesheet(props.companyId, props.employeeId, props.month, rows.value.map(row => ({
      date: row.date,
      worked_minutes: minutes(row.worked_hours),
      absence_minutes: minutes(row.absence_hours),
      overtime_minutes: minutes(row.overtime_hours),
      revision: row.revision,
    })))
    success.value = 'Табель сохранён.'
    await load()
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить табель'
  } finally {
    saving.value = false
  }
}

watch(() => [props.open, props.companyId, props.employeeId, props.month], () => {
  if (props.open) void load()
}, { immediate: true })
</script>

<template>
  <BaseDrawer :open="open" title="Табель сотрудника"
    :description="employeeName + ' · ' + month" @close="$emit('close')">
    <div class="timesheet-editor">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
      <BaseLoadingState v-if="loading" label="Загрузка табеля" />

      <template v-else>
        <div class="editor-toolbar">
          <div>
            <strong>{{ recordedCount }} дней заполнено</strong>
            <span>{{ rows.length }} дней календаря доступно</span>
          </div>
          <BaseButton variant="secondary" type="button" :disabled="saving || !rows.length" @click="fillByPlan">
            Заполнить по плану
          </BaseButton>
        </div>

        <BaseNotice v-if="!rows.length && !error" tone="warning">
          Производственный календарь на выбранный месяц не заполнен.
        </BaseNotice>

        <div v-else class="day-list">
          <article v-for="row in rows" :key="row.date" class="day-row"
            :class="{ 'day-row--off': row.planned_minutes === 0 }">
            <header>
              <div>
                <strong>{{ dayLabel(row) }}</strong>
                <span>{{ typeLabel(row) }}</span>
              </div>
              <small>План: {{ Math.round((row.planned_minutes / 60) * 100) / 100 }} ч</small>
            </header>
            <div class="day-fields">
              <BaseFormField v-model="row.worked_hours" label="Отработано, ч" type="number" :disabled="saving" />
              <BaseFormField v-model="row.absence_hours" label="Неявка, ч" type="number"
                :disabled="saving || row.planned_minutes === 0" />
              <BaseFormField v-model="row.overtime_hours" label="Сверхурочно, ч" type="number" :disabled="saving" />
            </div>
          </article>
        </div>
      </template>
    </div>

    <template #footer>
      <BaseButton variant="secondary" type="button" :disabled="saving" @click="$emit('close')">Закрыть</BaseButton>
      <BaseButton type="button" :disabled="saving || loading || !rows.length" @click="save">
        {{ saving ? 'Сохранение…' : 'Сохранить табель' }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.timesheet-editor{display:grid;gap:16px}
.editor-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.editor-toolbar>div{display:grid;gap:3px}
.editor-toolbar strong{font-size:13px}
.editor-toolbar span{font-size:11px;color:var(--color-muted)}
.day-list{display:grid;gap:10px}
.day-row{display:grid;gap:11px;padding:12px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised)}
.day-row--off{background:var(--color-soft)}
.day-row header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.day-row header>div{display:grid;gap:2px}
.day-row header strong{font-size:13px;text-transform:capitalize}
.day-row header span,.day-row header small{font-size:11px;color:var(--color-muted)}
.day-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
@media(max-width:520px){.day-fields{grid-template-columns:1fr}.editor-toolbar :deep(.base-button){width:100%}}
</style>
