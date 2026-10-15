<script setup lang="ts">
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowRightLeft, LogIn, LogOut, Plus } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import PersonnelActionForm from '../components/PersonnelActionForm.vue'
import BonusManagementPanel from '../components/BonusManagementPanel.vue'
import { useBonusWorkflowI18n } from '../i18n/bonusWorkflow'
import PersonnelActionMobileList from '../components/PersonnelActionMobileList.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  listPersonnelActions,
  type PersonnelActionRow,
  type PersonnelActionType,
} from '../api/personnelActions'

type ActionFilter = 'all' | PersonnelActionType | 'bonuses'

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const rows = ref<PersonnelActionRow[]>([])
const companyBusy = ref(false)
const busy = ref(false)
const error = ref('')
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const writesEnabled = ref(false)
const typeFilter = ref<ActionFilter>('all')
const createOpen = ref(false)
const summary = ref<{ hire:number; transfer:number; termination:number } | null>(null)

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const { t: bonusT } = useBonusWorkflowI18n()
const actionTabs = computed(() => [
  { id:'all', label:'Все действия' },
  { id:'hire', label:'Приём' },
  { id:'transfer', label:'Перевод' },
  { id:'termination', label:'Увольнение' },
  { id:'bonuses', label:bonusT('title') },
])
const columns = [
  { key:'effective_on', label:'Дата' },
  { key:'action_type', label:'Действие' },
  { key:'employee', label:'Сотрудник' },
  { key:'transition', label:'Изменение' },
  { key:'basis_reference', label:'Основание' },
]

function actionLabel(type: PersonnelActionType) {
  return type === 'hire' ? 'Приём' : type === 'transfer' ? 'Перевод' : 'Увольнение'
}
function employeeName(row: PersonnelActionRow) {
  return [row.last_name,row.first_name,row.middle_name].filter(Boolean).join(' ')
}
function transitionText(row: PersonnelActionRow) {
  const from = [row.source_position_name,row.source_department_name].filter(Boolean).join(' · ')
  const to = [row.target_position_name,row.target_department_name].filter(Boolean).join(' · ')
  if (row.action_type === 'hire') return to || 'Назначение не найдено'
  if (row.action_type === 'termination') return from ? from + ' → прекращено' : 'Назначение прекращено'
  return `${from || '—'} → ${to || '—'}`
}
function displayDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return String(value ?? '—')
  return value.slice(8,10) + '.' + value.slice(5,7) + '.' + value.slice(0,4)
}
function setActionFilter(value: string) {
  typeFilter.value = (['hire','transfer','termination','bonuses'].includes(value) ? value : 'all') as ActionFilter
}

async function loadCompanies() {
  companyBusy.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value))
      company.value = preferCompany(companies.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    companyBusy.value = false
  }
}

let generation = 0
async function loadActions() {
  const companyId = company.value
  const current = ++generation
  if (!companyId || typeFilter.value === 'bonuses') return
  busy.value = true
  error.value = ''
  try {
    const result = await listPersonnelActions(
      companyId,
      page.value,
      ['all','bonuses'].includes(typeFilter.value) ? '' : typeFilter.value as PersonnelActionType,
    )
    if (current !== generation || companyId !== company.value) return
    rows.value = result.data
    pages.value = result.meta.last_page
    total.value = result.meta.total
    writesEnabled.value = result.meta.personnel_actions_writes_enabled
    summary.value = result.meta.summary ?? null
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить кадровые действия'
    rows.value = []
    pages.value = 1
    total.value = 0
    writesEnabled.value = false
    summary.value = null
  } finally {
    if (current === generation) busy.value = false
  }
}

async function saved() {
  createOpen.value = false
  page.value = 1
  await loadActions()
}

watch(company, () => {
  page.value = 1
  typeFilter.value = 'all'
})
watch(typeFilter, () => { page.value = 1 })
watch([company,page,typeFilter], loadActions)
onMounted(loadCompanies)
</script>

<template>
  <section class="actions-page">
    <div class="actions-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Кадровые процессы</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="actions-heading">
        <div>
          <h1>Кадровые процессы</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="actions-heading-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseButton v-if="writesEnabled && typeFilter !== 'bonuses'" @click="createOpen = true">
            <Plus :size="17" /> Новое действие
          </BaseButton>
        </div>
      </div>

      <BaseViewTabs :model-value="typeFilter" :options="actionTabs"
        label="Тип кадрового действия" @update:model-value="setActionFilter" />

      <div v-if="summary && typeFilter !== 'bonuses'" class="action-metrics" aria-label="Сводка кадровых действий">
        <BaseCard class="action-metric">
          <LogIn :size="18" aria-hidden="true" />
          <span>Приём</span>
          <strong>{{ summary.hire }}</strong>
        </BaseCard>
        <BaseCard class="action-metric">
          <ArrowRightLeft :size="18" aria-hidden="true" />
          <span>Перевод</span>
          <strong>{{ summary.transfer }}</strong>
        </BaseCard>
        <BaseCard class="action-metric">
          <LogOut :size="18" aria-hidden="true" />
          <span>Увольнение</span>
          <strong>{{ summary.termination }}</strong>
        </BaseCard>
      </div>

      <BonusManagementPanel v-if="typeFilter === 'bonuses'" :company-id="company" />

      <BaseCard v-else class="action-register">
        <div class="section-heading">
          <div>
            <h2>{{ actionTabs.find(item => item.id === typeFilter)?.label }}</h2>
            <p>Проведённые кадровые операции и основания.</p>
          </div>
          <span>{{ total }} операций</span>
        </div>

        <div class="actions-desktop">
          <BaseDataTable
            :rows="rows"
            :columns="columns"
            row-key="id"
            :loading="busy"
            caption="Журнал кадровых действий"
            empty-title="Кадровых действий пока нет"
            empty-description="Проведённые операции появятся здесь."
          >
            <template #cell-effective_on="{ value }">{{ displayDate(value) }}</template>
            <template #cell-action_type="{ row }">
              <span class="action-pill" :class="'action-pill--' + row.action_type">{{ actionLabel(row.action_type) }}</span>
            </template>
            <template #cell-employee="{ row }">
              <div class="employee-cell">
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id } }">
                  {{ employeeName(row) }}
                </RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
            </template>
            <template #cell-transition="{ row }">{{ transitionText(row) }}</template>
            <template #cell-basis_reference="{ value }">{{ value || '—' }}</template>
          </BaseDataTable>
        </div>

        <div class="actions-mobile">
          <PersonnelActionMobileList :rows="rows" :company-id="company" :loading="busy" />
        </div>

        <BasePagination
          :page="page"
          :last-page="pages"
          :loading="busy"
          caption="Страницы журнала кадровых действий"
          @previous="page--"
          @next="page++"
        />
      </BaseCard>
    </template>

    <BaseDialog :open="createOpen" title="Новое кадровое действие" @close="createOpen = false">
      <PersonnelActionForm v-if="company" :company-id="company" @saved="saved" @cancelled="createOpen = false" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.actions-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.actions-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.actions-breadcrumb img{width:15px;height:15px}
.actions-breadcrumb strong{color:var(--color-text);font-weight:500}
.actions-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.actions-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.actions-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.actions-heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.actions-heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.action-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.action-metric{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;min-height:72px}
.action-metric svg{color:var(--color-primary)}
.action-metric span{color:var(--color-muted);font-size:12px}
.action-metric strong{color:var(--color-text);font-size:21px}
.action-register{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-heading>span{color:var(--color-muted);font-size:11px}
.employee-cell{display:grid;gap:3px;min-width:170px}
.employee-cell a{color:var(--color-text);font-size:13px;font-weight:600}
.employee-cell a:hover{color:var(--color-primary)}
.employee-cell span{color:var(--color-muted);font-size:11px}
.action-pill{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;line-height:1;font-weight:700;white-space:nowrap}
.action-pill--hire{background:var(--color-success-surface);color:var(--color-success)}
.action-pill--transfer{background:var(--color-accent-soft);color:var(--color-primary)}
.action-pill--termination{background:var(--color-warning-surface);color:var(--color-warning)}
.actions-mobile{display:none}
@media(max-width:800px){
  .actions-desktop{display:none}
  .actions-mobile{display:block}
  .action-metrics{grid-template-columns:1fr}
}
@media(max-width:650px){
  .actions-heading-controls{display:grid;grid-template-columns:1fr;width:100%}
  .actions-heading-controls :deep(.base-select-field){width:100%;max-width:none}
  .actions-heading-controls :deep(.base-button){width:100%}
}
</style>
