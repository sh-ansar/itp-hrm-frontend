import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

const copy = {
  ru: { action: 'Отменить утверждённый отпуск', reason: 'Причина отмены', hint: 'Можно отменить только будущий отпуск без фактического табеля и закрытых периодов. История сохранится, дни вернутся в остаток.', confirm: 'Подтвердить отмену', done: 'Отпуск отменён. График и остаток обновлены.', invalid: 'Укажите причину от 5 до 500 символов.' },
  kk: { action: 'Бекітілген демалысты болдырмау', reason: 'Болдырмау себебі', hint: 'Нақты табелі және жабық кезеңдері жоқ болашақ демалысты ғана болдырмауға болады. Тарих сақталып, күндер қалдыққа қайтарылады.', confirm: 'Болдырмауды растау', done: 'Демалыс болдырылмады. Кесте мен қалдық жаңартылды.', invalid: '5–500 таңбадан тұратын себепті көрсетіңіз.' },
  en: { action: 'Cancel approved leave', reason: 'Cancellation reason', hint: 'Only future leave without recorded attendance or closed periods can be cancelled. History is retained and days are returned to the balance.', confirm: 'Confirm cancellation', done: 'Leave cancelled. Schedule and balance refreshed.', invalid: 'Enter a reason of 5–500 characters.' },
  ka: { action: 'დამტკიცებული შვებულების გაუქმება', reason: 'გაუქმების მიზეზი', hint: 'გაუქმება შესაძლებელია მხოლოდ მომავალი შვებულებისთვის, ფაქტობრივი ტაბელისა და დახურული პერიოდების გარეშე. ისტორია შენარჩუნდება და დღეები ნაშთში დაბრუნდება.', confirm: 'გაუქმების დადასტურება', done: 'შვებულება გაუქმდა. განრიგი და ნაშთი განახლდა.', invalid: 'მიუთითეთ მიზეზი 5–500 სიმბოლოთი.' },
}
export function useLeaveReversalI18n() {
  const ui = useUiPreferencesStore()
  return computed(() => copy[ui.locale] ?? copy.ru)
}
