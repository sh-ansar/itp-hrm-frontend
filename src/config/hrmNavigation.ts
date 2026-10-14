/** Reuse one navigation contract in the sidebar, shortcut links and tests.
 * Keep real HRM routes; do not create decorative links to unbuilt modules. */
export interface HrmNavigationItem {
  to: string
  label: string
  labelKey?: string
  icon: string
  section: 'primary' | 'service'
}

export const hrmNavigation: readonly HrmNavigationItem[] = [
  { to: '/', label: 'Главная', labelKey: 'nav.home', icon: '/prototype-icons/Home.svg', section: 'primary' },
  { to: '/employees', label: 'Сотрудники', labelKey: 'nav.employees', icon: '/prototype-icons/People-groupf.svg', section: 'primary' },
  { to: '/organization', label: 'Оргструктура и штатка', labelKey: 'nav.organization', icon: '/prototype-icons/Structure.svg', section: 'primary' },
  { to: '/personnel-actions', label: 'Кадровые процессы', labelKey: 'nav.personnelActions', icon: '/prototype-icons/processf.svg', section: 'primary' },
  { to: '/timesheets', label: 'Графики и табель', labelKey: 'nav.timesheets', icon: '/prototype-icons/Calendar.svg', section: 'primary' },
  { to: '/leaves', label: 'Отпуска', labelKey: 'nav.leaves', icon: '/prototype-icons/Clock.svg', section: 'primary' },
  { to: '/documents', label: 'Документы и приказы', labelKey: 'nav.documents', icon: '/prototype-icons/Document.svg', section: 'primary' },
  { to: '/reports', label: 'Отчёты и аналитика', labelKey: 'nav.reports', icon: '/prototype-icons/Report.svg', section: 'primary' },
  { to: '/directories', label: 'Справочники', labelKey: 'nav.directories', icon: '/prototype-icons/Storagef.svg', section: 'service' },
  { to: '/settings', label: 'Настройки', labelKey: 'nav.settings', icon: '/prototype-icons/Settings.svg', section: 'service' },
]

/** Page navigation is different from a client-side accordion: keep its
 * states consistent for both mouse and keyboard across all viewports. */
export function isHrmNavigationActive(to: string, routePath: string): boolean {
  if (to === '/') return routePath === '/' || routePath === '/onboarding'
  if (to === '/employees') return routePath === '/employees'
    || routePath.startsWith('/employees/')
    || routePath === '/employees-development' || routePath === '/learning' || routePath === '/reserve'
  if (to === '/organization') return routePath === '/organization' || routePath === '/staffing'
  if (to === '/directories') return routePath === '/directories' || routePath.startsWith('/directories/')
  return to === routePath
}
