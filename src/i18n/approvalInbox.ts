import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

const translations = {
  ru: {
    title: 'Ожидают согласования', caption: 'Заявки и приказы вашей компании',
    leaves: 'Отпуска', bonuses: 'Премии', orders: 'Приказы',
    view: 'Перейти', refresh: 'Обновить', loading: 'Загрузка…',
    partial: 'Не все данные доступны. Проверьте права или обновите сводку.',
    none: 'Доступных очередей согласования нет.',
  },
  kk: {
    title: 'Келісуді күтуде', caption: 'Компанияның өтініштері мен бұйрықтары',
    leaves: 'Демалыстар', bonuses: 'Сыйақылар', orders: 'Бұйрықтар',
    view: 'Өту', refresh: 'Жаңарту', loading: 'Жүктелуде…',
    partial: 'Барлық деректер қолжетімді емес. Құқықтарыңызды тексеріңіз немесе жаңартыңыз.',
    none: 'Қолжетімді келісу кезегі жоқ.',
  },
  en: {
    title: 'Awaiting review', caption: 'Requests and orders in your company',
    leaves: 'Leave', bonuses: 'Bonuses', orders: 'Orders',
    view: 'Open', refresh: 'Refresh', loading: 'Loading…',
    partial: 'Some data could not be loaded. Check access or refresh.',
    none: 'No accessible approval queues.',
  },
  ka: {
    title: 'ელოდება განხილვას', caption: 'თქვენი კომპანიის განაცხადები და ბრძანებები',
    leaves: 'შვებულებები', bonuses: 'პრემიები', orders: 'ბრძანებები',
    view: 'გახსნა', refresh: 'განახლება', loading: 'იტვირთება…',
    partial: 'ზოგი მონაცემი მიუწვდომელია. შეამოწმეთ უფლებები ან განაახლეთ.',
    none: 'განხილვის ხელმისაწვდომი რიგები არ არის.',
  },
}
export function useApprovalInboxCopy() {
  const ui = useUiPreferencesStore()
  return { inboxCopy: computed(() => translations[ui.locale]) }
}
