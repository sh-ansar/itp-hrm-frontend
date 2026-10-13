<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowRight, BookOpenCheck, ShieldCheck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  getCompanyDevelopment, trainingModeName, developmentStatusName,
  type TrainingRow, type ReserveRow,
} from '../api/development'

const router = useRouter()
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
const training = ref<TrainingRow[]>([])
const reserve = ref<ReserveRow[]>([])
const trainingSummary = ref<Record<string, number>>({})
const reserveSummary = ref<Record<string, number>>({})
let generation = 0

const employeeTabs = [
  { id: 'register', label: 'Реестр сотрудников' },
  { id: 'development', label: 'Кадровый резерв и обучение' },
  { id: 'archive', label: 'Архив сотрудников' },
]
const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))

function setEmployeeTab(next: string) {
  if (next === 'register') router.push({ name: 'employees' })
  else if (next === 'archive') router.push({ name: 'employees', query: { status: 'archived' } })
}

function employeeRoute(employeeId: string) {
  return { name: 'employee-detail', params: { company: company.value, employee: employeeId }, query: { tab: 'development' } }
}
function personName(row: { last_name: string; first_name: string; middle_name: string | null }) {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}
function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'
  return value.slice(8,10) + '.' + value.slice(5,7) + '.' + value.slice(0,4)
}

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    company.value = result.data[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    loadingCompanies.value = false
  }
}

async function loadWorkspace() {
  const companyId = company.value
  const current = ++generation
  training.value = []
  reserve.value = []
  trainingSummary.value = {}
  reserveSummary.value = {}
  if (!companyId) return
  loading.value = true
  error.value = ''
  try {
    const [trainingResult, reserveResult] = await Promise.all([
      getCompanyDevelopment<TrainingRow>(companyId, 'training', { page: 1, status: 'all' }),
      getCompanyDevelopment<ReserveRow>(companyId, 'reserve', { page: 1, status: 'all' }),
    ])
    if (current !== generation) return
    training.value = trainingResult.data
    reserve.value = reserveResult.data
    trainingSummary.value = trainingResult.meta.summary
    reserveSummary.value = reserveResult.meta.summary
  } catch (cause) {
    if (current === generation)
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить кадровый резерв и обучение'
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(company, loadWorkspace)
onMounted(loadCompanies)
</script>

<template>
  <section class="employee-development-page">
    <div class="registry-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Сотрудники</strong><span>/</span><span>Кадровый резерв и обучение</span>
    </div>

    <BaseViewTabs model-value="development" :options="employeeTabs" label="Разделы сотрудников"
      @update:model-value="setEmployeeTab" />

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка доступных компаний" />

    <template v-else-if="companies.length">
      <div class="development-heading">
        <div>
          <h1>Кадровый резерв и обучение</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="company-select">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
        </div>
      </div>

      <div class="development-summary">
        <BaseCard class="summary-block">
          <ShieldCheck :size="19" aria-hidden="true" />
          <span>В кадровом резерве</span>
          <strong>{{ loading ? '…' : reserveSummary.active ?? 0 }}</strong>
        </BaseCard>
        <BaseCard class="summary-block">
          <ShieldCheck :size="19" aria-hidden="true" />
          <span>Всего записей резерва</span>
          <strong>{{ loading ? '…' : reserveSummary.total ?? 0 }}</strong>
        </BaseCard>
        <BaseCard class="summary-block">
          <BookOpenCheck :size="19" aria-hidden="true" />
          <span>Обучение в процессе</span>
          <strong>{{ loading ? '…' : trainingSummary.ongoing ?? 0 }}</strong>
        </BaseCard>
        <BaseCard class="summary-block">
          <BookOpenCheck :size="19" aria-hidden="true" />
          <span>Запланировано обучение</span>
          <strong>{{ loading ? '…' : trainingSummary.planned ?? 0 }}</strong>
        </BaseCard>
      </div>

      <div class="development-grid">
        <BaseCard class="workspace-card">
          <div class="workspace-title">
            <div><h2>Кадровый резерв</h2><p>{{ reserveSummary.total ?? reserve.length }} записей</p></div>
            <RouterLink to="/reserve">Открыть реестр <ArrowRight :size="15" /></RouterLink>
          </div>
          <BaseDataTable :rows="reserve.slice(0, 8)" row-key="id" :loading="loading"
            caption="Кадровый резерв сотрудников"
            :columns="[
              { key:'employee', label:'Сотрудник' },
              { key:'target_position', label:'Резервируемая должность' },
              { key:'reserve_level', label:'Уровень' },
              { key:'development_status', label:'Статус' },
            ]"
            empty-title="Кадровый резерв пуст"
            empty-description="Записи появятся после добавления сотрудников в резерв.">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="employeeRoute(row.employee_id)">{{ personName(row) }}</RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
            </template>
            <template #cell-development_status="{ row }">
              <span class="status-pill" :class="'status-pill--' + row.development_status">
                {{ developmentStatusName('reserve', row.development_status) }}
              </span>
            </template>
          </BaseDataTable>
        </BaseCard>

        <BaseCard class="workspace-card">
          <div class="workspace-title">
            <div><h2>Обучение</h2><p>{{ trainingSummary.total ?? training.length }} записей</p></div>
            <RouterLink to="/learning">Открыть реестр <ArrowRight :size="15" /></RouterLink>
          </div>
          <BaseDataTable :rows="training.slice(0, 8)" row-key="id" :loading="loading"
            caption="Обучение сотрудников"
            :columns="[
              { key:'employee', label:'Сотрудник' },
              { key:'topic', label:'Тема' },
              { key:'training_mode', label:'Формат' },
              { key:'started_on', label:'Период' },
              { key:'development_status', label:'Статус' },
            ]"
            empty-title="Обучение не зарегистрировано"
            empty-description="Записи появятся после добавления обучения сотрудникам.">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="employeeRoute(row.employee_id)">{{ personName(row) }}</RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
            </template>
            <template #cell-training_mode="{ value }">{{ trainingModeName(String(value)) }}</template>
            <template #cell-started_on="{ row }">
              {{ displayDate(row.started_on) }} — {{ row.ended_on ? displayDate(row.ended_on) : 'по н.в.' }}
            </template>
            <template #cell-development_status="{ row }">
              <span class="status-pill" :class="'status-pill--' + row.development_status">
                {{ developmentStatusName('training', row.development_status) }}
              </span>
            </template>
          </BaseDataTable>
        </BaseCard>
      </div>
    </template>

    <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
  </section>
</template>

<style scoped>
.employee-development-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.registry-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.registry-breadcrumb img{width:15px;height:15px}
.registry-breadcrumb strong{font-weight:500;color:var(--color-text)}
.development-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.development-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.development-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.company-select{min-width:190px;max-width:280px;flex:1}
.development-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.summary-block{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 9px;min-height:112px}
.summary-block svg{grid-column:2;grid-row:1;color:var(--color-primary)}
.summary-block span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;line-height:1.4}
.summary-block strong{grid-column:1/-1;color:var(--color-primary);font-size:25px;line-height:1.15}
.development-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
.workspace-card{min-width:0}
.workspace-title{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.workspace-title h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.workspace-title p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.workspace-title a{display:inline-flex;align-items:center;gap:5px;color:var(--color-primary);font-size:12px;font-weight:600}
.employee-cell{display:grid;gap:3px;min-width:160px}
.employee-cell a{color:var(--color-text);font-weight:600}
.employee-cell a:hover{color:var(--color-primary)}
.employee-cell span{color:var(--color-muted);font-size:11px}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-soft);font-size:10px;font-weight:700;white-space:nowrap}
.status-pill--active,.status-pill--ongoing{background:var(--color-success-surface);color:var(--color-success)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--completed{background:var(--color-soft);color:var(--color-muted)}
.status-pill--alumni{background:var(--color-warning-surface);color:var(--color-warning)}
@media(max-width:1120px){.development-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.development-grid{grid-template-columns:1fr}}
@media(max-width:650px){
  .development-summary{gap:8px}
  .summary-block{min-height:100px}
  .summary-block strong{font-size:22px}
  .company-select{max-width:none;width:100%}
}
</style>
