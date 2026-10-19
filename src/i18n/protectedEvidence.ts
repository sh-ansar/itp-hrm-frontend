import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

const messages = {
  ru: {
    title: 'Подтверждающий документ', noFile: 'Документ пока не прикреплён',
    pending: 'Ожидает проверки HR', verified: 'Проверен кадровой службой',
    rejected: 'Отклонён — прикрепите исправленный PDF', upload: 'Прикрепить PDF',
    replacing: 'Заменить PDF', uploadBusy: 'Загрузка…', download: 'Скачать защищённый PDF',
    verify: 'Подтвердить проверку', reject: 'Отклонить документ', reason: 'Причина отклонения',
    help: 'Только PDF до 5 МБ. Документ доступен автору заявления и кадровой службе, но не руководителю подразделения.',
    required: 'Для утверждения этой категории HR должен проверить PDF.',
    changed: 'Документ обновлён. Данные заявления обновлены.',
    reviewed: 'Результат проверки сохранён.', failed: 'Не удалось обработать документ.',
    noReason: 'Укажите причину отклонения.',
  },
  kk: {
    title: 'Растайтын құжат', noFile: 'Құжат әлі тіркелмеген',
    pending: 'HR тексеруін күтуде', verified: 'Кадр қызметі тексерді',
    rejected: 'Қабылданбады — түзетілген PDF тіркеңіз', upload: 'PDF тіркеу',
    replacing: 'PDF ауыстыру', uploadBusy: 'Жүктелуде…', download: 'Қорғалған PDF жүктеу',
    verify: 'Тексеруді растау', reject: 'Құжатты қабылдамау', reason: 'Қабылдамау себебі',
    help: 'Тек 5 МБ дейін PDF. Құжат өтініш авторына және кадр қызметіне ғана қолжетімді.',
    required: 'Бұл санатты бекіту үшін HR PDF құжатын тексеруі қажет.',
    changed: 'Құжат жаңартылды. Өтініш деректері жаңартылды.',
    reviewed: 'Тексеру нәтижесі сақталды.', failed: 'Құжатты өңдеу мүмкін болмады.',
    noReason: 'Қабылдамау себебін енгізіңіз.',
  },
  en: {
    title: 'Supporting document', noFile: 'No document attached',
    pending: 'Awaiting HR review', verified: 'Verified by HR',
    rejected: 'Rejected — upload a corrected PDF', upload: 'Attach PDF',
    replacing: 'Replace PDF', uploadBusy: 'Uploading…', download: 'Download private PDF',
    verify: 'Verify document', reject: 'Reject document', reason: 'Rejection reason',
    help: 'PDF only, up to 5 MB. Accessible to the applicant and HR, not department managers.',
    required: 'HR must verify the PDF before this category can be approved.',
    changed: 'Document updated. Request data refreshed.',
    reviewed: 'Review decision saved.', failed: 'Could not process the document.',
    noReason: 'Enter a rejection reason.',
  },
  ka: {
    title: 'დამადასტურებელი დოკუმენტი', noFile: 'დოკუმენტი არ არის ატვირთული',
    pending: 'ელოდება HR-ის შემოწმებას', verified: 'შემოწმებულია HR-ის მიერ',
    rejected: 'უარყოფილია — ატვირთეთ შესწორებული PDF', upload: 'PDF მიმაგრება',
    replacing: 'PDF შეცვლა', uploadBusy: 'იტვირთება…', download: 'კერძო PDF-ის ჩამოტვირთვა',
    verify: 'შემოწმების დადასტურება', reject: 'დოკუმენტის უარყოფა', reason: 'უარყოფის მიზეზი',
    help: 'მხოლოდ PDF, მაქსიმუმ 5 MB. ხელმისაწვდომია განმცხადებლისა და HR-ისთვის.',
    required: 'ამ კატეგორიის დამტკიცებამდე HR-მა უნდა შეამოწმოს PDF.',
    changed: 'დოკუმენტი განახლებულია. განაცხადის მონაცემები განახლდა.',
    reviewed: 'შემოწმების შედეგი შენახულია.', failed: 'დოკუმენტის დამუშავება ვერ მოხერხდა.',
    noReason: 'მიუთითეთ უარყოფის მიზეზი.',
  },
}
export function useProtectedEvidenceCopy() {
  const ui = useUiPreferencesStore()
  return { evidenceCopy: computed(() => messages[ui.locale]) }
}
