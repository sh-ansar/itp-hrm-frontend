<script setup lang="ts">
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, CircleDollarSign, FolderTree, Pencil, Plus, UsersRound } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import OrgStaffingNav from '../components/OrgStaffingNav.vue'
import StaffingLineForm from '../components/StaffingLineForm.vue'
import StaffingMobileList from '../components/StaffingMobileList.vue'
import StaffingPlanForm from '../components/StaffingPlanForm.vue'
import { localTodayISO } from '../utils/localDate'
import { downloadCsv } from '../utils/exportCsv'
import { useUiFormatters } from '../composables/useUiFormatters'
import { preferredStaffingPlan } from '../utils/staffingPlanChoice'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  approveStaffingPlan,
  listStaffingHistory,
  type StaffingHistoryEvent,
  getStaffingPlan,
  listStaffingPlans,
  type StaffingPlanDetailResponse,
  type StaffingPlanLine,
  type StaffingPlanRecord,
} from '../api/staffing'

const { tr } = useWorkspaceI18n()

const route = useRoute()
const router = useRouter()
const fmt = useUiFormatters()
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const plans = ref<StaffingPlanRecord[]>([])
const historyRows = ref<StaffingHistoryEvent[]>([])
const historyPage = ref(1)
const historyTotal = ref(0)
const historyLastPage = ref(1)
const historyBusy = ref(false)
const historyError = ref('')
const historyActions: Record<string,string> = {
  'staffing.plan_created': 'Создание версии',
  'staffing.plan_updated': 'Изменение версии',
  'staffing.plan_line_created': 'Ввод штатной позиции',
  'staffing.plan_line_updated': 'Изменение штатной позиции',
  'staffing.plan_approved': 'Утверждение штатного расписания',
}
let historyGeneration = 0
async function loadHistory() {
  const current = ++historyGeneration
  if (!company.value || activeView.value !== 'changes') return
  historyBusy.value = true
  historyError.value = ''
  try {
    const result = await listStaffingHistory(company.value, historyPage.value)
    if (current !== historyGeneration) return
    historyRows.value = result.data
    historyTotal.value = result.meta.total
    historyLastPage.value = result.meta.last_page
  } catch (cause) {
    if (current !== historyGeneration) return
    historyError.value = cause instanceof Error ? cause.message : 'Не удалось загрузить историю изменений'
    historyRows.value = []
  } finally {
    if (current === historyGeneration) historyBusy.value = false
  }
}
const selectedPlanId = ref('')
const detail = ref<StaffingPlanDetailResponse | null>(null)
const companyBusy = ref(false)
const planBusy = ref(false)
const detailBusy = ref(false)
const error = ref('')
const createPlanOpen = ref(false)
const lineEditorOpen = ref(false)
const approveOpen = ref(false)
const editingLine = ref<StaffingPlanLine | null>(null)
const staffingWritesEnabled = ref(false)
const asOf = ref(localTodayISO())
const initialView = ['all', 'vacant', 'changes'].includes(String(route.query.view)) ? String(route.query.view) : 'all'
const activeView = ref(initialView)
const searchLines = ref('')
const occupancyFilter = ref('all')
const occupancyFilterOptions = [
  { id: 'all', name: 'Все позиции' },
  { id: 'vacant', name: 'Есть вакансии' },
  { id: 'filled', name: 'Укомплектовано' },
  { id: 'overstaffed', name: 'Сверх штата' },
]
const grouped = ref(false)
const selectedLineIds = ref<string[]>([])
const selectedHistoryIds = ref<string[]>([])

const selectedPlan = computed(() => detail.value?.data ?? plans.value.find(item => item.id === selectedPlanId.value) ?? null)
const canEdit = computed(() => !!detail.value?.meta.staffing_writes_enabled && selectedPlan.value?.status === 'draft')
const totals = computed(() => {
  const lines = detail.value?.lines ?? []
  return lines.reduce((sum, line) => ({
    planned: sum.planned + Number(line.planned_units),
    occupied: sum.occupied + Number(line.occupied_units),
    vacant: sum.vacant + Number(line.vacant_units),
    overstaffed: sum.overstaffed + Number(line.overstaffed_units),
  }), { planned: 0, occupied: 0, vacant: 0, overstaffed: 0 })
})

const filteredLines = computed(() => {
  const term = searchLines.value.trim().toLocaleLowerCase('ru')
  return (detail.value?.lines ?? []).filter(line => {
    if (activeView.value === 'vacant' && Number(line.vacant_units) <= 0) return false
    if (occupancyFilter.value === 'vacant' && Number(line.vacant_units) <= 0) return false
    if (occupancyFilter.value === 'filled' && (Number(line.vacant_units) > 0 || Number(line.overstaffed_units) > 0)) return false
    if (occupancyFilter.value === 'overstaffed' && Number(line.overstaffed_units) <= 0) return false
    if (!term) return true
    return (line.department_name + ' ' + line.position_name).toLocaleLowerCase('ru').includes(term)
  })
})
const selectedLineRows = computed(() => filteredLines.value.filter(line => selectedLineIds.value.includes(line.id)))
const selectedHistoryRows = computed(() => historyRows.value.filter(event => selectedHistoryIds.value.includes(String(event.id))))
function clearSelectedRows() {
  selectedLineIds.value = []
  selectedHistoryIds.value = []
}
const mobileLines = computed(() => grouped.value
  ? [...filteredLines.value].sort((a, b) => a.department_name.localeCompare(b.department_name, 'ru') || a.position_name.localeCompare(b.position_name, 'ru'))
  : filteredLines.value)
const groupLines = (row: StaffingPlanLine): string => row.department_name || 'Без подразделения'

const planOptions = computed(() => plans.value.map(item => ({
  id: item.id,
  name: `${item.name} · ${item.status === 'approved' ? 'Утверждено' : 'Черновик'}`,
})))

const lineColumns = [
  { key: 'department_name', label: 'Подразделение' },
  { key: 'position_name', label: 'Должность' },
  { key: 'planned_units', label: 'Ставок' },
  { key: 'occupied_units', label: 'Занято' },
  { key: 'vacant_units', label: 'Вакантно' },
  { key: 'base_salary', label: 'Базовый оклад' },
  { key: 'status', label: 'Состояние' },
  { key: 'actions', label: '' },
]

const changeColumns = [
  { key: 'id', label: '№ изменения' },
  { key: 'action', label: 'Тип изменения' },
  { key: 'staffing_plan_id', label: 'Версия расписания' },
  { key: 'revision', label: 'Ревизия' },
  { key: 'created_at', label: 'Дата изменения' },
]

const optionalLineColumns = lineColumns.filter(column => !['department_name', 'position_name', 'actions'].includes(column.key))
const staffColumnKeys = optionalLineColumns.map(column => column.key)
function columnPreferences(): Record<string, boolean> {
  const initial = Object.fromEntries(staffColumnKeys.map(key => [key, true]))
  try {
    const saved = JSON.parse(localStorage.getItem('hrm-staffing-columns-v1') || '{}') as Record<string, unknown>
    for (const key of staffColumnKeys) {
      if (typeof saved[key] === 'boolean') initial[key] = saved[key]
    }
  } catch { /* Storage may be disabled or contain an invalid value. */ }
  return initial
}
const shownColumns = ref<Record<string, boolean>>(columnPreferences())
const visibleLineColumns = computed(() => lineColumns.filter(column =>
  (column.key !== 'actions' || canEdit.value) && shownColumns.value[column.key] !== false,
))
watch(shownColumns, value => {
  try { localStorage.setItem('hrm-staffing-columns-v1', JSON.stringify(value)) }
  catch { /* Keep preferences in current session. */ }
}, { deep: true })

function formatUnits(value: unknown) {
  return fmt.number(Number(value))
}

function formatSalary(row: StaffingPlanLine) {
  if (row.base_salary == null) return '—'
  return `${fmt.number(Number(row.base_salary), 0)} ${row.currency ?? ''}`.trim()
}

async function refreshCompanies() {
  companyBusy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = preferCompany(companies.value)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    companyBusy.value = false
  }
}

let planRequest = 0
let detailRequest = 0

async function loadPlans() {
  const current = ++planRequest
  const companyId = company.value
  if (!companyId) { plans.value = []; planBusy.value = false; return }
  planBusy.value = true
  error.value = ''
  detail.value = null
  try {
    const response = await listStaffingPlans(companyId)
    if (current !== planRequest || companyId !== company.value) return
    plans.value = response.data
    staffingWritesEnabled.value = response.meta.staffing_writes_enabled
    if (!plans.value.some(item => item.id === selectedPlanId.value)) {
      selectedPlanId.value = preferredStaffingPlan(plans.value, asOf.value)?.id ?? ''
    }
    if (!selectedPlanId.value) detail.value = null
  } catch (cause) {
    if (current !== planRequest) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить версии штатного расписания'
    plans.value = []
    staffingWritesEnabled.value = false
    selectedPlanId.value = ''
  } finally {
    if (current === planRequest) planBusy.value = false
  }
}

async function loadDetail() {
  const current = ++detailRequest
  const companyId = company.value
  const planId = selectedPlanId.value
  const date = asOf.value
  if (!companyId || !planId) {
    detail.value = null
    detailBusy.value = false
    return
  }
  detailBusy.value = true
  error.value = ''
  try {
    const response = await getStaffingPlan(companyId, planId, date)
    if (current !== detailRequest || companyId !== company.value || planId !== selectedPlanId.value) return
    detail.value = response
  } catch (cause) {
    if (current !== detailRequest) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось открыть штатное расписание'
    detail.value = null
  } finally {
    if (current === detailRequest) detailBusy.value = false
  }
}

async function planCreated(plan: StaffingPlanRecord) {
  createPlanOpen.value = false
  await loadPlans()
  selectedPlanId.value = plan.id
  await loadDetail()
}

function exportCurrentRows() {
  if (activeView.value === 'changes') {
    const selected = selectedHistoryRows.value
    const rows = selected.length ? selected : historyRows.value
    downloadCsv(selected.length ? 'staffing-history-selected.csv' : 'staffing-history.csv',
      ['№', 'Тип', 'Версия', 'Ревизия', 'Дата'],
      rows.map(event => [event.id, historyActions[event.action] ?? event.action, event.staffing_plan_id, event.revision, event.created_at]))
    return
  }
  const selected = selectedLineRows.value
  const rows = selected.length ? selected : filteredLines.value
  const filename = activeView.value === 'vacant' ? 'vacancies' : 'staffing'
  downloadCsv(filename + (selected.length ? '-selected' : '') + '.csv',
    ['Подразделение', 'Должность', 'Ставок', 'Занято', 'Вакантно', 'Оклад', 'Валюта'],
    rows.map(line => [line.department_name, line.position_name, line.planned_units, line.occupied_units, line.vacant_units, line.base_salary, line.currency]))
}

function createLine() {
  editingLine.value = null
  lineEditorOpen.value = true
}

function editLine(row: StaffingPlanLine) {
  editingLine.value = row
  lineEditorOpen.value = true
}

async function lineSaved() {
  lineEditorOpen.value = false
  editingLine.value = null
  await loadDetail()
}

async function approvePlan() {
  if (!company.value || !selectedPlan.value) return
  error.value = ''
  try {
    await approveStaffingPlan(company.value, selectedPlan.value.id, selectedPlan.value.revision)
    approveOpen.value = false
    await loadPlans()
    selectedPlanId.value = selectedPlan.value?.id ?? selectedPlanId.value
    await loadDetail()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось утвердить штатное расписание'
    approveOpen.value = false
  }
}

watch(() => route.query.view, value => {
  const next = ['all', 'vacant', 'changes'].includes(String(value)) ? String(value) : 'all'
  if (activeView.value !== next) activeView.value = next
})
watch(activeView, value => {
  const target = value === 'all' ? undefined : value
  if (String(route.query.view ?? 'all') !== value) {
    router.replace({ path: '/staffing', query: target ? { view: target } : {} })
  }
})

watch([company, activeView, historyPage], () => { loadHistory() })
// Do not carry selection into another company, plan, date, page or tab.
watch([company, activeView, historyPage, selectedPlanId, asOf], clearSelectedRows)

watch(company, async () => {
  historyPage.value = 1
  historyRows.value = []
  ++detailRequest
  detailBusy.value = false
  selectedPlanId.value = ''
  searchLines.value = ''
  plans.value = []
  detail.value = null
  await loadPlans()
})
watch(selectedPlanId, () => { searchLines.value = ''; loadDetail() })
onMounted(refreshCompanies)
</script>

<template>
  <section class="staffing-page">
    <OrgStaffingNav />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseLoadingState v-if="companyBusy" :label="tr('Загрузка компаний')" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">{{ tr('Нет доступных компаний.') }}</BaseNotice>

    <div v-else class="staffing-heading">
      <h1>
        {{ activeView === 'vacant' ? tr('Вакантные позиции') : activeView === 'changes' ? tr('Изменения штатного расписания') : tr('Штатное расписание') }}
      </h1>
      <div class="staffing-heading-actions">
        <BaseSelectField v-model="company" :label="tr('Компания')" :options="companies" />
        <BaseSelectField
          v-if="activeView !== 'changes' && plans.length"
          v-model="selectedPlanId"
          :label="tr('Версия штатного расписания')"
          :options="planOptions"
          :disabled="planBusy"
        />
        <BaseButton v-if="activeView === 'changes' ? historyRows.length : filteredLines.length"
          variant="secondary" @click="exportCurrentRows">{{ tr('Экспорт CSV') }}</BaseButton>
        <BaseButton v-if="staffingWritesEnabled && activeView === 'all'" @click="createPlanOpen = true">
          <Plus :size="17" /> {{ tr('Новая версия') }}</BaseButton>
      </div>
    </div>

    <BaseCard v-if="activeView === 'changes' && company">
      <div class="section-heading">
        <div>
          <h2>{{ tr('Реестр изменений штатного расписания') }}</h2>
          <p class="section-copy">{{ tr('История операций со штатными позициями и версиями расписания.') }}</p>
        </div>
        <span class="muted">{{ fmt.number(historyTotal, 0) }} {{ tr('событий') }}</span>
      </div>
      <BaseNotice v-if="historyError" tone="error">{{ historyError }}</BaseNotice>
      <div v-if="selectedHistoryRows.length" class="staffing-selection-toolbar" role="status">
        <span>{{ tr('Выбрано на странице:') }} {{ fmt.number(selectedHistoryRows.length, 0) }}</span>
        <BaseButton variant="secondary" @click="clearSelectedRows">{{ tr('Снять выделение') }}</BaseButton>
      </div>
      <div class="staffing-history-desktop">
        <BaseDataTable
        v-model:selected-keys="selectedHistoryIds"
        selectable
        :rows="historyRows"
        :columns="changeColumns"
        :loading="historyBusy"
        row-key="id"
        :caption="tr('История изменений штатного расписания')"
        :empty-title="tr('История изменений пуста')"
        :empty-description="tr('Здесь появятся события создания, изменения и утверждения расписания.')"
      >
        <template #cell-action="{ value }">{{ tr(historyActions[String(value)] ?? String(value)) }}</template>
        <template #cell-staffing_plan_id="{ value }">
          <span class="history-reference">{{ value ? plans.find(plan => plan.id === value)?.name ?? String(value).slice(0, 8) : '—' }}</span>
        </template>
        <template #cell-created_at="{ value }">{{ fmt.dateTime(String(value)) }}</template>
        </BaseDataTable>
      </div>
      <div class="staffing-history-mobile">
        <BaseLoadingState v-if="historyBusy" :label="tr('Загрузка истории изменений')" />
        <p v-else-if="!historyRows.length" class="staffing-history-empty">{{ tr('История изменений пока пуста.') }}</p>
        <article v-for="event in historyRows" :key="event.id" class="staffing-history-card">
          <div class="staffing-history-card-heading">
            <strong>{{ tr(historyActions[event.action] ?? event.action) }}</strong>
            <span>№ {{ event.id }}</span>
          </div>
          <p>{{ plans.find(plan => plan.id === event.staffing_plan_id)?.name ?? (event.staffing_plan_id ? tr('Версия ') + event.staffing_plan_id.slice(0, 8) : tr('Без версии')) }}</p>
          <div class="staffing-history-card-foot">
            <span>{{ fmt.dateTime(event.created_at) }}</span>
            <span v-if="event.revision != null">{{ tr('Ревизия') }} {{ fmt.number(event.revision, 0) }}</span>
          </div>
        </article>
      </div>
      <BasePagination
        :page="historyPage"
        :last-page="historyLastPage"
        :loading="historyBusy"
        :caption="tr('Страницы истории штатного расписания')"
        @previous="historyPage--"
        @next="historyPage++"
      />
    </BaseCard>

    <BaseLoadingState v-if="activeView !== 'changes' && (planBusy || detailBusy)" :label="tr('Загрузка штатного расписания')" />

    <BaseCard v-else-if="activeView !== 'changes' && company && !plans.length">
      <div class="empty-state">
        <UsersRound :size="30" />
        <h2>{{ tr('Штатное расписание ещё не создано') }}</h2>
        <p>{{ tr('Создайте первую версию, затем добавьте подразделения, должности и количество ставок.') }}</p>
        <BaseButton v-if="staffingWritesEnabled" @click="createPlanOpen = true"><Plus :size="17" /> {{ tr('Создать первую версию') }}</BaseButton>
      </div>
    </BaseCard>

    <template v-else-if="activeView !== 'changes' && detail && selectedPlan">
      <BaseCard class="plan-header">
        <div class="snapshot-row">
          <BaseFormField v-model="asOf" :label="tr('Дата среза занятости')" type="date" :disabled="detailBusy" />
          <BaseButton variant="secondary" :disabled="detailBusy || !asOf" @click="loadDetail">{{ tr('Показать на дату') }}</BaseButton>
        </div>
        <div class="plan-title">
          <div>
            <div class="title-row">
              <h2>{{ selectedPlan.name }}</h2>
              <span class="plan-status" :class="{ approved: selectedPlan.status === 'approved' }">
                {{ selectedPlan.status === 'approved' ? tr('Утверждено') : tr('Черновик') }}
              </span>
            </div>
            <p class="muted">
              {{ fmt.date(selectedPlan.valid_from) }} — {{ selectedPlan.valid_to ? fmt.date(selectedPlan.valid_to) : tr('без даты окончания') }}
              · {{ tr('занятость на') }} {{ fmt.date(detail.meta.as_of) }}
            </p>
          </div>
          <div class="plan-actions">
            <BaseButton v-if="canEdit && activeView === 'all'" variant="secondary" @click="createLine"><Plus :size="17" /> {{ tr('Добавить строку') }}</BaseButton>
            <BaseButton v-if="canEdit && detail.lines.length && activeView === 'all'" @click="approveOpen = true"><CheckCircle2 :size="17" /> {{ tr('Утвердить') }}</BaseButton>
          </div>
        </div>
      </BaseCard>

      <div class="staffing-summary-strip" :aria-label="tr('Показатели штатного расписания')">
        <div class="staffing-summary-item"><span>{{ tr('Плановых ставок') }}</span><strong>{{ formatUnits(totals.planned) }}</strong></div>
        <div class="staffing-summary-item"><span>{{ tr('Занято') }}</span><strong>{{ formatUnits(totals.occupied) }}</strong></div>
        <div class="staffing-summary-item staffing-summary-item--accent"><span>{{ tr('Вакантно') }}</span><strong>{{ formatUnits(totals.vacant) }}</strong></div>
        <div class="staffing-summary-item"><span>{{ tr('Сверх штата') }}</span><strong>{{ formatUnits(totals.overstaffed) }}</strong></div>
      </div>

      <BaseCard>
        <div class="section-heading">
          <div>
            <h2>{{ activeView === 'vacant' ? tr('Вакантные позиции') : tr('Штатное расписание') }}</h2>
            <p class="section-copy">{{ activeView === 'vacant' ? tr('Открытые позиции по подразделениям.') : tr('Должности, ставки и текущая занятость.') }}</p>
          </div>
          <span class="muted">{{ fmt.number(filteredLines.length, 0) }} {{ tr('из') }} {{ fmt.number(detail.lines.length, 0) }} {{ tr('строк') }}</span>
        </div>

        <div class="line-toolbar" :aria-label="tr('Фильтры штатного расписания')">
          <BaseFormField v-model="searchLines" class="line-search" :label="tr('Поиск штатных единиц')"
            :placeholder="tr('Подразделение или должность')" />
          <BaseSelectField v-model="occupancyFilter" :label="tr('Фильтр занятости')"
            :options="occupancyFilterOptions.map(item => ({ ...item, name: tr(item.name) }))" />
          <BaseButton variant="secondary" @click="grouped = !grouped">
            <FolderTree :size="16" /> {{ grouped ? tr('Без группировки') : tr('Группировка') }}
          </BaseButton>
          <BaseColumnPicker v-model="shownColumns" :columns="optionalLineColumns" />
        </div>
        <p v-if="grouped" class="line-hint">{{ tr('Группировка по подразделениям выбранной версии штатного расписания.') }}</p>
        <div v-if="selectedLineRows.length" class="staffing-selection-toolbar" role="status">
          <span>{{ tr('Выбрано на странице:') }} {{ fmt.number(selectedLineRows.length, 0) }}</span>
          <BaseButton variant="secondary" @click="clearSelectedRows">{{ tr('Снять выделение') }}</BaseButton>
        </div>

        <div class="staffing-desktop-table">
          <BaseDataTable
          v-model:selected-keys="selectedLineIds"
          selectable
          :rows="filteredLines"
          :columns="visibleLineColumns"
          :group-by="grouped ? groupLines : undefined"
          row-key="id"
          :caption="tr('Строки штатного расписания')"
          :empty-title="activeView === 'vacant' ? tr('Вакансий нет') : tr('Штатные единицы не найдены')"
          :empty-description="searchLines ? tr('Уточните поисковый запрос.') : tr('Для выбранного представления нет записей.')"
        >
          <template #cell-planned_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-occupied_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-vacant_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-base_salary="{ row }">
            <span class="salary"><CircleDollarSign :size="15" /> {{ formatSalary(row) }}</span>
          </template>
          <template #cell-status="{ row }">
            <span v-if="row.overstaffed_units > 0" class="line-status danger">{{ tr('Сверх штата') }} +{{ formatUnits(row.overstaffed_units) }}</span>
            <span v-else-if="row.vacant_units > 0" class="line-status warning">{{ tr('Есть вакансии') }}</span>
            <span v-else class="line-status success">{{ tr('Укомплектовано') }}</span>
          </template>
          <template #cell-actions="{ row }">
            <BaseButton v-if="canEdit" variant="secondary" @click="editLine(row)"><Pencil :size="15" /> {{ tr('Изменить') }}</BaseButton>
          </template>
          </BaseDataTable>
        </div>
        <div class="staffing-mobile-only">
          <StaffingMobileList :rows="mobileLines" :can-edit="canEdit" :grouped="grouped"
            :filtered="!!searchLines.trim() || occupancyFilter !== 'all'" :vacant-only="activeView === 'vacant'"
            @edit="editLine" />
        </div>
      </BaseCard>
    </template>

    <BaseDrawer :open="createPlanOpen" :title="tr('Новая версия штатного расписания')"
      :description="tr('Период действия и параметры новой версии')" @close="createPlanOpen = false">
      <StaffingPlanForm v-if="company" :company-id="company" @saved="planCreated" @cancelled="createPlanOpen = false" />
    </BaseDrawer>

    <BaseDrawer :open="lineEditorOpen" :title="editingLine ? tr('Изменить штатную единицу') : tr('Новая штатная единица')"
      :description="tr('Структурная позиция и параметры ставки')" @close="lineEditorOpen = false">
      <StaffingLineForm
        v-if="company && selectedPlanId"
        :key="editingLine?.id ?? 'new'"
        :company-id="company"
        :plan-id="selectedPlanId"
        :edit="editingLine"
        @saved="lineSaved"
        @cancelled="lineEditorOpen = false"
      />
    </BaseDrawer>

    <BaseDialog :open="approveOpen" :title="tr('Утвердить штатное расписание')" @close="approveOpen = false">
      <div class="approve-copy">
        <BaseNotice tone="warning">{{ tr('После утверждения эту версию нельзя будет редактировать. Для изменений нужно будет создать новую версию.') }}</BaseNotice>
        <p><strong>{{ selectedPlan?.name }}</strong></p>
        <p class="muted">{{ tr('Проверьте ставки и период действия перед утверждением.') }}</p>
        <div class="approve-actions">
          <BaseButton variant="secondary" @click="approveOpen = false">{{ tr('Отмена') }}</BaseButton>
          <BaseButton @click="approvePlan">{{ tr('Утвердить') }}</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.staffing-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
.staffing-mobile-only,.staffing-history-mobile{display:none}
.staffing-selection-toolbar{display:flex;align-items:center;gap:12px;margin:0 0 12px;color:var(--color-muted);font-size:12px}
.staffing-selection-toolbar :deep(.base-button){height:30px;min-height:30px;font-weight:500}
.staffing-history-card{min-width:0;padding:14px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
.staffing-history-card-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}
.staffing-history-card-heading strong{font-size:14px;line-height:1.4}
.staffing-history-card-heading span{font-size:11px;white-space:nowrap;color:var(--color-muted)}
.staffing-history-card p{margin:8px 0 10px;color:var(--color-muted);font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.staffing-history-card-foot{display:flex;gap:8px;align-items:center;justify-content:space-between;padding-top:9px;border-top:1px solid var(--color-stroke);font-size:11px;color:var(--color-muted)}
.staffing-history-empty{margin:12px 0;text-align:center;color:var(--color-muted);font-size:13px}
@media(max-width:700px){
 .staffing-desktop-table,.staffing-history-desktop{display:none}
 .staffing-mobile-only{display:block}
 .staffing-history-mobile{display:grid;gap:10px}
 .line-toolbar :deep(.column-settings){display:none}
}
.staffing-page :deep(.base-card){box-shadow:var(--shadow-card)}
.staffing-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:16px}
.staffing-heading h1{margin:0;color:var(--color-text);font-size:24px;line-height:1.2;font-weight:700}
.staffing-heading-actions{display:flex;align-items:end;justify-content:flex-end;gap:10px;min-width:0;flex-wrap:wrap}
.staffing-heading-actions :deep(.base-select-field){width:210px;max-width:210px}
.empty-state{display:grid;justify-items:center;text-align:center;gap:10px;padding:40px 20px;color:var(--color-muted)}
.empty-state h2{margin:0;color:var(--color-text);font-size:var(--font-section-heading)}
.empty-state p{max-width:620px;margin:0 0 8px;line-height:1.5}
.plan-header{background:transparent;border:0!important;box-shadow:none!important;padding:0!important}
.snapshot-row{display:flex;align-items:end;gap:10px;justify-content:flex-end;margin-bottom:8px;padding-bottom:8px;border-bottom:0}
.snapshot-row :deep(.field){width:min(260px,100%)}
.plan-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.title-row h2{margin:0;font-size:20px}
.plan-status,.line-status{display:inline-flex;align-items:center;width:max-content;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.plan-status{padding:5px 9px;background:var(--color-warning-surface);color:var(--color-warning)}
.plan-status.approved{background:var(--color-success-surface);color:var(--color-success)}
.plan-title .muted{margin:8px 0 0;font-size:13px}
.plan-actions{display:flex;gap:8px;flex-wrap:wrap}
.staffing-summary-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-card)}
.staffing-summary-item{display:grid;gap:4px;padding:13px 18px;border-right:1px solid var(--color-stroke)}
.staffing-summary-item:last-child{border-right:0}
.staffing-summary-item span{font-size:11px;line-height:1.25;color:var(--color-muted)}
.staffing-summary-item strong{font-size:20px;line-height:1.15;font-weight:650;color:var(--color-text)}
.staffing-summary-item--accent strong{color:var(--color-primary)}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-heading h2{margin:0;font-size:var(--font-section-heading)}
.section-copy{margin:5px 0 0;color:var(--color-muted);font-size:12px;line-height:1.45}
.line-toolbar{display:flex;align-items:end;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)}
.line-toolbar .line-search{min-width:230px;flex:1}
.line-search :deep(label){position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.line-search :deep(input){font-size:13px}
.staffing-page :deep(.field label){font-size:12px}
.staffing-page :deep(.base-card){border-radius:var(--radius-md)}
.line-toolbar :deep(button){display:inline-flex;gap:7px;align-items:center;justify-content:center}
.line-hint{color:var(--color-muted);font-size:12px;line-height:1.5;margin:0 0 var(--space-3)}
.salary{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.line-status{padding:5px 8px}
.line-status.success{background:var(--color-success-surface);color:var(--color-success)}
.line-status.warning{background:var(--color-warning-surface);color:var(--color-warning)}
.line-status.danger{background:var(--color-danger-surface);color:var(--color-danger)}
.approve-copy{display:grid;gap:var(--space-4)}
.approve-copy p{margin:0}
.approve-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:1000px){.staffing-summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.staffing-summary-item:nth-child(2){border-right:0}.staffing-summary-item:nth-child(-n+2){border-bottom:1px solid var(--color-stroke)}}
@media(max-width:900px){
 .staffing-heading{grid-template-columns:1fr}
 .staffing-heading-actions{justify-content:flex-start}
}
@media(max-width:650px){
 .staffing-heading h1{font-size:20px}
 .staffing-heading-actions{width:100%;display:grid;grid-template-columns:1fr}
 .staffing-heading-actions :deep(.base-select-field){width:100%;max-width:none}
 .staffing-heading-actions :deep(.base-button){width:100%}
 .line-toolbar .line-search{min-width:100%;flex-basis:100%}.staffing-summary-item{padding:11px 12px}.staffing-summary-item strong{font-size:18px}.snapshot-row{display:grid;grid-template-columns:1fr}.snapshot-row :deep(.field){width:100%}.snapshot-row :deep(button){width:100%}.plan-actions{width:100%}.plan-actions :deep(button){flex:1}.approve-actions :deep(button){flex:1}}
</style>

<style scoped>
.plan-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:10px 0;border:0;background:transparent;box-shadow:none}
.plan-header .snapshot-row{margin:0;order:2;display:flex;gap:10px;align-items:end}
.plan-header .snapshot-row :deep(.field){max-width:165px}
.plan-header .plan-title{flex:1;min-width:280px;margin:0}
.plan-header .plan-title h2{font-size:15px;font-weight:500}
.plan-header .plan-title p{font-size:12px;margin:6px 0 0}
.staffing-summary-strip{gap:14px;background:transparent;border:0;box-shadow:none;overflow:visible}
.staffing-summary-item{min-height:104px;align-content:start;gap:10px;padding:16px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:var(--radius-md);box-shadow:var(--shadow-card)}
.staffing-summary-item:last-child{border-right:1px solid var(--color-stroke)}
.staffing-summary-item strong{font-size:24px;font-weight:600;color:var(--color-primary)}
.staffing-summary-item span{font-size:13px;text-transform:uppercase;color:var(--color-text)}
@media(max-width:700px){.plan-header .plan-title{min-width:0}.plan-header .snapshot-row{width:100%;justify-content:space-between}.staffing-summary-strip{gap:10px}.staffing-summary-item{min-height:94px;padding:13px}}

/* The real 1180px viewport must not clip date actions beside the plan name. */
@media(min-width:701px) and (max-width:1420px){
  .staffing-heading{grid-template-columns:minmax(0,1fr);align-items:start;gap:11px}
  .staffing-heading-actions{justify-content:flex-start;flex-wrap:wrap;gap:8px}
  .staffing-heading-actions :deep(.base-select-field){flex:0 1 220px;max-width:260px;width:220px}
  .plan-header{flex-direction:column;align-items:stretch;gap:9px}
  .plan-header .plan-title{flex:none;min-width:0;width:100%}
  .plan-header .snapshot-row{order:2;display:flex;flex-wrap:wrap;justify-content:flex-start;align-items:flex-end;gap:8px;width:100%}
  .plan-header .snapshot-row :deep(.field){max-width:205px;width:205px}
  .plan-header .snapshot-row :deep(button){flex:0 0 auto;white-space:nowrap}
}
</style>
