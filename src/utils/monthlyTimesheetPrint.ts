import type { WorktimeMatrixCell, WorktimeMatrixDay, WorktimeMatrixRow } from '../api/worktime'

export interface MonthlyTimesheetPrintInput {
  companyName: string
  month: string
  dates: WorktimeMatrixDay[]
  rows: WorktimeMatrixRow[]
  generatedAt?: Date
  locale?: 'ru' | 'kk' | 'en' | 'ka'
}

const copy = {
  ru: ['Табель учёта рабочего времени','Сотрудник','Подразделение','Должность','План, ч','Явок, дн','Факт, ч','Неявки, ч','Сверхур., ч','Печать / сохранить PDF','Закрыть','Сформировано','Составил(а): _____________________'],
  kk: ['Жұмыс уақытын есепке алу табелі','Қызметкер','Бөлімше','Лауазым','Жоспар, сағ','Келген күн','Нақты, сағ','Келмеген, сағ','Артық, сағ','Басып шығару / PDF','Жабу','Құрастырылды','Дайындаған: _____________________'],
  en: ['Monthly employee attendance register','Employee','Department','Position','Plan, h','Att. days','Actual, h','Absent, h','Overtime, h','Print / save PDF','Close','Generated','Prepared by: _____________________'],
  ka: ['სამუშაო დროის აღრიცხვის ტაბელი','თანამშრომელი','განყოფილება','თანამდებობა','გეგმა, სთ','დასწრ. დღე','ფაქტი, სთ','გაცდენა, სთ','ზეგანაკ., სთ','ბეჭდვა / PDF','დახურვა','შექმნილია','მოამზადა: _____________________'],
} as const

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)
export const formatTimecardMinutes = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  const hours = value / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',')
}
function cellText(cell: WorktimeMatrixCell): string {
  const w = cell.worked_minutes, a = cell.absence_minutes
  if (w !== null && w > 0 && a !== null && a > 0)
    return formatTimecardMinutes(w) + '/' + formatTimecardMinutes(a)
  if (w !== null && w > 0) return formatTimecardMinutes(w)
  if (a !== null && a > 0) return 'Н'
  if (cell.state === 'leave') return 'О'
  if (cell.state === 'absence') return 'Н'
  if (cell.state === 'outside_employment') return '—'
  if (cell.state === 'rest') return 'В'
  if (w === 0 && a === 0) return '0'
  return '·'
}
export function monthlyTimesheetTotals(rows: WorktimeMatrixRow[]) {
  const cells = rows.flatMap(row => row.days)
  const sum = (field: 'planned_minutes'|'worked_minutes'|'absence_minutes'|'overtime_minutes') =>
    cells.reduce((total, cell) => total + (cell[field] ?? 0), 0)
  return {
    presentDays: cells.filter(cell => (cell.worked_minutes ?? 0) > 0).length,
    plannedMinutes: sum('planned_minutes'),
    workedMinutes: sum('worked_minutes'),
    absenceMinutes: sum('absence_minutes'),
    overtimeMinutes: sum('overtime_minutes'),
  }
}

export function buildMonthlyTimesheetPrintHtml(input: MonthlyTimesheetPrintInput): string {
  const { companyName, month, dates, rows } = input
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month')
  const year = Number(month.slice(0,4)), num = Number(month.slice(5,7))
  const dayCount = new Date(Date.UTC(year,num,0)).getUTCDate()
  const expectedDates = Array.from({length:dayCount},(_,i)=>month+'-'+String(i+1).padStart(2,'0'))
  if (dates.length !== dayCount || dates.some((date,i)=>date.date !== expectedDates[i]))
    throw new Error('Incomplete monthly calendar. Printing is blocked.')
  if (new Set(rows.map(row=>row.employee_id)).size !== rows.length)
    throw new Error('Duplicate employees in monthly report.')
  for (const row of rows) {
    if (row.days.length !== dayCount || row.days.some((cell,i)=>cell.date !== expectedDates[i]))
      throw new Error('Incomplete employee month data. Printing is blocked.')
  }
  const language = input.locale && copy[input.locale] ? input.locale : 'ru'
  const labels = copy[language]
  const locale = { ru:'ru-RU',kk:'kk-KZ',en:'en-GB',ka:'ka-GE' }[language]
  const monthLabel = new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'UTC'})
    .format(new Date(Date.UTC(year,num-1,1)))
  const generated = new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(input.generatedAt ?? new Date())
  const heads = dates.map(day => '<th class="day'+(['holiday','weekend'].includes(day.day_type)?' rest':'')+'">'+escapeHtml(Number(day.date.slice(8)))+'</th>').join('')
  const body = rows.map((row,index)=>{
    const totals = monthlyTimesheetTotals([row])
    const cells = row.days.map((cell,i)=>
      '<td class="day'+(['holiday','weekend'].includes(dates[i].day_type)?' rest':'')+
      (['missing','unconfigured','future'].includes(cell.state)?' pending':'')+'">'+escapeHtml(cellText(cell))+'</td>').join('')
    return '<tr><td>'+(index+1)+'</td><th scope="row" class="person">'+escapeHtml(row.full_name)+
      '<small>'+escapeHtml(row.personnel_number)+'</small></th><td class="dept">'+escapeHtml(row.department_name||'—')+
      '</td><td class="position">'+escapeHtml(row.position_name||'—')+'</td>'+cells+
      '<td>'+formatTimecardMinutes(totals.plannedMinutes)+'</td><td>'+totals.presentDays+'</td><td>'+
      formatTimecardMinutes(totals.workedMinutes)+'</td><td>'+formatTimecardMinutes(totals.absenceMinutes)+
      '</td><td>'+formatTimecardMinutes(totals.overtimeMinutes)+'</td></tr>'
  }).join('')
  const totals = monthlyTimesheetTotals(rows)
  const totalColumns = dayCount + 9
  const intro = escapeHtml(companyName)+' · '+escapeHtml(monthLabel)+' · '+escapeHtml(labels[11])+': '+escapeHtml(generated)
  const legend = {
    ru:'Числа — отработанные часы; часы через дробь — отработано/неявка; Н — неявка (включая больничный); О — отпуск; В — выходной; — — вне периода трудоустройства; · — фактическая запись отсутствует. Печатная форма не является подписанным документом.',
    kk:'Сандар — жұмыс сағаттары; бөлшек — жұмыс/келмеу; Н — келмеу; О — демалыс; В — демалыс күні; — — жұмыс мерзімінен тыс; · — нақты жазба жоқ. Қол қойылмаған нысан.',
    en:'Numbers = worked hours; fractions = worked/absent hours; N = absence; O = leave; V = rest day; — = outside employment; · = actual entry missing. Unsigned report.',
    ka:'რიცხვები — ნამუშევარი საათები; წილადი — სამუშაო/გაცდენა; Н — გაცდენა; О — შვებულება; В — დასვენება; — — დასაქმების პერიოდის გარეთ; · — ჩანაწერი არ არის. ხელმოუწერელი ფორმა.',
  }[language]
  return '<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><title>'+escapeHtml(labels[0])+' · '+escapeHtml(monthLabel)+'</title>'+
    '<style>@page{size:A3 landscape;margin:10mm 8mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#23303b;font:10px Arial,sans-serif}'+
    '.toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#eef2f5;border-bottom:1px solid #cbd5dd}'+
    '.toolbar button{padding:8px 13px;border:1px solid #b1bcc5;border-radius:6px;background:white;cursor:pointer}'+
    'main{padding:16px}h1{font-size:20px;margin:0 0 10px}.info{margin:3px 0 5px;font-size:11px}'+
    'table{width:100%;min-width:1320px;table-layout:fixed;border-collapse:collapse;margin-top:14px;font-size:8px}'+
    'tr{break-inside:avoid;page-break-inside:avoid}thead{display:table-header-group}tfoot{display:table-row-group}'+
    'th,td{border:1px solid #a6b3c1;padding:4px 2px;text-align:center;vertical-align:middle;overflow-wrap:anywhere}'+
    'thead th,tfoot th,tfoot td{background:#e8eef2;font-weight:bold}.person{text-align:left;width:120px}.person small{display:block;margin-top:2px;color:#596875;font-weight:normal}'+
    '.dept,.position{text-align:left;width:78px}.day{width:22px}.rest{background:#f2f4f5}.pending{color:#87929a}'+
    '.notes{margin:13px 0 0;line-height:1.5}.signature{margin-top:22px}'+
    '@media screen and (max-width:1400px){main{overflow-x:auto}}'+
    '@media print{.toolbar{display:none}main{padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}table{min-width:0}}'+
    '</style></head><body><div class="toolbar"><b>'+escapeHtml(labels[0])+'</b><div><button type="button" id="print-now">'+
    escapeHtml(labels[9])+'</button> <button type="button" id="close-report">'+escapeHtml(labels[10])+'</button></div></div>'+
    '<main><h1>'+escapeHtml(labels[0])+'</h1><p class="info">'+intro+'</p><p class="info">'+escapeHtml(rows.length)+' '+escapeHtml(labels[1])+'</p>'+
    '<table aria-label="'+escapeHtml(labels[0])+'"><thead><tr><th>№</th><th class="person">'+escapeHtml(labels[1])+'</th><th class="dept">'+
    escapeHtml(labels[2])+'</th><th class="position">'+escapeHtml(labels[3])+'</th>'+heads+
    [4,5,6,7,8].map(i=>'<th>'+escapeHtml(labels[i])+'</th>').join('')+
    '</tr></thead><tbody>'+ (body || '<tr><td colspan="'+totalColumns+'">—</td></tr>')+'</tbody><tfoot><tr><th colspan="'+(dayCount+4)+'">Σ</th><td>'+
    formatTimecardMinutes(totals.plannedMinutes)+'</td><td>'+totals.presentDays+'</td><td>'+
    formatTimecardMinutes(totals.workedMinutes)+'</td><td>'+formatTimecardMinutes(totals.absenceMinutes)+
    '</td><td>'+formatTimecardMinutes(totals.overtimeMinutes)+'</td></tr></tfoot></table>'+
    '<p class="notes">'+escapeHtml(legend)+'</p><p class="signature">'+escapeHtml(labels[12])+'</p></main></body></html>'
}
