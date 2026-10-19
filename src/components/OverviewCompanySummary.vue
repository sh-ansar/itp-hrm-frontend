<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight, UsersRound } from 'lucide-vue-next'
import { useUiPreferencesStore } from '../stores/uiPreferences'

interface LatestPersonnelEvent {
  id: string
  fullName: string
  kind: string
  effectiveOn: string
}
const props = defineProps<{
  companyName: string
  activeCount: number | null
  totalCount: number | null
  activeShare: number | null
  journalAvailable: boolean
  recentEvents: LatestPersonnelEvent[]
}>()
const ui = useUiPreferencesStore()
const strings = {
  ru: {
    title: 'Сводка компании',
    staff: 'Сотрудников в штате',
    total: 'записей в кадровом реестре',
    activity: 'Последнее кадровое событие',
    empty: 'Проведённых кадровых действий пока нет',
    hire: 'Приём',
    transfer: 'Перевод',
    termination: 'Увольнение',
    open: 'Открыть реестр',
    journal: 'Открыть журнал',
  },
  kk: {
    title: 'Компания шолуы',
    staff: 'Штаттағы қызметкерлер',
    total: 'кадрлық тізілімдегі жазба',
    activity: 'Соңғы кадрлық оқиға',
    empty: 'Әзірге кадрлық әрекеттер жоқ',
    hire: 'Қабылдау',
    transfer: 'Ауыстыру',
    termination: 'Жұмыстан шығару',
    open: 'Тізілімді ашу',
    journal: 'Журналды ашу',
  },
  en: {
    title: 'Company overview',
    staff: 'Active employees',
    total: 'records in the employee register',
    activity: 'Latest personnel event',
    empty: 'No recorded personnel actions yet',
    hire: 'Hire',
    transfer: 'Transfer',
    termination: 'Termination',
    open: 'Open register',
    journal: 'Open action log',
  },
  ka: {
    title: 'კომპანიის მიმოხილვა',
    staff: 'შტატში მყოფი თანამშრომლები',
    total: 'ჩანაწერი საკადრო რეესტრში',
    activity: 'ბოლო საკადრო მოვლენა',
    empty: 'საკადრო მოქმედებები ჯერ არ არის',
    hire: 'მიღება',
    transfer: 'გადაყვანა',
    termination: 'გათავისუფლება',
    open: 'რეესტრის გახსნა',
    journal: 'ჟურნალის გახსნა',
  },
} as const
const copy = computed(() => strings[ui.locale])
const headcount = computed(() =>
  props.activeCount === null ? '—' : new Intl.NumberFormat(ui.locale === 'kk' ? 'kk-KZ'
    : ui.locale === 'ka' ? 'ka-GE' : ui.locale === 'en' ? 'en-US' : 'ru-RU')
    .format(props.activeCount))
const total = computed(() => props.totalCount === null ? '—'
  : String(props.totalCount))
const share = computed(() => props.activeShare === null || !Number.isFinite(props.activeShare)
  ? null : Math.max(0, Math.min(100, Math.round(props.activeShare))))
const latest = computed(() => props.recentEvents[0] ?? null)
const actionText = computed(() => latest.value?.kind === 'hire' ? copy.value.hire
  : latest.value?.kind === 'transfer' ? copy.value.transfer
    : latest.value?.kind === 'termination' ? copy.value.termination : '')
</script>

<template>
  <aside class="overview-summary" :aria-label="copy.title">
    <div class="overview-summary__heading">
      <div class="overview-summary__titles">
        <p>{{ companyName || 'HRM' }}</p>
        <h2>{{ copy.title }}</h2>
      </div>
      <RouterLink to="/employees" class="overview-summary__open" :title="copy.open" :aria-label="copy.open">
        <ArrowUpRight :size="17" aria-hidden="true" />
      </RouterLink>
    </div>
    <RouterLink class="overview-summary__headcount" to="/employees">
      <span class="overview-summary__staff-icon"><UsersRound :size="18" aria-hidden="true" /></span>
      <strong>{{ headcount }}</strong>
      <span>{{ copy.staff }}</span>
    </RouterLink>
    <p class="overview-summary__total">{{ total }} {{ copy.total }}
      <span v-if="share !== null" class="overview-summary__share">{{ share }}%</span>
    </p>
    <div v-if="journalAvailable" class="overview-summary__event">
      <span class="overview-summary__event-heading">{{ copy.activity }}</span>
      <RouterLink v-if="latest" to="/personnel-actions" class="overview-summary__event-link">
        <span>{{ actionText }}</span>
        <strong>{{ latest.fullName }}</strong>
        <small>{{ latest.effectiveOn }}</small>
        <ArrowUpRight :size="14" aria-hidden="true" />
      </RouterLink>
      <p v-else>{{ copy.empty }}</p>
    </div>
  </aside>
</template>

<style scoped>
.overview-summary{
  min-width:0;display:grid;align-content:start;gap:10px;padding:13px;
  border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-card);
}
.overview-summary__heading{display:flex;align-items:start;justify-content:space-between;gap:8px}
.overview-summary__titles{min-width:0;display:grid;gap:4px}
.overview-summary__titles p{
  color:var(--color-muted);font-size:11px;line-height:15px;margin:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.overview-summary__titles h2{margin:0;color:var(--color-text);font-size:13px;line-height:19px;font-weight:650}
.overview-summary__open{
  display:grid;place-items:center;width:29px;height:29px;flex:none;
  border:1px solid var(--color-stroke);border-radius:50%;color:var(--color-primary);
  text-decoration:none;
}
.overview-summary__open:hover{border-color:var(--color-primary-stroke)}
.overview-summary__headcount{
  display:flex;align-items:center;gap:8px;min-width:0;
  text-decoration:none;color:var(--color-text);
}
.overview-summary__headcount strong{font-size:24px;line-height:28px;font-weight:700;font-variant-numeric:tabular-nums}
.overview-summary__headcount span:last-child{
  color:var(--color-muted);font-size:11px;line-height:16px;overflow-wrap:anywhere;
}
.overview-summary__staff-icon{
  display:grid;place-items:center;width:29px;height:29px;flex:none;
  border-radius:8px;background:var(--color-accent-soft);color:var(--color-primary);
}
.overview-summary__total{margin:0;color:var(--color-muted);font-size:11px;line-height:17px}
.overview-summary__share{
  display:inline-block;margin-left:5px;padding:1px 6px;border-radius:12px;
  background:var(--color-success-surface);color:var(--color-success);font-variant-numeric:tabular-nums;
}
.overview-summary__event{display:grid;gap:6px;border-top:1px solid var(--color-stroke);padding-top:9px;min-width:0}
.overview-summary__event-heading{font-size:11px;font-weight:600;color:var(--color-muted)}
.overview-summary__event-link{
  display:grid;grid-template-columns:1fr auto;column-gap:7px;min-width:0;
  color:var(--color-text);text-decoration:none;font-size:11px;line-height:17px;
}
.overview-summary__event-link>span{font-weight:650;color:var(--color-primary)}
.overview-summary__event-link strong{
  grid-column:1;min-width:0;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.overview-summary__event-link small{grid-column:1;color:var(--color-muted);font-size:10px}
.overview-summary__event-link svg{grid-column:2;grid-row:1 / 4;align-self:center;color:var(--color-primary)}
.overview-summary__event p{color:var(--color-muted);font-size:11px;margin:0}
.overview-summary :is(a):focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
@media(max-width:1390px){
  .overview-summary{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}
  .overview-summary__heading{grid-row:1 / 3}
  .overview-summary__headcount{grid-column:2;grid-row:1}
  .overview-summary__total{grid-column:2;grid-row:2}
  .overview-summary__event{grid-column:1 / -1}
}
@media(max-width:620px){
  .overview-summary{grid-template-columns:1fr}
  .overview-summary__heading,.overview-summary__headcount,.overview-summary__total,.overview-summary__event{
    grid-column:1;grid-row:auto;
  }
}
</style>
