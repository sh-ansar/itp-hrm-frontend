<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
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
const error = ref('')
const page = ref(1)
const total = ref(0)
const lastPage = ref(1)
let generation = 0

const columns = [
  { key: 'personnel_number', label: 'Табельный номер' },
  { key: 'last_name', label: 'Фамилия' },
  { key: 'first_name', label: 'Имя' },
  { key: 'middle_name', label: 'Отчество' },
  { key: 'details', label: 'Карточка' },
]
const currentCompany = computed(() => companies.value.find(x => x.id === selectedCompany.value))

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
    const response = await listEmployees(company, currentPage)
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

async function employeeCreated(employee: EmployeeRecord) {
  createOpen.value = false
  await router.push({ name: 'employee-detail', params: { company: selectedCompany.value, employee: employee.id } })
}

watch(selectedCompany, () => { page.value = 1 })
watch([selectedCompany, page], loadEmployees)
onMounted(loadCompanies)
</script>

<template>
  <section class="personnel-page">
    <BasePageHeading title="Реестр сотрудников" description="Сотрудники компании и переход в единую кадровую карточку">
      <BaseButton variant="secondary" :disabled="companyLoading" @click="loadCompanies">Обновить</BaseButton>
      <BaseButton v-if="employeeWritesEnabled" @click="createOpen = true"><Plus :size="17" /> Добавить сотрудника</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <div v-else-if="companies.length" class="selector-row">
        <BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" />
        <div class="registry-stat"><span>Сотрудников</span><strong>{{ total }}</strong></div>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>

    <BaseCard v-if="selectedCompany">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Кадровый состав</p>
          <h2>Сотрудники</h2>
          <p class="muted">{{ currentCompany?.name }}</p>
        </div>
        <span class="muted">Страница {{ page }} из {{ lastPage }}</span>
      </div>
      <BaseDataTable :rows="employees" :columns="columns" row-key="id"
        caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
        empty-title="Доступные сотрудники не найдены"
        empty-description="Нет записей, разрешённых для просмотра в выбранной компании.">
        <template #cell-details="{ row }">
          <RouterLink class="employee-link" :to="{ name: 'employee-detail', params: { company: selectedCompany, employee: row.id } }">Открыть карточку</RouterLink>
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
.selector-row{display:flex;align-items:end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.selector-row :deep(.base-select-field){flex:1;min-width:min(100%,320px)}
.registry-stat{display:grid;gap:2px;min-width:110px;padding:10px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.registry-stat span{font-size:11px;color:var(--color-muted)}
.registry-stat strong{font-size:20px}
.employee-link{color:var(--color-primary);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.employee-link:focus-visible{outline:3px solid var(--color-focus)}
</style>
