<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'

const router = useRouter()
const companies = ref<CompanyRecord[]>([])
const employees = ref<EmployeeRecord[]>([])
const selectedCompany = ref('')
const companyLoading = ref(false)
const employeeLoading = ref(false)
const employeeWritesEnabled = ref(false)
const createOpen = ref(false)
const searchInput = ref('')
const search = ref('')
const error = ref('')
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)
let generation = 0

const columns = [
  { key: 'personnel_number', label: 'Табельный №' },
  { key: 'full_name', label: 'Сотрудник' },
  { key: 'current_position_name', label: 'Должность' },
  { key: 'current_department_name', label: 'Подразделение' },
  { key: 'status', label: 'Статус' },
  { key: 'details', label: '' },
]
const currentCompany = computed(() => companies.value.find(x => x.id === selectedCompany.value))
const registryRows = computed(() => employees.value.map(employee => ({
  ...employee,
  full_name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' '),
  status: employee.current_position_name ? 'Активный' : 'Без назначения',
})))

async function loadCompanies() {
  companyLoading.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(x => x.id === selectedCompany.value)) {
      selectedCompany.value = companies.value[0]?.id ?? ''
    }
  } catch (cause) {
    companies.value = []
    selectedCompany.value = ''
    error.value = cause instanceof Error ? cause.message : 'Не удалось получить компании'
  } finally {
    companyLoading.value = false
  }
}

async function loadEmployees() {
  const company = selectedCompany.value
  const currentPage = page.value
  const current = ++generation
  employees.value = []
  total.value = 0
  lastPage.value = 1
  employeeWritesEnabled.value = false
  if (!company) { employeeLoading.value = false; return }
  employeeLoading.value = true
  error.value = ''
  try {
    const response = await listEmployees(company, currentPage, search.value)
    if (current !== generation) return
    employees.value = response.data
    total.value = response.meta.total
    lastPage.value = response.meta.last_page
    employeeWritesEnabled.value = response.meta.employee_writes_enabled
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось получить сотрудников'
  } finally {
    if (current === generation) employeeLoading.value = false
  }
}

function applySearch() {
  page.value = 1
  search.value = searchInput.value.trim()
}

function clearSearch() {
  searchInput.value = ''
  page.value = 1
  search.value = ''
}

async function employeeCreated(employee: EmployeeRecord) {
  createOpen.value = false
  await router.push({ name: 'employee-detail', params: { company: selectedCompany.value, employee: employee.id } })
}

watch(selectedCompany, () => {
  page.value = 1
  searchInput.value = ''
  search.value = ''
})
watch([selectedCompany, page, search], loadEmployees)
onMounted(loadCompanies)
</script>

<template>
  <section class="personnel-page">
    <BasePageHeading title="Реестр сотрудников" description="Сотрудники компании, текущие назначения и единая кадровая карточка">
      <BaseButton variant="secondary" :disabled="companyLoading" @click="loadCompanies">Обновить</BaseButton>
      <BaseButton v-if="employeeWritesEnabled" @click="createOpen = true"><Plus :size="17" /> Добавить сотрудника</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <div v-else-if="companies.length" class="filters">
        <BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" />
        <form class="search-form" @submit.prevent="applySearch">
          <BaseFormField v-model="searchInput" label="Поиск" placeholder="ФИО или табельный номер" :disabled="employeeLoading" />
          <BaseButton type="submit" variant="secondary" :disabled="employeeLoading"><Search :size="16" /> Найти</BaseButton>
          <BaseButton v-if="search" type="button" variant="secondary" :disabled="employeeLoading" @click="clearSearch"><X :size="16" /> Сбросить</BaseButton>
        </form>
        <div class="registry-stat"><span>{{ search ? 'Найдено' : 'Сотрудников' }}</span><strong>{{ total }}</strong></div>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>

    <BaseCard v-if="selectedCompany">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Кадровый состав</p>
          <h2>Сотрудники</h2>
          <p class="muted">{{ currentCompany?.name }}<template v-if="search"> · поиск «{{ search }}»</template></p>
        </div>
        <span class="muted">Страница {{ page }} из {{ lastPage }}</span>
      </div>

      <BaseDataTable :rows="registryRows" :columns="columns" row-key="id"
        caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
        empty-title="Сотрудники не найдены"
        :empty-description="search ? 'Измените поисковый запрос или сбросьте фильтр.' : 'Нет записей, разрешённых для просмотра в выбранной компании.'">
        <template #cell-current_position_name="{ value }">{{ value ?? '—' }}</template>
        <template #cell-current_department_name="{ value }">{{ value ?? '—' }}</template>
        <template #cell-status="{ row }">
          <span class="status-pill" :class="{ 'status-pill--inactive': !row.current_position_name }">{{ row.status }}</span>
        </template>
        <template #cell-details="{ row }">
          <RouterLink class="employee-link" :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">Открыть</RouterLink>
        </template>
      </BaseDataTable>

      <BasePagination :page="page" :last-page="lastPage" :loading="employeeLoading"
        caption="Страницы реестра сотрудников" @previous="page--" @next="page++" />
    </BaseCard>

    <BaseDialog :open="createOpen" title="Новый сотрудник" @close="createOpen = false">
      <EmployeeRecordForm v-if="selectedCompany" :company-id="selectedCompany" @saved="employeeCreated" @cancelled="createOpen = false" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.personnel-page{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.section-heading h2{font-size:var(--font-section-heading);margin:0}
.section-heading .muted{margin:5px 0 0}
.section-kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.filters{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(380px,1.3fr) auto;align-items:end;gap:16px}
.search-form{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;align-items:end;gap:8px}
.registry-stat{display:grid;gap:2px;min-width:110px;padding:10px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.registry-stat span{font-size:11px;color:var(--color-muted)}
.registry-stat strong{font-size:20px}
.status-pill{display:inline-flex;padding:5px 8px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:11px;font-weight:700;white-space:nowrap}
.status-pill--inactive{background:var(--color-warning-surface);color:var(--color-warning)}
.employee-link{color:var(--color-primary);font-weight:600;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.employee-link:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:980px){.filters{grid-template-columns:1fr}.search-form{grid-template-columns:minmax(0,1fr) auto auto}.registry-stat{width:max-content}}
@media(max-width:600px){.search-form{grid-template-columns:1fr}.search-form :deep(button){width:100%}}
</style>
