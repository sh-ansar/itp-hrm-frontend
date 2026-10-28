<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  putProductionCalendar,
  type ProductionCalendarDay,
  type ProductionCalendarDayType,
  type CalendarDayChange,
} from '../api/worktime'
import { ApiError } from '../api/client'
import { useWorkforceI18n } from '../i18n/workforce'

type DraftDay = {
  date: string
  day_type: ProductionCalendarDayType | 'missing'
  planned_minutes: number | null
  label: string
  revision: number | null
}

const props = defineProps<{
  open: boolean
  companyId: string
  month: string
  days: ProductionCalendarDay[]
}>()
const emit = defineEmits<{ close: []; saved: []; refresh: [] }>()
const { t } = useWorkforceI18n()
const drafts = ref<DraftDay[]>([])
const selectedDate = ref('')
const multiMode = ref(false)
const selectedDates = ref<string[]>([])
function clickDay(date: string) {
  selectedDate.value = date
  if (!multiMode.value) return
  selectedDates.value = selectedDates.value.includes(date)
    ? selectedDates.value.filter(value => value !== date)
    : [...selectedDates.value, date]
}
function selectAllDisplayed() {
  selectedDates.value = drafts.value.map(day => day.date)
}
function clearSelection() { selectedDates.value = [] }
function applySelected() {
  if (saving.value || !selectedDates.value.length
    || (rangeIsWorking.value && (!Number.isInteger(Number(rangeMinutes.value))
      || Number(rangeMinutes.value) < 1 || Number(rangeMinutes.value) > 1440))) return
  for (const day of drafts.value) {
    if (!selectedDates.value.includes(day.date)) continue
    day.day_type = rangeType.value
    day.planned_minutes = rangeIsWorking.value ? Number(rangeMinutes.value) : 0
    day.label = rangeLabel.value.trim()
  }
  error.value = ''
}
const rangeFrom = ref('')
const rangeTo = ref('')
const rangeType = ref<ProductionCalendarDayType>('workday')
const rangeMinutes = ref('480')
const rangeLabel = ref('')
const saving = ref(false)
const error = ref('')
const typeOptions: ProductionCalendarDayType[] = ['workday', 'shortened', 'weekend', 'holiday']

function allDates(month: string): string[] {
  const [year, monthNo] = month.split('-').map(Number)
  if (!year || !monthNo || monthNo < 1 || monthNo > 12) return []
  const total = new Date(Date.UTC(year, monthNo, 0)).getUTCDate()
  return Array.from({ length: total }, (_, index) =>
    month + '-' + String(index + 1).padStart(2, '0'))
}
function createDrafts(): DraftDay[] {
  const saved = new Map(props.days.map(day => [day.date, day]))
  return allDates(props.month).map(date => {
    const day = saved.get(date)
    return {
      date,
      day_type: day?.day_type ?? 'missing',
      planned_minutes: day?.planned_minutes ?? null,
      label: day?.label ?? '',
      revision: day?.revision ?? null,
    }
  })
}
function resetDrafts() {
  drafts.value = createDrafts()
  selectedDate.value = drafts.value.find(day => day.day_type === 'missing')?.date ?? drafts.value[0]?.date ?? ''
  multiMode.value = false
  selectedDates.value = []
  rangeFrom.value = drafts.value[0]?.date ?? ''
  rangeTo.value = drafts.value.at(-1)?.date ?? ''
  rangeLabel.value = ''
  error.value = ''
}
watch(() => [props.open, props.month, props.companyId, props.days], () => {
  if (props.open) resetDrafts()
}, { immediate: true, deep: true })

const selectedDay = computed(() => drafts.value.find(day => day.date === selectedDate.value))
const originalDays = computed(() => new Map(props.days.map(day => [day.date, day])))
function changed(day: DraftDay): boolean {
  const saved = originalDays.value.get(day.date)
  if (!saved) return day.day_type !== 'missing'
  return day.day_type !== saved.day_type
    || day.planned_minutes !== saved.planned_minutes
    || (day.label.trim() || null) !== (saved.label || null)
}
const pending = computed(() => drafts.value.filter(changed))
const workdays = computed(() => drafts.value.filter(d => d.day_type === 'workday' || d.day_type === 'shortened').length)
const offdays = computed(() => drafts.value.filter(d => d.day_type === 'weekend').length)
const holidays = computed(() => drafts.value.filter(d => d.day_type === 'holiday').length)
const missing = computed(() => drafts.value.filter(d => d.day_type === 'missing').length)
const rangeOptions = computed(() => typeOptions.map(id => ({ id, name: t(id) })))
const rangeIsWorking = computed(() => ['workday', 'shortened'].includes(rangeType.value))
const rangeValid = computed(() => rangeFrom.value >= (drafts.value[0]?.date ?? '9999')
  && rangeTo.value <= (drafts.value.at(-1)?.date ?? '') && rangeFrom.value <= rangeTo.value
  && (!rangeIsWorking.value || (Number.isInteger(Number(rangeMinutes.value))
    && Number(rangeMinutes.value) >= 1 && Number(rangeMinutes.value) <= 1440)))
watch(rangeType, type => { rangeMinutes.value = type === 'workday' ? '480' : type === 'shortened' ? '360' : '0' })
function applyRange() {
  if (saving.value || !rangeValid.value) return
  for (const day of drafts.value) {
    if (day.date < rangeFrom.value || day.date > rangeTo.value) continue
    day.day_type = rangeType.value
    day.planned_minutes = rangeIsWorking.value ? Number(rangeMinutes.value) : 0
    day.label = rangeLabel.value.trim()
  }
  error.value = ''
}
function chooseType(value: string) {
  const draft = selectedDay.value
  if (!draft || !typeOptions.includes(value as ProductionCalendarDayType)) return
  draft.day_type = value as ProductionCalendarDayType
  if (draft.day_type === 'workday') draft.planned_minutes = 480
  else if (draft.day_type === 'shortened') draft.planned_minutes = 360
  else draft.planned_minutes = 0
}
function changeMinutes(raw: string) {
  const draft = selectedDay.value
  if (draft) draft.planned_minutes = raw === '' ? null : Number(raw)
}
function fillMissing52() {
  for (const day of drafts.value) {
    if (day.day_type !== 'missing') continue
    const weekday = new Date(day.date + 'T00:00:00Z').getUTCDay()
    day.day_type = weekday === 0 || weekday === 6 ? 'weekend' : 'workday'
    day.planned_minutes = day.day_type === 'workday' ? 480 : 0
  }
  error.value = ''
}
function undoSelected() {
  const original = originalDays.value.get(selectedDate.value)
  const index = drafts.value.findIndex(day => day.date === selectedDate.value)
  if (index < 0) return
  drafts.value[index] = original ? {
    date: original.date,
    day_type: original.day_type,
    planned_minutes: original.planned_minutes,
    label: original.label ?? '',
    revision: original.revision,
  } : {
    date: selectedDate.value,
    day_type: 'missing',
    planned_minutes: null,
    label: '',
    revision: null,
  }
}
function close() {
  if (saving.value) return
  if (pending.value.length && !window.confirm(t('unsaved'))) return
  emit('close')
}
function refresh() {
  if (saving.value) return
  emit('refresh')
}
async function save() {
  if (!pending.value.length || saving.value || !props.companyId) return
  const invalid = pending.value.some(day => day.day_type === 'missing'
    || (['workday', 'shortened'].includes(day.day_type)
      ? !Number.isInteger(day.planned_minutes) || (day.planned_minutes ?? 0) < 1 || (day.planned_minutes ?? 0) > 1440
      : day.planned_minutes !== null && day.planned_minutes !== 0))
  if (invalid) { error.value = t('invalid'); return }
  error.value = ''
  saving.value = true
  try {
    const days: CalendarDayChange[] = pending.value.map(day => ({
      date: day.date,
      day_type: day.day_type as ProductionCalendarDayType,
      planned_minutes: day.planned_minutes,
      label: day.label.trim() || null,
      revision: day.revision,
    }))
    await putProductionCalendar(props.companyId, props.month, days)
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof ApiError && cause.status === 409 ? t('conflict') : t('failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDrawer :open="open" :title="t('title')" :description="t('description')" :close-label="t('cancel')" @close="close">
    <div class="calendar-editor">
      <p class="calendar-editor-month"><strong>{{ t('month') }}:</strong> {{ month }}</p>
      <div class="calendar-editor-stats">
        <span>{{ t('workdays') }}: <strong>{{ workdays }}</strong></span>
        <span>{{ t('weekend') }}: <strong>{{ offdays }}</strong></span>
        <span>{{ t('holiday') }}: <strong>{{ holidays }}</strong></span>
        <span>{{ t('incomplete') }}: <strong>{{ missing }}</strong></span>
      </div>
      <BaseButton variant="secondary" :disabled="saving || missing === 0" @click="fillMissing52">{{ t('fill52') }}</BaseButton>
      <p class="calendar-editor-hint">{{ t('fillHint') }} {{ t('suggested') }}</p>

      <details class="calendar-editor-bulk">
        <summary>{{ t('bulkTitle') }}</summary>
        <div class="calendar-editor-bulk-fields">
          <BaseFormField v-model="rangeFrom" type="date" :label="t('rangeFrom')" :disabled="saving" />
          <BaseFormField v-model="rangeTo" type="date" :label="t('rangeTo')" :disabled="saving" />
          <BaseSelectField v-model="rangeType" :label="t('bulkType')" :options="rangeOptions" :disabled="saving" />
          <BaseFormField v-model="rangeMinutes" type="number" :label="t('bulkMinutes')" :disabled="saving || !rangeIsWorking" />
          <BaseFormField v-model="rangeLabel" :label="t('bulkLabel')" :disabled="saving" />
          <p class="calendar-editor-hint">{{ t('bulkHint') }}</p>
          <BaseButton variant="secondary" :disabled="saving || !rangeValid" @click="applyRange">{{ t('applyRange') }}</BaseButton>
        </div>
      </details>

      <div class="calendar-selection-toolbar">
        <p class="calendar-editor-choose">{{ multiMode ? 'Выберите несколько дней, затем тип и примените' : t('clickDay') }}</p>
        <BaseButton variant="secondary" :aria-pressed="multiMode"
          @click="multiMode = !multiMode; clearSelection()">
          {{ multiMode ? 'Один день' : 'Выбрать несколько дат' }}
        </BaseButton>
      </div>
      <div v-if="multiMode" class="calendar-multi-actions">
        <span>Выбрано дат: <strong>{{ selectedDates.length }}</strong></span>
        <BaseButton variant="secondary" :disabled="saving" @click="selectAllDisplayed">Все даты месяца</BaseButton>
        <BaseButton variant="secondary" :disabled="saving || !selectedDates.length" @click="clearSelection">Снять выделение</BaseButton>
        <BaseSelectField v-model="rangeType" label="Тип для выбранных" :options="rangeOptions" :disabled="saving" />
        <BaseFormField v-model="rangeMinutes" label="Минуты" type="number" :disabled="saving || !rangeIsWorking" />
        <BaseButton :disabled="saving || !selectedDates.length" @click="applySelected">Применить к выбранным</BaseButton>
      </div>
      <div class="calendar-editor-legend" role="list" aria-label="Обозначения дней">
        <span role="listitem"><i class="editor-legend-key editor-legend-key--workday" aria-hidden="true" />{{ t('workday') }}</span>
        <span role="listitem"><i class="editor-legend-key editor-legend-key--weekend" aria-hidden="true" />{{ t('weekend') }}</span>
        <span role="listitem"><i class="editor-legend-key editor-legend-key--holiday" aria-hidden="true" />{{ t('holiday') }}</span>
        <span role="listitem"><i class="editor-legend-key editor-legend-key--missing" aria-hidden="true" />{{ t('missing') }}</span>
      </div>
      <div class="calendar-editor-days" role="group" :aria-label="t('selected')">
        <button v-for="day in drafts" :key="day.date" type="button" class="calendar-editor-day"
          :class="{
            selected: multiMode ? selectedDates.includes(day.date) : day.date === selectedDate,
            dirty: changed(day),
            workday: day.day_type === 'workday' || day.day_type === 'shortened',
            shortened: day.day_type === 'shortened',
            weekend: day.day_type === 'weekend',
            holiday: day.day_type === 'holiday',
            missing: day.day_type === 'missing',
          }"
          :aria-pressed="multiMode ? selectedDates.includes(day.date) : day.date === selectedDate"
          :aria-label="day.date + ' – ' + (day.day_type === 'missing' ? t('missing') : t(day.day_type))"
          @click="clickDay(day.date)">
          <strong>{{ Number(day.date.slice(8)) }}</strong>
          <small>{{ day.day_type === 'missing' ? '—' : t(day.day_type) }}</small>
        </button>
      </div>

      <div v-if="selectedDay && !multiMode" class="calendar-editor-details">
        <h3>{{ t('selected') }}: {{ selectedDay.date }}</h3>
        <label class="calendar-editor-field">
          <span>{{ t('dayType') }}</span>
          <select :value="selectedDay.day_type" :disabled="saving" @change="chooseType(($event.target as HTMLSelectElement).value)">
            <option value="missing" disabled>{{ t('missing') }}</option>
            <option v-for="dayType in typeOptions" :key="dayType" :value="dayType">{{ t(dayType) }}</option>
          </select>
        </label>
        <label class="calendar-editor-field">
          <span>{{ t('minutes') }}</span>
          <input type="number" min="0" max="1440" step="1"
            :value="selectedDay.planned_minutes ?? ''"
            :disabled="saving || selectedDay.day_type === 'missing' || selectedDay.day_type === 'weekend' || selectedDay.day_type === 'holiday'"
            @input="changeMinutes(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="calendar-editor-field">
          <span>{{ t('label') }}</span>
          <input v-model="selectedDay.label" maxlength="255" :placeholder="t('labelHint')" :disabled="saving || selectedDay.day_type === 'missing'" />
        </label>
        <BaseButton variant="secondary" :disabled="saving || !changed(selectedDay)" @click="undoSelected">{{ t('restore') }}</BaseButton>
      </div>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <p class="calendar-editor-hint">{{ t('remaining') }}</p>
    </div>
    <template #footer>
      <span class="calendar-editor-pending">{{ t('count') }}: {{ pending.length }}</span>
      <BaseButton v-if="error === t('conflict')" variant="secondary" :disabled="saving" @click="refresh">{{ t('refresh') }}</BaseButton>
      <BaseButton class="calendar-close" variant="secondary" :disabled="saving" @click="close">{{ t('cancel') }}</BaseButton>
      <BaseButton class="calendar-save" :disabled="!pending.length || saving" @click="save">{{ saving ? t('saving') : t('save') }}</BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.calendar-selection-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.calendar-multi-actions{display:flex;gap:8px;align-items:end;flex-wrap:wrap}
.calendar-multi-actions>span{font-size:12px;align-self:center}
.calendar-multi-actions :deep(.base-field){max-width:210px}
.calendar-editor-bulk{border:1px solid var(--color-stroke);border-radius:var(--radius-sm);padding:12px}
.calendar-editor-bulk summary{cursor:pointer;font-weight:600;color:var(--color-text)}
.calendar-editor-bulk-fields{display:grid;gap:12px;margin-top:12px;min-width:0}
.calendar-editor{display:grid;gap:14px;min-width:0}
.calendar-editor-month{margin:0;color:var(--color-text)}
.calendar-editor-stats{display:flex;gap:9px;flex-wrap:wrap}
.calendar-editor-stats span{border:1px solid var(--color-stroke);border-radius:7px;padding:7px 9px;background:var(--color-surface-raised);font-size:11px;color:var(--color-text)}
.calendar-editor-hint{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.calendar-editor-choose{margin:4px 0 0;font-weight:600;font-size:13px;color:var(--color-text)}
.calendar-editor-legend{display:flex;flex-wrap:wrap;align-items:center;gap:7px 13px;color:var(--color-text);font-size:11px}
.calendar-editor-legend span{display:inline-flex;align-items:center;gap:6px}
.editor-legend-key{display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid var(--color-stroke-strong)}
.editor-legend-key--workday{background:var(--calendar-work-bg);border-color:var(--calendar-work-border)}
.editor-legend-key--weekend{background:var(--calendar-weekend-bg);border-color:var(--calendar-weekend-border)}
.editor-legend-key--holiday{background:var(--calendar-holiday-bg);border-color:var(--calendar-holiday-border)}
.editor-legend-key--missing{background:var(--color-surface-raised);border-style:dashed}
.calendar-editor-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
.calendar-editor-day{display:grid;align-content:start;gap:3px;min-width:0;min-height:52px;padding:5px 2px;border-radius:6px;border:1px solid var(--color-stroke);background:var(--color-surface-raised);color:var(--color-text);cursor:pointer}
.calendar-editor-day strong{font-size:13px;color:inherit}
.calendar-editor-day small{font-size:9px;line-height:1.2;overflow-wrap:anywhere;display:none;color:inherit}
.calendar-editor-day.workday{background:var(--calendar-work-bg);border-color:var(--calendar-work-border);color:var(--calendar-work-text)}
.calendar-editor-day.weekend{background:var(--calendar-weekend-bg);border-color:var(--calendar-weekend-border);color:var(--calendar-weekend-text)}
.calendar-editor-day.holiday{background:var(--calendar-holiday-bg);border-color:var(--calendar-holiday-border);color:var(--calendar-holiday-text)}
.calendar-editor-day.shortened{border-style:dashed}
.calendar-editor-day.missing{border-style:dashed;color:var(--color-muted)}
.calendar-editor-day.selected{outline:2px solid var(--color-primary);outline-offset:1px}
.calendar-editor-day.dirty{box-shadow:inset 0 -3px 0 var(--color-primary)}
.calendar-editor-day:focus-visible{outline:3px solid var(--color-primary);outline-offset:2px}
.calendar-editor-details{display:grid;gap:12px;border-top:1px solid var(--color-stroke);padding-top:12px}
.calendar-editor-details h3{margin:0;font-size:14px;color:var(--color-text)}
.calendar-editor-field{display:grid;gap:5px;color:var(--color-text);font-size:12px}
.calendar-editor-field input,.calendar-editor-field select{width:100%;min-height:37px;border:1px solid var(--color-stroke);border-radius:7px;background:var(--color-surface-raised);color:var(--color-text);padding:0 9px;font:inherit}
.calendar-editor-field input:disabled{opacity:.58}
.calendar-editor-pending{align-self:center;color:var(--color-muted);font-size:11px;margin-right:auto}
.calendar-save,.calendar-close{min-width:max-content}
@media(max-width:560px){.calendar-editor-pending{flex-basis:100%;margin-right:0}}
@media(min-width:500px){.calendar-editor-day small{display:block;max-height:24px;overflow:hidden}}
@media(max-width:390px){.calendar-editor-days{gap:3px}.calendar-editor-day{min-height:40px}.calendar-editor-stats{gap:5px}}
</style>
