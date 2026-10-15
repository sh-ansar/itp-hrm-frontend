import type { EmployeeRecord } from '../api/personnel'

export type WorktimeTab = 'timesheet' | 'schedules' | 'calendar' | 'absences'

export interface DemoTimesheetRow extends Record<string, unknown> {
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  position: string
  schedule: string
  planned_hours: number
  worked_hours: number
  absence_hours: number
  overtime_hours: number
  status: 'complete' | 'attention'
}

export interface DemoScheduleRow extends Record<string, unknown> {
  id: string
  name: string
  type: string
  work_time: string
  week_hours: number
  employees: number
}

export interface DemoAbsenceRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  reason: string
  from: string
  to: string
  days: number
  hours: number
  status: 'recorded' | 'planned'
}

export interface DemoCalendarDay {
  date: string
  day: number
  weekday: string
  type: 'workday' | 'weekend' | 'holiday'
  label?: string
}

const scheduleTemplates = [
  { name: 'Основной график 5/2', type: 'Основной', work_time: '09:00–18:00', week_hours: 40 },
  { name: 'Сменный график 2/2', type: 'Сменный', work_time: '08:00–20:00', week_hours: 40 },
  { name: 'Индивидуальный график', type: 'Индивидуальный', work_time: '10:00–19:00', week_hours: 40 },
  { name: 'Суммированный учёт', type: 'Суммированный', work_time: 'По сменам', week_hours: 40 },
]

function nameOf(employee: EmployeeRecord): string {
  return [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' ')
}

function monthDays(month: string): Date[] {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return []
  const result: Date[] = []
  const cursor = new Date(Date.UTC(year, monthNumber - 1, 1))
  while (cursor.getUTCFullYear() === year && cursor.getUTCMonth() === monthNumber - 1) {
    result.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

// Explicit synthetic preview only. Live calendars must come from the company API.
const demoHolidayNames: Record<string, string> = {
  '2026-10-25': 'День Республики',
}

export function buildDemoCalendar(month: string): DemoCalendarDay[] {
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  return monthDays(month).map(date => {
    const weekday = date.getUTCDay()
    const dateIso = date.toISOString().slice(0, 10)
    const holidayName = demoHolidayNames[dateIso]
    return {
      date: dateIso,
      day: date.getUTCDate(),
      weekday: weekdays[weekday],
      type: holidayName ? 'holiday' : weekday === 0 || weekday === 6 ? 'weekend' : 'workday',
      ...(holidayName ? { label: holidayName } : {}),
    }
  })
}

export function buildDemoTimesheet(employees: EmployeeRecord[], month: string): DemoTimesheetRow[] {
  const workdays = buildDemoCalendar(month).filter(day => day.type === 'workday').length
  const planned = workdays * 8
  return employees.map((employee, index) => {
    const template = scheduleTemplates[index % scheduleTemplates.length]
    const absence = index % 9 === 3 ? 16 : index % 11 === 5 ? 8 : 0
    const overtime = index % 7 === 2 ? 4 : index % 13 === 6 ? 6 : 0
    const worked = Math.max(0, planned - absence + overtime)
    return {
      employee_id: employee.id,
      personnel_number: employee.personnel_number,
      full_name: nameOf(employee),
      department: employee.current_department_name || 'Без подразделения',
      position: employee.current_position_name || 'Без должности',
      schedule: template.name,
      planned_hours: planned,
      worked_hours: worked,
      absence_hours: absence,
      overtime_hours: overtime,
      status: absence > 0 || overtime > 0 ? 'attention' : 'complete',
    }
  })
}

export function buildDemoSchedules(timesheet: DemoTimesheetRow[]): DemoScheduleRow[] {
  return scheduleTemplates.map((template, index) => ({
    id: `schedule-${index + 1}`,
    ...template,
    employees: timesheet.filter((_, employeeIndex) => employeeIndex % scheduleTemplates.length === index).length,
  }))
}

export function buildDemoAbsences(employees: EmployeeRecord[], month: string): DemoAbsenceRow[] {
  if (!employees.length) return []
  const reasons = ['Временная нетрудоспособность', 'Командировка', 'Ежегодный отпуск', 'Отсутствие']
  const offsets = [3, 8, 14, 21, 25]
  return offsets
    .map((offset, index) => {
      const employee = employees[(index * 4 + 1) % employees.length]
      const fromDay = Math.min(offset, 27)
      const duration = index % 3 === 0 ? 2 : index % 3 === 1 ? 3 : 1
      const toDay = fromDay + duration - 1
      return {
        id: `absence-${index + 1}`,
        employee_id: employee.id,
        personnel_number: employee.personnel_number,
        full_name: nameOf(employee),
        department: employee.current_department_name || 'Без подразделения',
        reason: reasons[index % reasons.length],
        from: `${month}-${String(fromDay).padStart(2, '0')}`,
        to: `${month}-${String(toDay).padStart(2, '0')}`,
        days: duration,
        hours: duration * 8,
        status: index === offsets.length - 1 ? 'planned' : 'recorded',
      } as DemoAbsenceRow
    })
}

export function demoTimesheetSummary(rows: DemoTimesheetRow[]) {
  return rows.reduce((summary, row) => {
    summary.planned += row.planned_hours
    summary.worked += row.worked_hours
    summary.absence += row.absence_hours
    summary.overtime += row.overtime_hours
    return summary
  }, { planned: 0, worked: 0, absence: 0, overtime: 0 })
}
