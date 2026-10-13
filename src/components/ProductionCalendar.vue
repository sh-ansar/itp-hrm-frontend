<script setup lang="ts">
import { computed } from 'vue'
import type { ProductionCalendarDay } from '../mocks/timeAttendanceDemo'

const props=defineProps<{ days:ProductionCalendarDay[]; monthLabel:string }>()
const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const orderedDays=computed(()=>{
  if(!props.days.length)return []
  const firstWeekday=props.days[0].weekday===0?7:props.days[0].weekday
  return [...Array.from({length:firstWeekday-1},()=>null),...props.days]
})
const summary=computed(()=>({
  workdays:props.days.filter(day=>day.kind==='workday').length,
  weekends:props.days.filter(day=>day.kind==='weekend').length,
  holidays:props.days.filter(day=>day.kind==='holiday').length,
  hours:props.days.filter(day=>day.kind==='workday').length*8,
}))
</script>

<template>
  <div class="production-calendar">
    <div class="calendar-summary">
      <div><span>Рабочих дней</span><strong>{{ summary.workdays }}</strong></div>
      <div><span>Выходных</span><strong>{{ summary.weekends }}</strong></div>
      <div><span>Праздничных</span><strong>{{ summary.holidays }}</strong></div>
      <div><span>Норма времени</span><strong>{{ summary.hours }} ч</strong></div>
    </div>

    <div class="calendar-card">
      <div class="calendar-head">
        <h2>{{ monthLabel }}</h2>
        <div class="calendar-legend">
          <span><i class="workday"></i>Рабочий</span>
          <span><i class="weekend"></i>Выходной</span>
          <span><i class="holiday"></i>Праздничный</span>
        </div>
      </div>
      <div class="calendar-grid">
        <strong v-for="name in weekdays" :key="name" class="weekday">{{ name }}</strong>
        <span v-for="(day,index) in orderedDays" :key="day?.date||'empty-'+index"
          class="calendar-day" :class="day?'calendar-day--'+day.kind:'calendar-day--empty'">
          <template v-if="day">
            <b>{{ day.day }}</b><small>{{ day.label }}</small>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.production-calendar{display:grid;gap:12px}
.calendar-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--color-stroke);border-radius:var(--radius-md);overflow:hidden;background:var(--color-surface);box-shadow:var(--shadow-card)}
.calendar-summary div{display:grid;gap:4px;padding:13px 16px;border-right:1px solid var(--color-stroke)}
.calendar-summary div:last-child{border-right:0}
.calendar-summary span{color:var(--color-muted);font-size:11px}
.calendar-summary strong{color:var(--color-text);font-size:19px}
.calendar-card{padding:16px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
.calendar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.calendar-head h2{margin:0;color:var(--color-text);font-size:16px;font-weight:600}
.calendar-legend{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--color-muted);font-size:10px}
.calendar-legend span{display:inline-flex;align-items:center;gap:5px}
.calendar-legend i{width:9px;height:9px;border-radius:3px;border:1px solid var(--color-stroke)}
.calendar-legend .workday{background:var(--color-surface)}
.calendar-legend .weekend{background:var(--color-soft)}
.calendar-legend .holiday{background:var(--color-accent-soft)}
.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.weekday{text-align:center;color:var(--color-muted);font-size:10px;font-weight:600;padding:4px}
.calendar-day{min-height:88px;display:flex;flex-direction:column;justify-content:space-between;gap:6px;padding:9px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface)}
.calendar-day b{color:var(--color-text);font-size:13px}
.calendar-day small{color:var(--color-muted);font-size:9px;line-height:1.3}
.calendar-day--weekend{background:var(--color-soft)}
.calendar-day--holiday{background:var(--color-accent-soft);border-color:var(--color-primary-stroke)}
.calendar-day--holiday b,.calendar-day--holiday small{color:var(--color-primary)}
.calendar-day--empty{border-color:transparent;background:transparent}
@media(max-width:700px){
  .calendar-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .calendar-summary div:nth-child(2){border-right:0}
  .calendar-summary div:nth-child(-n+2){border-bottom:1px solid var(--color-stroke)}
  .calendar-day{min-height:58px;padding:6px}
  .calendar-day small{display:none}
  .calendar-card{padding:12px}
}
</style>
