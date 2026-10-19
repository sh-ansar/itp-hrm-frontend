<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import ProtectedLeaveEvidencePanel from '../components/ProtectedLeaveEvidencePanel.vue'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { useUiPreferencesStore } from '../stores/uiPreferences'
import { useLeaveWorkflowI18n } from '../i18n/leaveWorkflow'
import { useLeaveBalanceCopy } from '../i18n/leaveBalances'
import { getOwnLeaveBalances, type LeaveBalanceRow } from '../api/leaveBalances'
import { useUiFormatters } from '../composables/useUiFormatters'
import { getOwnWorkspace, getOwnTimesheet, getOwnDocuments, ownDocumentFileUrl, saveOwnLeave, transitionOwnLeave, type OwnDocument, type OwnTimesheetDay, type OwnWorkspace, type OwnRequest } from '../api/selfService'

const access = useCompanyAccessStore()
const ui = useUiPreferencesStore()
const { t } = useLeaveWorkflowI18n()
const { balanceT } = useLeaveBalanceCopy()
const fmt = useUiFormatters()
const connectedDocuments = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true' && import.meta.env.VITE_DEMO_MODE !== 'true'
const copy = computed(() => ({
  ru: ['Мой кабинет', 'Мои отпуска', 'Мои заявки', 'Подать заявку', 'Учётная запись не связана с сотрудником. Обратитесь к администратору компании.', 'Настройки', 'Нет отпусков', 'Компания', 'Предыдущая', 'Следующая'],
  kk: ['Менің кабинетім', 'Менің демалыстарым', 'Менің өтінімдерім', 'Өтінім беру', 'Тіркелгі қызметкермен байланыстырылмаған. Компания әкімшісіне хабарласыңыз.', 'Баптаулар', 'Демалыстар жоқ', 'Компания', 'Алдыңғы', 'Келесі'],
  en: ['My workspace', 'My leave', 'My requests', 'Request leave', 'Your account is not linked to an employee. Contact your company administrator.', 'Settings', 'No leave records', 'Company', 'Previous', 'Next'],
  ka: ['ჩემი კაბინეტი', 'ჩემი შვებულებები', 'ჩემი მოთხოვნები', 'მოთხოვნის გაგზავნა', 'ანგარიში თანამშრომელთან არ არის დაკავშირებული. მიმართეთ კომპანიის ადმინისტრატორს.', 'პარამეტრები', 'შვებულებები არ არის', 'კომპანია', 'წინა', 'შემდეგი'],
}[ui.locale]))
const workspace = ref<OwnWorkspace | null>(null)
const loading = ref(false), busy = ref(false), error = ref(''), success = ref('')
const open = ref(false), editing = ref<OwnRequest>()
const type = ref(''), start = ref(''), end = ref(''), note = ref('')
const requestsPage = ref(1), leavesPage = ref(1)
const ownTimesheetCopy = computed(() => ({
  ru: { title: 'Мой табель', month: 'Месяц', recorded: 'Дней с внесёнными часами', worked: 'Отработано', absence: 'Отсутствие', overtime: 'Сверхурочно', planned: 'План', date: 'Дата', type: 'Тип дня', noCalendar: 'Производственный календарь за этот месяц пока не заполнен.', partial: 'Календарь заполнен частично. Показаны только доступные даты.', noEntries: 'Фактические часы пока не внесены.', workday: 'Рабочий', weekend: 'Выходной', holiday: 'Праздничный', loading: 'Загружаем табель', hours: 'ч' },
  kk: { title: 'Менің табелім', month: 'Ай', recorded: 'Сағаты енгізілген күндер', worked: 'Жұмыс істелді', absence: 'Қатыспау', overtime: 'Үстеме жұмыс', planned: 'Жоспар', date: 'Күн', type: 'Күн түрі', noCalendar: 'Бұл айдың өндірістік күнтізбесі толтырылмаған.', partial: 'Күнтізбе толық емес. Тек қолжетімді күндер көрсетілді.', noEntries: 'Нақты сағаттар әлі енгізілмеген.', workday: 'Жұмыс күні', weekend: 'Демалыс', holiday: 'Мереке', loading: 'Табель жүктелуде', hours: 'сағ' },
  en: { title: 'My timesheet', month: 'Month', recorded: 'Days with recorded hours', worked: 'Worked', absence: 'Absence', overtime: 'Overtime', planned: 'Planned', date: 'Date', type: 'Day type', noCalendar: 'The production calendar is not yet filled for this month.', partial: 'The calendar is incomplete. Only available dates are shown.', noEntries: 'No actual hours have been recorded yet.', workday: 'Workday', weekend: 'Day off', holiday: 'Holiday', loading: 'Loading timesheet', hours: 'h' },
  ka: { title: 'ჩემი ტაბელი', month: 'თვე', recorded: 'დღეები აღრიცხული საათებით', worked: 'ნამუშევარი', absence: 'გაცდენა', overtime: 'ზეგანაკვეთური', planned: 'გეგმა', date: 'თარიღი', type: 'დღის ტიპი', noCalendar: 'ამ თვის სამუშაო კალენდარი ჯერ არ არის შევსებული.', partial: 'კალენდარი არასრულია. ნაჩვენებია არსებული თარიღები.', noEntries: 'ფაქტობრივი საათები ჯერ არ არის შეტანილი.', workday: 'სამუშაო', weekend: 'დასვენება', holiday: 'დღესასწაული', loading: 'ტაბელი იტვირთება', hours: 'სთ' },
}[ui.locale]))
const monthToday = new Date()
const timesheetMonth = ref(`${monthToday.getFullYear()}-${String(monthToday.getMonth() + 1).padStart(2, '0')}`)
const timesheetDays = ref<OwnTimesheetDay[]>([])
const timesheetLoading = ref(false)
const timesheetError = ref('')
let timesheetRequestGeneration = 0
const recordedTimesheetDays = computed(() => timesheetDays.value.filter(day =>
  day.worked_minutes !== null || day.absence_minutes !== null || day.overtime_minutes !== null))
const timesheetTotals = computed(() => recordedTimesheetDays.value.reduce((sum, day) => ({
  worked: sum.worked + (day.worked_minutes ?? 0),
  absence: sum.absence + (day.absence_minutes ?? 0),
  overtime: sum.overtime + (day.overtime_minutes ?? 0),
}), { worked: 0, absence: 0, overtime: 0 }))
const expectedDays = computed(() => {
  const [year, month] = timesheetMonth.value.split('-').map(Number)
  return year && month >= 1 && month <= 12 ? new Date(year, month, 0).getDate() : 0
})
function hours(minutes: number | null): string {
  if (minutes === null) return '—'
  const value = Math.round((minutes / 60) * 100) / 100
  const locale = ui.locale === 'en' ? 'en-US' : ui.locale === 'ka' ? 'ka-GE' : 'ru-RU'
  return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${ownTimesheetCopy.value.hours}`
}
function timesheetDayLabel(dayType: string): string {
  if (dayType === 'holiday') return ownTimesheetCopy.value.holiday
  if (dayType === 'weekend' || dayType === 'day_off') return ownTimesheetCopy.value.weekend
  if (dayType === 'workday') return ownTimesheetCopy.value.workday
  return dayType
}
async function loadOwnTimesheet() {
  const current = ++timesheetRequestGeneration
  timesheetDays.value = []
  timesheetError.value = ''
  if (!workspace.value?.data.employee || !access.activeCompanyId) { timesheetLoading.value = false; return }
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(timesheetMonth.value)) return
  timesheetLoading.value = true
  try {
    const response = await getOwnTimesheet(access.activeCompanyId, timesheetMonth.value)
    if (current === timesheetRequestGeneration) timesheetDays.value = response.data
  } catch (cause) {
    if (current === timesheetRequestGeneration) timesheetError.value = cause instanceof Error ? cause.message : t('failed')
  } finally {
    if (current === timesheetRequestGeneration) timesheetLoading.value = false
  }
}



const balanceYear = ref(String(new Date().getFullYear()))
const balanceYearOptions = Array.from({ length: 9 }, (_, index) => {
  const value = String(new Date().getFullYear() - 5 + index)
  return { id: value, name: value }
})
const ownBalances = ref<LeaveBalanceRow[]>([])
const balanceLoading = ref(false)
const balanceError = ref('')
let balanceGeneration = 0
async function loadOwnBalances(): Promise<void> {
  const current = ++balanceGeneration
  ownBalances.value = []
  balanceError.value = ''
  if (!connectedDocuments || !access.activeCompanyId || !workspace.value?.data.employee) {
    balanceLoading.value = false
    return
  }
  balanceLoading.value = true
  try {
    const result = await getOwnLeaveBalances(access.activeCompanyId, Number(balanceYear.value))
    if (current === balanceGeneration) ownBalances.value = result.data
  } catch (cause) {
    if (current === balanceGeneration) balanceError.value = cause instanceof Error ? cause.message : balanceT('failed')
  } finally {
    if (current === balanceGeneration) balanceLoading.value = false
  }
}
function readableBalance(value: number | null): string {
  return value === null ? balanceT('unknown') : `${value} ${balanceT('dayUnit')}`
}

const documentsCopy = computed(() => ({
  ru: { title: 'Мои документы', loading: 'Загружаем документы…', none: 'Документы пока не опубликованы для вас.', date: 'Дата', order: 'Приказ', contract: 'Трудовой договор', download: 'Скачать PDF', previous: 'Предыдущая', next: 'Следующая', page: 'Страница', refresh: 'Повторить' },
  kk: { title: 'Менің құжаттарым', loading: 'Құжаттар жүктелуде…', none: 'Сізге арналған құжаттар әзірге жарияланбаған.', date: 'Күні', order: 'Бұйрық', contract: 'Еңбек шарты', download: 'PDF жүктеу', previous: 'Алдыңғы', next: 'Келесі', page: 'Бет', refresh: 'Қайталау' },
  en: { title: 'My documents', loading: 'Loading documents…', none: 'No documents have been shared with you yet.', date: 'Date', order: 'Order', contract: 'Employment contract', download: 'Download PDF', previous: 'Previous', next: 'Next', page: 'Page', refresh: 'Retry' },
  ka: { title: 'ჩემი დოკუმენტები', loading: 'დოკუმენტები იტვირთება…', none: 'დოკუმენტები ჯერ არ არის თქვენთვის გაზიარებული.', date: 'თარიღი', order: 'ბრძანება', contract: 'შრომითი ხელშეკრულება', download: 'PDF ჩამოტვირთვა', previous: 'წინა', next: 'შემდეგი', page: 'გვერდი', refresh: 'ხელახლა' },
}[ui.locale]))
const ownDocuments = ref<OwnDocument[]>([])
const ownDocumentsPage = ref(1)
const ownDocumentsLastPage = ref(1)
const ownDocumentsLoading = ref(false)
const ownDocumentsError = ref('')
let documentsGeneration = 0
async function loadOwnDocuments(): Promise<void> {
  const current = ++documentsGeneration
  ownDocuments.value = []
  ownDocumentsError.value = ''
  if (!connectedDocuments || !access.activeCompanyId || !workspace.value?.data.employee) {
    ownDocumentsLoading.value = false
    return
  }
  ownDocumentsLoading.value = true
  try {
    const result = await getOwnDocuments(access.activeCompanyId, ownDocumentsPage.value)
    if (current === documentsGeneration) {
      ownDocuments.value = result.data
      ownDocumentsLastPage.value = result.meta.last_page
    }
  } catch (cause) {
    if (current === documentsGeneration) ownDocumentsError.value = cause instanceof Error ? cause.message : t('failed')
  } finally {
    if (current === documentsGeneration) ownDocumentsLoading.value = false
  }
}

let generation = 0
async function load() {
  const current = ++generation
  workspace.value = null; error.value = ''; loading.value = true
  try {
    const result = await getOwnWorkspace(access.activeCompanyId, requestsPage.value, leavesPage.value)
    if (current === generation) workspace.value = result
  } catch (cause) { if (current === generation) error.value = cause instanceof Error ? cause.message : t('failed') }
  finally { if (current === generation) loading.value = false }
}
watch(() => access.activeCompanyId, () => { open.value = false; requestsPage.value = 1; leavesPage.value = 1; void load() }, { immediate: true })
watch([requestsPage, leavesPage], () => void load())
watch([() => workspace.value?.data.employee?.id, () => access.activeCompanyId, timesheetMonth], () => void loadOwnTimesheet(), { immediate: true })
watch([() => workspace.value?.data.employee?.id, () => access.activeCompanyId], () => {
  ownDocumentsPage.value = 1
  void loadOwnDocuments()
}, { immediate: true })
watch(ownDocumentsPage, () => void loadOwnDocuments())
watch([() => workspace.value?.data.employee?.id, () => access.activeCompanyId, balanceYear],
  () => void loadOwnBalances(), { immediate: true })

function edit(request?: OwnRequest) {
  editing.value = request; type.value = request?.leave_type_id ?? ''
  start.value = request?.planned_started_on ?? ''; end.value = request?.planned_ended_on ?? ''; note.value = request?.note ?? ''
  error.value = ''; success.value = ''; open.value = true
}
async function perform(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try { await action(); open.value = false; await load(); if (!error.value) success.value = t('saved') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : t('failed') }
  finally { busy.value = false }
}
function save() {
  if (!type.value || !start.value || !end.value || end.value < start.value) { error.value = t('checkFields'); return }
  void perform(() => saveOwnLeave(access.activeCompanyId, { leave_type_id: type.value, planned_started_on: start.value, planned_ended_on: end.value, note: note.value || null }, editing.value))
}
function status(request: OwnRequest) {
  return t(request.status === 'submitted' ? 'awaiting' : request.status)
}
</script>

<template>
  <section class="own-workspace">
    <header><h1>{{ copy[0] }}</h1><RouterLink to="/settings">{{ copy[5] }}</RouterLink></header>
    <BaseSelectField v-if="access.companies.length > 1" :model-value="access.activeCompanyId" :label="copy[7] ?? ''"
      :options="access.companies.map(c => ({ id: c.company_id, name: c.company_name }))" @update:model-value="access.chooseCompany" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <p v-if="loading" role="status">{{ t('saving') }}</p>
    <BaseButton v-if="error && !open" variant="secondary" @click="load">{{ t('refresh') }}</BaseButton>
    <template v-if="workspace">
      <BaseNotice v-if="!workspace.data.employee">{{ copy[4] }}</BaseNotice>
      <template v-else>
        <BaseCard><h2>{{ workspace.data.employee.last_name }} {{ workspace.data.employee.first_name }} {{ workspace.data.employee.middle_name }}</h2>
          <p>{{ workspace.data.employee.personnel_number }} · {{ access.active?.company_name }}</p></BaseCard>
        <BaseCard>
          <header><h2>{{ copy[2] }}</h2><BaseButton v-if="workspace.meta.can_request" :disabled="busy || !workspace.data.leave_types.length" @click="edit()">{{ copy[3] }}</BaseButton></header>
          <BaseNotice v-if="workspace.meta.can_request && !workspace.data.leave_types.length">{{ t('noTypes') }}</BaseNotice>
          <p v-if="!workspace.data.requests.length">{{ t('noRequests') }}</p>
          <article v-for="request in workspace.data.requests" :key="request.id">
            <strong>{{ request.leave_type_name }}</strong><p>{{ request.planned_started_on }} — {{ request.planned_ended_on }} · {{ request.planned_days }} · {{ status(request) }}</p>
            <p v-if="request.note">{{ request.note }}</p><p v-if="request.decision_comment">{{ t('decisionComment') }}: {{ request.decision_comment }}</p>
            <ProtectedLeaveEvidencePanel v-if="request.category && request.category !== 'ordinary'"
              :company-id="access.activeCompanyId" :request="request"
              :can-upload="!!workspace.meta.protected_evidence_uploads_enabled && workspace.meta.can_request"
              :can-review="false" :required="!!workspace.meta.protected_evidence_required" @changed="load" />
            <div v-if="workspace.meta.can_request" class="actions">
              <BaseButton v-if="request.status === 'draft' && !request.evidence_status" variant="secondary" :disabled="busy" @click="edit(request)">{{ t('edit') }}</BaseButton>
              <BaseButton v-if="request.status === 'draft'" :disabled="busy" @click="perform(() => transitionOwnLeave(access.activeCompanyId, request, 'submit'))">{{ t('submit') }}</BaseButton>
              <BaseButton v-if="['draft', 'submitted'].includes(request.status)" variant="secondary" :disabled="busy" @click="perform(() => transitionOwnLeave(access.activeCompanyId, request, 'cancel'))">{{ t('cancel') }}</BaseButton>
            </div>
          </article>
          <div class="actions"><BaseButton :disabled="loading || requestsPage === 1" variant="secondary" @click="requestsPage--">{{ copy[8] }}</BaseButton>
            <span>{{ requestsPage }} / {{ workspace.meta.requests_last_page }}</span><BaseButton :disabled="loading || requestsPage >= workspace.meta.requests_last_page" variant="secondary" @click="requestsPage++">{{ copy[9] }}</BaseButton></div>
        </BaseCard>
        <BaseCard><h2>{{ copy[1] }}</h2><p v-if="!workspace.data.leaves.length">{{ copy[6] }}</p>
          <article v-for="leave in workspace.data.leaves" :key="leave.id"><strong>{{ leave.leave_type_name }}</strong>
            <p>{{ leave.planned_started_on }} — {{ leave.planned_ended_on }} · {{ leave.planned_days }}</p>
            <p v-if="leave.actual_started_on">{{ leave.actual_started_on }} — {{ leave.actual_ended_on ?? '…' }} · {{ leave.actual_days ?? '—' }}</p></article>
          <div class="actions"><BaseButton :disabled="loading || leavesPage === 1" variant="secondary" @click="leavesPage--">{{ copy[8] }}</BaseButton>
            <span>{{ leavesPage }} / {{ workspace.meta.leaves_last_page }}</span><BaseButton :disabled="loading || leavesPage >= workspace.meta.leaves_last_page" variant="secondary" @click="leavesPage++">{{ copy[9] }}</BaseButton></div>
        </BaseCard>


        <BaseCard v-if="connectedDocuments" class="own-balances">
          <header class="own-balances__header">
            <h2>{{ balanceT('mine') }}</h2>
            <BaseSelectField v-model="balanceYear" :label="balanceT('year')" :options="balanceYearOptions" />
          </header>
          <BaseNotice tone="info">{{ balanceT('noAuto') }}</BaseNotice>
          <BaseNotice v-if="balanceError" tone="error">{{ balanceError }}</BaseNotice>
          <BaseButton v-if="balanceError" variant="secondary" @click="loadOwnBalances">{{ balanceT('retry') }}</BaseButton>
          <p v-if="balanceLoading" role="status">{{ balanceT('loading') }}</p>
          <p v-else-if="!balanceError && !ownBalances.length">{{ balanceT('noTypes') }}</p>
          <div v-else-if="!balanceError" class="own-balances__types">
            <article v-for="row in ownBalances" :key="row.leave_type_id" class="own-balances__type">
              <header><strong>{{ row.leave_type_name }}</strong><span>{{ balanceT(row.state) }}</span></header>
              <p v-if="row.reference_annual_days !== null" class="own-balances__reference">
                {{ balanceT('reference') }}: {{ readableBalance(row.reference_annual_days) }}
              </p>
              <BaseNotice v-if="row.state === 'unconfigured'" tone="info">{{ balanceT('missingMessage') }}</BaseNotice>
              <BaseNotice v-else-if="row.state === 'calendar_incomplete'" tone="info">{{ balanceT('incompleteMessage') }}</BaseNotice>
              <BaseNotice v-else-if="row.state === 'closed'" tone="info">{{ balanceT('closedExplanation') }}</BaseNotice>
              <dl class="own-balances__figures">
                <div><dt>{{ balanceT('grant') }}</dt><dd>{{ readableBalance(row.granted_days) }}</dd></div>
                <div><dt>{{ balanceT('carry') }}</dt><dd>{{ readableBalance(row.carried_days) }}</dd></div>
                <div><dt>{{ balanceT('adjust') }}</dt><dd>{{ readableBalance(row.adjustment_days) }}</dd></div>
                <div><dt>{{ balanceT('booked') }}</dt><dd>{{ readableBalance(row.booked_days) }}</dd></div>
                <div><dt>{{ balanceT('pending') }}</dt><dd>{{ readableBalance(row.pending_days) }}</dd></div>
                <div class="own-balances__available">
                  <dt>{{ balanceT('available') }}</dt><dd>{{ readableBalance(row.available_days) }}</dd>
                </div>
                <div v-if="row.state === 'closed'">
                  <dt>{{ balanceT('closingSnapshot') }}</dt><dd>{{ readableBalance(row.closing_available_days) }}</dd>
                </div>
                <div v-if="row.state === 'closed'">
                  <dt>{{ balanceT('carriedOut') }}</dt><dd>{{ readableBalance(row.carried_out_days) }}</dd>
                </div>
              </dl>
            </article>
          </div>
        </BaseCard>
        <BaseCard v-if="connectedDocuments" class="personal-documents">
          <header><h2>{{ documentsCopy.title }}</h2></header>
          <BaseNotice v-if="ownDocumentsError" tone="error">{{ ownDocumentsError }}</BaseNotice>
          <BaseButton v-if="ownDocumentsError" variant="secondary" @click="loadOwnDocuments">{{ documentsCopy.refresh }}</BaseButton>
          <p v-if="ownDocumentsLoading" role="status">{{ documentsCopy.loading }}</p>
          <p v-else-if="!ownDocumentsError && !ownDocuments.length">{{ documentsCopy.none }}</p>
          <template v-else-if="!ownDocumentsError">
          <div v-for="document in ownDocuments" :key="document.id" class="personal-documents__row">
            <div class="personal-documents__details">
              <strong>{{ document.title }}</strong>
              <span>{{ document.document_type === 'contract' ? documentsCopy.contract : documentsCopy.order }}
                · {{ documentsCopy.date }}: {{ document.issued_on ? fmt.date(document.issued_on) : '—' }}</span>
            </div>
            <a :href="ownDocumentFileUrl(access.activeCompanyId, document.id)"
              class="personal-documents__download" download="document.pdf" rel="noreferrer">
              {{ documentsCopy.download }}
            </a>
          </div>
          </template>
          <div v-if="ownDocumentsLastPage > 1" class="actions">
            <BaseButton variant="secondary" :disabled="ownDocumentsLoading || ownDocumentsPage === 1"
              @click="ownDocumentsPage--">{{ documentsCopy.previous }}</BaseButton>
            <span>{{ documentsCopy.page }} {{ ownDocumentsPage }} / {{ ownDocumentsLastPage }}</span>
            <BaseButton variant="secondary" :disabled="ownDocumentsLoading || ownDocumentsPage >= ownDocumentsLastPage"
              @click="ownDocumentsPage++">{{ documentsCopy.next }}</BaseButton>
          </div>
        </BaseCard>
        <BaseCard class="own-timesheet">
          <header class="own-timesheet__header">
            <h2>{{ ownTimesheetCopy.title }}</h2>
            <BaseFormField v-model="timesheetMonth" type="month" :label="ownTimesheetCopy.month" />
          </header>
          <BaseNotice v-if="timesheetError" tone="error">{{ timesheetError }}</BaseNotice>
          <p v-if="timesheetLoading" role="status">{{ ownTimesheetCopy.loading }}</p>
          <template v-else-if="!timesheetError">
            <p v-if="!timesheetDays.length">{{ ownTimesheetCopy.noCalendar }}</p>
            <template v-else>
              <BaseNotice v-if="timesheetDays.length < expectedDays" tone="info">{{ ownTimesheetCopy.partial }}</BaseNotice>
              <p v-if="!recordedTimesheetDays.length">{{ ownTimesheetCopy.noEntries }}</p>
              <p v-else class="own-timesheet__summary">
                {{ ownTimesheetCopy.recorded }}: {{ recordedTimesheetDays.length }} ·
                {{ ownTimesheetCopy.worked }}: {{ hours(timesheetTotals.worked) }} ·
                {{ ownTimesheetCopy.absence }}: {{ hours(timesheetTotals.absence) }} ·
                {{ ownTimesheetCopy.overtime }}: {{ hours(timesheetTotals.overtime) }}
              </p>
              <div class="own-timesheet__scroll" tabindex="0" :aria-label="ownTimesheetCopy.title">
                <table class="own-timesheet__table">
                  <thead><tr>
                    <th scope="col">{{ ownTimesheetCopy.date }}</th>
                    <th scope="col">{{ ownTimesheetCopy.type }}</th>
                    <th scope="col">{{ ownTimesheetCopy.planned }}</th>
                    <th scope="col">{{ ownTimesheetCopy.worked }}</th>
                    <th scope="col">{{ ownTimesheetCopy.absence }}</th>
                    <th scope="col">{{ ownTimesheetCopy.overtime }}</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="day in timesheetDays" :key="day.date">
                      <td>{{ day.date }}</td>
                      <td>{{ timesheetDayLabel(day.day_type) }}<span v-if="day.label"> · {{ day.label }}</span></td>
                      <td>{{ hours(day.planned_minutes) }}</td>
                      <td>{{ hours(day.worked_minutes) }}</td>
                      <td>{{ hours(day.absence_minutes) }}</td>
                      <td>{{ hours(day.overtime_minutes) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </template>
        </BaseCard>
      </template>
    </template>
    <BaseDrawer :open="open" :title="copy[3] ?? ''" @close="!busy && (open = false)">
      <form id="own-leave-form" class="own-form" @submit.prevent="save">
        <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
        <BaseSelectField v-model="type" :label="t('type')" :options="workspace?.data.leave_types ?? []" :required="true" :disabled="busy" :placeholder="t('type')" />
        <BaseFormField v-model="start" :label="t('start')" type="date" required :disabled="busy" />
        <BaseFormField v-model="end" :label="t('end')" type="date" required :disabled="busy" />
        <BaseFormField v-model="note" :label="t('reason')" :disabled="busy" />
        <p>{{ t('help') }}</p>
      </form>
      <template #footer><BaseButton variant="secondary" :disabled="busy" @click="open = false">{{ t('close') }}</BaseButton>
        <BaseButton type="submit" form="own-leave-form" :disabled="busy">{{ editing ? t('updateDraft') : t('saveDraft') }}</BaseButton></template>
    </BaseDrawer>
  </section>
</template>
<style scoped>
.own-workspace,.own-form{display:grid;gap:var(--space-4);min-width:0}
header,.actions{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}
h1,h2,p{overflow-wrap:anywhere}h2{font-size:var(--font-body-size)}
article{padding:var(--space-4) 0;border-top:1px solid var(--color-stroke)}
.actions{justify-content:flex-start}a{color:var(--color-primary)}

.own-balances__header{display:flex;align-items:end;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}
.own-balances__header h2{margin:0}
.own-balances__header :deep(.base-select-field){width:165px}
.own-balances__types{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:var(--space-3)}
.own-balances__type{display:grid;align-content:start;gap:var(--space-3);min-width:0;padding:var(--space-4);border:1px solid var(--color-stroke);border-radius:var(--radius-md)}
.own-balances__type>header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
.own-balances__type>header span,.own-balances__reference{font-size:var(--font-caption-size);color:var(--color-muted)}
.own-balances__figures{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3);margin:0}
.own-balances__figures div{display:grid;gap:var(--space-1);min-width:0;padding:var(--space-3);background:var(--color-soft);border-radius:var(--radius-sm)}
.own-balances__figures dt{font-size:var(--font-caption-size);color:var(--color-muted)}
.own-balances__figures dd{margin:0;font-weight:650;overflow-wrap:anywhere}
.own-balances__available{border:1px solid var(--color-stroke)}
@media(max-width:580px){.own-balances__header :deep(.base-select-field){width:100%}}
.personal-documents__row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;border-top:1px solid var(--color-stroke);padding:var(--space-4) 0}
.personal-documents__details{display:grid;gap:var(--space-1);min-width:0;overflow-wrap:anywhere}
.personal-documents__details span{font-size:var(--font-caption-size);color:var(--color-muted)}
.personal-documents__download{display:inline-flex;min-height:var(--control-height);align-items:center;padding:var(--space-2) var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);font-weight:600;text-decoration:none}
.personal-documents__download:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.own-timesheet__header{align-items:flex-end}
.own-timesheet__header .field{min-width:145px}
.own-timesheet__summary{font-weight:500}
.own-timesheet__scroll{max-width:100%;overflow-x:auto}
.own-timesheet__table{width:100%;min-width:620px;border-collapse:collapse;font-size:var(--font-caption-size)}
.own-timesheet__table th,.own-timesheet__table td{padding:var(--space-3);border:1px solid var(--color-stroke);text-align:left;vertical-align:top}
.own-timesheet__table th{font-weight:600;background:var(--color-surface-raised)}
.own-timesheet__table td:not(:nth-child(2)){white-space:nowrap}

</style>