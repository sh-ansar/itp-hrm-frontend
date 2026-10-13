<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Printer } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import ProductionCalendar from '../components/ProductionCalendar.vue'
import TimesheetGrid from '../components/TimesheetGrid.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import { localTodayISO } from '../utils/localDate'
import { buildAttendanceDemo, type AttendanceDemo, type AbsenceRecord } from '../mocks/timeAttendanceDemo'

type AttendanceTab='timesheet'|'schedules'|'calendar'|'absences'

const demoMode=import.meta.env.VITE_DEMO_MODE==='true'
const companies=ref<CompanyRecord[]>([])
const company=ref('')
const employees=ref<EmployeeRecord[]>([])
const loadingCompanies=ref(false)
const loading=ref(false)
const error=ref('')
const tab=ref<AttendanceTab>('timesheet')
const month=ref(localTodayISO().slice(0,7))
const department=ref('all')
const search=ref('')
const demo=ref<AttendanceDemo>({rows:[],schedules:[],absences:[],calendar:[]})
let generation=0

const tabs=[
  {id:'timesheet',label:'Табель'},
  {id:'schedules',label:'Графики работы'},
  {id:'calendar',label:'Производственный календарь'},
  {id:'absences',label:'Невыходы'},
]
const selectedCompany=computed(()=>companies.value.find(item=>item.id===company.value)??null)
const monthLabel=computed(()=>{
  const [year,m]=month.value.split('-').map(Number)
  if(!year||!m)return month.value
  return new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(new Date(year,m-1,1))
})
const departmentOptions=computed(()=>[
  {id:'all',name:'Все подразделения'},
  ...[...new Set(employees.value.map(item=>item.current_department_name).filter((x):x is string=>Boolean(x)))]
    .sort((a,b)=>a.localeCompare(b,'ru'))
    .map(name=>({id:name,name})),
])
const filteredRows=computed(()=>{
  const q=search.value.trim().toLocaleLowerCase('ru')
  return demo.value.rows.filter(row=>{
    if(department.value!=='all'&&row.department!==department.value)return false
    if(!q)return true
    return [row.full_name,row.personnel_number,row.department,row.position]
      .join(' ').toLocaleLowerCase('ru').includes(q)
  })
})
const filteredAbsences=computed(()=>{
  const visible=new Set(filteredRows.value.map(row=>row.employee_id))
  return demo.value.absences.filter(row=>visible.has(row.employee_id))
})
const summary=computed(()=>filteredRows.value.reduce((acc,row)=>{
  acc.planned+=row.planned_hours
  acc.worked+=row.worked_hours
  acc.absences+=row.absence_days
  acc.overtime+=row.overtime_hours
  return acc
},{planned:0,worked:0,absences:0,overtime:0}))
const scheduleColumns=[
  {key:'name',label:'График'},
  {key:'pattern',label:'Режим'},
  {key:'shift',label:'Рабочее время'},
  {key:'hours_per_week',label:'Часов в неделю'},
  {key:'employee_count',label:'Сотрудников'},
]
const absenceColumns=[
  {key:'employee',label:'Сотрудник'},
  {key:'kind',label:'Причина'},
  {key:'period',label:'Период'},
  {key:'days',label:'Дней'},
  {key:'basis',label:'Основание'},
]

function displayDate(value:string){
  return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(0,4):value
}
function absencePeriod(row:AbsenceRecord){
  return row.from===row.to?displayDate(row.from):displayDate(row.from)+' — '+displayDate(row.to)
}
function setTab(value:string){
  if(['timesheet','schedules','calendar','absences'].includes(value))tab.value=value as AttendanceTab
}
function printTimesheet(){window.print()}

async function loadCompanies(){
  loadingCompanies.value=true
  error.value=''
  try{
    const result=await listCompanies()
    companies.value=result.data
    if(!companies.value.some(item=>item.id===company.value))company.value=companies.value[0]?.id??''
  }catch(cause){
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить компании'
    companies.value=[]
    company.value=''
  }finally{loadingCompanies.value=false}
}

async function loadEmployees(){
  const companyId=company.value
  const current=++generation
  employees.value=[]
  demo.value={rows:[],schedules:[],absences:[],calendar:[]}
  if(!companyId)return
  loading.value=true
  error.value=''
  try{
    const first=await listEmployees(companyId,1,'','active')
    if(current!==generation)return
    const all=[...first.data]
    for(let page=2;page<=Math.min(first.meta.last_page,10);page++){
      const result=await listEmployees(companyId,page,'','active')
      if(current!==generation)return
      all.push(...result.data)
    }
    employees.value=all
    if(demoMode)demo.value=buildAttendanceDemo(all,month.value)
  }catch(cause){
    if(current!==generation)return
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить сотрудников'
  }finally{
    if(current===generation)loading.value=false
  }
}

watch(company,()=>{department.value='all';search.value='';loadEmployees()})
watch(month,value=>{if(demoMode&&employees.value.length)demo.value=buildAttendanceDemo(employees.value,value)})
onMounted(loadCompanies)
</script>

<template>
  <section class="attendance-page">
    <div class="attendance-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Графики и табель</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length&&!error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="attendance-heading">
        <div>
          <h1>Графики и табель</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="attendance-heading-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseButton v-if="tab==='timesheet'" variant="secondary" @click="printTimesheet">
            <Printer :size="16" /> Печать табеля
          </BaseButton>
        </div>
      </div>

      <BaseViewTabs :model-value="tab" :options="tabs" label="Разделы табельного учета" @update:model-value="setTab" />

      <div class="attendance-controls">
        <BaseFormField v-model="month" label="Период" type="month" />
        <BaseSelectField v-model="department" label="Подразделение" :options="departmentOptions" />
        <BaseFormField v-model="search" label="Сотрудник" placeholder="ФИО или табельный номер" />
      </div>

      <BaseNotice v-if="!demoMode" tone="info">Для выбранной компании табельные данные пока недоступны.</BaseNotice>

      <template v-else>
        <div v-if="tab==='timesheet'||tab==='absences'" class="attendance-summary" aria-label="Итоги табеля">
          <div><span>План часов</span><strong>{{ summary.planned }}</strong></div>
          <div><span>Отработано</span><strong>{{ summary.worked }}</strong></div>
          <div><span>Дней неявок</span><strong>{{ summary.absences }}</strong></div>
          <div><span>Сверхурочно</span><strong>{{ summary.overtime }} ч</strong></div>
        </div>

        <BaseCard v-if="tab==='timesheet'" class="attendance-card">
          <div class="section-heading">
            <div><h2>Табель за {{ monthLabel }}</h2><p>{{ filteredRows.length }} сотрудников</p></div>
            <div class="timesheet-legend">
              <span><i class="work"></i>Явка / часы</span>
              <span><i class="off"></i>В — выходной</span>
              <span><i class="sick"></i>Б — больничный</span>
              <span><i class="trip"></i>К — командировка</span>
              <span><i class="vacation"></i>ОТ — отпуск</span>
              <span><i class="unknown"></i>НН — неявка</span>
            </div>
          </div>
          <TimesheetGrid :rows="filteredRows" :calendar="demo.calendar" :company-id="company" :loading="loading" />
        </BaseCard>

        <BaseCard v-else-if="tab==='schedules'" class="attendance-card">
          <div class="section-heading">
            <div><h2>Графики работы</h2><p>Назначенные режимы рабочего времени</p></div>
          </div>
          <BaseDataTable :rows="demo.schedules" :columns="scheduleColumns" row-key="id" :loading="loading"
            caption="Графики работы сотрудников" empty-title="Графики не найдены"
            empty-description="Для выбранной компании нет доступных графиков.">
            <template #cell-hours_per_week="{ value }">{{ value }} ч</template>
          </BaseDataTable>
        </BaseCard>

        <ProductionCalendar v-else-if="tab==='calendar'" :days="demo.calendar" :month-label="monthLabel" />

        <BaseCard v-else class="attendance-card">
          <div class="section-heading">
            <div><h2>Невыходы на работу</h2><p>{{ filteredAbsences.length }} записей за {{ monthLabel }}</p></div>
          </div>
          <div class="absence-desktop">
            <BaseDataTable :rows="filteredAbsences" :columns="absenceColumns" row-key="id" :loading="loading"
              caption="Невыходы сотрудников" empty-title="Невыходов нет"
              empty-description="Для выбранного периода записи отсутствуют.">
              <template #cell-employee="{ row }">
                <RouterLink class="absence-person" :to="{name:'employee-detail',params:{company,employee:row.employee_id},query:{tab:'schedule'}}">
                  <strong>{{ row.full_name }}</strong><span>{{ row.personnel_number }} · {{ row.department }}</span>
                </RouterLink>
              </template>
              <template #cell-period="{ row }">{{ absencePeriod(row) }}</template>
            </BaseDataTable>
          </div>
          <div class="absence-mobile">
            <article v-for="row in filteredAbsences" :key="row.id" class="absence-card">
              <header><strong>{{ row.kind }}</strong><span>{{ row.days }} дн.</span></header>
              <RouterLink :to="{name:'employee-detail',params:{company,employee:row.employee_id},query:{tab:'schedule'}}">
                {{ row.full_name }} <small>{{ row.personnel_number }}</small>
              </RouterLink>
              <dl>
                <div><dt>Период</dt><dd>{{ absencePeriod(row) }}</dd></div>
                <div><dt>Подразделение</dt><dd>{{ row.department }}</dd></div>
                <div><dt>Основание</dt><dd>{{ row.basis }}</dd></div>
              </dl>
            </article>
            <p v-if="!filteredAbsences.length&&!loading" class="absence-empty">Невыходов за выбранный период нет.</p>
          </div>
        </BaseCard>
      </template>
    </template>
  </section>
</template>

<style scoped>
.attendance-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.attendance-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.attendance-breadcrumb img{width:15px;height:15px}
.attendance-breadcrumb strong{color:var(--color-text);font-weight:500}
.attendance-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.attendance-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.attendance-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.attendance-heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.attendance-heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.attendance-controls{
  display:grid;grid-template-columns:minmax(170px,.45fr) minmax(220px,.75fr) minmax(260px,1fr);
  gap:12px;align-items:end;padding:14px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.attendance-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--color-stroke);border-radius:var(--radius-md);overflow:hidden;background:var(--color-surface);box-shadow:var(--shadow-card)}
.attendance-summary div{display:grid;gap:4px;padding:13px 16px;border-right:1px solid var(--color-stroke)}
.attendance-summary div:last-child{border-right:0}
.attendance-summary span{color:var(--color-muted);font-size:11px}
.attendance-summary strong{color:var(--color-text);font-size:19px}
.attendance-card{min-width:0}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.timesheet-legend{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap;color:var(--color-muted);font-size:9px}
.timesheet-legend span{display:inline-flex;align-items:center;gap:4px}
.timesheet-legend i{width:8px;height:8px;border-radius:2px;border:1px solid var(--color-stroke)}
.timesheet-legend .work{background:var(--color-surface)}
.timesheet-legend .off{background:var(--color-soft)}
.timesheet-legend .sick{background:var(--color-danger-surface)}
.timesheet-legend .trip{background:var(--color-accent-soft)}
.timesheet-legend .vacation{background:var(--color-success-surface)}
.timesheet-legend .unknown{background:var(--color-warning-surface)}
.absence-person{display:grid;gap:3px;min-width:180px;color:var(--color-text)}
.absence-person:hover strong{color:var(--color-primary)}
.absence-person strong{font-size:12px}
.absence-person span{color:var(--color-muted);font-size:10px}
.absence-mobile{display:none}
@media(max-width:900px){
  .attendance-controls{grid-template-columns:repeat(2,minmax(0,1fr))}
  .attendance-controls>*:last-child{grid-column:1/-1}
}
@media(max-width:760px){
  .absence-desktop{display:none}
  .absence-mobile{display:grid;gap:10px}
  .absence-card{display:grid;gap:10px;padding:12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface)}
  .absence-card header{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .absence-card header strong{font-size:12px;color:var(--color-text)}
  .absence-card header span{color:var(--color-primary);font-size:11px;font-weight:600}
  .absence-card>a{display:flex;align-items:center;gap:5px;color:var(--color-text);font-size:12px;font-weight:600}
  .absence-card>a small{color:var(--color-muted);font-size:10px;font-weight:400}
  .absence-card dl{display:grid;gap:7px;margin:0}
  .absence-card dl div{display:grid;gap:2px}
  .absence-card dt{color:var(--color-muted);font-size:9px}
  .absence-card dd{margin:0;color:var(--color-text);font-size:11px;line-height:1.4}
  .absence-empty{margin:0;padding:20px;text-align:center;color:var(--color-muted);font-size:12px}
}
@media(max-width:650px){
  .attendance-heading-controls{display:grid;grid-template-columns:1fr;width:100%}
  .attendance-heading-controls :deep(.base-select-field){width:100%;max-width:none}
  .attendance-heading-controls :deep(.base-button){width:100%}
  .attendance-controls{grid-template-columns:1fr;padding:12px}
  .attendance-controls>*:last-child{grid-column:auto}
  .attendance-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .attendance-summary div:nth-child(2){border-right:0}
  .attendance-summary div:nth-child(-n+2){border-bottom:1px solid var(--color-stroke)}
}
@media print{
  .attendance-breadcrumb,.attendance-heading-controls,.attendance-page :deep(.view-tabs),.attendance-controls,.attendance-summary{display:none!important}
  .attendance-page{display:block}
  .attendance-card{border:0;box-shadow:none;padding:0}
}
</style>
