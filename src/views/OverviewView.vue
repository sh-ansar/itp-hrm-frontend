<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, BriefcaseBusiness, FileText, FolderTree, UserRoundCheck, Users } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import { listCompanies, listDepartments } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { listPersonnelActions, type PersonnelActionRow } from '../api/personnelActions'
import { getStaffingPlan, listStaffingPlans } from '../api/staffing'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'

const companyId = ref('')
const companyName = ref('')
const loading = ref(true)
const error = ref('')
const employees = ref<EmployeeRecord[]>([])
const actions = ref<PersonnelActionRow[]>([])
const summary = ref({
  employees: null as number | null,
  departments: null as number | null,
  vacancies: null as number | null,
  actions: null as number | null,
})
const employeeRows = computed(() => employees.value.map(item => ({
  ...item,
  full_name: [item.last_name, item.first_name, item.middle_name].filter(Boolean).join(' '),
})))
const actionRows = computed(() => actions.value.map(item => ({
  ...item,
  full_name: [item.last_name, item.first_name, item.middle_name].filter(Boolean).join(' '),
  action_label: ({ hire: 'Приём', transfer: 'Перевод', termination: 'Увольнение' } as Record<string,string>)[item.action_type] || item.action_type,
})))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const companies = await listCompanies()
    const company = companies.data[0]
    if (!company) {
      error.value = 'Нет доступных компаний'
      return
    }
    companyId.value = company.id
    companyName.value = company.name

    const results = await Promise.allSettled([
      listEmployees(company.id),
      listDepartments(company.id),
      listPersonnelActions(company.id),
      listStaffingPlans(company.id),
    ])
    if (results[0].status === 'fulfilled') {
      employees.value = results[0].value.data.slice(0, 6)
      summary.value.employees = results[0].value.meta.total
    }
    if (results[1].status === 'fulfilled')
      summary.value.departments = results[1].value.meta.total
    if (results[2].status === 'fulfilled') {
      actions.value = results[2].value.data.slice(0, 5)
      summary.value.actions = results[2].value.meta.total
    }
    if (results[3].status === 'fulfilled') {
      const preferred = preferredApprovedStaffingPlan(results[3].value.data)
      if (preferred) {
        try {
          const detail = await getStaffingPlan(company.id, preferred.id)
          summary.value.vacancies = detail.lines.reduce(
            (total, line) => total + Number(line.vacant_units || 0), 0)
        } catch { summary.value.vacancies = null }
      }
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось получить кадровую сводку'
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="overview-page">
    <BasePageHeading title="Обзор системы" :description="companyName || 'Кадровые данные компании'" />
    <BaseNotice v-if="error" tone="info">{{ error }}</BaseNotice>

    <div class="summary-grid">
      <BaseCard class="summary-card">
        <span>СОТРУДНИКИ</span><strong>{{ loading ? '…' : summary.employees ?? '—' }}</strong><Users :size="21" />
        <RouterLink to="/employees">Открыть реестр <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>ПОДРАЗДЕЛЕНИЯ</span><strong>{{ loading ? '…' : summary.departments ?? '—' }}</strong><FolderTree :size="21" />
        <RouterLink to="/organization">Оргструктура <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>ВАКАНТНЫЕ СТАВКИ</span><strong>{{ loading ? '…' : summary.vacancies ?? '—' }}</strong><BriefcaseBusiness :size="21" />
        <RouterLink to="/staffing">Штатное расписание <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>КАДРОВЫЕ СОБЫТИЯ</span><strong>{{ loading ? '…' : summary.actions ?? '—' }}</strong><UserRoundCheck :size="21" />
        <RouterLink to="/personnel-actions">Журнал действий <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
    </div>

    <BaseCard class="overview-register">
      <div class="section-title">
        <h2>Реестр сотрудников</h2>
        <RouterLink to="/employees">Все сотрудники <ArrowRight :size="16" /></RouterLink>
      </div>
      <BaseDataTable :rows="employeeRows" :columns="[
        { key: 'full_name', label: 'ФИО / Подразделение' },
        { key: 'personnel_number', label: 'Таб. №' },
        { key: 'current_position_name', label: 'Должность' },
        { key: 'details', label: '' },
      ]" row-key="id" :loading="loading"
        caption="Последние записи реестра сотрудников" empty-title="Сотрудники не найдены"
        empty-description="В выбранной компании нет доступных сотрудников.">
        <template #cell-full_name="{ row }">
          <div class="person-cell"><strong>{{ row.full_name }}</strong>
            <span>{{ row.current_department_name || 'Без подразделения' }}</span></div>
        </template>
        <template #cell-current_position_name="{ value }">{{ value || '—' }}</template>
        <template #cell-details="{ row }">
          <RouterLink class="detail-link" :to="{ name: 'employee-detail', params: { company: companyId, employee: row.id } }">Открыть</RouterLink>
        </template>
      </BaseDataTable>
    </BaseCard>

    <BaseCard v-if="actions.length || loading" class="overview-register">
      <div class="section-title">
        <h2>Кадровые действия</h2>
        <RouterLink to="/personnel-actions">Весь журнал <ArrowRight :size="16" /></RouterLink>
      </div>
      <BaseDataTable :rows="actionRows" :columns="[
        { key: 'effective_on', label: 'Дата' },
        { key: 'full_name', label: 'Сотрудник' },
        { key: 'action_label', label: 'Действие' },
        { key: 'basis_reference', label: 'Основание' },
      ]" row-key="id" :loading="loading" caption="Кадровые действия компании" />
    </BaseCard>

    <div class="secondary-link"><FileText :size="17" /><RouterLink to="/documents">Документы и приказы <ArrowRight :size="15" /></RouterLink></div>
  </section>
</template>

<style scoped>
.overview-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);min-width:0}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-3)}
.summary-card{position:relative;display:grid;align-content:space-between;gap:10px;min-height:138px}
.summary-card>span{font-size:11px;line-height:1.35;font-weight:700;letter-spacing:.025em;color:var(--color-text)}
.summary-card>strong{font-size:29px;font-weight:700;line-height:1.1;color:var(--color-primary)}
.summary-card>svg{position:absolute;right:21px;top:22px;color:var(--color-muted)}
.summary-card a{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--color-muted);font-weight:600}
.summary-card a:hover{color:var(--color-primary)}
.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-title h2{font-size:20px;margin:0;letter-spacing:-.02em}
.section-title a{display:inline-flex;align-items:center;gap:7px;color:var(--color-primary);font-size:13px;font-weight:700}
.person-cell{display:grid;gap:3px;min-width:180px}
.person-cell strong{font-size:13px}
.person-cell span{font-size:11px;color:var(--color-muted)}
.detail-link{color:var(--color-primary);text-decoration:underline;text-underline-offset:3px;font-weight:600}
.secondary-link{display:flex;align-items:center;gap:8px;color:var(--color-muted);font-size:13px}
.secondary-link a{color:var(--color-primary);display:inline-flex;align-items:center;gap:5px}
@media(max-width:1050px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.summary-grid{gap:8px}.summary-card{min-height:116px}.summary-card>strong{font-size:24px}.summary-card>svg{right:12px;top:12px}}
</style>
