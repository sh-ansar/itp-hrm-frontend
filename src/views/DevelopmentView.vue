<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpenCheck, Plus, ShieldCheck } from 'lucide-vue-next'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  getCompanyDevelopment, trainingModeName, developmentStatusName,
  type DevelopmentSection, type DevelopmentStatus, type DevelopmentRow,
  type DevelopmentMeta, type TrainingRow, type ReserveRow,
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
let generation = 0

const isTraining = computed(() => props.section === 'training')
const title = computed(() => isTraining.value ? 'Обучение' : 'Кадровый резерв')
const description = computed(() => isTraining.value
  ? 'Обучение сотрудников, программы, сроки и подтверждающие документы.'
  : 'Сотрудники кадрового резерва, целевые должности и история участия.')
const statusTabs = computed(() => isTraining.value
  ? [{ id: 'all', label: 'Все программы' }, { id: 'planned', label: 'Запланировано' },
    { id: 'ongoing', label: 'В процессе' }, { id: 'completed', label: 'Завершено' }]
  : [{ id: 'all', label: 'Все записи' }, { id: 'active', label: 'В резерве' }, { id: 'alumni', label: 'Выбывшие' }])
const statCards = computed(() => statusTabs.value.map(tab => ({
  id: tab.id, title: tab.id === 'all' ? 'Всего записей' : tab.label,
  value: summary.value[tab.id === 'all' ? 'total' : tab.id] ?? null,
})))
const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
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
const editing = ref<TrainingRow | null>(null)

function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—'
  return value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(0, 4)
}

function nameOf(row: DevelopmentRow): string {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ')
}
function employeeRoute(row: DevelopmentRow) {
  return {
    name: 'employee-detail',
    params: { company: company.value, employee: row.employee_id },
    query: { tab: props.section },
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
async function loadCompanies() {
  companiesBusy.value = true
  error.value = ''
  try {
    const data = await listCompanies()
    companies.value = data.data
    company.value = data.data[0]?.id ?? ''
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
  if (!companyId) { loading.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const result = await getCompanyDevelopment(companyId, props.section, {
      page: page.value, status: activeStatus.value as DevelopmentStatus, search: search.value,
    })
    if (current !== generation) return
    rows.value = result.data
    const meta: DevelopmentMeta = result.meta
    total.value = meta.total
    lastPage.value = Math.max(meta.last_page, 1)
    summary.value = meta.summary
    writesEnabled.value = meta.profile_writes_enabled
  } catch (cause) {
    if (current === generation)
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить реестр'
  } finally {
    if (current === generation) loading.value = false
  }
}
function openCreate() {
  selectedEmployee.value = ''
  createOpen.value = true
}
async function recordSaved() {
  createOpen.value = false
  editing.value = null
  page.value = 1
  await loadRecords()
}
function editTraining(row: DevelopmentRow) {
  if (!isTraining.value || !writesEnabled.value) return
  editing.value = row as TrainingRow
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
  <section class="development-page" :class="{ 'development-page--training': isTraining }">
    <BasePageHeading :title="title" :description="description">
      <BaseButton v-if="writesEnabled" @click="openCreate"><Plus :size="16" /> Добавить запись</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseViewTabs :model-value="activeStatus" :options="statusTabs"
      :label="isTraining ? 'Состояния обучения' : 'Состояния кадрового резерва'"
      @update:model-value="setStatus" />

    <div class="development-metrics" aria-label="Сводка реестра">
      <BaseCard v-for="card in statCards" :key="card.id" class="metric">
        <component :is="isTraining ? BookOpenCheck : ShieldCheck" :size="19" aria-hidden="true" />
        <span>{{ card.title }}</span>
        <strong>{{ card.value ?? '—' }}</strong>
      </BaseCard>
    </div>

    <BaseCard class="records-card">
      <BaseLoadingState v-if="companiesBusy" label="Загрузка компаний" />
      <template v-else-if="companies.length">
        <div class="records-toolbar">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <form role="search" class="records-search" @submit.prevent="applySearch">
            <BaseFormField v-model="searchDraft" label="Поиск" :placeholder="isTraining
              ? 'ФИО, табельный номер или программа' : 'ФИО, табельный номер или должность'" />
            <BaseButton type="submit" variant="secondary">Найти</BaseButton>
            <BaseButton v-if="search" variant="secondary" @click="clearSearch">Сбросить</BaseButton>
          </form>
        </div>

        <div class="records-heading">
          <div>
            <h2>{{ isTraining ? 'Программы обучения' : 'Реестр кадрового резерва' }}</h2>
            <p>{{ selectedCompany?.name }} · {{ loading ? 'Загрузка…' : total + ' записей по фильтру' }}</p>
          </div>
        </div>

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
            <div class="subject-cell"><strong>{{ row.topic }}</strong><span>{{ row.training_type }}</span></div>
          </template>
          <template #cell-training_mode="{ value }">{{ trainingModeName(String(value)) }}</template>
          <template #cell-provider="{ value }">{{ value || '—' }}</template>
          <template #cell-started_on="{ value }">{{ displayDate(value) }}</template>
          <template #cell-ended_on="{ value }">{{ displayDate(value) }}</template>
          <template #cell-document_reference="{ value }">{{ value || '—' }}</template>
          <template #cell-left_year="{ value }">{{ value || '—' }}</template>
          <template #cell-development_status="{ row }">
            <span class="status-pill" :class="'status-pill--' + row.development_status">
              {{ developmentStatusName(section, row.development_status) }}
            </span>
          </template>
          <template #cell-edit="{ row }">
            <BaseButton variant="secondary" @click="editTraining(row)">Изменить</BaseButton>
          </template>
        </BaseDataTable>
        <BasePagination :page="page" :last-page="lastPage" :loading="loading"
          :caption="'Страницы раздела ' + title" @previous="page--" @next="page++" />
      </template>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>

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
.development-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);min-width:0;max-width:100%;overflow-x:clip}
.development-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3)}
.metric{display:grid;grid-template-columns:1fr auto;align-items:center;gap:9px}
.metric svg{grid-column:2;grid-row:1;color:var(--color-primary)}
.metric span{grid-column:1;grid-row:1;font-size:12px;color:var(--color-muted);line-height:1.4}
.metric strong{grid-column:1/-1;font-size:26px;line-height:1.15;color:var(--color-text)}
.records-card{min-width:0;overflow:visible}
/* Wide HR tables scroll inside the card; never squash date cells or actions. */
.development-page--training .records-card :deep(table){min-width:1290px}
.development-page--training .records-card :deep(td:nth-child(5)),
.development-page--training .records-card :deep(td:nth-child(6)){white-space:nowrap}
.records-card :deep(td button){white-space:nowrap;min-width:94px}
.records-card :deep(.table-scroll){max-width:100%;overflow-x:auto}
.records-toolbar{display:grid;grid-template-columns:minmax(185px,.8fr) minmax(0,1.8fr);align-items:end;gap:var(--space-4);margin-bottom:var(--space-4)}
.records-search{display:flex;align-items:end;gap:var(--space-2);min-width:0}
.records-search :deep(.field){flex:1}
.records-search :deep(button){white-space:nowrap}
.records-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:var(--space-3);flex-wrap:wrap}
.records-heading h2{font-size:var(--font-section-heading);margin:0}
.records-heading p{margin:6px 0 0;font-size:12px;color:var(--color-muted)}
.employee-cell,.subject-cell{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.employee-cell a{color:var(--color-text);font-weight:700;text-decoration:none}
.employee-cell a:hover{color:var(--color-primary);text-decoration:underline;text-underline-offset:3px}
.employee-cell a:focus-visible{outline:3px solid var(--color-focus)}
.employee-cell span,.subject-cell span{color:var(--color-muted);font-size:11px}
.subject-cell strong{font-weight:600}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-soft);color:var(--color-muted);font-size:11px;font-weight:700;white-space:nowrap}
.status-pill--ongoing,.status-pill--active{background:var(--color-success-surface);color:var(--color-success)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--completed{background:var(--color-soft);color:var(--color-muted)}
.status-pill--alumni{background:var(--color-warning-surface);color:var(--color-warning)}
.create-workflow{display:grid;gap:var(--space-5);min-width:0}
@media(max-width:1120px){.development-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:790px){.records-toolbar{grid-template-columns:1fr}}
@media(max-width:520px){.records-search{flex-wrap:wrap}.records-search :deep(.field){flex:1 0 100%}.records-search :deep(button){flex:1}.metric strong{font-size:23px}}
</style>
