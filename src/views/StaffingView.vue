<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CheckCircle2, CircleDollarSign, FolderTree, Pencil, Plus, UsersRound } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import StaffingLineForm from '../components/StaffingLineForm.vue'
import StaffingPlanForm from '../components/StaffingPlanForm.vue'
import { localTodayISO } from '../utils/localDate'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  approveStaffingPlan,
  getStaffingPlan,
  listStaffingPlans,
  type StaffingPlanDetailResponse,
  type StaffingPlanLine,
  type StaffingPlanRecord,
} from '../api/staffing'

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const plans = ref<StaffingPlanRecord[]>([])
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
const activeView = ref('all')
const searchLines = ref('')
const grouped = ref(false)
const viewTabs = [
  { id: 'all', label: 'Штатное расписание' },
  { id: 'vacant', label: 'Вакантные позиции' },
  { id: 'overstaffed', label: 'Сверх штата' },
]

const selectedPlan = computed(() => detail.value?.data ?? plans.value.find(item => item.id === selectedPlanId.value) ?? null)
const canEdit = computed(() => !!detail.value?.meta.staffing_writes_enabled)
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
    if (activeView.value === 'overstaffed' && Number(line.overstaffed_units) <= 0) return false
    if (!term) return true
    return (line.department_name + ' ' + line.position_name).toLocaleLowerCase('ru').includes(term)
  })
})
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
  return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function formatSalary(row: StaffingPlanLine) {
  if (row.base_salary == null) return '—'
  return `${Number(row.base_salary).toLocaleString('ru-RU')} ${row.currency ?? ''}`.trim()
}

async function refreshCompanies() {
  companyBusy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = companies.value[0]?.id ?? ''
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    companyBusy.value = false
  }
}

async function loadPlans() {
  if (!company.value) return
  planBusy.value = true
  error.value = ''
  detail.value = null
  try {
    const response = await listStaffingPlans(company.value)
    plans.value = response.data
    staffingWritesEnabled.value = response.meta.staffing_writes_enabled
    if (!plans.value.some(item => item.id === selectedPlanId.value)) {
      selectedPlanId.value = plans.value[0]?.id ?? ''
    }
    if (!selectedPlanId.value) detail.value = null
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить версии штатного расписания'
    plans.value = []
    staffingWritesEnabled.value = false
    selectedPlanId.value = ''
  } finally {
    planBusy.value = false
  }
}

async function loadDetail() {
  if (!company.value || !selectedPlanId.value) {
    detail.value = null
    return
  }
  detailBusy.value = true
  error.value = ''
  try {
    detail.value = await getStaffingPlan(company.value, selectedPlanId.value, asOf.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось открыть штатное расписание'
    detail.value = null
  } finally {
    detailBusy.value = false
  }
}

async function planCreated(plan: StaffingPlanRecord) {
  createPlanOpen.value = false
  await loadPlans()
  selectedPlanId.value = plan.id
  await loadDetail()
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

watch(company, async () => {
  selectedPlanId.value = ''
  activeView.value = 'all'
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
    <BasePageHeading
      title="Штатное расписание"
      description="Версии штатной структуры, плановые ставки, занятость и вакансии по подразделениям."
    >
      <BaseButton v-if="staffingWritesEnabled" @click="createPlanOpen = true">
        <Plus :size="17" /> Новая версия
      </BaseButton>
    </BasePageHeading>

    <BaseViewTabs v-model="activeView" :options="viewTabs" label="Штатные представления" />

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="toolbar">
        <BaseSelectField v-model="company" label="Компания" :options="companies" />
        <BaseSelectField
          v-if="plans.length"
          v-model="selectedPlanId"
          label="Версия штатного расписания"
          :options="planOptions"
          :disabled="planBusy"
        />

      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>

    <BaseLoadingState v-if="planBusy || detailBusy" label="Загрузка штатного расписания" />

    <BaseCard v-else-if="company && !plans.length">
      <div class="empty-state">
        <UsersRound :size="30" />
        <h2>Штатное расписание ещё не создано</h2>
        <p>Создайте первую версию, затем добавьте подразделения, должности и количество ставок.</p>
        <BaseButton v-if="staffingWritesEnabled" @click="createPlanOpen = true"><Plus :size="17" /> Создать первую версию</BaseButton>
      </div>
    </BaseCard>

    <template v-else-if="detail && selectedPlan">
      <BaseCard class="plan-header">
        <div class="snapshot-row">
          <BaseFormField v-model="asOf" label="Дата среза занятости" type="date" :disabled="detailBusy" />
          <BaseButton variant="secondary" :disabled="detailBusy || !asOf" @click="loadDetail">Показать на дату</BaseButton>
        </div>
        <div class="plan-title">
          <div>
            <p class="kicker">Версия штатного расписания</p>
            <div class="title-row">
              <h2>{{ selectedPlan.name }}</h2>
              <span class="plan-status" :class="{ approved: selectedPlan.status === 'approved' }">
                {{ selectedPlan.status === 'approved' ? 'Утверждено' : 'Черновик' }}
              </span>
            </div>
            <p class="muted">
              {{ selectedPlan.valid_from }} — {{ selectedPlan.valid_to ?? 'без даты окончания' }}
              · занятость на {{ detail.meta.as_of }}
            </p>
          </div>
          <div class="plan-actions">
            <BaseButton v-if="canEdit && activeView === 'all'" variant="secondary" @click="createLine"><Plus :size="17" /> Добавить строку</BaseButton>
            <BaseButton v-if="canEdit && detail.lines.length && activeView === 'all'" @click="approveOpen = true"><CheckCircle2 :size="17" /> Утвердить</BaseButton>
          </div>
        </div>
      </BaseCard>

      <div class="metrics">
        <BaseCard>
          <span>Плановых ставок</span>
          <strong>{{ formatUnits(totals.planned) }}</strong>
        </BaseCard>
        <BaseCard>
          <span>Занято</span>
          <strong>{{ formatUnits(totals.occupied) }}</strong>
        </BaseCard>
        <BaseCard>
          <span>Вакантно</span>
          <strong>{{ formatUnits(totals.vacant) }}</strong>
        </BaseCard>
        <BaseCard>
          <span>Сверх штата</span>
          <strong>{{ formatUnits(totals.overstaffed) }}</strong>
        </BaseCard>
      </div>

      <BaseCard>
        <div class="section-heading">
          <div>
            <p class="kicker">Структура штата</p>
            <h2>{{ activeView === 'vacant' ? 'Вакантные позиции' : activeView === 'overstaffed' ? 'Сверхштатные позиции' : 'Штатные единицы' }}</h2>
          </div>
          <span class="muted">{{ filteredLines.length }} из {{ detail.lines.length }} строк</span>
        </div>

        <div class="line-toolbar" aria-label="Фильтры штатного расписания">
          <BaseFormField v-model="searchLines" class="line-search" label="Поиск штатных единиц"
            placeholder="Подразделение или должность" />
          <BaseButton variant="secondary" @click="grouped = !grouped">
            <FolderTree :size="16" /> {{ grouped ? 'Без группировки' : 'Группировка' }}
          </BaseButton>
          <BaseColumnPicker v-model="shownColumns" :columns="optionalLineColumns" />
        </div>
        <p v-if="grouped" class="line-hint">Группировка по подразделениям выбранной версии штатного расписания.</p>

        <BaseDataTable
          :rows="filteredLines"
          :columns="visibleLineColumns"
          :group-by="grouped ? groupLines : undefined"
          row-key="id"
          caption="Строки штатного расписания"
          :empty-title="activeView === 'vacant' ? 'Вакансий нет' : activeView === 'overstaffed' ? 'Сверхштатных позиций нет' : 'Штатные единицы не найдены'"
          :empty-description="searchLines ? 'Уточните поисковый запрос.' : 'Для выбранного представления нет записей.'"
        >
          <template #cell-planned_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-occupied_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-vacant_units="{ value }">{{ formatUnits(value) }}</template>
          <template #cell-base_salary="{ row }">
            <span class="salary"><CircleDollarSign :size="15" /> {{ formatSalary(row) }}</span>
          </template>
          <template #cell-status="{ row }">
            <span v-if="row.overstaffed_units > 0" class="line-status danger">Сверх штата +{{ formatUnits(row.overstaffed_units) }}</span>
            <span v-else-if="row.vacant_units > 0" class="line-status warning">Есть вакансии</span>
            <span v-else class="line-status success">Укомплектовано</span>
          </template>
          <template #cell-actions="{ row }">
            <BaseButton v-if="canEdit" variant="secondary" @click="editLine(row)"><Pencil :size="15" /> Изменить</BaseButton>
          </template>
        </BaseDataTable>
      </BaseCard>
    </template>

    <BaseDialog :open="createPlanOpen" title="Новая версия штатного расписания" @close="createPlanOpen = false">
      <StaffingPlanForm v-if="company" :company-id="company" @saved="planCreated" @cancelled="createPlanOpen = false" />
    </BaseDialog>

    <BaseDialog :open="lineEditorOpen" :title="editingLine ? 'Изменить штатную единицу' : 'Новая штатная единица'" @close="lineEditorOpen = false">
      <StaffingLineForm
        v-if="company && selectedPlanId"
        :key="editingLine?.id ?? 'new'"
        :company-id="company"
        :plan-id="selectedPlanId"
        :edit="editingLine"
        @saved="lineSaved"
        @cancelled="lineEditorOpen = false"
      />
    </BaseDialog>

    <BaseDialog :open="approveOpen" title="Утвердить штатное расписание" @close="approveOpen = false">
      <div class="approve-copy">
        <BaseNotice tone="warning">После утверждения эту версию нельзя будет редактировать. Для изменений нужно будет создать новую версию.</BaseNotice>
        <p><strong>{{ selectedPlan?.name }}</strong></p>
        <p class="muted">Проверьте ставки и период действия перед утверждением.</p>
        <div class="approve-actions">
          <BaseButton variant="secondary" @click="approveOpen = false">Отмена</BaseButton>
          <BaseButton @click="approvePlan">Утвердить</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.staffing-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
.toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:end;gap:var(--space-4)}
.empty-state{display:grid;justify-items:center;text-align:center;gap:10px;padding:40px 20px;color:var(--color-muted)}
.empty-state h2{margin:0;color:var(--color-text);font-size:var(--font-section-heading)}
.empty-state p{max-width:620px;margin:0 0 8px;line-height:1.5}
.plan-header{background:linear-gradient(135deg,#fff 0%,#f4fbff 100%)}
.snapshot-row{display:flex;align-items:end;gap:10px;justify-content:flex-end;margin-bottom:var(--space-4);padding-bottom:var(--space-4);border-bottom:1px solid var(--color-stroke)}
.snapshot-row :deep(.field){width:min(260px,100%)}
.plan-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.title-row h2{margin:0;font-size:23px}
.kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.plan-status,.line-status{display:inline-flex;align-items:center;width:max-content;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.plan-status{padding:5px 9px;background:var(--color-warning-surface);color:var(--color-warning)}
.plan-status.approved{background:var(--color-success-surface);color:var(--color-success)}
.plan-title .muted{margin:8px 0 0;font-size:13px}
.plan-actions{display:flex;gap:8px;flex-wrap:wrap}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-4)}
.metrics :deep(.base-card){display:grid;gap:7px}
.metrics span{font-size:12px;color:var(--color-muted)}
.metrics strong{font-size:26px;line-height:1}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-heading h2{margin:0;font-size:var(--font-section-heading)}
.line-toolbar{display:flex;align-items:end;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)}
.line-toolbar .line-search{min-width:230px;flex:1}
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
@media(max-width:1000px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.toolbar{grid-template-columns:1fr}.line-toolbar .line-search{min-width:100%;flex-basis:100%}.metrics{grid-template-columns:1fr 1fr}.snapshot-row{display:grid;grid-template-columns:1fr}.snapshot-row :deep(.field){width:100%}.snapshot-row :deep(button){width:100%}.plan-actions{width:100%}.plan-actions :deep(button){flex:1}.approve-actions :deep(button){flex:1}}
</style>
