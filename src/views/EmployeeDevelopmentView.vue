<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Maximize2, Minimize2, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseColumnPicker from '../components/ui/BaseColumnPicker.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseTableBulkActions from '../components/ui/BaseTableBulkActions.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { listEmployees, type EmployeeRecord } from '../api/personnel'
import {
  developmentStatusName,
  getCompanyDevelopment,
  trainingModeName,
  type ReserveRow,
  type TrainingRow,
} from '../api/development'
import { downloadCsv } from '../utils/exportCsv'
import { useUiFormatters } from '../composables/useUiFormatters'

type GroupMode = 'none' | 'department' | 'status'
type DevelopmentEmployeeRow = EmployeeRecord & {
  full_name: string
  learning_label: string
  learning_detail: string
  development_status: string
  development_tone: 'success' | 'info' | 'warning' | 'neutral'
  target_position: string
}

const router = useRouter()
const fmt = useUiFormatters()
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const employees = ref<EmployeeRecord[]>([])
const training = ref<TrainingRow[]>([])
const reserve = ref<ReserveRow[]>([])
const loadingCompanies = ref(false)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const pageSize = ref('10')
const searchDraft = ref('')
const search = ref('')
const groupMode = ref<GroupMode>('none')
const statusFilter = ref('all')
const filtersOpen = ref(false)
const fullscreen = ref(false)
const selectedIds = ref<string[]>([])
const presetNotice = ref('')
const presetAvailable = ref(false)
const visibleColumns = ref<Record<string, boolean>>({
  personnel_number: true,
  current_position_name: true,
  current_department_name: true,
  learning_label: true,
  development_status: true,
})
const PRESET_KEY='hrm-development-register-view-v1'
let generation=0

const employeeTabs = [
  { id: 'register', label: 'Реестр сотрудников' },
  { id: 'development', label: 'Кадровый резерв и обучение' },
  { id: 'archive', label: 'Архив сотрудников' },
]
const columns = [
  { key:'full_name', label:'ФИО / Отдел' },
  { key:'personnel_number', label:'Таб. №' },
  { key:'current_position_name', label:'Должность' },
  { key:'current_department_name', label:'Отдел' },
  { key:'learning_label', label:'Обучение / квалификация' },
  { key:'development_status', label:'Статус развития' },
  { key:'actions', label:'Действие' },
]
const optionalColumns=columns.filter(column=>!['full_name','actions'].includes(column.key))
const selectedCompany=computed(()=>companies.value.find(item=>item.id===company.value)??null)
const trainingByEmployee=computed(()=>{
  const map=new Map<string,TrainingRow>()
  for(const row of training.value){
    const current=map.get(row.employee_id)
    if(!current || row.started_on > current.started_on) map.set(row.employee_id,row)
  }
  return map
})
const reserveByEmployee=computed(()=>{
  const map=new Map<string,ReserveRow>()
  for(const row of reserve.value){
    const current=map.get(row.employee_id)
    if(!current || Number(row.joined_year)>Number(current.joined_year)) map.set(row.employee_id,row)
  }
  return map
})
function statusFor(employeeId:string){
  const reserveRow=reserveByEmployee.value.get(employeeId)
  const trainingRow=trainingByEmployee.value.get(employeeId)
  if(reserveRow?.development_status==='active')
    return {label:'В кадровом резерве',tone:'success' as const}
  if(trainingRow?.development_status==='ongoing')
    return {label:'Обучение в процессе',tone:'info' as const}
  if(trainingRow?.development_status==='planned')
    return {label:'Обучение запланировано',tone:'warning' as const}
  if(reserveRow?.development_status==='alumni')
    return {label:'Выбыл из резерва',tone:'neutral' as const}
  if(trainingRow?.development_status==='completed')
    return {label:'Обучение завершено',tone:'success' as const}
  return {label:'—',tone:'neutral' as const}
}
const rows=computed<DevelopmentEmployeeRow[]>(()=>employees.value.map(employee=>{
  const trainingRow=trainingByEmployee.value.get(employee.id)
  const reserveRow=reserveByEmployee.value.get(employee.id)
  const status=statusFor(employee.id)
  return {
    ...employee,
    full_name:[employee.last_name,employee.first_name,employee.middle_name].filter(Boolean).join(' '),
    learning_label:trainingRow?.topic || reserveRow?.target_position || '—',
    learning_detail:trainingRow ? trainingModeName(trainingRow.training_mode)
      : reserveRow ? 'Целевая должность резерва' : '',
    development_status:status.label,
    development_tone:status.tone,
    target_position:reserveRow?.target_position || '—',
  }
}))
const filteredRows=computed(()=>rows.value.filter(row=>
  statusFilter.value==='all'
  || (statusFilter.value==='reserve'&&reserveByEmployee.value.get(row.id)?.development_status==='active')
  || (statusFilter.value==='training'&&['ongoing','planned'].includes(trainingByEmployee.value.get(row.id)?.development_status??''))
  || (statusFilter.value==='completed'&&trainingByEmployee.value.get(row.id)?.development_status==='completed')
))
const shownColumns=computed(()=>columns.filter(column=>
  ['full_name','actions'].includes(column.key)||visibleColumns.value[column.key]!==false))
const selectedRows=computed(()=>filteredRows.value.filter(row=>selectedIds.value.includes(row.id)))
const groupOptions=[
  {id:'none',label:'Без группировки'},
  {id:'department',label:'По отделам'},
  {id:'status',label:'По статусу развития'},
]
const statusOptions=[
  {id:'all',name:'Все статусы'},
  {id:'reserve',name:'В кадровом резерве'},
  {id:'training',name:'Обучение в процессе / запланировано'},
  {id:'completed',name:'Обучение завершено'},
]
const exportOptions=computed(()=>[
  {id:'page',label:'Экспортировать текущую страницу',disabled:!filteredRows.value.length},
  {id:'selected',label:'Экспортировать выбранных',disabled:!selectedRows.value.length},
])
const actionOptions=computed(()=>[
  {id:'open_selected',label:'Открыть выбранную карточку',disabled:selectedRows.value.length!==1},
  {id:'clear_selection',label:'Снять выделение',disabled:!selectedRows.value.length},
])
const templateOptions=computed(()=>[
  {id:'save',label:'Сохранить текущий вид'},
  {id:'apply',label:'Применить сохранённый вид',disabled:!presetAvailable.value},
  {id:'delete',label:'Удалить сохранённый вид',disabled:!presetAvailable.value},
])
const bulkOptions=[{id:'export',label:'Экспортировать выбранных CSV'}]
const filterChips=computed(()=>[
  ...(statusFilter.value!=='all'?[{id:'status',label:'Статус: '+(statusOptions.find(item=>item.id===statusFilter.value)?.name??statusFilter.value)}]:[]),
  ...(groupMode.value!=='none'?[{id:'group',label:'Группировка: '+(groupOptions.find(item=>item.id===groupMode.value)?.label??groupMode.value)}]:[]),
])
const titleCount=computed(()=>filteredRows.value.length+' из '+total.value)

function setEmployeeTab(next:string){
  if(next==='register')void router.push({name:'employees'})
  if(next==='archive')void router.push({name:'employees',query:{status:'archived'}})
}
function employeeRoute(employeeId:string){
  return {name:'employee-detail',params:{company:company.value,employee:employeeId},query:{tab:'development'}}
}
function setGrouping(id:string){
  if(['none','department','status'].includes(id))groupMode.value=id as GroupMode
}
function groupBy(row:DevelopmentEmployeeRow){
  if(groupMode.value==='department')return row.current_department_name||'Без отдела'
  if(groupMode.value==='status')return row.development_status||'Без статуса'
  return ''
}
function applySearch(){search.value=searchDraft.value.trim();page.value=1;void loadWorkspace()}
function clearSearch(){searchDraft.value='';search.value='';page.value=1;void loadWorkspace()}
function clearFilter(id:string){
  if(id==='status')statusFilter.value='all'
  if(id==='group')groupMode.value='none'
}
function clearFilters(){statusFilter.value='all';groupMode.value='none'}
function exportRows(items:DevelopmentEmployeeRow[],fileName:string){
  if(!items.length)return
  downloadCsv(fileName,
    ['ФИО','Табельный номер','Должность','Отдел','Обучение / квалификация','Статус развития'],
    items.map(row=>[row.full_name,row.personnel_number,row.current_position_name,row.current_department_name,row.learning_label,row.development_status]))
}
function doExport(id:string){
  if(id==='page')exportRows(filteredRows.value,'development-employees.csv')
  if(id==='selected')exportRows(selectedRows.value,'development-selected.csv')
}
function doBulk(id:string){if(id==='export')exportRows(selectedRows.value,'development-selected.csv')}
function doAction(id:string){
  if(id==='clear_selection')selectedIds.value=[]
  if(id==='open_selected'&&selectedRows.value.length===1)void router.push(employeeRoute(selectedRows.value[0]!.id))
}
function templateAction(id:string){
  if(id==='save'){
    try{
      localStorage.setItem(PRESET_KEY,JSON.stringify({
        columns:visibleColumns.value,groupMode:groupMode.value,status:statusFilter.value,pageSize:Number(pageSize.value),
      }))
      presetAvailable.value=true
      presetNotice.value='Вид сохранён в этом браузере'
    }catch{presetNotice.value='Не удалось сохранить вид'}
  }
  if(id==='apply'){
    try{
      const raw=localStorage.getItem(PRESET_KEY);if(!raw)return
      const saved=JSON.parse(raw) as {columns?:Record<string,boolean>;groupMode?:GroupMode;status?:string;pageSize?:number}
      if(saved.columns)visibleColumns.value={...visibleColumns.value,...saved.columns}
      if(saved.groupMode&&['none','department','status'].includes(saved.groupMode))groupMode.value=saved.groupMode
      if(saved.status&&statusOptions.some(item=>item.id===saved.status))statusFilter.value=saved.status
      if(saved.pageSize&&[10,15,25,50].includes(saved.pageSize))pageSize.value=String(saved.pageSize)
      presetNotice.value='Сохранённый вид применён'
    }catch{presetNotice.value='Не удалось применить вид'}
  }
  if(id==='delete'){
    try{localStorage.removeItem(PRESET_KEY);presetAvailable.value=false;presetNotice.value='Сохранённый вид удалён'}catch{}
  }
}
function toggleFullscreen(){fullscreen.value=!fullscreen.value}
function handleEscape(event:KeyboardEvent){if(event.key==='Escape'&&fullscreen.value)fullscreen.value=false}
watch(fullscreen,value=>document.body.classList.toggle('hrm-development-fullscreen',value))
onBeforeUnmount(()=>{document.body.classList.remove('hrm-development-fullscreen');window.removeEventListener('keydown',handleEscape)})

async function loadAllDevelopment<T extends TrainingRow|ReserveRow>(section:'training'|'reserve'):Promise<T[]>{
  const first=await getCompanyDevelopment<T>(company.value,section,{page:1,status:'all'})
  const data=[...first.data]
  const maxPage=Math.min(first.meta.last_page,12)
  for(let start=2;start<=maxPage;start+=4){
    const end=Math.min(start+3,maxPage)
    const pages=await Promise.all(Array.from({length:end-start+1},(_,index)=>
      getCompanyDevelopment<T>(company.value,section,{page:start+index,status:'all'})))
    for(const result of pages)data.push(...result.data)
  }
  return data
}
async function loadCompanies(){
  loadingCompanies.value=true;error.value=''
  try{
    const result=await listCompanies()
    companies.value=result.data
    if(!companies.value.some(item=>item.id===company.value))company.value = preferCompany(companies.value)
  }catch(cause){
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить компании'
    companies.value=[];company.value=''
  }finally{loadingCompanies.value=false}
}
async function loadWorkspace(){
  const companyId=company.value
  const current=++generation
  employees.value=[];training.value=[];reserve.value=[];selectedIds.value=[]
  if(!companyId)return
  loading.value=true;error.value=''
  try{
    const [peopleResult,trainingResult,reserveResult]=await Promise.all([
      listEmployees(companyId,page.value,search.value,'active',Number(pageSize.value)),
      loadAllDevelopment<TrainingRow>('training'),
      loadAllDevelopment<ReserveRow>('reserve'),
    ])
    if(current!==generation||companyId!==company.value)return
    employees.value=peopleResult.data
    total.value=peopleResult.meta.total
    lastPage.value=peopleResult.meta.last_page
    training.value=trainingResult
    reserve.value=reserveResult
  }catch(cause){
    if(current===generation)error.value=cause instanceof Error?cause.message:'Не удалось загрузить кадровый резерв и обучение'
  }finally{if(current===generation)loading.value=false}
}
watch(company,()=>{page.value=1;void loadWorkspace()})
watch(page,()=>{void loadWorkspace()})
watch(pageSize,()=>{page.value=1;void loadWorkspace()})
onMounted(()=>{
  void loadCompanies()
  window.addEventListener('keydown',handleEscape)
  try{presetAvailable.value=Boolean(localStorage.getItem(PRESET_KEY))}catch{presetAvailable.value=false}
})
</script>

<template>
  <section class="employee-development-page" :class="{ 'is-fullscreen': fullscreen }">
    <div class="registry-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Сотрудники</strong><span>/</span><span>Кадровый резерв и обучение</span>
    </div>

    <BaseViewTabs model-value="development" :options="employeeTabs" label="Разделы сотрудников"
      @update:model-value="setEmployeeTab" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="presetNotice" tone="success">{{ presetNotice }}</BaseNotice>
    <BaseLoadingState v-if="loadingCompanies" label="Загрузка доступных компаний" />

    <template v-else-if="companies.length">
      <div class="development-heading">
        <h1>Кадровый резерв и обучение сотрудников <span>({{ titleCount }})</span></h1>
        <div class="development-heading-actions">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseActionDropdown label="Экспорт" :options="exportOptions" @select="doExport" />
          <BaseActionDropdown label="Действия" variant="primary" :options="actionOptions" @select="doAction" />
          <BaseButton icon-only variant="secondary"
            :aria-label="fullscreen?'Выйти из полноэкранного режима':'На весь экран'" @click="toggleFullscreen">
            <Minimize2 v-if="fullscreen" :size="17" /><Maximize2 v-else :size="17" />
          </BaseButton>
        </div>
      </div>

      <div class="development-toolbar">
        <form class="development-search" role="search" @submit.prevent="applySearch">
          <Search :size="16" aria-hidden="true" />
          <input v-model="searchDraft" type="search" aria-label="Поиск сотрудников развития" placeholder="Поиск" />
          <BaseButton type="submit" variant="secondary">Найти</BaseButton>
        </form>
        <BaseButton variant="secondary" @click="filtersOpen=true">Фильтры</BaseButton>
        <BaseActionDropdown label="Группировка" :options="groupOptions" @select="setGrouping" />
        <BaseColumnPicker v-model="visibleColumns" :columns="optionalColumns" title="Настройка колонок" />
        <span class="toolbar-spacer"></span>
        <BaseActionDropdown label="Шаблоны" :options="templateOptions" @select="templateAction" />
      </div>

      <BaseFilterSummary :items="filterChips" label="Активные фильтры развития" @remove="clearFilter" @clear="clearFilters" />
      <BaseTableBulkActions :count="selectedRows.length" subject="сотрудников" :options="bulkOptions"
        @execute="doBulk" @clear="selectedIds=[]" />

      <BaseDataTable :rows="filteredRows" :columns="shownColumns" row-key="id"
        selectable selection-label="Выбрать сотрудника" v-model:selected-keys="selectedIds"
        :group-by="groupMode!=='none'?groupBy:undefined" :loading="loading"
        caption="Кадровый резерв и обучение сотрудников"
        empty-title="Сотрудники не найдены"
        empty-description="Измените поиск или фильтры, чтобы увидеть записи.">
        <template #cell-full_name="{row}">
          <div class="employee-cell">
            <RouterLink :to="employeeRoute(row.id)">{{ row.full_name }}</RouterLink>
            <span>{{ row.current_department_name||'Без отдела' }}</span>
          </div>
        </template>
        <template #cell-personnel_number="{value}">{{ value||'—' }}</template>
        <template #cell-current_position_name="{value}">{{ value||'—' }}</template>
        <template #cell-current_department_name="{value}">{{ value||'—' }}</template>
        <template #cell-learning_label="{row}">
          <div class="learning-cell"><strong>{{ row.learning_label }}</strong><span v-if="row.learning_detail">{{ row.learning_detail }}</span></div>
        </template>
        <template #cell-development_status="{row}">
          <BaseStatusPill :tone="row.development_tone">{{ row.development_status }}</BaseStatusPill>
        </template>
        <template #cell-actions="{row}"><RouterLink class="row-link" :to="employeeRoute(row.id)">Открыть</RouterLink></template>
      </BaseDataTable>

      <div class="development-pagination">
        <span>Всего {{ total }} строк, показать</span>
        <BaseSelectField v-model="pageSize" label="Строк на странице"
          :options="[{id:'10',name:'10 на странице'},{id:'15',name:'15 на странице'},{id:'25',name:'25 на странице'},{id:'50',name:'50 на странице'}]" />
        <BasePagination :page="page" :last-page="lastPage" :loading="loading"
          caption="Страницы кадрового резерва и обучения" @previous="page--" @next="page++" />
      </div>
    </template>
    <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>

    <BaseDrawer :open="filtersOpen" title="Фильтры" description="Фильтры реестра кадрового резерва и обучения" @close="filtersOpen=false">
      <div class="filter-drawer-content">
        <BaseSelectField v-model="statusFilter" label="Статус развития" :options="statusOptions" />
        <BaseNotice tone="info">Поиск по ФИО и табельному номеру применяется ко всему реестру. Статус развития фильтрует загруженную страницу.</BaseNotice>
      </div>
      <template #footer><BaseButton @click="filtersOpen=false">Применить</BaseButton><BaseButton variant="secondary" @click="statusFilter='all'">Сбросить</BaseButton></template>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.employee-development-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.employee-development-page.is-fullscreen{position:fixed;z-index:220;inset:0;overflow:auto;padding:20px;background:var(--color-page)}
.registry-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}.registry-breadcrumb img{width:15px;height:15px}.registry-breadcrumb strong{font-weight:500;color:var(--color-text)}
.development-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.development-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}.development-heading h1 span{font-size:14px;font-weight:500}
.development-heading-actions{display:flex;align-items:end;justify-content:flex-end;gap:8px;flex-wrap:wrap}.development-heading-actions :deep(.base-select-field){width:210px}
.development-toolbar{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.toolbar-spacer{flex:1}
.development-search{display:flex;align-items:center;gap:7px;flex:1 1 260px;min-height:40px;padding-left:10px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface)}.development-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.employee-cell,.learning-cell{display:grid;gap:3px;min-width:160px}.employee-cell a,.learning-cell strong{color:var(--color-text);font-size:12px;font-weight:600}.employee-cell span,.learning-cell span{color:var(--color-muted);font-size:10px}.row-link{color:var(--color-primary);font-size:11px;font-weight:700;text-decoration:underline;text-underline-offset:2px}
.development-pagination{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--color-muted);font-size:11px}.development-pagination :deep(.base-select-field){width:160px}.development-pagination :deep(.base-pagination){margin-left:auto}
.filter-drawer-content{display:grid;gap:16px}
:global(body.hrm-development-fullscreen){overflow:hidden}
@media(max-width:760px){
  .development-heading-actions{width:100%;justify-content:flex-start}.development-heading-actions :deep(.base-select-field){width:100%}
  .development-toolbar{display:grid;grid-template-columns:1fr}.development-search{width:100%}.toolbar-spacer{display:none}
  .development-pagination{display:grid;grid-template-columns:1fr}.development-pagination :deep(.base-select-field){width:100%}.development-pagination :deep(.base-pagination){margin-left:0}
  .employee-development-page.is-fullscreen{padding:12px}
}
</style>
