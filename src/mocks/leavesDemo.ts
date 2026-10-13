import type { EmployeeRecord } from '../api/personnel'

export type DemoLeaveStatus = 'planned' | 'ongoing' | 'completed'

export interface DemoLeaveRow extends Record<string, unknown> {
  id: string
  employee_id: string
  personnel_number: string
  full_name: string
  department: string
  position: string
  leave_type: string
  started_on: string
  ended_on: string
  days: number
  status: DemoLeaveStatus
  schedule_state: 'on_schedule' | 'shifted'
}

export interface DemoLeaveMonth extends Record<string, unknown> {
  month: number
  label: string
  employees: number
  days: number
  planned: number
  ongoing: number
  completed: number
}

const leaveTypes = [
  'Ежегодный оплачиваемый отпуск',
  'Дополнительный оплачиваемый отпуск',
  'Учебный отпуск',
  'Отпуск без сохранения заработной платы',
]

function fullName(employee: EmployeeRecord): string {
  return [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' ')
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function endDate(startedOn: string, days: number): string {
  const date = new Date(startedOn + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + Math.max(0, days - 1))
  return date.toISOString().slice(0, 10)
}

export function buildDemoLeaves(employees: EmployeeRecord[], year: number): DemoLeaveRow[] {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  return employees.slice(0, 30).map((employee, index) => {
    const month = (index * 2 + 1) % 12 + 1
    const day = 3 + (index * 3) % 19
    const days = index % 6 === 4 ? 5 : index % 4 === 2 ? 10 : 14
    const startedOn = iso(year, month, day)
    let status: DemoLeaveStatus = 'planned'
    if (year < currentYear || (year === currentYear && month < currentMonth)) status = 'completed'
    else if (year === currentYear && month === currentMonth && index % 3 === 0) status = 'ongoing'

    return {
      id: `leave-${year}-${index + 1}`,
      employee_id: employee.id,
      personnel_number: employee.personnel_number,
      full_name: fullName(employee),
      department: employee.current_department_name || 'Без подразделения',
      position: employee.current_position_name || 'Без должности',
      leave_type: leaveTypes[index % leaveTypes.length],
      started_on: startedOn,
      ended_on: endDate(startedOn, days),
      days,
      status,
      schedule_state: index % 8 === 5 ? 'shifted' : 'on_schedule',
    }
  })
}

export function leaveSummary(rows: DemoLeaveRow[]) {
  return rows.reduce((result, row) => {
    result.total += 1
    result.days += row.days
    result[row.status] += 1
    if (row.schedule_state === 'shifted') result.shifted += 1
    return result
  }, { total: 0, days: 0, planned: 0, ongoing: 0, completed: 0, shifted: 0 })
}

export function leaveMonths(rows: DemoLeaveRow[]): DemoLeaveMonth[] {
  const labels = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  return labels.map((label, index) => {
    const month = index + 1
    const selected = rows.filter(row => Number(row.started_on.slice(5, 7)) === month)
    return {
      month,
      label,
      employees: selected.length,
      days: selected.reduce((sum, row) => sum + row.days, 0),
      planned: selected.filter(row => row.status === 'planned').length,
      ongoing: selected.filter(row => row.status === 'ongoing').length,
      completed: selected.filter(row => row.status === 'completed').length,
    }
  })
}

export function leaveTypeRows(rows: DemoLeaveRow[]) {
  const grouped = new Map<string, { type: string; employees: number; days: number }>()
  for (const row of rows) {
    const current = grouped.get(row.leave_type) ?? { type: row.leave_type, employees: 0, days: 0 }
    current.employees += 1
    current.days += row.days
    grouped.set(row.leave_type, current)
  }
  return [...grouped.values()].sort((a, b) => b.employees - a.employees || a.type.localeCompare(b.type, 'ru'))
}
