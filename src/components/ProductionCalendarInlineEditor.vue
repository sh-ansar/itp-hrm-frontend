<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { ApiError } from '../api/client'
import {
  getProductionCalendar, putProductionCalendar,
  type CalendarDayChange, type ProductionCalendarDay, type ProductionCalendarDayType,
} from '../api/worktime'
import type { CalendarPeriodView } from './ProductionCalendarPeriodOverview.vue'

type DraftDay = {
  date: string; day: number; weekday: number
  day_type: ProductionCalendarDayType | 'missing'
  label: string | null; planned_minutes: number | null; revision: number | null
}
type MonthBlock = { key: string; title: string; days: DraftDay[] }
const props = defineProps<{
  companyId: string
  month: string
  view: CalendarPeriodView
}>()
const emit = defineEmits<{ saved: []; cancel: [] }>()
const blocks = ref<MonthBlock[]>([])
const originals = ref<Map<string, DraftDay>>(new Map())
const selected = ref<string[]>([])
const desiredType = ref<ProductionCalendarDayType>('workday')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
let generation = 0

function periodMonths(): string[] {
  const [year, number] = props.month.split('-').map(Number)
  if (!year || !number) return []
  const start = props.view === 'year' ? 1 : props.view === 'quarter' ? Math.floor((number - 1) / 3) * 3 + 1 : number
  const count = props.view === 'year' ? 12 : props.view === 'quarter' ? 3 : 1
  return Array.from({ length: count }, (_, index) =>
    year + '-' + String(start + index).padStart(2, '0'))
}
const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const typeOptions = [
  { id: 'workday', name: 'Рабочий' },
  { id: 'weekend', name: 'Выходной' },
  { id: 'holiday', name: 'Праздничный' },
  { id: 'shortened', name: 'Сокращённый рабочий' },
]
function makeDays(month: string, records: ProductionCalendarDay[]): DraftDay[] {
  const indexed = new Map(records.map(day => [day.date, day]))
  const [year, number] = month.split('-').map(Number)
  const total = new Date(Date.UTC(year!, number!, 0)).getUTCDate()
  return Array.from({ length: total }, (_, index) => {
    const day = index + 1
    const date = month + '-' + String(day).padStart(2, '0')
    const source = indexed.get(date)
    return {
      date, day, weekday: (new Date(Date.UTC(year!, number! - 1, day)).getUTCDay() + 6) % 7,
      day_type: source?.day_type ?? 'missing',
      label: source?.label ?? null,
      planned_minutes: source?.planned_minutes ?? null,
      revision: source?.revision ?? null,
    }
  })
}
async function load() {
  const token = ++generation
  error.value = ''
  success.value = ''
  loading.value = true
  blocks.value = []
  selected.value = []
  const months = periodMonths()
  try {
    const responses = await Promise.all(months.map(month => getProductionCalendar(props.companyId, month)))
    if (token !== generation) return
    const loaded = months.map((month, index) => ({
      key: month,
      title: new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(month + '-01T00:00:00Z')),
      days: makeDays(month, responses[index]!.data),
    }))
    blocks.value = loaded
    originals.value = new Map(loaded.flatMap(block => block.days).map(day => [day.date, { ...day }]))
  } catch (cause) {
    if (token === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить календарь'
  } finally {
    if (token === generation) loading.value = false
  }
}
watch(() => [props.companyId, props.month, props.view], () => { void load() }, { immediate: true })
const pending = computed(() => blocks.value.flatMap(block => block.days).filter(day => {
  const source = originals.value.get(day.date)
  return !!source && (
    day.day_type !== source.day_type ||
    day.planned_minutes !== source.planned_minutes ||
    (day.label || null) !== (source.label || null)
  )
}))
function toggle(date: string) {
  if (saving.value) return
  selected.value = selected.value.includes(date)
    ? selected.value.filter(value => value !== date) : [...selected.value, date]
}
function selectAll() { selected.value = blocks.value.flatMap(block => block.days.map(day => day.date)) }
function setType() {
  if (!selected.value.length || saving.value) return
  const dates = new Set(selected.value)
  for (const block of blocks.value) for (const day of block.days) {
    if (!dates.has(day.date)) continue
    day.day_type = desiredType.value
    day.planned_minutes = desiredType.value === 'workday' ? 480
      : desiredType.value === 'shortened' ? 360 : 0
    if (desiredType.value !== 'holiday') day.label = null
  }
  error.value = ''
  success.value = ''
}
function restoreSelected() {
  if (saving.value) return
  const dates = new Set(selected.value)
  for (const block of blocks.value) for (const day of block.days) {
    if (!dates.has(day.date)) continue
    const original = originals.value.get(day.date)
    if (original) Object.assign(day, original)
  }
}
function cancel() {
  if (saving.value) return
  if (pending.value.length && !window.confirm('Есть несохранённые изменения календаря. Выйти без сохранения?')) return
  emit('cancel')
}
onBeforeRouteLeave(() => !pending.value.length ||
  window.confirm('Есть несохранённые изменения календаря. Перейти без сохранения?'))

async function save() {
  if (saving.value || loading.value || !pending.value.length) return
  if (pending.value.some(day => day.day_type === 'missing' ||
    (['workday', 'shortened'].includes(day.day_type)
      ? !Number.isInteger(day.planned_minutes) || (day.planned_minutes ?? 0) < 1 || (day.planned_minutes ?? 0) > 1440
      : day.planned_minutes !== 0))) {
    error.value = 'Проверьте тип и норму времени выбранных дат.'
    return
  }
  saving.value = true
  error.value = ''
  let savedMonths = 0
  try {
    const byMonth = new Map<string, CalendarDayChange[]>()
    for (const day of pending.value) {
      const month = day.date.slice(0, 7)
      const list = byMonth.get(month) ?? []
      list.push({
        date: day.date, day_type: day.day_type as ProductionCalendarDayType,
        planned_minutes: day.planned_minutes, label: day.label || null, revision: day.revision,
      })
      byMonth.set(month, list)
    }
    // The API writes each month transactionally. Never imply cross-month atomicity.
    for (const [month, changes] of byMonth.entries()) {
      const response = await putProductionCalendar(props.companyId, month, changes)
      for (const changedDay of response.data) {
        const day = blocks.value.flatMap(block => block.days).find(item => item.date === changedDay.date)
        if (day) {
          day.revision = changedDay.revision
          originals.value.set(day.date, { ...day })
        }
      }
      savedMonths++
    }
    selected.value = []
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof ApiError && cause.status === 409
      ? 'Календарь изменился у другого пользователя. Обновите данные и проверьте незаписанные даты.'
      : 'Не удалось сохранить календарь. ' + (cause instanceof Error ? cause.message : '')
    if (savedMonths) success.value = 'Сохранено месяцев: ' + savedMonths + '. Остальные изменения не применены.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="calendar-inline-edit" aria-label="Редактирование календаря без боковой панели">
    <div class="calendar-inline-toolbar">
      <div>
        <strong>Выберите один или несколько дней</strong>
        <p>Нажмите на даты, выберите их тип и примените. Изменения сохранятся после нажатия «Сохранить».</p>
      </div>
      <div class="calendar-inline-actions">
        <BaseButton variant="secondary" :disabled="saving || loading" @click="selectAll">Выбрать всё</BaseButton>
        <BaseButton variant="secondary" :disabled="saving || !selected.length" @click="selected = []">Снять выделение</BaseButton>
        <BaseSelectField v-model="desiredType" label="Тип дня" :options="typeOptions" :disabled="saving || loading" />
        <BaseButton variant="secondary" :disabled="saving || !selected.length" @click="setType">Применить</BaseButton>
      </div>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="info">{{ success }}</BaseNotice>
    <p v-if="loading" role="status">Загрузка календаря…</p>
    <div v-else class="calendar-inline-months" :class="{ 'calendar-inline-months--year': view === 'year' }">
      <article v-for="block in blocks" :key="block.key" class="calendar-inline-month">
        <h3>{{ block.title }}</h3>
        <div class="calendar-inline-grid">
          <span v-for="name in weekdayLabels" :key="name" class="calendar-inline-weekday">{{ name }}</span>
          <span v-for="space in (block.days[0]?.weekday ?? 0)" :key="'gap-'+space" aria-hidden="true" />
          <button v-for="day in block.days" :key="day.date" type="button"
            :data-calendar-date="day.date" :aria-pressed="selected.includes(day.date)"
            :aria-label="day.date + ': ' + day.day_type + (day.label ? ' · ' + day.label : '')"
            :class="['calendar-inline-day', 'calendar-inline-day--'+day.day_type,
              { 'calendar-inline-day--selected': selected.includes(day.date),
                'calendar-inline-day--changed': pending.some(value => value.date === day.date) }]"
            :disabled="saving" @click="toggle(day.date)">{{ day.day }}</button>
        </div>
      </article>
    </div>
    <div class="calendar-inline-footer">
      <span>Выбрано: {{ selected.length }} · Изменено: {{ pending.length }}</span>
      <BaseButton v-if="selected.length" variant="secondary" :disabled="saving" @click="restoreSelected">Вернуть выбранные</BaseButton>
      <BaseButton variant="secondary" :disabled="saving" @click="cancel">Отмена</BaseButton>
      <BaseButton :disabled="saving || !pending.length" @click="save">{{ saving ? 'Сохранение…' : 'Сохранить изменения' }}</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.calendar-inline-edit{display:grid;gap:16px;min-width:0}
.calendar-inline-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.calendar-inline-toolbar strong{font-size:14px;font-weight:600}
.calendar-inline-toolbar p{margin:5px 0 0;font-size:12px;color:var(--color-muted);max-width:500px}
.calendar-inline-actions{display:flex;align-items:end;gap:8px;flex-wrap:wrap}
.calendar-inline-actions :deep(.base-select-field){width:190px}
.calendar-inline-months{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:16px}
.calendar-inline-months--year{grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr))}
.calendar-inline-month{min-width:0;padding:12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md)}
.calendar-inline-month h3{margin:0 0 12px;font-size:13px;font-weight:600;text-transform:capitalize}
.calendar-inline-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.calendar-inline-weekday{text-align:center;font-size:10px;color:var(--color-muted)}
.calendar-inline-day{min-width:0;aspect-ratio:1;border:1px solid var(--color-stroke);border-radius:5px;color:var(--color-text);background:var(--color-surface);font:inherit;font-size:11px;cursor:pointer}
.calendar-inline-day--workday{background:var(--calendar-work-bg)}
.calendar-inline-day--shortened{background:var(--calendar-work-bg);border-style:dashed}
.calendar-inline-day--weekend{background:var(--calendar-weekend-bg)}
.calendar-inline-day--holiday{background:var(--calendar-holiday-bg)}
.calendar-inline-day--missing{border-style:dashed}
.calendar-inline-day--selected{outline:2px solid var(--color-primary);outline-offset:1px}
.calendar-inline-day--changed{box-shadow:inset 0 -3px 0 var(--color-primary)}
.calendar-inline-day:focus-visible{outline:3px solid var(--color-primary);outline-offset:3px}
.calendar-inline-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;border-top:1px solid var(--color-stroke);padding-top:12px}
.calendar-inline-footer>span{margin-right:auto;font-size:12px;color:var(--color-muted)}
@media(max-width:650px){.calendar-inline-toolbar{align-items:stretch}.calendar-inline-actions{align-items:stretch}.calendar-inline-actions :deep(.base-select-field){width:100%}.calendar-inline-months{grid-template-columns:1fr}}
</style>
