<script setup lang="ts">
import { computed } from 'vue'
import type { AttendanceRow, ProductionCalendarDay } from '../mocks/timeAttendanceDemo'

const props=defineProps<{
  rows:AttendanceRow[]
  calendar:ProductionCalendarDay[]
  companyId:string
  loading?:boolean
}>()

const weekdayNames=['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const visibleRows=computed(()=>props.rows)
function cellTitle(row:AttendanceRow,index:number){
  const day=row.days[index]
  if(!day)return ''
  const labels:Record<string,string>={
    work:'Отработано',
    off:'Выходной',
    sick:'Временная нетрудоспособность',
    trip:'Командировка',
    vacation:'Отпуск',
    unknown:'Неявка',
  }
  return `${day.date}: ${labels[day.code]||day.code}${day.hours?' · '+day.hours+' ч':''}`
}
</script>

<template>
  <div class="timesheet-grid">
    <div class="timesheet-desktop">
      <div class="timesheet-scroll" tabindex="0" aria-label="Табель рабочего времени">
        <table>
          <thead>
            <tr>
              <th class="employee-column">Сотрудник</th>
              <th v-for="day in calendar" :key="day.date" class="day-column"
                :class="{ weekend: day.kind !== 'workday' }">
                <strong>{{ day.day }}</strong><span>{{ weekdayNames[day.weekday] }}</span>
              </th>
              <th class="total-column">План</th>
              <th class="total-column">Факт</th>
              <th class="total-column">Неявки</th>
              <th class="total-column">Сверх.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td :colspan="calendar.length+5" class="loading-cell">Загрузка табеля…</td></tr>
            <tr v-else-if="!visibleRows.length"><td :colspan="calendar.length+5" class="loading-cell">Сотрудники не найдены.</td></tr>
            <tr v-for="row in visibleRows" v-else :key="row.employee_id">
              <td class="employee-column">
                <RouterLink :to="{name:'employee-detail',params:{company:companyId,employee:row.employee_id},query:{tab:'schedule'}}">
                  <strong>{{ row.full_name }}</strong><span>{{ row.personnel_number }} · {{ row.department }}</span>
                </RouterLink>
              </td>
              <td v-for="(day,index) in row.days" :key="day.date" class="attendance-cell"
                :class="['attendance-cell--'+day.code,{ weekend:calendar[index]?.kind!=='workday' }]"
                :title="cellTitle(row,index)">
                {{ day.mark }}
              </td>
              <td class="total-cell">{{ row.planned_hours }}</td>
              <td class="total-cell">{{ row.worked_hours }}</td>
              <td class="total-cell">{{ row.absence_days }}</td>
              <td class="total-cell">{{ row.overtime_hours }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="timesheet-mobile">
      <p v-if="loading" class="mobile-empty">Загрузка табеля…</p>
      <p v-else-if="!visibleRows.length" class="mobile-empty">Сотрудники не найдены.</p>
      <article v-for="row in visibleRows" v-else :key="row.employee_id" class="timesheet-card">
        <header>
          <RouterLink :to="{name:'employee-detail',params:{company:companyId,employee:row.employee_id},query:{tab:'schedule'}}">
            <strong>{{ row.full_name }}</strong><span>{{ row.personnel_number }} · {{ row.department }}</span>
          </RouterLink>
          <span class="schedule-label">{{ row.schedule_name }}</span>
        </header>
        <dl>
          <div><dt>План</dt><dd>{{ row.planned_hours }} ч</dd></div>
          <div><dt>Факт</dt><dd>{{ row.worked_hours }} ч</dd></div>
          <div><dt>Неявки</dt><dd>{{ row.absence_days }} дн.</dd></div>
          <div><dt>Сверхурочно</dt><dd>{{ row.overtime_hours }} ч</dd></div>
        </dl>
        <div class="day-strip" aria-label="Дни месяца">
          <span v-for="day in row.days" :key="day.date" :class="'day-mark day-mark--'+day.code" :title="day.date">
            {{ day.day }}<b>{{ day.mark }}</b>
          </span>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.timesheet-mobile{display:none}
.timesheet-scroll{
  width:100%;max-width:100%;overflow:auto;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.timesheet-scroll:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
table{border-collapse:separate;border-spacing:0;min-width:max-content;width:100%;font-size:11px}
th,td{height:42px;padding:7px 8px;border-right:1px solid var(--color-stroke);border-bottom:1px solid var(--color-stroke);text-align:center}
th{position:sticky;top:0;z-index:3;background:var(--color-soft);color:var(--color-text);font-weight:600}
.employee-column{
  position:sticky;left:0;z-index:2;width:250px;min-width:250px;max-width:250px;text-align:left;
  background:var(--color-surface)
}
thead .employee-column{z-index:5;background:var(--color-soft)}
.employee-column a{display:grid;gap:2px;color:var(--color-text)}
.employee-column a:hover strong{color:var(--color-primary)}
.employee-column strong{font-size:12px;line-height:1.3}
.employee-column span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-muted);font-size:10px}
.day-column{width:38px;min-width:38px;padding:5px 3px}
.day-column strong,.day-column span{display:block}
.day-column span{margin-top:2px;color:var(--color-muted);font-size:9px}
.day-column.weekend,.attendance-cell.weekend{background:var(--color-soft)}
.attendance-cell{width:38px;min-width:38px;padding-inline:3px;color:var(--color-text);font-weight:600}
.attendance-cell--sick{background:var(--color-danger-surface);color:var(--color-danger)}
.attendance-cell--trip{background:var(--color-accent-soft);color:var(--color-primary)}
.attendance-cell--vacation{background:var(--color-success-surface);color:var(--color-success)}
.attendance-cell--unknown{background:var(--color-warning-surface);color:var(--color-warning)}
.total-column,.total-cell{width:60px;min-width:60px;font-weight:600}
.total-cell{background:var(--color-surface)}
.loading-cell{height:90px;color:var(--color-muted);text-align:center}
@media(max-width:760px){
  .timesheet-desktop{display:none}
  .timesheet-mobile{display:grid;gap:10px}
  .mobile-empty{margin:0;padding:20px 10px;text-align:center;color:var(--color-muted);font-size:12px}
  .timesheet-card{display:grid;gap:12px;padding:13px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
  .timesheet-card header{display:grid;gap:7px}
  .timesheet-card header a{display:grid;gap:3px;color:var(--color-text)}
  .timesheet-card header a strong{font-size:13px}
  .timesheet-card header a span{color:var(--color-muted);font-size:10px}
  .schedule-label{width:max-content;max-width:100%;padding:5px 8px;border-radius:999px;background:var(--color-soft);color:var(--color-muted);font-size:10px}
  .timesheet-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}
  .timesheet-card dl div{padding:9px;border-radius:var(--radius-sm);background:var(--color-soft)}
  .timesheet-card dt{color:var(--color-muted);font-size:10px}
  .timesheet-card dd{margin:3px 0 0;color:var(--color-text);font-size:13px;font-weight:600}
  .day-strip{display:flex;gap:5px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}
  .day-strip::-webkit-scrollbar{display:none}
  .day-mark{display:grid;place-items:center;flex:0 0 34px;width:34px;height:44px;border:1px solid var(--color-stroke);border-radius:7px;color:var(--color-muted);font-size:9px;background:var(--color-surface)}
  .day-mark b{color:var(--color-text);font-size:10px}
  .day-mark--sick{background:var(--color-danger-surface)}
  .day-mark--trip{background:var(--color-accent-soft)}
  .day-mark--vacation{background:var(--color-success-surface)}
  .day-mark--unknown{background:var(--color-warning-surface)}
}
</style>
