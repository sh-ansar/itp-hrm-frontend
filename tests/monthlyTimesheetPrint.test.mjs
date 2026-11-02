import assert from 'node:assert/strict'
import { buildMonthlyTimesheetPrintHtml, monthlyTimesheetTotals } from '../src/utils/monthlyTimesheetPrint.ts'
const month='2026-10'
const dates=Array.from({length:31},(_,i)=>({date:month+'-'+String(i+1).padStart(2,'0'),day_type:i%7===4?'weekend':'workday',label:null,locked:false}))
const cells=dates.map((date,i)=>({
 date:date.date,planned_minutes: [0,1,2,3,6].includes(i)?480:0,
 worked_minutes:null,absence_minutes:null,overtime_minutes:null,shift_code:null,revision:null,state:'rest',locked:false,editable:false
}))
cells[0]={...cells[0],worked_minutes:480,state:'recorded'}
cells[1]={...cells[1],worked_minutes:240,absence_minutes:240,state:'recorded'}
cells[2]={...cells[2],state:'leave'}
cells[3]={...cells[3],absence_minutes:480,state:'absence'}
cells[5]={...cells[5],state:'outside_employment'}
cells[6]={...cells[6],state:'missing'}
const row={employee_id:'A',personnel_number:'01',full_name:'Тест <script>alert(1)</script>',
 department_name:'ИТ & поддержка',department_id:'dep',position_name:'Engineer',schedule_name:null,
 summary:{planned_minutes:2400,worked_minutes:720,recorded_days:3,missing_days:1},days:cells}
const totals=monthlyTimesheetTotals([row])
assert.deepEqual(totals,{presentDays:2,plannedMinutes:2400,workedMinutes:720,absenceMinutes:720,overtimeMinutes:0})
const html=buildMonthlyTimesheetPrintHtml({companyName:'ITP <demo>',month,dates,rows:[row],generatedAt:new Date('2026-11-02T10:00:00Z')})
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
assert.ok(!html.includes('<script>alert(1)</script>'))
assert.ok(html.includes('ИТ &amp; поддержка'))
assert.ok(html.includes('ITP &lt;demo&gt;'))
assert.ok(html.includes('Табель учёта рабочего времени'))
assert.equal((html.match(/<th class="day/g)||[]).length,31)
assert.ok(html.includes('>12</td>'))
assert.ok(html.includes('>40</td>'))
assert.ok(html.includes('Н — неявка'))
assert.ok(html.includes('@page{size:A3 landscape'))
assert.throws(()=>buildMonthlyTimesheetPrintHtml({companyName:'test',month,dates:dates.slice(0,30),rows:[row]}),/Incomplete/)
assert.throws(()=>buildMonthlyTimesheetPrintHtml({companyName:'test',month,dates,rows:[row,row]}),/Duplicate/)
assert.throws(()=>buildMonthlyTimesheetPrintHtml({companyName:'test',month,dates,rows:[{...row,days:cells.slice(0,30)}]}),/Incomplete/)
for(const locale of ['kk','en','ka'])assert.ok(buildMonthlyTimesheetPrintHtml({companyName:'ITP',month,dates,rows:[row],locale}).includes('print-now'))
console.log('MONTHLY_TIME_CARD_PRINT_UTIL_PASS '+JSON.stringify({days:31,presentDays:totals.presentDays,plannedHours:40,actualHours:12,absentHours:12,escaped:true,partialBlocked:true,allLanguages:true}))
