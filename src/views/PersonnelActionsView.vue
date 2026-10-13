<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowRightLeft, LogIn, LogOut, Plus } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import PersonnelActionForm from '../components/PersonnelActionForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  listPersonnelActions,
  type PersonnelActionRow,
  type PersonnelActionType,
} from '../api/personnelActions'

const companies=ref<CompanyRecord[]>([])
const company=ref('')
const rows=ref<PersonnelActionRow[]>([])
const companyBusy=ref(false)
const busy=ref(false)
const error=ref('')
const page=ref(1)
const pages=ref(1)
const total=ref(0)
const writesEnabled=ref(false)
const typeFilter=ref('')
const createOpen=ref(false)

const selectedCompany=computed(()=>companies.value.find(item=>item.id===company.value)??null)
const filterOptions=[
  {id:'all',name:'Все действия'},
  {id:'hire',name:'Приём'},
  {id:'transfer',name:'Перевод'},
  {id:'termination',name:'Увольнение'},
]

const columns=[
  {key:'effective_on',label:'Дата'},
  {key:'action_type',label:'Действие'},
  {key:'employee',label:'Сотрудник'},
  {key:'transition',label:'Изменение'},
  {key:'basis_reference',label:'Основание'},
]

function actionLabel(type:PersonnelActionType){
  return type==='hire'?'Приём':type==='transfer'?'Перевод':'Увольнение'
}
function employeeName(row:PersonnelActionRow){
  return [row.last_name,row.first_name,row.middle_name].filter(Boolean).join(' ')
}
function transitionText(row:PersonnelActionRow){
  const from=[row.source_position_name,row.source_department_name].filter(Boolean).join(' · ')
  const to=[row.target_position_name,row.target_department_name].filter(Boolean).join(' · ')
  if(row.action_type==='hire') return to||'Назначение не найдено'
  if(row.action_type==='termination') return from?from+' → прекращено':'Назначение прекращено'
  return `${from||'—'} → ${to||'—'}`
}

async function loadCompanies(){
  companyBusy.value=true
  error.value=''
  try{
    const result=await listCompanies()
    companies.value=result.data
    if(!companies.value.some(item=>item.id===company.value)){
      company.value=companies.value[0]?.id??''
    }
  }catch(cause){
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить компании'
    companies.value=[]
    company.value=''
  }finally{companyBusy.value=false}
}

async function loadActions(){
  if(!company.value)return
  busy.value=true
  error.value=''
  try{
    const result=await listPersonnelActions(
      company.value,
      page.value,
      typeFilter.value==='all'||!typeFilter.value?'':typeFilter.value as PersonnelActionType,
    )
    rows.value=result.data
    pages.value=result.meta.last_page
    total.value=result.meta.total
    writesEnabled.value=result.meta.personnel_actions_writes_enabled
  }catch(cause){
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить кадровые действия'
    rows.value=[]
    pages.value=1
    total.value=0
    writesEnabled.value=false
  }finally{busy.value=false}
}

async function saved(){
  createOpen.value=false
  page.value=1
  await loadActions()
}

watch(company,()=>{page.value=1;typeFilter.value='all'})
watch([company,page,typeFilter],loadActions)
onMounted(loadCompanies)
</script>

<template>
  <section class="actions-page">
    <BasePageHeading
      title="Кадровые действия"
      description="Проведённые операции приёма, перевода и увольнения с основаниями и неизменяемым журналом."
    >
      <BaseButton v-if="writesEnabled" @click="createOpen=true"><Plus :size="17" /> Новое действие</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="toolbar">
        <BaseSelectField v-model="company" label="Компания" :options="companies" />
        <BaseSelectField v-model="typeFilter" label="Тип действия" :options="filterOptions" />
        <div class="summary">
          <span>Операций</span>
          <strong>{{ total }}</strong>
          <small>{{ selectedCompany?.name }}</small>
        </div>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>

    <div class="metrics">
      <BaseCard>
        <LogIn :size="19" />
        <span>Приём</span>
        <strong>{{ rows.filter(row=>row.action_type==='hire').length }}</strong>
      </BaseCard>
      <BaseCard>
        <ArrowRightLeft :size="19" />
        <span>Перевод</span>
        <strong>{{ rows.filter(row=>row.action_type==='transfer').length }}</strong>
      </BaseCard>
      <BaseCard>
        <LogOut :size="19" />
        <span>Увольнение</span>
        <strong>{{ rows.filter(row=>row.action_type==='termination').length }}</strong>
      </BaseCard>
    </div>

    <BaseCard v-if="company">
      <div class="section-heading">
        <div>
          <p class="kicker">Журнал операций</p>
          <h2>Кадровые действия</h2>
          <p class="muted">Проведённые записи не редактируются и не удаляются.</p>
        </div>
        <span class="muted">Страница {{ page }} из {{ pages }}</span>
      </div>

      <BaseDataTable
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="busy"
        caption="Журнал кадровых действий"
        empty-title="Кадровых действий пока нет"
        empty-description="Проведённые операции приёма, перевода и увольнения появятся здесь."
      >
        <template #cell-action_type="{ row }">
          <span class="action-pill" :class="'action-pill--'+row.action_type">{{ actionLabel(row.action_type) }}</span>
        </template>
        <template #cell-employee="{ row }">
          <div class="employee-cell"><strong>{{ employeeName(row) }}</strong><span>{{ row.personnel_number }}</span></div>
        </template>
        <template #cell-transition="{ row }">{{ transitionText(row) }}</template>
      </BaseDataTable>

      <BasePagination
        :page="page"
        :last-page="pages"
        :loading="busy"
        caption="Страницы журнала кадровых действий"
        @previous="page--"
        @next="page++"
      />
    </BaseCard>

    <BaseDialog :open="createOpen" title="Новое кадровое действие" @close="createOpen=false">
      <PersonnelActionForm v-if="company" :company-id="company" @saved="saved" @cancelled="createOpen=false" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.actions-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);min-width:0;max-width:100%;overflow-x:clip}
.actions-page>*{min-width:0;max-width:100%}
.toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(180px,.7fr) auto;gap:var(--space-4);align-items:end;min-width:0}
.summary{display:grid;gap:2px;min-width:0;padding:10px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.summary span,.summary small{font-size:11px;color:var(--color-muted)}
.summary strong{font-size:20px}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4)}
.metrics :deep(.base-card){display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
.metrics span{font-size:12px;color:var(--color-muted)}
.metrics strong{font-size:22px}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-heading h2{margin:0;font-size:var(--font-section-heading)}
.kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.section-heading .muted{margin:5px 0 0}
.action-pill{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.action-pill--hire{background:var(--color-success-surface);color:var(--color-success)}
.action-pill--transfer{background:var(--color-accent-soft);color:var(--color-primary)}
.action-pill--termination{background:var(--color-warning-surface);color:var(--color-warning)}
.employee-cell{display:grid;gap:2px;min-width:0;overflow-wrap:anywhere}
.section-heading>div{min-width:0;overflow-wrap:anywhere}
.summary{overflow-wrap:anywhere}
.employee-cell span{font-size:11px;color:var(--color-muted)}
@media(max-width:850px){.toolbar{grid-template-columns:1fr 1fr}.summary{grid-column:1/-1}.metrics{grid-template-columns:1fr}}
@media(max-width:600px){.toolbar{grid-template-columns:1fr}.summary{grid-column:auto}}
</style>
