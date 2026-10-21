<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { LockKeyhole, RefreshCw } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDataTable from './ui/BaseDataTable.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseLoadingState from './ui/BaseLoadingState.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { getEmployeeWorktimeMonth, type EmployeeWorktimeMonthResponse } from '../api/worktime'
import { useUiFormatters } from '../composables/useUiFormatters'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { localTodayISO } from '../utils/localDate'

const props = defineProps<{ companyId: string; employeeId: string }>()
const fmt = useUiFormatters()
const { tr } = useWorkspaceI18n()
const month = ref(localTodayISO().slice(0, 7))
const result = ref<EmployeeWorktimeMonthResponse | null>(null)
const loading = ref(false)
const error = ref('')
let generation = 0

function hours(minutes: number | null | undefined): string {
  return minutes === null || minutes === undefined ? '—' : fmt.number(minutes / 60, 1) + ' ' + tr('ч')
}
function count(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : fmt.number(value, 0)
}

const summary = computed(() => result.value?.data.summary ?? null)
const metrics = computed(() => [
  { id: 'present', label: tr('Явки'), value: count(summary.value?.present_days), unit: tr('дн.') },
  { id: 'late', label: tr('Опоздания'), value: hours(summary.value?.lateness_minutes), unit: '' },
  { id: 'overtime', label: tr('Сверхурочные'), value: hours(summary.value?.overtime_minutes), unit: '' },
  { id: 'absent', label: tr('Отсутствия'), value: hours(summary.value?.absence_minutes), unit: '' },
])
const columns = computed(() => [
  { key: 'date', label: tr('Дата') },
  { key: 'planned_minutes', label: tr('План, ч'), align: 'right' as const },
  { key: 'worked_minutes', label: tr('Отработано, ч'), align: 'right' as const },
  { key: 'absence_minutes', label: tr('Отсутствие, ч'), align: 'right' as const },
  { key: 'overtime_minutes', label: tr('Сверхурочно, ч'), align: 'right' as const },
])

async function load() {
  const ownGeneration = ++generation
  error.value = ''
  result.value = null
  loading.value = true
  try {
    const response = await getEmployeeWorktimeMonth(props.companyId, props.employeeId, month.value)
    if (ownGeneration !== generation) return
    result.value = response
  } catch {
    if (ownGeneration !== generation) return
    error.value = tr('Не удалось загрузить табель за выбранный период')
  } finally {
    if (ownGeneration === generation) loading.value = false
  }
}
watch([() => props.companyId, () => props.employeeId, month], () => { void load() }, { immediate: true })
onBeforeUnmount(() => { generation++ })
</script>

<template>
  <section class="employee-month-worktime" :aria-label="tr('Явки, неявки и отсутствия за месяц')">
    <div class="employee-worktime-toolbar">
      <BaseFormField v-model="month" type="month" :label="tr('Период')" />
      <span class="employee-worktime-informative"><LockKeyhole :size="14" aria-hidden="true" />{{ tr('Только просмотр') }}</span>
      <BaseButton variant="secondary" :disabled="loading" @click="load">
        <RefreshCw :size="15" aria-hidden="true" />{{ tr('Обновить') }}
      </BaseButton>
    </div>

    <BaseLoadingState v-if="loading" :label="tr('Загрузка табеля')" />
    <template v-else-if="error">
      <BaseNotice tone="error">{{ error }}</BaseNotice>
      <BaseButton variant="secondary" @click="load">{{ tr('Повторить') }}</BaseButton>
    </template>
    <template v-else-if="result">
      <div class="employee-month-metrics" :aria-label="tr('Показатели табеля')">
        <div v-for="metric in metrics" :key="metric.id" class="employee-month-metric" :data-metric="metric.id">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}<small v-if="metric.unit && metric.value !== '—'"> {{ metric.unit }}</small></strong>
        </div>
      </div>
      <p class="employee-month-help">
        {{ tr('Учтены только сохранённые записи табеля; неизвестные значения показаны прочерком.') }}
        {{ tr('Опоздания не рассчитываются — нет подтверждённого источника.') }}
      </p>
      <BaseNotice v-if="!result.data.days.length" tone="info">
        {{ tr('Записей табеля за выбранный месяц нет') }}
      </BaseNotice>
      <BaseDataTable v-else density="compact" :rows="result.data.days" :columns="columns" row-key="date"
        :caption="tr('Фактически записанные дни табеля')" :empty-title="tr('Записей табеля нет')">
        <template #cell-date="{ value }">{{ fmt.date(String(value)) }}</template>
        <template #cell-planned_minutes="{ value }">{{ hours(value === null ? null : Number(value)) }}</template>
        <template #cell-worked_minutes="{ value }">{{ hours(value === null ? null : Number(value)) }}</template>
        <template #cell-absence_minutes="{ value }">{{ hours(value === null ? null : Number(value)) }}</template>
        <template #cell-overtime_minutes="{ value }">{{ hours(value === null ? null : Number(value)) }}</template>
      </BaseDataTable>
    </template>
  </section>
</template>

<style scoped>
.employee-month-worktime{display:grid;gap:13px;min-width:0}
.employee-worktime-toolbar{display:flex;align-items:end;flex-wrap:wrap;gap:10px;min-width:0}
.employee-worktime-toolbar :deep(.field){width:185px;max-width:100%}
.employee-worktime-toolbar :deep(.base-button){height:36px;min-height:36px;font-weight:500}
.employee-worktime-informative{display:inline-flex;align-items:center;gap:5px;margin:0 auto 7px 0;color:var(--color-muted);font-size:11px;line-height:16px}
.employee-worktime-informative svg{flex:none}
.employee-month-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;min-width:0}
.employee-month-metric{display:grid;gap:9px;align-content:center;min-height:93px;padding:12px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface)}
.employee-month-metric>span{font-size:11px;line-height:16px;font-weight:500;color:var(--color-muted)}
.employee-month-metric>strong{font-size:20px;line-height:24px;font-weight:600;color:var(--color-text);font-variant-numeric:tabular-nums}
.employee-month-metric small{font-size:11px;font-weight:400;color:var(--color-muted)}
.employee-month-help{margin:0;color:var(--color-muted);font-size:11px;line-height:17px}
@media(max-width:900px){.employee-month-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:420px){.employee-worktime-toolbar :deep(.field){width:100%}.employee-month-metric{min-height:78px;padding:10px}.employee-month-metric>strong{font-size:18px}}
</style>
