import { useUiPreferencesStore, type UiLocale } from '../stores/uiPreferences'

type CategoryKey = 'category' | 'ordinary' | 'maternity' | 'childcare' | 'medical' | 'hint'

const labels: Record<UiLocale, Record<CategoryKey, string>> = {
  ru: {
    category: 'Категория отсутствия',
    ordinary: 'Обычный отпуск',
    maternity: 'Беременность и роды',
    childcare: 'Уход за ребёнком',
    medical: 'Временная нетрудоспособность',
    hint: 'Для защищённых отпусков используется подсчёт календарных дней. Конкретные сроки и основания определяет кадровая политика организации и применимое законодательство.',
  },
  kk: {
    category: 'Болмау санаты',
    ordinary: 'Жыл сайынғы еңбек демалысы',
    maternity: 'Жүктілік және босану',
    childcare: 'Бала күтімі',
    medical: 'Уақытша еңбекке жарамсыздық',
    hint: 'Қорғалатын демалыстар күнтізбелік күндермен есептеледі. Мерзімдер мен негіздер ұйымның кадр саясатына және қолданыстағы заңнамаға байланысты.',
  },
  en: {
    category: 'Absence category',
    ordinary: 'Ordinary leave',
    maternity: 'Maternity leave',
    childcare: 'Childcare leave',
    medical: 'Medical leave',
    hint: 'Protected leave is counted in calendar days. The actual duration and supporting requirements follow company policy and applicable law.',
  },
  ka: {
    category: 'არყოფნის კატეგორია',
    ordinary: 'ჩვეულებრივი შვებულება',
    maternity: 'დეკრეტული შვებულება',
    childcare: 'ბავშვის მოვლის შვებულება',
    medical: 'ავადმყოფობის შვებულება',
    hint: 'დაცული შვებულება კალენდარული დღეებით ითვლება. ვადები და საფუძვლები განისაზღვრება ორგანიზაციის წესებითა და მოქმედი კანონმდებლობით.',
  },
}

export function useLeaveCategoryI18n() {
  const ui = useUiPreferencesStore()
  return { ct: (key: CategoryKey): string => labels[ui.locale][key] }
}
