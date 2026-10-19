import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

/** Shared translations for the HR registry and mobile document controls. */
export function useDocumentSharingCopy() {
  const ui = useUiPreferencesStore()
  const sharing = computed(() => ({
    ru: {
      access: 'Доступ сотрудника', available: 'Доступен сотруднику', private: 'Закрыт',
      share: 'Поделиться', revoke: 'Отозвать доступ', title: 'Доступ сотрудника к PDF',
      revokeMessage: 'Доступ сотрудника к PDF отозван.', sharedMessage: 'PDF теперь доступен сотруднику в личном кабинете.',
      revokeQuestion: 'Отозвать доступ к файлу? Сотрудник больше не сможет скачать этот PDF, но документ останется в приватном архиве HR.',
      shareQuestion: 'Поделиться PDF с сотрудником? Проверьте содержимое документа: после подтверждения сотрудник сможет скачать его из личного кабинета. Это не является электронной подписью.',
      notice: 'Доступ предоставляется только сотруднику, связанному с кадровой записью, и фиксируется в журнале действий.',
      cancel: 'Отмена',
    },
    kk: {
      access: 'Қызметкерге қолжетімділік', available: 'Қызметкерге ашық', private: 'Жабық',
      share: 'Бөлісу', revoke: 'Қолжетімділікті қайтару', title: 'Қызметкердің PDF файлына қолжетімділігі',
      revokeMessage: 'Қызметкердің PDF файлына қолжетімділігі қайтарылды.', sharedMessage: 'PDF енді қызметкердің жеке кабинетінде қолжетімді.',
      revokeQuestion: 'Файлға қолжетімділікті қайтару керек пе? Қызметкер оны енді жүктей алмайды, ал құжат HR мұрағатында сақталады.',
      shareQuestion: 'PDF файлын қызметкерге ашу керек пе? Құжат мазмұнын тексеріңіз: растағаннан кейін қызметкер оны жеке кабинетінен жүктей алады. Бұл электрондық қолтаңба емес.',
      notice: 'Қолжетімділік тек кадрлық жазбаға байланыстырылған қызметкерге беріледі және әрекет журналға тіркеледі.',
      cancel: 'Болдырмау',
    },
    en: {
      access: 'Employee access', available: 'Shared with employee', private: 'Private',
      share: 'Share', revoke: 'Revoke access', title: 'Employee PDF access',
      revokeMessage: 'Employee access to the PDF has been revoked.', sharedMessage: 'The PDF is now available in the employee workspace.',
      revokeQuestion: 'Revoke file access? The employee can no longer download this PDF. It remains in the private HR archive.',
      shareQuestion: 'Share this PDF with the employee? Review its contents: once confirmed, the employee can download it from their workspace. This does not constitute an electronic signature.',
      notice: 'Access is limited to the employee explicitly linked to the personnel record and the action is audited.',
      cancel: 'Cancel',
    },
    ka: {
      access: 'თანამშრომლის წვდომა', available: 'გაზიარებულია თანამშრომელთან', private: 'დახურული',
      share: 'გაზიარება', revoke: 'წვდომის გაუქმება', title: 'თანამშრომლის წვდომა PDF-ზე',
      revokeMessage: 'თანამშრომლის წვდომა PDF-ზე გაუქმებულია.', sharedMessage: 'PDF ახლა ხელმისაწვდომია თანამშრომლის პირად კაბინეტში.',
      revokeQuestion: 'გაუქმდეს ფაილზე წვდომა? თანამშრომელი ვეღარ ჩამოტვირთავს PDF-ს, მაგრამ დოკუმენტი HR-ის კერძო არქივში დარჩება.',
      shareQuestion: 'გაუზიაროთ PDF თანამშრომელს? შეამოწმეთ შიგთავსი: დადასტურების შემდეგ თანამშრომელი შეძლებს მის ჩამოტვირთვას საკუთარი კაბინეტიდან. ეს არ წარმოადგენს ელექტრონულ ხელმოწერას.',
      notice: 'წვდომა ენიჭება მხოლოდ შესაბამის საკადრო ჩანაწერთან დაკავშირებულ თანამშრომელს და აღირიცხება ჟურნალში.',
      cancel: 'გაუქმება',
    },
  }[ui.locale]))
  return { sharing }
}
