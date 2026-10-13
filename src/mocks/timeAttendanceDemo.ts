import type { EmployeeRecord } from '../api/personnel'

export type AttendanceCode = 'work' | 'off' | 'sick' | 'trip' | 'vacation' | 'unknown'

export interface AttendanceDay {
  date: string
  day: number
  weekday: number
  code: AttendanceCode
  mark: string
  hours: number
  overtime: number
}

export interface AttendanceRow {
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  position: string
  schedule_id: string
  schedule_name: string
  planned_hours: number
  worked_hours: number
  absence_days: number
  overtime_hours: number
  days: AttendanceDay[]
}

export interface WorkScheduleDefinition {
  id: string
  name: string
  pattern: string
  shift: string
  hours_per_week: number
  employee_count: number
}

export interface AbsenceRecord {
  id: string
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  kind: string
  from: string
  to: string
  days: number
  basis: string
}

export interface ProductionCalendarDay {
  date: string
  day: number
  weekday: number
  kind: 'workday' | 'weekend' | 'holiday'
  label: string
}

export interface AttendanceDemo {
  rows: AttendanceRow[]
  schedules: WorkScheduleDefinition[]
  absences: AbsenceRecord[]
  calendar: ProductionCalendarDay[]
}

const scheduleDefs = [
  { id:'standard', name:'Пятидневная рабочая неделя', pattern:'5/2', shift:'09:00–18:00', hours_per_week:40 },
  { id:'shift', name:'Сменный график', pattern:'2/2', shift:'08:00–20:00', hours_per_week:42 },
  { id:'flex', name:'Гибкий график', pattern:'5/2', shift:'Гибкое начало дня', hours_per_week:40 },
] as const

function dateKey(year:number,month:number,day:number) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function scheduled(scheduleId:string,day:number,weekday:number,index:number) {
  if (scheduleId === 'shift') return ((day + index) % 4) < 2
  return weekday !== 0 && weekday !== 6
}

function markFor(code:AttendanceCode,hours:number) {
  if (code === 'work') return String(hours)
  if (code === 'off') return 'В'
  if (code === 'sick') return 'Б'
  if (code === 'trip') return 'К'
  if (code === 'vacation') return 'ОТ'
  return 'НН'
}

function absenceCode(index:number,day:number):AttendanceCode|null {
  if (index % 13 === 0 && day >= 20 && day <= 22) return 'vacation'
  if (index % 11 === 0 && day >= 13 && day <= 14) return 'trip'
  if (index % 9 === 0 && day >= 6 && day <= 7) return 'sick'
  if (index % 17 === 0 && day === 16) return 'unknown'
  return null
}

function absenceKind(code:AttendanceCode) {
  if (code === 'sick') return 'Временная нетрудоспособность'
  if (code === 'trip') return 'Командировка'
  if (code === 'vacation') return 'Ежегодный отпуск'
  return 'Отсутствие по невыясненной причине'
}

export function buildAttendanceDemo(employees:EmployeeRecord[],monthValue:string):AttendanceDemo {
  const [year,month] = monthValue.split('-').map(Number)
  const daysInMonth = new Date(year,month,0).getDate()
  const calendar:ProductionCalendarDay[] = Array.from({length:daysInMonth},(_,offset)=>{
    const day=offset+1
    const date=dateKey(year,month,day)
    const weekday=new Date(`${date}T12:00:00`).getDay()
    const republicDay=date==='2026-10-25'
    return {
      date,day,weekday,
      kind:republicDay?'holiday':weekday===0||weekday===6?'weekend':'workday',
      label:republicDay?'День Республики':weekday===0||weekday===6?'Выходной':'Рабочий день',
    }
  })

  const absences:AbsenceRecord[]=[]
  const rows=employees.map((employee,index)=>{
    const schedule=scheduleDefs[index%5===0?1:index%5===1?2:0]
    const days:AttendanceDay[]=[]
    let planned=0,worked=0,absenceDays=0,overtime=0
    for(const item of calendar){
      const isScheduled=scheduled(schedule.id,item.day,item.weekday,index) && item.kind!=='holiday'
      if(isScheduled) planned += schedule.id==='shift'?12:8
      let code:AttendanceCode=isScheduled?'work':'off'
      const absence=isScheduled?absenceCode(index,item.day):null
      if(absence) code=absence
      let hours=code==='work'?(schedule.id==='shift'?12:8):0
      let extra=0
      if(code==='work'&&index%7===0&&item.day===9){extra=2;hours+=2;overtime+=2}
      if(code==='work') worked+=hours
      if(['sick','trip','vacation','unknown'].includes(code)) absenceDays++
      days.push({date:item.date,day:item.day,weekday:item.weekday,code,mark:markFor(code,hours),hours,overtime:extra})
    }

    const fullName=[employee.last_name,employee.first_name,employee.middle_name].filter(Boolean).join(' ')
    const department=employee.current_department_name||'Без подразделения'
    const codes:AttendanceCode[]=['sick','trip','vacation','unknown']
    for(const code of codes){
      const matching=days.filter(day=>day.code===code)
      if(!matching.length) continue
      absences.push({
        id:`${employee.id}:${code}`,
        employee_id:employee.id,
        personnel_number:employee.personnel_number,
        full_name:fullName,
        department,
        kind:absenceKind(code),
        from:matching[0].date,
        to:matching[matching.length-1].date,
        days:matching.length,
        basis:code==='sick'?'Листок нетрудоспособности':code==='trip'?'Приказ о командировке':code==='vacation'?'Приказ об отпуске':'Требует уточнения',
      })
    }

    return {
      employee_id:employee.id,
      personnel_number:employee.personnel_number,
      full_name:fullName,
      department,
      position:employee.current_position_name||'—',
      schedule_id:schedule.id,
      schedule_name:schedule.name,
      planned_hours:planned,
      worked_hours:worked,
      absence_days:absenceDays,
      overtime_hours:overtime,
      days,
    }
  })

  const schedules:WorkScheduleDefinition[]=scheduleDefs.map(schedule=>({
    ...schedule,
    employee_count:rows.filter(row=>row.schedule_id===schedule.id).length,
  }))

  return {rows,schedules,absences,calendar}
}
