<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseTableBulkActions from '../components/ui/BaseTableBulkActions.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import DashboardMetricCard from '../components/ui/DashboardMetricCard.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import DashboardSectionHeading from '../components/ui/DashboardSectionHeading.vue'
import DashboardTableToolbar from '../components/ui/DashboardTableToolbar.vue'
import { listCompanies } from '../api/organization'
import { listEmployees, type EmployeeRecord, type EmploymentFilter } from '../api/personnel'
import { listPersonnelActions, type PersonnelActionRow } from '../api/personnelActions'
import { listDocuments } from '../api/documents'
import { getStaffingPlan, listStaffingPlans, type StaffingPlanLine } from '../api/staffing'
import { preferredApprovedStaffingPlan } from '../utils/staffingPlanChoice'
import { localTodayISO } from '../utils/localDate'
import { downloadCsv } from '../utils/exportCsv'
import { useAppI18n } from '../i18n'

type EmployeeRow = EmployeeRecord & { full_name:string; gender_label:string; status_label:string }
type ActionRow = PersonnelActionRow & { full_name:string; action_label:string }
const router = useRouter()
const { t } = useAppI18n()
const onboardingComplete = ref(false)
const onboardingStorageKey = 'hrm-onboarding-complete-v1'
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
const staffCount=ref<number|null>(null)
const allEmployeeCount=ref<number|null>(null)
const selectedEmployeeKeys=ref<string[]>([])
const selectedVacancyKeys=ref<string[]>([])

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
const selectedEmployeeRows=computed(()=>employeeRows.value.filter(row=>selectedEmployeeKeys.value.includes(row.id)))
const selectedVacancyRows=computed(()=>visibleVacancies.value.filter(row=>selectedVacancyKeys.value.includes(row.id)))
const employeeBulkOptions=computed(()=>[
  {id:'export_csv',label:'Экспорт выбранных сотрудников в CSV'},
  ...(selectedEmployeeRows.value.length === 1 ? [{id:'open_card',label:'Открыть карточку сотрудника'}] : []),
])
const vacancyBulkOptions=[
  {id:'export_csv',label:'Экспорт выбранных вакансий в CSV'},
  {id:'open_staffing',label:'Открыть штатное расписание'},
]
function executeEmployeeAction(action:string){
  if(action==='export_csv'){
    downloadCsv('overview-selected-employees.csv',
      ['ФИО','Табельный номер','Подразделение','Должность','Статус'],
      selectedEmployeeRows.value.map(row=>[
        row.full_name,row.personnel_number,row.current_department_name,row.current_position_name,row.status_label]))
  }else if(action==='open_card'&&selectedEmployeeRows.value.length===1){
    void router.push({name:'employee-detail',params:{company:companyId.value,employee:selectedEmployeeRows.value[0]!.id}})
  }
}
function executeVacancyAction(action:string){
  if(action==='export_csv'){
    downloadCsv('overview-selected-vacancies.csv',
      ['Должность','Подразделение','Ставок','Занято','Вакантно'],
      selectedVacancyRows.value.map(row=>[row.position_name,row.department_name,
        row.planned_units,row.occupied_units,row.vacant_units]))
  }else if(action==='open_staffing'){
    void router.push('/staffing?view=vacant')
  }
}
watch(employeeRows,()=>{selectedEmployeeKeys.value=[]})
watch(visibleVacancies,()=>{selectedVacancyKeys.value=[]})
const plannedUnits=computed(()=>staffing.value.reduce((s,row)=>s+Number(row.planned_units||0),0))
const vacantUnits=computed(()=>staffing.value.reduce((s,row)=>s+Number(row.vacant_units||0),0))
const vacancyShare=computed(()=>plannedUnits.value>0?100*vacantUnits.value/plannedUnits.value:null)
const newHireShare=computed(()=>hiresThisMonth.value!==null&&staffCount.value!==null&&staffCount.value>0?100*hiresThisMonth.value/staffCount.value:null)
const activeShare=computed(()=>staffCount.value!==null&&allEmployeeCount.value!==null&&allEmployeeCount.value>0
  ?100*staffCount.value/allEmployeeCount.value:null)

const employeeColumns=[
  {key:'full_name',label:'ФИО / Отдел',sortable:true},
  {key:'personnel_number',label:'Таб. №',sortable:true},
  {key:'birth_date',label:'Дата рождения',sortable:true},
  {key:'current_assignment_valid_from',label:'Дата назначения',sortable:true},
  {key:'gender_label',label:'Пол',sortable:true},
  {key:'status_label',label:'Статус',sortable:true},
  {key:'current_position_name',label:'Должность'},
  {key:'details',label:'Действия'},
]
const vacancyColumns=[
  {key:'position_name',label:'Должность',sortable:true},
  {key:'department_name',label:'Подразделение',sortable:true},
  {key:'planned_units',label:'Ставок',sortable:true},
  {key:'occupied_units',label:'Занято',sortable:true},
  {key:'vacant_units',label:'Вакантно',sortable:true},
  {key:'base_salary',label:'Базовый оклад',sortable:true},
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
    const [peopleResult,allPeopleResult,actionsResult,plansResult,documentsResult]=await Promise.allSettled([
      listEmployees(company.id,1,'','active'),
      listEmployees(company.id,1,'','all'),
      listPersonnelActions(company.id),
      listStaffingPlans(company.id),
      listDocuments(company.id),
    ])
    if(peopleResult.status==='fulfilled'){
      employees.value=peopleResult.value.data
      personnelTotal.value=peopleResult.value.meta.total
      staffCount.value=peopleResult.value.meta.total
    }else staffError.value='Не удалось получить реестр сотрудников'
    if(allPeopleResult.status==='fulfilled')allEmployeeCount.value=allPeopleResult.value.meta.total
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
function readOnboardingCompletion(){
  try { onboardingComplete.value = Boolean(localStorage.getItem(onboardingStorageKey)) }
  catch { onboardingComplete.value = false }
}
onMounted(() => {
  readOnboardingCompletion()
  void load()
})
</script>

<template>
  <section class="overview-page">
    <h1 class="overview-sr-only">Главная</h1>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <section v-if="!onboardingComplete" class="onboarding-entry" aria-label="Первичная настройка">
      <div>
        <strong>{{ t('onboarding.dashboardTitle') }}</strong>
        <span>{{ t('onboarding.dashboardHelp') }}</span>
      </div>
      <BaseButton @click="router.push('/onboarding')">{{ t('onboarding.dashboardAction') }}</BaseButton>
    </section>
    <BaseKpiGrid class="overview-metrics" label="Основные показатели компании">
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
      <DashboardMetricCard title="Сотрудники в штате" color="blue"
        :value="staffCount" :percent="activeShare"
        :detail="'работают из '+(allEmployeeCount??'—')+' записей'"
        footnote="По реестру персонала" to="/employees" />
    </BaseKpiGrid>

    <section class="overview-section" aria-label="Реестр сотрудников на главной">
      <DashboardSectionHeading title="Реестр сотрудников" to="/employees" action-label="Полный реестр">
        <template #actions>
          <DashboardTableToolbar v-model:query="employeeQuery" v-model:filter="employeeStatus"
            :options="employeeOptions" :loading="staffLoading" search-label="Поиск сотрудников"
            filter-label="Статус сотрудника" @search="refreshEmployees" />
        </template>
      </DashboardSectionHeading>
      <BaseNotice v-if="staffError" tone="error">{{ staffError }}</BaseNotice>
      <BaseTableBulkActions :count="selectedEmployeeRows.length" subject="сотрудников"
        :options="employeeBulkOptions" @execute="executeEmployeeAction" @clear="selectedEmployeeKeys=[]" />
      <BaseDataTable :rows="employeeRows" :columns="employeeColumns" row-key="id"
        selectable selection-label="Выбрать сотрудника" v-model:selected-keys="selectedEmployeeKeys"
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
      <BaseTableBulkActions :count="selectedVacancyRows.length" subject="вакансий"
        :options="vacancyBulkOptions" @execute="executeVacancyAction" @clear="selectedVacancyKeys=[]" />
      <BaseDataTable :rows="visibleVacancies" :columns="vacancyColumns" row-key="id"
        selectable selection-label="Выбрать вакансию" v-model:selected-keys="selectedVacancyKeys"
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
.overview-section{min-width:0;display:grid;gap:0}
.onboarding-entry{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  padding:13px 15px;border:1px solid var(--color-primary-stroke);border-radius:var(--radius-md);
  background:var(--color-accent-soft);color:var(--color-text);
}
.onboarding-entry>div{display:grid;gap:3px;min-width:0}
.onboarding-entry strong{font-size:13px;line-height:18px}
.onboarding-entry span{color:var(--color-muted);font-size:11px;line-height:16px}
.onboarding-entry :deep(.base-button){min-height:34px;font-size:11px}
.primary-cell{display:grid;gap:3px;min-width:165px;max-width:290px}
.primary-cell strong{color:var(--color-text);font-size:12px;line-height:17px;font-weight:600}
.primary-cell span{color:var(--color-muted);font-size:11px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.table-row-link{color:var(--color-primary);font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:2px}
.table-row-link:hover{color:var(--color-primary-hover)}
.overview-count{margin:8px 0 0;color:var(--color-muted);font-size:11px;line-height:17px}
.overview-count a{color:var(--color-primary);font-weight:600}
.overview-actions{padding-bottom:16px}
@media(max-width:700px){
  .overview-page{gap:21px}
}
</style>
