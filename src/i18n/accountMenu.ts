import { computed } from 'vue'
import { useUiPreferencesStore, type UiLocale } from '../stores/uiPreferences'

export type AccountMenuKey =
  | 'account' | 'notifications' | 'noNotifications' | 'notificationInfo' | 'notificationSettings'
  | 'online' | 'offline' | 'visibility' | 'localStatus' | 'company' | 'noCompanies'
  | 'system' | 'portal' | 'hrm' | 'inventory' | 'mro'
  | 'disableNotifications' | 'notificationsError' | 'profile'
  | 'settings' | 'companySettings' | 'platformAdmin' | 'logout'
  | 'switchCompanyError' | 'statusLabel' | 'chooseCompany' | 'chooseSystem'
  | 'companyTools' | 'organization' | 'rights' | 'billing' | 'adminOnly'

const copy: Record<UiLocale, Record<AccountMenuKey, string>> = {
  ru: {
    account: 'Аккаунт', notifications: 'Уведомления', noNotifications: 'Пока нет уведомлений',
    notificationInfo: 'История уведомлений появится здесь после подключения центра событий.',
    notificationSettings: 'Настроить уведомления',
    online: 'Онлайн', offline: 'Офлайн', visibility: 'Статус', localStatus: 'Пока это локальный статус — другие пользователи его не видят.',
    company: 'Компания', noCompanies: 'Нет доступных компаний', system: 'Система',
    portal: 'Портал', hrm: 'Кадры', inventory: 'Инвентаризация', mro: 'ТОиР',
    disableNotifications: 'Отключить уведомления', notificationsError: 'Не удалось сохранить настройки уведомлений',
    profile: 'Мой кабинет', settings: 'Настройки', companySettings: 'Настройки компании',
    platformAdmin: 'Супер-админка', logout: 'Выход',
    switchCompanyError: 'Не удалось переключить компанию. Проверьте доступ.',
    statusLabel: 'Выберите статус', chooseCompany: 'Выберите компанию', chooseSystem: 'Перейти в систему',
    companyTools: 'Управление компанией', organization: 'Оргструктура', rights: 'Роли и доступы',
    billing: 'Тариф и оплата', adminOnly: 'Доступно администратору организации',
  },
  en: {
    account: 'Account', notifications: 'Notifications', noNotifications: 'No notifications yet',
    notificationInfo: 'Notification history will appear here when the activity feed is connected.',
    notificationSettings: 'Notification settings',
    online: 'Online', offline: 'Offline', visibility: 'Status', localStatus: 'For now this status is local; other users cannot see it.',
    company: 'Company', noCompanies: 'No available companies', system: 'System',
    portal: 'Portal', hrm: 'HRM', inventory: 'Inventory', mro: 'Maintenance',
    disableNotifications: 'Mute notifications', notificationsError: 'Notification settings could not be saved',
    profile: 'My workspace', settings: 'Settings', companySettings: 'Company settings',
    platformAdmin: 'Platform admin', logout: 'Sign out',
    switchCompanyError: 'Cannot switch company. Please check your access.',
    statusLabel: 'Choose your status', chooseCompany: 'Choose a company', chooseSystem: 'Go to system',
    companyTools: 'Company management', organization: 'Organization', rights: 'Roles and access',
    billing: 'Subscription and billing', adminOnly: 'Company administrator only',
  },
  ka: {
    account: 'ანგარიში', notifications: 'შეტყობინებები', noNotifications: 'შეტყობინებები ჯერ არ არის',
    notificationInfo: 'შეტყობინებების ისტორია გამოჩნდება მოვლენების ცენტრის ჩართვის შემდეგ.',
    notificationSettings: 'შეტყობინებების პარამეტრები',
    online: 'ონლაინ', offline: 'ოფლაინ', visibility: 'სტატუსი', localStatus: 'ეს ჯერ ლოკალური სტატუსია — სხვები მას ვერ ხედავენ.',
    company: 'კომპანია', noCompanies: 'ხელმისაწვდომი კომპანიები არ არის', system: 'სისტემა',
    portal: 'პორტალი', hrm: 'კადრები', inventory: 'ინვენტარიზაცია', mro: 'ტექნიკური მომსახურება',
    disableNotifications: 'შეტყობინებების გამორთვა', notificationsError: 'შეტყობინებების პარამეტრები ვერ შეინახა',
    profile: 'ჩემი კაბინეტი', settings: 'პარამეტრები', companySettings: 'კომპანიის პარამეტრები',
    platformAdmin: 'პლატფორმის ადმინისტრირება', logout: 'გასვლა',
    switchCompanyError: 'კომპანიის შეცვლა ვერ მოხერხდა. გადაამოწმეთ წვდომა.',
    statusLabel: 'აირჩიეთ სტატუსი', chooseCompany: 'აირჩიეთ კომპანია', chooseSystem: 'გადასვლა სისტემაში',
    companyTools: 'კომპანიის მართვა', organization: 'ორგანიზაცია', rights: 'როლები და წვდომა',
    billing: 'ტარიფი და გადახდა', adminOnly: 'მხოლოდ კომპანიის ადმინისტრატორისთვის',
  },
  kk: {
    account: 'Аккаунт', notifications: 'Хабарландырулар', noNotifications: 'Әзірге хабарландыру жоқ',
    notificationInfo: 'Оқиғалар орталығы қосылған соң хабарландырулар осы жерде көрсетіледі.',
    notificationSettings: 'Хабарландыру баптаулары',
    online: 'Желіде', offline: 'Желіден тыс', visibility: 'Күй', localStatus: 'Бұл әзірге жергілікті күй, оны басқа пайдаланушылар көрмейді.',
    company: 'Компания', noCompanies: 'Қолжетімді компания жоқ', system: 'Жүйе',
    portal: 'Портал', hrm: 'Кадрлар', inventory: 'Инвентарь', mro: 'ТҚжЖ',
    disableNotifications: 'Хабарландыруларды өшіру', notificationsError: 'Хабарландыру баптаулары сақталмады',
    profile: 'Менің кабинетім', settings: 'Баптаулар', companySettings: 'Компания баптаулары',
    platformAdmin: 'Платформа әкімшісі', logout: 'Шығу',
    switchCompanyError: 'Компанияны ауыстыру мүмкін болмады. Құқықтарды тексеріңіз.',
    statusLabel: 'Күйді таңдаңыз', chooseCompany: 'Компанияны таңдаңыз', chooseSystem: 'Жүйеге өту',
    companyTools: 'Компанияны басқару', organization: 'Ұйым құрылымы', rights: 'Рөлдер мен құқықтар',
    billing: 'Тариф және төлем', adminOnly: 'Тек компания әкімшісіне қолжетімді',
  },
}

export function useAccountMenuI18n() {
  const ui = useUiPreferencesStore()
  const locale = computed(() => ui.locale)
  const tr = (key: AccountMenuKey): string => copy[locale.value][key]
  return { tr, locale }
}
