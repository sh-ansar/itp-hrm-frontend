<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import DashboardMetricCard from '../components/ui/DashboardMetricCard.vue'
import DashboardSectionHeading from '../components/ui/DashboardSectionHeading.vue'
import DashboardTableToolbar from '../components/ui/DashboardTableToolbar.vue'
import { listCompanies } from '../api/organization'
import { listEmployees, type EmployeeRecord, type EmploymentFilter } from '../api/personnel'
import { listPersonnelActions, type PersonnelActionRow } from '../api/personnelActions'
import { listDocuments } from '../api/documents'
import { getStaffingPlan, listStaffingPlans, type StaffingPlanLine } from '../api/staffing'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'

type EmployeeRow = EmployeeRecord & { full_name:string; gender_label:string; status_label:string }
type ActionRow = PersonnelActionRow & { full_name:string; action_label:string }
const companyId=ref('')
const companyName=ref('')
const loading=ref(true)
const staffLoading=ref(false)
const error=ref('')
const staffError=ref('')
const staffingError=ref('')
const employees=ref<EmployeeRecord[]>([])
const actions=ref<PersonnelActionRow[]>([])
const staffing=ref<StaffingPlanLine[]>([])
const personnelTotal=ref<number|null>(null)
const documentsTotal=ref<number|null>(null)
const documentExpiryAvailable=ref(false)
const hiresThisMonth=ref<number|null>(null)
const employeeQuery=ref('')
const employeeStatus=ref('active')
const vacancyQuery=ref('')
const vacancySearch=ref('')
const vacancyDepartment=ref('all')
const staffCount=ref(0)

const employeeOptions=[
  {id:'active',label:'Работают'},
  {id:'all',label:'Все сотрудники'},
  {id:'planned',label:'Приём запланирован'},
  {id:'unassigned',label:'Без назначения'},
  {id:'archived',label:'Архив'},
]
const employeeRows=computed<EmployeeRow[]>(()=>employees.value.slice(0,6).map(e=>({
  ...e,
  full_name:[e.last_name,e.first_name,e.middle_name].filter(Boolean).join(' '),
  gender_label:e.gender==='male'?'М':e.gender==='female'?'Ж':'—',
  status_label:e.employment_status==='planned'?'Запланирован'
    :e.employment_status==='archived'?'В архиве'
      :e.employment_status==='unassigned'?'Без назначения':'Работает',
})))
const staffStatusTone=(status:unknown):'success'|'info'|'danger'|'warning'=>status==='active'?'success'
  :status==='planned'?'info':status==='archived'?'danger':'warning'
const actionRows=computed<ActionRow[]>(()=>actions.value.slice(0,5).map(a=>({
  ...a,
  full_name:[a.last_name,a.first_name,a.middle_name].filter(Boolean).join(' '),
  action_label:({hire:'Приём',transfer:'Перевод',termination:'Увольнение'} as Record<string,string>)[a.action_type]??a.action_type,
})))
const vacancyRows=computed(()=>staffing.value.filter(row=>Number(row.vacant_units)>0))
const vacancyDepartments=computed(()=>[
  {id:'all',label:'Все подразделения'},
  ...[...new Map(vacancyRows.value.map(row=>[row.department_id,row.department_name])).entries()]
    .sort((a,b)=>a[1].localeCompare(b[1],'ru'))
    .map(([id,label])=>({id,label})),
])
const visibleVacancies=computed(()=>vacancyRows.value.filter(row=>
  (vacancyDepartment.value==='all'||row.department_id===vacancyDepartment.value)
  &&(!vacancySearch.value||[row.position_name,row.department_name].join(' ').toLowerCase().includes(vacancySearch.value.toLowerCase()))
).slice(0,6))
const plannedUnits=computed(()=>staffing.value.reduce((s,row)=>s+Number(row.planned_units||0),0))
const vacantUnits=computed(()=>staffing.value.reduce((s,row)=>s+Number(row.vacant_units||0),0))
const vacancyShare=computed(()=>plannedUnits.value>0?100*vacantUnits.value/plannedUnits.value:null)
const newHireShare=computed(()=>hiresThisMonth.value!==null&&staffCount.value>0?100*hiresThisMonth.value/staffCount.value:null)

const employeeColumns=[
  {key:'full_name',label:'ФИО / Отдел'},
  {key:'personnel_number',label:'Таб. №'},
  {key:'birth_date',label:'Дата рождения'},
  {key:'current_assignment_valid_from',label:'Дата назначения'},
  {key:'gender_label',label:'Пол'},
  {key:'status_label',label:'Статус'},
  {key:'current_position_name',label:'Должность'},
  {key:'details',label:'Действия'},
]
const vacancyColumns=[
  {key:'position_name',label:'Должность'},
  {key:'department_name',label:'Подразделение'},
  {key:'planned_units',label:'Ставок'},
  {key:'occupied_units',label:'Занято'},
  {key:'vacant_units',label:'Вакантно'},
  {key:'base_salary',label:'Базовый оклад'},
  {key:'status',label:'Статус'},
]
const actionColumns=[
  {key:'effective_on',label:'Дата'},
  {key:'full_name',label:'Сотрудник'},
  {key:'action_label',label:'Действие'},
  {key:'basis_reference',label:'Основание'},
]
function formatDate(value:unknown):string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(value))return '—'
  const [year,month,day]=value.slice(0,10).split('-')
  return day+'.'+month+'.'+year
}
function formatUnits(value:number):string{
  return Number(value).toLocaleString('ru-RU',{maximumFractionDigits:2})
}
function salary(line:StaffingPlanLine):string{
  return line.base_salary===null?'—':Number(line.base_salary).toLocaleString('ru-RU')+' '+(line.currency??'')
}
let staffGeneration=0
async function refreshEmployees(){
  if(!companyId.value)return
  const myGeneration=++staffGeneration
  staffLoading.value=true
  staffError.value=''
  try{
    const result=await listEmployees(companyId.value,1,employeeQuery.value,employeeStatus.value as EmploymentFilter)
    if(myGeneration!==staffGeneration)return
    employees.value=result.data
    personnelTotal.value=result.meta.total
  }catch(cause){
    if(myGeneration===staffGeneration)staffError.value=cause instanceof Error?cause.message:'Не удалось загрузить сотрудников'
  }finally{
    if(myGeneration===staffGeneration)staffLoading.value=false
  }
}
watch(employeeStatus,()=>{void refreshEmployees()})
watch(vacancyDepartment,value=>{if(!vacancyDepartments.value.some(item=>item.id===value))vacancyDepartment.value='all'})

async function load(){
  loading.value=true
  error.value=''
  try{
    const companies=await listCompanies()
    const company=companies.data[0]
    if(!company){error.value='Нет доступных компаний';return}
    companyId.value=company.id
    companyName.value=company.name

    // Independent requests: one optional unavailable module must not hide the dashboard.
    const [peopleResult,actionsResult,plansResult,documentsResult]=await Promise.allSettled([
      listEmployees(company.id,1,'','active'),
      listPersonnelActions(company.id),
      listStaffingPlans(company.id),
      listDocuments(company.id),
    ])
    if(peopleResult.status==='fulfilled'){
      employees.value=peopleResult.value.data
      personnelTotal.value=peopleResult.value.meta.total
      staffCount.value=peopleResult.value.meta.total
    }else staffError.value='Не удалось получить реестр сотрудников'
    if(actionsResult.status==='fulfilled'){
      actions.value=actionsResult.value.data
      const {data,meta}=actionsResult.value
      // A count from an incomplete page would be misleading.
      if(meta.total<=data.length){
        const month=localTodayISO().slice(0,7)
        hiresThisMonth.value=data.filter(row=>row.action_type==='hire'&&row.effective_on.startsWith(month)).length
      }
    }
    if(plansResult.status==='fulfilled'){
      const selected=preferredApprovedStaffingPlan(plansResult.value.data)
      if(selected){
        try{
          const detail=await getStaffingPlan(company.id,selected.id,localTodayISO())
          staffing.value=detail.lines
        }catch{staffingError.value='Не удалось получить актуальные вакансии'}
      }
    }else staffingError.value='Штатное расписание временно недоступно'
    if(documentsResult.status==='fulfilled')documentsTotal.value=documentsResult.value.meta.total
    // Current document contract has no expiry dates. Never invent a 30-day alert or percentage.
    documentExpiryAvailable.value=false
  }catch(cause){
    error.value=cause instanceof Error?cause.message:'Не удалось открыть главную страницу'
  }finally{loading.value=false}
}
onMounted(load)
</script>

<template>
  <section class="overview-page">
    <h1 class="overview-sr-only">Главная</h1>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <section class="overview-metrics" aria-label="Основные показатели компании">
      <DashboardMetricCard title="Вакантные позиции" color="amber"
        :value="staffingError?'—':formatUnits(vacantUnits)" :percent="staffingError?null:vacancyShare"
        :detail="'ставок из '+(plannedUnits?formatUnits(plannedUnits):'—')"
        :footnote="staffingError||'По штатному расписанию на сегодня'" to="/staffing?view=vacant" />
      <DashboardMetricCard title="Новые сотрудники" color="blue"
        :value="hiresThisMonth" :percent="newHireShare"
        detail="оформленных приёмов за месяц" :footnote="hiresThisMonth===null?'Нужна полная история кадровых действий':'По журналу кадровых действий'"
        to="/personnel-actions" />
      <DashboardMetricCard title="Документы и сроки" color="green"
        :value="documentsTotal" :percent="null"
        detail="документов в реестре" :footnote="documentExpiryAvailable?'Сроки документов рассчитаны':'Сроки действия пока не учитываются'"
        to="/documents" />
    </section>

    <section class="overview-section" aria-label="Реестр сотрудников на главной">
      <DashboardSectionHeading title="Реестр сотрудников" to="/employees" action-label="Полный реестр">
        <template #actions>
          <DashboardTableToolbar v-model:query="employeeQuery" v-model:filter="employeeStatus"
            :options="employeeOptions" :loading="staffLoading" search-label="Поиск сотрудников"
            filter-label="Статус сотрудника" @search="refreshEmployees" />
        </template>
      </DashboardSectionHeading>
      <BaseNotice v-if="staffError" tone="error">{{ staffError }}</BaseNotice>
      <BaseDataTable :rows="employeeRows" :columns="employeeColumns" row-key="id"
        :loading="loading||staffLoading" caption="Реестр сотрудников на главной"
        empty-title="Сотрудники не найдены" empty-description="Измените запрос или фильтры, чтобы увидеть сотрудников.">
        <template #cell-full_name="{row}">
          <div class="primary-cell">
            <strong>{{ row.full_name }}</strong>
            <span>{{ row.current_department_name||'Без подразделения' }}</span>
          </div>
        </template>
        <template #cell-birth_date="{value}">{{ formatDate(value) }}</template>
        <template #cell-current_assignment_valid_from="{value}">{{ formatDate(value) }}</template>
        <template #cell-status_label="{row}">
          <BaseStatusPill :tone="staffStatusTone(row.employment_status)">{{ row.status_label }}</BaseStatusPill>
        </template>
        <template #cell-current_position_name="{value}">{{ value||'—' }}</template>
        <template #cell-details="{row}">
          <RouterLink class="table-row-link" :to="{name:'employee-detail',params:{company:companyId,employee:row.id}}">Открыть</RouterLink>
        </template>
      </BaseDataTable>
      <p v-if="!loading&&!staffLoading&&personnelTotal!==null" class="overview-count">
        Показано {{ employeeRows.length }} из {{ personnelTotal }}. <RouterLink to="/employees">Весь реестр →</RouterLink>
      </p>
    </section>

    <section class="overview-section" aria-label="Вакантные позиции на главной">
      <DashboardSectionHeading title="Вакантные позиции" to="/staffing?view=vacant" action-label="Все вакансии">
        <template #actions>
          <DashboardTableToolbar v-model:query="vacancyQuery" v-model:filter="vacancyDepartment"
            :options="vacancyDepartments" search-label="Поиск вакансий"
            filter-label="Подразделение" @search="vacancySearch=vacancyQuery.trim()" />
        </template>
      </DashboardSectionHeading>
      <BaseNotice v-if="staffingError" tone="error">{{ staffingError }}</BaseNotice>
      <BaseDataTable :rows="visibleVacancies" :columns="vacancyColumns" row-key="id"
        :loading="loading" caption="Вакантные штатные позиции на главной"
        empty-title="Вакантных позиций нет"
        empty-description="В текущей версии штатного расписания нет подходящих вакансий.">
        <template #cell-position_name="{row}">
          <div class="primary-cell"><strong>{{ row.position_name }}</strong>
            <span>{{ row.department_name }}</span></div>
        </template>
        <template #cell-planned_units="{value}">{{ formatUnits(Number(value)) }}</template>
        <template #cell-occupied_units="{value}">{{ formatUnits(Number(value)) }}</template>
        <template #cell-vacant_units="{value}"><strong>{{ formatUnits(Number(value)) }}</strong></template>
        <template #cell-base_salary="{row}">{{ salary(row) }}</template>
        <template #cell-status><BaseStatusPill tone="warning">Есть вакансии</BaseStatusPill></template>
      </BaseDataTable>
      <p v-if="!loading&&!staffingError" class="overview-count">Показано {{ visibleVacancies.length }} из {{ vacancyRows.length }} вакантных позиций.
        <RouterLink to="/staffing?view=vacant">Открыть штатное расписание →</RouterLink>
      </p>
    </section>

    <section v-if="actions.length" class="overview-section overview-actions" aria-label="Последние кадровые действия">
      <DashboardSectionHeading title="Последние кадровые действия" subtitle="Из кадрового журнала"
        to="/personnel-actions" action-label="Весь журнал" />
      <BaseDataTable :rows="actionRows" :columns="actionColumns" row-key="id"
        caption="Последние кадровые действия" empty-title="Кадровых действий нет">
        <template #cell-effective_on="{value}">{{ formatDate(value) }}</template>
        <template #cell-action_label="{value}">
          <BaseStatusPill tone="info">{{ value }}</BaseStatusPill>
        </template>
      </BaseDataTable>
    </section>
  </section>
</template>

<style scoped>
.overview-page{display:grid;grid-template-columns:minmax(0,1fr);gap:25px;min-width:0;max-width:100%;padding-top:1px}
.overview-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.overview-metrics{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;min-width:0;padding:20px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-lg);background:var(--color-soft);box-shadow:var(--shadow-card);
}
.overview-section{min-width:0;display:grid;gap:0}
.overview-section :deep(.table-scroll){
  min-width:0;border-radius:var(--radius-md);
  box-shadow:var(--shadow-card);scrollbar-color:var(--color-stroke-strong) transparent;scrollbar-width:thin;
}
.overview-section :deep(table){min-width:930px}
.overview-section :deep(th){
  padding:12px 13px;background:var(--color-table-heading);font-size:12px;
  font-weight:600;line-height:17px;color:var(--color-text);
}
.overview-section :deep(td){padding:10px 13px;font-size:12px;line-height:18px}
.overview-section :deep(tbody tr){height:51px}
.primary-cell{display:grid;gap:3px;min-width:165px;max-width:290px}
.primary-cell strong{color:var(--color-text);font-size:12px;line-height:17px;font-weight:600}
.primary-cell span{color:var(--color-muted);font-size:11px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.table-row-link{color:var(--color-primary);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:2px}
.table-row-link:hover{color:var(--color-primary-hover)}
.overview-count{margin:8px 0 0;color:var(--color-muted);font-size:11px;line-height:17px}
.overview-count a{color:var(--color-primary);font-weight:600}
.overview-actions{padding-bottom:16px}
@media(max-width:1100px){.overview-metrics{grid-template-columns:repeat(2,minmax(0,1fr));padding:14px;gap:10px}}
@media(max-width:700px){
  .overview-page{gap:21px}
  .overview-metrics{grid-template-columns:1fr;padding:9px}
  .overview-section :deep(th),.overview-section :deep(td){padding:9px 10px}
}
</style>
