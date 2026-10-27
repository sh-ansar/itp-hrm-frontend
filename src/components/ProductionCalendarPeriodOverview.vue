<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { getProductionCalendar, type ProductionCalendarDay } from '../api/worktime'
import { buildDemoCalendar } from '../mocks/timesheetDemo'

export type CalendarPeriodView = 'month' | 'quarter' | 'year'
type Day = { date: string; day: number; weekday: number; type: string; label: string | null }
type MonthBlock = { month: string; title: string; days: Day[]; error?: string }
const props = defineProps<{
  companyId: string
  month: string
  active: boolean
  demoMode: boolean
  view: CalendarPeriodView
}>()
const emit = defineEmits<{ view: [value: CalendarPeriodView]; selectMonth: [value: string] }>()
const blocks = ref<MonthBlock[]>([])
const loading = ref(false)
let generation = 0

function monthKeys(month: string, period: CalendarPeriodView): string[] {
  const [year, number] = month.split('-').map(Number)
  if (!year || number < 1 || number > 12) return []
  const start = period === 'year' ? 1 : period === 'quarter' ? Math.floor((number - 1) / 3) * 3 + 1 : number
  const count = period === 'year' ? 12 : period === 'quarter' ? 3 : 1
  return Array.from({ length: count }, (_, i) => year + '-' + String(start + i).padStart(2, '0'))
}
const periodLabel = computed(() => {
  const months = monthKeys(props.month, props.view)
  if (!months.length) return ''
  if (props.view === 'year') return props.month.slice(0, 4) + ' год'
  if (props.view === 'quarter') return 'Квартал ' + (Math.floor((Number(months[0]?.slice(5)) - 1) / 3) + 1) + ', ' + props.month.slice(0, 4)
  return ''
})
function dayRows(month: string, records: Array<{ date: string; day_type: string; label?: string | null }>): Day[] {
  const [year, number] = month.split('-').map(Number)
  const saved = new Map(records.map(day => [day.date, day]))
  const total = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1
    const date = month + '-' + String(day).padStart(2, '0')
    return {
      date, day, weekday: (new Date(Date.UTC(year, number - 1, day)).getUTCDay() + 6) % 7,
      type: saved.get(date)?.day_type ?? 'missing', label: saved.get(date)?.label ?? null,
    }
  })
}
watch(() => [props.active, props.companyId, props.month, props.view], async () => {
  const run = ++generation
  blocks.value = []
  if (!props.active || !props.companyId || props.view === 'month') { loading.value = false; return }
  const months = monthKeys(props.month, props.view)
  loading.value = true
  const responses = await Promise.allSettled(months.map(async month => {
    const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(month + '-01T00:00:00Z'))
    if (props.demoMode) {
      const demo = buildDemoCalendar(month)
      return { month, title, days: dayRows(month, demo.map(day => ({ date: day.date, day_type: day.type, label: day.label }))) }
    }
    const response = await getProductionCalendar(props.companyId, month)
    return { month, title, days: dayRows(month, response.data as ProductionCalendarDay[]) }
  }))
  if (run !== generation) return
  blocks.value = responses.map((result, i) => result.status === 'fulfilled' ? result.value : {
    month: months[i]!, title: months[i]!, days: [], error: 'Не удалось загрузить данные месяца. Повторите выбор периода.',
  })
  loading.value = false
}, { immediate: true })
const summary = computed(() => {
  const days = blocks.value.flatMap(block => block.days)
  return { working: days.filter(d => d.type === 'workday' || d.type === 'shortened').length,
    weekend: days.filter(d => d.type === 'weekend').length,
    holiday: days.filter(d => d.type === 'holiday').length,
    missing: days.filter(d => d.type === 'missing').length }
})
const week = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
</script>

<template>
  <div class="calendar-period-overview">
    <div class="calendar-period-toolbar">
      <div class="calendar-period-segments" role="group" aria-label="Период производственного календаря">
        <BaseButton v-for="option in (['month','quarter','year'] as const)" :key="option"
          :variant="view === option ? 'primary' : 'secondary'"
          :aria-pressed="view === option" @click="emit('view', option)">
          {{ option === 'month' ? 'Месяц' : option === 'quarter' ? 'Квартал' : 'Год' }}
        </BaseButton>
      </div>
      <span v-if="view !== 'month'" class="calendar-period-title">{{ periodLabel }}</span>
    </div>
    <template v-if="view !== 'month'">
      <p v-if="loading" role="status">Загрузка календаря за выбранный период…</p>
      <p v-else class="calendar-period-stats" aria-live="polite">
        Рабочие: {{ summary.working }} · Выходные: {{ summary.weekend }} · Праздники: {{ summary.holiday }}
        <span v-if="summary.missing"> · Не заполнено: {{ summary.missing }}</span>
      </p>
      <div class="calendar-period-grid" :class="{ 'calendar-period-grid--year': view === 'year' }">
        <article v-for="block in blocks" :key="block.month" class="calendar-period-month">
          <header>
            <h3>{{ block.title }}</h3>
            <BaseButton variant="secondary" @click="emit('selectMonth', block.month)">Открыть месяц</BaseButton>
          </header>
          <BaseNotice v-if="block.error" tone="error">{{ block.error }}</BaseNotice>
          <div v-else class="calendar-period-days">
            <span v-for="name in week" :key="name" class="calendar-period-weekday">{{ name }}</span>
            <span v-for="gap in (block.days[0]?.weekday ?? 0)" :key="'empty-'+gap" aria-hidden="true"></span>
            <span v-for="day in block.days" :key="day.date" :title="day.date + (day.label ? ' · '+day.label : '')"
              :aria-label="day.date + ': ' + (day.type === 'holiday' ? 'праздник' : day.type === 'weekend' ? 'выходной' : day.type === 'missing' ? 'не заполнено' : 'рабочий')"
              class="calendar-period-day" :class="'calendar-period-day--'+day.type">{{ day.day }}</span>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
<style scoped>
.calendar-period-overview{display:grid;gap:16px}
.calendar-period-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.calendar-period-segments{display:flex;flex-wrap:wrap;gap:6px}
.calendar-period-title{font-weight:600}
.calendar-period-stats{margin:0;color:var(--color-text-secondary);font-size:13px}
.calendar-period-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:16px}
.calendar-period-grid--year{grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.calendar-period-month{min-width:0;border:1px solid var(--color-stroke);border-radius:var(--radius-md);padding:14px;background:var(--color-surface)}
.calendar-period-month header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:14px}
.calendar-period-month h3{margin:0;font-size:14px;text-transform:capitalize;font-weight:600}
.calendar-period-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.calendar-period-weekday{font-size:10px;color:var(--color-text-secondary);text-align:center}
.calendar-period-day{min-width:0;aspect-ratio:1;display:grid;place-items:center;border-radius:5px;font-size:11px;border:1px solid var(--color-stroke)}
.calendar-period-day--workday{background:color-mix(in srgb,var(--color-success) 18%,var(--color-surface))}
.calendar-period-day--shortened{background:color-mix(in srgb,var(--color-warning) 25%,var(--color-surface))}
.calendar-period-day--weekend{background:color-mix(in srgb,var(--color-error) 14%,var(--color-surface))}
.calendar-period-day--holiday{background:color-mix(in srgb,var(--color-warning) 30%,var(--color-surface));font-weight:700}
.calendar-period-day--missing{background:var(--color-surface);border-style:dashed}
@media(max-width:600px){.calendar-period-grid{grid-template-columns:1fr}.calendar-period-month{padding:10px}}
</style>