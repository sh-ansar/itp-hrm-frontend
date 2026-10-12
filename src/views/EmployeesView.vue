<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'

const companies = ref<CompanyRecord[]>([])
const employees = ref<EmployeeRecord[]>([])
const selectedCompany = ref('')
const companyLoading = ref(false)
const employeeLoading = ref(false)
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

watch(selectedCompany, () => { page.value = 1 })
watch([selectedCompany, page], async ([company, currentPage]) => {
  const current = ++generation
  employees.value = []
  total.value = 0
  lastPage.value = 1
  if (!company) { employeeLoading.value = false; return }
  employeeLoading.value = true
  error.value = ''
  try {
    const response = await listEmployees(company, currentPage)
    if (current !== generation) return
    employees.value = response.data
    total.value = response.meta.total
    lastPage.value = response.meta.last_page
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось получить сотрудников'
  } finally {
    if (current === generation) employeeLoading.value = false
  }
})

onMounted(loadCompanies)
</script>

<template>
  <section class="personnel-page">
    <div class="page-heading">
      <div>
        <h1 class="page-title">Реестр сотрудников</h1>
        <p class="muted">Только сотрудники и поля, разрешённые вашим доступом</p>
      </div>
      <BaseButton variant="secondary" :disabled="companyLoading" @click="loadCompanies">Обновить</BaseButton>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseCard>
      <BaseLoadingState v-if="companyLoading" label="Загрузка доступных компаний" />
      <div v-else-if="companies.length" class="selector">
        <label for="employees-company">Компания</label>
        <select id="employees-company" v-model="selectedCompany">
          <option v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</option>
        </select>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>
    <BaseCard v-if="selectedCompany">
      <div class="section-heading">
        <div>
          <h2>Сотрудники</h2>
          <p class="muted">{{ currentCompany?.name }}</p>
        </div>
        <span class="muted">Всего: {{ total }}</span>
      </div>
      <BaseDataTable :rows="employees" :columns="columns" row-key="id"
        caption="Реестр сотрудников выбранной компании" :loading="employeeLoading"
        empty-title="Доступные сотрудники не найдены"
        empty-description="Нет записей, разрешённых для просмотра в выбранной компании." />
      <nav v-if="lastPage > 1" class="page-controls" aria-label="Страницы реестра сотрудников">
        <BaseButton variant="secondary" :disabled="employeeLoading || page <= 1" @click="page--">Назад</BaseButton>
        <span class="muted">Страница {{ page }} из {{ lastPage }}</span>
        <BaseButton variant="secondary" :disabled="employeeLoading || page >= lastPage" @click="page++">Далее</BaseButton>
      </nav>
    </BaseCard>
  </section>
</template>

<style scoped>
.personnel-page{display:grid;gap:20px}
.page-heading,.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.page-heading p,.section-heading p{margin:0}
.section-heading{margin-bottom:18px}
.section-heading h2{font-size:20px;margin:0}
.selector{display:grid;gap:8px;max-width:540px}
.selector label{font-size:14px;font-weight:600;color:var(--color-text)}
.selector select{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit}
.selector select:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.page-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;font-size:13px}
@media(max-width:600px){.page-heading{align-items:flex-start}.page-heading :deep(button){width:100%}}
</style>
