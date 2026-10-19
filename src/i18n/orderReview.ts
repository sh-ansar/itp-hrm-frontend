import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

const copies = {
  ru: {
    draft: 'Черновик', submitted: 'На согласовании', approved: 'Согласован', rejected: 'Отклонён',
    submit: 'Отправить приказ', approve: 'Согласовать', reject: 'Отклонить',
    title: 'Согласование приказа', reason: 'Причина отклонения',
    notice: 'Внутреннее согласование PDF, а не электронная подпись или выполнение кадрового действия.',
    submitQuestion: 'Передать приказ независимому администратору для проверки?',
    approveQuestion: 'Подтвердить проверку приказа? После этого PDF можно отдельно открыть сотруднику.',
    rejectQuestion: 'Отклонить приказ? Для исправления потребуется новый черновик.',
    missing: 'Для отправки необходимы номер, дата приказа и прикреплённый PDF.',
    rejectionReason: 'Укажите причину не короче 5 символов.',
    confirmed: 'Статус приказа сохранён.', failed: 'Не удалось обновить приказ.',
    stale: 'Приказ изменён. Обновите реестр.',
    cancel: 'Отмена', confirm: 'Подтвердить', saving: 'Сохраняем…',
    legacy: 'Старому документу требуется отдельная проверка автора.',
  },
  kk: {
    draft: 'Жоба', submitted: 'Келісуде', approved: 'Келісілген', rejected: 'Қабылданбады',
    submit: 'Бұйрықты жіберу', approve: 'Келісу', reject: 'Қабылдамау',
    title: 'Бұйрықты келісу', reason: 'Қабылдамау себебі',
    notice: 'PDF файлын ішкі келісу, электрондық қолтаңба немесе кадрлық әрекетті орындау емес.',
    submitQuestion: 'Бұйрықты тәуелсіз әкімшіге тексеруге жіберу керек пе?',
    approveQuestion: 'Бұйрықты тексеруді растау керек пе? Кейін PDF қызметкерге бөлек беріледі.',
    rejectQuestion: 'Бұйрықты қабылдамау керек пе? Жаңа жоба қажет.',
    missing: 'Жіберу үшін нөмірі, күні және PDF файлы қажет.',
    rejectionReason: 'Кемінде 5 таңбалы себеп енгізіңіз.',
    confirmed: 'Бұйрық мәртебесі сақталды.', failed: 'Бұйрық жаңартылмады.',
    stale: 'Бұйрық өзгерді. Тізімді жаңартыңыз.',
    cancel: 'Болдырмау', confirm: 'Растау', saving: 'Сақталуда…',
    legacy: 'Ескі құжат авторын бөлек тексеру қажет.',
  },
  en: {
    draft: 'Draft', submitted: 'Awaiting review', approved: 'Reviewed', rejected: 'Rejected',
    submit: 'Submit order', approve: 'Approve review', reject: 'Reject order',
    title: 'Order review', reason: 'Rejection reason',
    notice: 'Internal PDF review only; not an e-signature or execution of a personnel action.',
    submitQuestion: 'Submit the order for independent administrator review?',
    approveQuestion: 'Confirm the review? The PDF can then be shared separately with the employee.',
    rejectQuestion: 'Reject the order? A new draft will be required.',
    missing: 'An order number, date and attached PDF are required to submit.',
    rejectionReason: 'Enter a reason at least 5 characters long.',
    confirmed: 'Review status saved.', failed: 'Could not update the order.',
    stale: 'The order has changed. Reload the list.',
    cancel: 'Cancel', confirm: 'Confirm', saving: 'Saving…',
    legacy: 'Older records require a separate author reconciliation.',
  },
  ka: {
    draft: 'მონახაზი', submitted: 'განხილვაშია', approved: 'შეთანხმებულია', rejected: 'უარყოფილია',
    submit: 'ბრძანების გაგზავნა', approve: 'დადასტურება', reject: 'უარყოფა',
    title: 'ბრძანების განხილვა', reason: 'უარყოფის მიზეზი',
    notice: 'PDF-ის შიდა განხილვაა და არა ელექტრონული ხელმოწერა ან საკადრო მოქმედება.',
    submitQuestion: 'გავაგზავნოთ ბრძანება დამოუკიდებელ ადმინისტრატორთან?',
    approveQuestion: 'დადასტურდეს შემოწმება? შემდეგ PDF ცალკე გადაეცემა თანამშრომელს.',
    rejectQuestion: 'უარვყოთ ბრძანება? საჭირო იქნება ახალი მონახაზი.',
    missing: 'საჭიროა ნომერი, თარიღი და მიმაგრებული PDF.',
    rejectionReason: 'მიუთითეთ მინიმუმ 5-სიმბოლოიანი მიზეზი.',
    confirmed: 'სტატუსი შენახულია.', failed: 'ბრძანება ვერ განახლდა.',
    stale: 'ბრძანება შეიცვალა. განაახლეთ სია.',
    cancel: 'გაუქმება', confirm: 'დადასტურება', saving: 'ინახება…',
    legacy: 'ძველი ჩანაწერის ავტორის ცალკე შემოწმებაა საჭირო.',
  },
}
export function useOrderReviewCopy() {
  const ui = useUiPreferencesStore()
  return { orderCopy: computed(() => copies[ui.locale]) }
}
