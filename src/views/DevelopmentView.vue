<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpenCheck, Plus, Search, ShieldCheck } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  developmentStatusName,
  getCompanyDevelopment,
  trainingModeName,
  type DevelopmentMeta,
  type DevelopmentRow,
  type DevelopmentSection,
  type DevelopmentStatus,
  type ReserveRow,
  type TrainingRow,
} from '../api/development'

const props = defineProps<{ section: DevelopmentSection }>()
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const companiesBusy = ref(false)
const loading = ref(false)
const error = ref('')
const rows = ref<DevelopmentRow[]>([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const summary = ref<Record<string, number>>({})
const writesEnabled = ref(false)
const activeStatus = ref('all')
const searchDraft = ref('')
const search = ref('')
const createOpen = ref(false)
const selectedEmployee = ref('')
const editing = ref<TrainingRow | null>(null)
let generation = 0

const isTraining = computed(() => props.section === 'training')
const title = computed(() => isTraining.value ? 'Обучение' : 'Кадровый резерв')
const subtitle = computed(() => isTraining.value
  ? 'Программы, сроки, учебные центры и подтверждающие документы.'
  : 'Целевые должности, уровни, виды резерва и история участия.')
const statusTabs = computed(() => isTraining.value
  ? [
    { id: 'all', label: 'Все программы' },
    { id: 'planned', label: 'Запланировано' },
    { id: 'ongoing', label: 'В процессе' },
    { id: 'completed', label: 'Завершено' },
  ]
  : [
    { id: 'all', label: 'Все записи' },
    { id: 'active', label: 'В резерве' },
    { id: 'alumni', label: 'Выбывшие' },
  ])
const statCards = computed(() => statusTabs.value.map(tab => ({
  id: tab.id,
  title: tab.id === 'all' ? 'Всего записей' : tab.label,
  value: summary.value[tab.id === 'all' ? 'total' : tab.id] ?? null,
})))
const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const columns = computed(() => isTraining.value
  ? [
    { key: 'employee', label: 'Сотрудник' },
    { key: 'topic', label: 'Программа / тема' },
    { key: 'training_mode', label: 'Формат' },
    { key: 'provider', label: 'Учебный центр' },
    { key: 'started_on', label: 'Начало' },
    { key: 'ended_on', label: 'Окончание' },
    { key: 'document_reference', label: 'Документ' },
    { key: 'development_status', label: 'Статус' },
    ...(writesEnabled.value ? [{ key: 'edit', label: '' }] : []),
  ]
  : [
    { key: 'employee', label: 'Сотрудник' },
    { key: 'target_position', label: 'Целевая должность' },
    { key: 'reserve_level', label: 'Уровень' },
    { key: 'reserve_type', label: 'Вид' },
    { key: 'joined_year', label: 'Зачислен' },
    { key: 'left_year', label: 'Исключён' },
    { key: 'development_status', label: 'Статус' },
  ])

function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'
  return value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4)
}
function trainingPeriod(row: TrainingRow): string {
  return displayDate(row.started_on) + ' — ' + (row.ended_on ? displayDate(row.ended_on) : 'по н.в.')
}
function trainingTypeLabel(value: unknown): string {
  const key = String(value ?? '')
  return ({ internal: 'Внутреннее', external: 'Внешнее' } as Record<string, string>)[key] ?? (key || '—')
}
function nameOf(row: DevelopmentRow): string {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}
function employeeRoute(row: DevelopmentRow) {
  return {
    name: 'employee-detail',
    params: { company: company.value, employee: row.employee_id },
    query: { tab: 'development' },
  }
}
function setStatus(next: string) {
  if (activeStatus.value === next) return
  page.value = 1
  activeStatus.value = next
}
function applySearch() {
  const next = searchDraft.value.trim()
  if (next === search.value) return
  page.value = 1
  search.value = next
}
function clearSearch() {
  searchDraft.value = ''
  applySearch()
}
function openCreate() {
  selectedEmployee.value = ''
  createOpen.value = true
}
function editTraining(row: DevelopmentRow) {
  if (!isTraining.value || !writesEnabled.value) return
  editing.value = row as TrainingRow
}

async function loadCompanies() {
  companiesBusy.value = true
  error.value = ''
  try {
    const data = await listCompanies()
    companies.value = data.data
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = data.data[0]?.id ?? ''
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    company.value = ''
    companies.value = []
  } finally {
    companiesBusy.value = false
  }
}

async function loadRecords() {
  const current = ++generation
  const companyId = company.value
  rows.value = []
  total.value = 0
  lastPage.value = 1
  summary.value = {}
  writesEnabled.value = false
  if (!companyId) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await getCompanyDevelopment(companyId, props.section, {
      page: page.value,
      status: activeStatus.value as DevelopmentStatus,
      search: search.value,
    })
    if (current !== generation) return
    rows.value = result.data
    const meta: DevelopmentMeta = result.meta
    total.value = meta.total
    lastPage.value = Math.max(meta.last_page, 1)
    summary.value = meta.summary
    writesEnabled.value = meta.profile_writes_enabled
  } catch (cause) {
    if (current === generation) {
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить реестр'
    }
  } finally {
    if (current === generation) loading.value = false
  }
}

async function recordSaved() {
  createOpen.value = false
  editing.value = null
  page.value = 1
  await loadRecords()
}

watch(() => props.section, () => {
  activeStatus.value = 'all'
  searchDraft.value = ''
  search.value = ''
  page.value = 1
  createOpen.value = false
  editing.value = null
  loadRecords()
})
watch(company, () => {
  page.value = 1
  activeStatus.value = 'all'
  searchDraft.value = ''
  search.value = ''
  createOpen.value = false
  editing.value = null
})
watch([company, page, activeStatus, search], loadRecords)
onMounted(loadCompanies)
</script>

<template>
  <section class="development-page">
    <div class="development-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><RouterLink to="/employees">Сотрудники</RouterLink>
      <span>/</span><strong>{{ title }}</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="companiesBusy" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="development-heading">
        <div>
          <h1>{{ title }}</h1>
          <p>{{ selectedCompany?.name }} · {{ subtitle }}</p>
        </div>
        <div class="heading-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseButton v-if="writesEnabled" @click="openCreate">
            <Plus :size="16" /> {{ isTraining ? 'Добавить обучение' : 'Добавить в резерв' }}
          </BaseButton>
        </div>
      </div>

      <BaseViewTabs :model-value="activeStatus" :options="statusTabs"
        :label="isTraining ? 'Состояния обучения' : 'Состояния кадрового резерва'"
        @update:model-value="setStatus" />

      <div class="development-metrics" aria-label="Сводка реестра">
        <BaseCard v-for="card in statCards" :key="card.id" class="metric">
          <component :is="isTraining ? BookOpenCheck : ShieldCheck" :size="19" aria-hidden="true" />
          <span>{{ card.title }}</span>
          <strong>{{ loading ? '…' : (card.value ?? '—') }}</strong>
        </BaseCard>
      </div>

      <BaseCard class="records-card">
        <div class="records-heading">
          <div>
            <h2>{{ isTraining ? 'Программы обучения' : 'Реестр кадрового резерва' }}</h2>
            <p>{{ loading ? 'Загрузка…' : total + ' записей по фильтру' }}</p>
          </div>
          <span>{{ search ? 'Поиск: «' + search + '»' : 'Все доступные записи' }}</span>
        </div>

        <form role="search" class="records-search" @submit.prevent="applySearch">
          <BaseFormField v-model="searchDraft" label="Поиск" :placeholder="isTraining
            ? 'ФИО, табельный номер или программа' : 'ФИО, табельный номер или должность'" />
          <BaseButton type="submit" variant="secondary"><Search :size="15" /> Найти</BaseButton>
          <BaseButton v-if="search" variant="secondary" @click="clearSearch">Сбросить</BaseButton>
        </form>

        <div class="development-desktop">
          <BaseDataTable :rows="rows" :columns="columns" row-key="id" :loading="loading"
            :caption="isTraining ? 'Общий реестр обучения' : 'Общий реестр кадрового резерва'"
            :empty-title="search ? 'Ничего не найдено' : 'Записей по фильтру нет'"
            :empty-description="search ? 'Уточните запрос или сбросьте поиск.' : 'Записи появятся после внесения их в карточки сотрудников.'">
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="employeeRoute(row)">{{ nameOf(row) }}</RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
            </template>
            <template #cell-topic="{ row }">
              <div class="subject-cell"><strong>{{ row.topic }}</strong><span>{{ trainingTypeLabel(row.training_type) }}</span></div>
            </template>
            <template #cell-training_mode="{ value }">{{ trainingModeName(String(value)) }}</template>
            <template #cell-provider="{ value }">{{ value || '—' }}</template>
            <template #cell-started_on="{ value }">{{ displayDate(value) }}</template>
            <template #cell-ended_on="{ value }">{{ displayDate(value) }}</template>
            <template #cell-document_reference="{ value }">{{ value || '—' }}</template>
            <template #cell-left_year="{ value }">{{ value || '—' }}</template>
            <template #cell-development_status="{ row }">
              <BaseStatusPill :tone="['ongoing', 'active'].includes(row.development_status) ? 'success'
                : row.development_status === 'planned' ? 'info'
                : row.development_status === 'alumni' ? 'warning' : 'neutral'">
                {{ developmentStatusName(section, row.development_status) }}
              </BaseStatusPill>
            </template>
            <template #cell-edit="{ row }">
              <BaseButton variant="secondary" @click="editTraining(row)">Изменить</BaseButton>
            </template>
          </BaseDataTable>
        </div>

        <div class="development-mobile">
          <article v-for="row in rows" :key="row.id" class="development-record-card">
            <header>
              <div class="mobile-person">
                <RouterLink :to="employeeRoute(row)">{{ nameOf(row) }}</RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
              <BaseStatusPill :tone="['ongoing', 'active'].includes(row.development_status) ? 'success'
                : row.development_status === 'planned' ? 'info'
                : row.development_status === 'alumni' ? 'warning' : 'neutral'">
                {{ developmentStatusName(section, row.development_status) }}
              </BaseStatusPill>
            </header>

            <template v-if="isTraining">
              <div class="mobile-subject">
                <strong>{{ (row as TrainingRow).topic }}</strong>
                <span>{{ trainingTypeLabel((row as TrainingRow).training_type) }}</span>
              </div>
              <dl>
                <div><dt>Формат</dt><dd>{{ trainingModeName((row as TrainingRow).training_mode) }}</dd></div>
                <div><dt>Период</dt><dd>{{ trainingPeriod(row as TrainingRow) }}</dd></div>
                <div><dt>Учебный центр</dt><dd>{{ (row as TrainingRow).provider || '—' }}</dd></div>
                <div><dt>Документ</dt><dd>{{ (row as TrainingRow).document_reference || '—' }}</dd></div>
              </dl>
              <footer v-if="writesEnabled">
                <BaseButton variant="secondary" @click="editTraining(row)">Изменить</BaseButton>
              </footer>
            </template>

            <template v-else>
              <div class="mobile-subject">
                <strong>{{ (row as ReserveRow).target_position }}</strong>
                <span>Целевая должность</span>
              </div>
              <dl>
                <div><dt>Уровень</dt><dd>{{ (row as ReserveRow).reserve_level }}</dd></div>
                <div><dt>Вид резерва</dt><dd>{{ (row as ReserveRow).reserve_type }}</dd></div>
                <div><dt>Зачислен</dt><dd>{{ (row as ReserveRow).joined_year }}</dd></div>
                <div><dt>Исключён</dt><dd>{{ (row as ReserveRow).left_year || '—' }}</dd></div>
              </dl>
            </template>
          </article>
          <p v-if="!loading && !rows.length" class="mobile-empty">
            {{ search ? 'Ничего не найдено. Уточните запрос или сбросьте поиск.' : 'Записей по фильтру нет.' }}
          </p>
        </div>

        <BasePagination :page="page" :last-page="lastPage" :loading="loading"
          :caption="'Страницы раздела ' + title" @previous="page--" @next="page++" />
      </BaseCard>
    </template>

    <BaseDialog :open="createOpen" :title="isTraining ? 'Новое обучение' : 'Добавить в кадровый резерв'"
      @close="createOpen = false">
      <div v-if="createOpen && company" class="create-workflow">
        <EmployeeLookupField v-model="selectedEmployee" :company-id="company" required />
        <EmployeeProfileCreateForm v-if="selectedEmployee" :key="selectedEmployee + section"
          :company-id="company" :employee-id="selectedEmployee" :initial-section="section"
          @saved="recordSaved" @cancelled="createOpen = false" />
      </div>
    </BaseDialog>

    <BaseDialog :open="editing !== null" title="Изменить обучение" @close="editing = null">
      <EmployeeProfileCreateForm v-if="editing" :key="editing.id + ':' + editing.revision"
        :company-id="company" :employee-id="editing.employee_id"
        :edit="{ section: 'training', record: editing }"
        @saved="recordSaved" @cancelled="editing = null" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.development-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.development-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.development-breadcrumb img{width:15px;height:15px}
.development-breadcrumb a{color:var(--color-muted)}
.development-breadcrumb a:hover{color:var(--color-primary)}
.development-breadcrumb strong{color:var(--color-text);font-weight:500}
.development-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.development-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.development-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.development-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.metric{display:grid;grid-template-columns:minmax(0,1fr) auto;align-content:start;gap:5px 9px;min-height:104px}
.metric svg{grid-column:2;grid-row:1;color:var(--color-primary)}
.metric span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;font-weight:600}
.metric strong{grid-column:1/-1;color:var(--color-primary);font-size:24px;line-height:1.1}
.records-card{min-width:0}
.records-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.records-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.records-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.records-heading>span{color:var(--color-muted);font-size:10px}
.records-search{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:end;gap:8px;margin-bottom:14px}
.records-search :deep(.field){max-width:none}
.development-desktop{min-width:0}
.development-desktop :deep(.table-scroll){max-width:100%;overflow-x:auto;overflow-y:hidden}
.development-desktop :deep(table){min-width:1050px}
.employee-cell,.subject-cell{display:grid;gap:3px;min-width:0;overflow-wrap:anywhere}
.employee-cell a{color:var(--color-text);font-weight:600;text-decoration:none}
.employee-cell a:hover{color:var(--color-primary)}
.employee-cell span,.subject-cell span{color:var(--color-muted);font-size:10px}
.subject-cell strong{font-weight:600}
.development-mobile{display:none}
.development-record-card{display:grid;gap:11px;padding:13px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)}
.development-record-card header{display:flex;align-items:start;justify-content:space-between;gap:10px}
.mobile-person{display:grid;gap:3px;min-width:0}
.mobile-person a{color:var(--color-text);font-size:13px;font-weight:600;overflow-wrap:anywhere}
.mobile-person a:hover{color:var(--color-primary)}
.mobile-person span{color:var(--color-muted);font-size:10px}
.mobile-subject{display:grid;gap:3px}
.mobile-subject strong{color:var(--color-text);font-size:12px;line-height:1.4}
.mobile-subject span{color:var(--color-muted);font-size:10px}
.development-record-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:0}
.development-record-card dl div{display:grid;gap:3px;min-width:0;padding:8px;background:var(--color-soft);border-radius:var(--radius-sm)}
.development-record-card dt{color:var(--color-muted);font-size:9px}
.development-record-card dd{margin:0;color:var(--color-text);font-size:11px;font-weight:600;overflow-wrap:anywhere}
.development-record-card footer{display:flex;justify-content:flex-end;padding-top:2px}
.development-record-card footer :deep(.base-button){min-width:96px;white-space:nowrap}
.mobile-empty{margin:0;padding:20px 10px;text-align:center;color:var(--color-muted);font-size:11px}
.create-workflow{display:grid;gap:var(--space-5);min-width:0}
@media(max-width:1120px){.development-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){
  .development-desktop{display:none}
  .development-mobile{display:grid;gap:9px}
}
@media(max-width:650px){
  .heading-controls{display:grid;grid-template-columns:1fr;width:100%}
  .heading-controls :deep(.base-select-field){width:100%;max-width:none}
  .heading-controls :deep(.base-button){width:100%}
  .development-metrics{gap:8px}
  .records-search{grid-template-columns:1fr 1fr}
  .records-search :deep(.field){grid-column:1/-1}
  .records-search :deep(.base-button){width:100%}
  .development-record-card dl{grid-template-columns:1fr}
}
</style>
