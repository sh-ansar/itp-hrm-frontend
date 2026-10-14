/** Reuse one navigation contract in the sidebar, shortcut links and tests.
 * Keep real HRM routes; do not create decorative links to unbuilt modules. */
export interface HrmNavigationItem {
  to: string
  label: string
  icon: string
  section: 'primary' | 'service'
}

export const hrmNavigation: readonly HrmNavigationItem[] = [
  { to: '/', label: 'Главная', icon: '/prototype-icons/Home.svg', section: 'primary' },
  { to: '/employees', label: 'Сотрудники', icon: '/prototype-icons/People-groupf.svg', section: 'primary' },
  { to: '/organization', label: 'Оргструктура и штатка', icon: '/prototype-icons/Structure.svg', section: 'primary' },
  { to: '/personnel-actions', label: 'Кадровые процессы', icon: '/prototype-icons/processf.svg', section: 'primary' },
  { to: '/timesheets', label: 'Графики и табель', icon: '/prototype-icons/Calendar.svg', section: 'primary' },
  { to: '/leaves', label: 'Отпуска', icon: '/prototype-icons/Clock.svg', section: 'primary' },
  { to: '/documents', label: 'Документы и приказы', icon: '/prototype-icons/Document.svg', section: 'primary' },
  { to: '/reports', label: 'Отчёты и аналитика', icon: '/prototype-icons/Report.svg', section: 'primary' },
  { to: '/directories', label: 'Справочники', icon: '/prototype-icons/Storagef.svg', section: 'service' },
  { to: '/roles', label: 'Роли и права', icon: '/prototype-icons/People-groupf.svg', section: 'service' },
  { to: '/settings', label: 'Настройки', icon: '/prototype-icons/Settings.svg', section: 'service' },
]

/** Page navigation is different from a client-side accordion: keep its
 * states consistent for both mouse and keyboard across all viewports. */
export function isHrmNavigationActive(to: string, routePath: string): boolean {
  if (to === '/') return routePath === '/'
  if (to === '/employees') return routePath === '/employees'
    || routePath.startsWith('/employees/')
    || routePath === '/employees-development' || routePath === '/learning' || routePath === '/reserve'
  if (to === '/organization') return routePath === '/organization' || routePath === '/staffing'
  return to === routePath
}
