<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, BriefcaseBusiness, FileText, FolderTree, UserRoundCheck, Users } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
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
  status_label: item.employment_status === 'planned' ? 'Запланирован'
    : item.employment_status === 'archived' ? 'В архиве'
      : item.employment_status === 'unassigned' ? 'Без назначения' : 'Работает',
})))
const actionRows = computed(() => actions.value.map(item => ({
  ...item,
  full_name: [item.last_name, item.first_name, item.middle_name].filter(Boolean).join(' '),
  action_label: ({ hire: 'Приём', transfer: 'Перевод', termination: 'Увольнение' } as Record<string,string>)[item.action_type] || item.action_type,
})))
function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  const [year, month, day] = value.slice(0,10).split('-')
  return day + '.' + month + '.' + year
}

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
      listEmployees(company.id, 1, '', 'active'),
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
    <div class="overview-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Главная</strong>
    </div>

    <div class="overview-heading">
      <div>
        <h1>Главная</h1>
        <p>{{ companyName || 'Кадровая сводка компании' }}</p>
      </div>
    </div>

    <BaseNotice v-if="error" tone="info">{{ error }}</BaseNotice>

    <div class="summary-grid" aria-label="Кадровая сводка">
      <BaseCard class="summary-card">
        <span>Сотрудники</span>
        <Users :size="18" aria-hidden="true" />
        <strong>{{ loading ? '…' : summary.employees ?? '—' }}</strong>
        <RouterLink to="/employees">Открыть реестр <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>Подразделения</span>
        <FolderTree :size="18" aria-hidden="true" />
        <strong>{{ loading ? '…' : summary.departments ?? '—' }}</strong>
        <RouterLink to="/organization">Оргструктура <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>Вакантные ставки</span>
        <BriefcaseBusiness :size="18" aria-hidden="true" />
        <strong>{{ loading ? '…' : summary.vacancies ?? '—' }}</strong>
        <RouterLink to="/staffing">Штатное расписание <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
      <BaseCard class="summary-card">
        <span>Кадровые события</span>
        <UserRoundCheck :size="18" aria-hidden="true" />
        <strong>{{ loading ? '…' : summary.actions ?? '—' }}</strong>
        <RouterLink to="/personnel-actions">Открыть журнал <ArrowRight :size="14" /></RouterLink>
      </BaseCard>
    </div>

    <BaseCard class="overview-register">
      <div class="section-title">
        <div><h2>Сотрудники</h2><p>Последние записи реестра</p></div>
        <RouterLink to="/employees">Все сотрудники <ArrowRight :size="15" /></RouterLink>
      </div>
      <BaseDataTable :rows="employeeRows" :columns="[
        { key: 'full_name', label: 'ФИО / Подразделение' },
        { key: 'personnel_number', label: 'Таб. №' },
        { key: 'current_position_name', label: 'Должность' },
        { key: 'status_label', label: 'Статус' },
        { key: 'details', label: '' },
      ]" row-key="id" :loading="loading"
        caption="Последние записи реестра сотрудников" empty-title="Сотрудники не найдены"
        empty-description="В выбранной компании нет доступных сотрудников.">
        <template #cell-full_name="{ row }">
          <div class="person-cell">
            <strong>{{ row.full_name }}</strong>
            <span>{{ row.current_department_name || 'Без подразделения' }}</span>
          </div>
        </template>
        <template #cell-current_position_name="{ value }">{{ value || '—' }}</template>
        <template #cell-status_label="{ row }">
          <span class="status-pill" :class="'status-pill--' + (row.employment_status ?? 'unassigned')">{{ row.status_label }}</span>
        </template>
        <template #cell-details="{ row }">
          <RouterLink class="detail-link" :to="{ name: 'employee-detail', params: { company: companyId, employee: row.id } }">
            Открыть
          </RouterLink>
        </template>
      </BaseDataTable>
    </BaseCard>

    <BaseCard class="overview-register">
      <div class="section-title">
        <div><h2>Последние кадровые действия</h2><p>Приём, перевод и увольнение сотрудников</p></div>
        <RouterLink to="/personnel-actions">Весь журнал <ArrowRight :size="15" /></RouterLink>
      </div>
      <BaseDataTable :rows="actionRows" :columns="[
        { key: 'effective_on', label: 'Дата' },
        { key: 'full_name', label: 'Сотрудник' },
        { key: 'action_label', label: 'Действие' },
        { key: 'basis_reference', label: 'Основание' },
      ]" row-key="id" :loading="loading"
        caption="Последние кадровые действия компании"
        empty-title="Кадровых действий нет"
        empty-description="Записи появятся после оформления кадровых операций.">
        <template #cell-effective_on="{ value }">{{ displayDate(value) }}</template>
      </BaseDataTable>
    </BaseCard>

    <RouterLink class="documents-link" to="/documents">
      <FileText :size="17" aria-hidden="true" />
      <span>Документы и приказы</span>
      <ArrowRight :size="15" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.overview-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.overview-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.overview-breadcrumb img{width:15px;height:15px}
.overview-breadcrumb strong{color:var(--color-text);font-weight:500}
.overview-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.overview-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.overview-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px;line-height:1.4}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.summary-card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-content:start;gap:6px 9px;min-height:118px}
.summary-card>span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;line-height:1.4;font-weight:600}
.summary-card>svg{grid-column:2;grid-row:1;color:var(--color-primary)}
.summary-card>strong{grid-column:1/-1;color:var(--color-primary);font-size:25px;line-height:1.15;font-weight:700}
.summary-card>a{grid-column:1/-1;display:inline-flex;align-items:center;gap:5px;width:max-content;color:var(--color-muted);font-size:11px;line-height:1.4;font-weight:600}
.summary-card>a:hover{color:var(--color-primary)}
.overview-register{min-width:0}
.section-title{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-title h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-title p{margin:4px 0 0;color:var(--color-muted);font-size:11px;line-height:1.4}
.section-title a{display:inline-flex;align-items:center;gap:5px;color:var(--color-primary);font-size:12px;font-weight:600}
.person-cell{display:grid;gap:3px;min-width:180px}
.person-cell strong{color:var(--color-text);font-size:13px;line-height:1.4;font-weight:600}
.person-cell span{color:var(--color-muted);font-size:11px;line-height:1.4}
.detail-link{color:var(--color-primary);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-soft);font-size:10px;font-weight:700;white-space:nowrap}
.status-pill--active{background:var(--color-success-surface);color:var(--color-success)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.status-pill--archived{background:var(--color-danger-surface);color:var(--color-danger)}
.status-pill--unassigned{background:var(--color-warning-surface);color:var(--color-warning)}
.documents-link{
  display:inline-flex;align-items:center;gap:7px;width:max-content;max-width:100%;
  color:var(--color-primary);font-size:12px;line-height:1.4;font-weight:600
}
.documents-link:hover{text-decoration:underline;text-underline-offset:3px}
@media(max-width:1050px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){
  .summary-grid{gap:8px}
  .summary-card{min-height:106px}
  .summary-card>strong{font-size:22px}
  .overview-register{padding:13px}
  .section-title{align-items:flex-start}
}
</style>

