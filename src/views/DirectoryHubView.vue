<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, FolderTree, Plus, Search } from 'lucide-vue-next'
import { publicAsset } from '../utils/publicAsset'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  createDirectoryEntry, deleteDirectoryEntry, listDirectoryEntries, updateDirectoryEntry,
  type DirectoryEntry, type DirectoryStatus,
} from '../api/directories'

type GroupDefinition={id:string;label:string;description:string}

const tabs=[
  {id:'leave',label:'Отпуска и лимиты'},
  {id:'labor',label:'Условия труда, надбавки и компенсации'},
  {id:'tariffs',label:'Тарифы и начисления'},
  {id:'development',label:'Развитие и подбор кадров'},
  {id:'documents',label:'Документы и основания'},
]
const groups:Record<string,GroupDefinition[]>={
  leave:[
    {id:'leave-types',label:'Виды отпусков',description:'ежегодные, дополнительные, социальные и специальные отпуска'},
    {id:'leave-limits',label:'Лимиты отпусков',description:'правила начисления, переносы и ограничения'},
    {id:'absence-types',label:'Виды отсутствий',description:'больничные, командировки, отгулы и другие причины'},
    {id:'balance-methods',label:'Методы расчёта баланса',description:'календарные, рабочие дни и индивидуальные правила'},
  ],
  labor:[
    {id:'work-conditions',label:'Виды условий труда',description:'нормальные, вредные и особые условия труда'},
    {id:'allowance-types',label:'Виды надбавок',description:'за условия, квалификацию, стаж и режим работы'},
    {id:'compensations',label:'Компенсации',description:'компенсационные выплаты и возмещения'},
    {id:'benefits',label:'Льготы',description:'дополнительные дни, питание и другие льготы'},
    {id:'condition-bases',label:'Основания условий труда',description:'карты, приказы и нормативные основания'},
  ],
  tariffs:[
    {id:'tariff-types',label:'Виды тарифов',description:'по грузам, дополнительные работы, доплаты, внутрипортовые работы'},
    {id:'calculation-units',label:'Единицы расчёта',description:'тонна, час, смена, операция, месяц'},
    {id:'position-schemes',label:'Тарифные схемы должностей',description:'какие тарифы могут применяться к конкретной должности'},
    {id:'base-tariffing',label:'Основания тарификации',description:'почему применяется тот или иной тариф'},
    {id:'tariff-methods',label:'Способы тарификации',description:'повременная, сдельная и комбинированная'},
    {id:'tariffs',label:'Тарифы',description:'конкретные тарифные строки и группы'},
    {id:'cargo-types',label:'Виды грузов',description:'категории грузов'},
  ],
  development:[
    {id:'training-types',label:'Виды обучения',description:'внутреннее, внешнее и обязательное обучение'},
    {id:'training-modes',label:'Форматы обучения',description:'очное, дистанционное и на рабочем месте'},
    {id:'reserve-levels',label:'Уровни кадрового резерва',description:'корпоративный и функциональный уровни'},
    {id:'reserve-types',label:'Виды кадрового резерва',description:'оперативный и среднесрочный резерв'},
    {id:'recruiting-sources',label:'Источники подбора',description:'каналы и источники кандидатов'},
  ],
  documents:[
    {id:'document-types',label:'Виды документов',description:'договоры, приказы, основания и приложения'},
    {id:'document-statuses',label:'Статусы документов',description:'черновик, действует, подписан, закрыт'},
    {id:'personnel-bases',label:'Основания кадровых действий',description:'приём, перевод, увольнение и иные основания'},
    {id:'order-types',label:'Типы приказов',description:'классификация кадровых приказов'},
  ],
}

const companies=ref<CompanyRecord[]>([])
const company=ref('')
const activeSection=ref('tariffs')
const activeGroup=ref('tariff-types')
const records=ref<DirectoryEntry[]>([])
const groupCounts=ref<Record<string,number>>({})
const writesEnabled=ref(false)
const loading=ref(false)
const saving=ref(false)
const error=ref('')
const success=ref('')
const search=ref('')
const statusFilter=ref('all')
const editorOpen=ref(false)
const editing=ref<DirectoryEntry|null>(null)
const draft=ref({code:'',name:'',parent_id:null as string|null,category:'',unit:'',value:'',status:'active' as DirectoryStatus})
const expandedCategories=ref<string[]>([])

const currentGroups=computed(()=>groups[activeSection.value]??[])
const currentGroup=computed(()=>currentGroups.value.find(x=>x.id===activeGroup.value)??null)
const statusOptions=[{id:'all',name:'Все статусы'},{id:'active',name:'Активные'},{id:'draft',name:'Черновики'},{id:'inactive',name:'Неактивные'}]
const visibleRows=computed(()=>records.value.filter(row=>{
  const q=search.value.trim().toLowerCase()
  return (statusFilter.value==='all'||row.status===statusFilter.value)
    &&(!q||[row.code,row.name,row.category??'',row.unit??'',row.value??''].join(' ').toLowerCase().includes(q))
}))
const hierarchyRows=computed(()=>{
  const lookup=new Map(records.value.map(row=>[row.id,row]))
  const groups=new Map<string,DirectoryEntry[]>()
  for(const item of visibleRows.value){
    const parent=item.parent_id && lookup.has(item.parent_id)?item.parent_id:''
    const bucket=groups.get(parent)??[]
    bucket.push(item);groups.set(parent,bucket)
  }
  const results:Array<{row:DirectoryEntry;level:number;children:boolean}>=[]
  const seen=new Set<string>()
  function walk(parent:string,depth:number){
    for(const row of groups.get(parent)??[]){
      if(seen.has(row.id))continue
      seen.add(row.id)
      const children=records.value.some(child=>child.parent_id===row.id)
      results.push({row,level:depth,children})
      if(expandedCategories.value.includes(row.id)||search.value.trim())walk(row.id,depth+1)
    }
  }
  walk('',0)
  // Search results whose parents are hidden must remain accessible.
  if(search.value.trim())for(const row of visibleRows.value)if(!seen.has(row.id))results.push({row,level:0,children:false})
  return results
})
const tariffTreeColumns=[{key:'name',label:'Наименование'},{key:'code',label:'Код'},{key:'unit',label:'Единица'},{key:'value',label:'Значение'},{key:'status',label:'Статус'},{key:'actions',label:'Действия'}]
const parentOptions=computed(()=>[{id:'',name:'Без родительской группы'},...records.value.filter(row=>row.id!==editing.value?.id).map(row=>({id:row.id,name:row.name}))])
function toggleCategory(id:string){expandedCategories.value=expandedCategories.value.includes(id)?expandedCategories.value.filter(x=>x!==id):[...expandedCategories.value,id]}
const filterChips=computed(()=>[
  ...(search.value?[{id:'search',label:'Поиск: '+search.value}]:[]),
  ...(statusFilter.value!=='all'?[{id:'status',label:'Статус: '+(statusOptions.find(x=>x.id===statusFilter.value)?.name??statusFilter.value)}]:[]),
])
const columns=[
  {key:'code',label:'Код'},{key:'name',label:'Наименование'},{key:'category',label:'Категория'},
  {key:'unit',label:'Единица'},{key:'value',label:'Значение'},{key:'status',label:'Статус'},{key:'actions',label:'Действия'},
]

async function loadCompanies(){
  const response=await listCompanies();companies.value=response.data
  if(!companies.value.some(x=>x.id===company.value))company.value=companies.value[0]?.id??''
}
let directoryRequest=0
async function loadRecords(){
  const request=++directoryRequest
  const companyId=company.value
  const groupId=activeGroup.value
  records.value=[]
  writesEnabled.value=false
  if(!companyId||!groupId){loading.value=false;return}
  loading.value=true;error.value=''
  try{
    const response=await listDirectoryEntries(companyId,groupId)
    if(request!==directoryRequest||companyId!==company.value||groupId!==activeGroup.value)return
    records.value=response.data;writesEnabled.value=response.meta.writes_enabled
    groupCounts.value={...groupCounts.value,[groupId]:response.data.length}
  }catch(cause){
    if(request!==directoryRequest)return
    records.value=[];error.value=cause instanceof Error?cause.message:'Не удалось загрузить справочник'
  }finally{if(request===directoryRequest)loading.value=false}
}
function selectSection(id:string){
  if(!groups[id])return
  activeSection.value=id;activeGroup.value=groups[id]?.[0]?.id??'';search.value='';statusFilter.value='all'
}
function toggleGroup(id:string){if(activeGroup.value===id)return;activeGroup.value=id;search.value='';statusFilter.value='all'}
function clearFilter(id:string){if(id==='search')search.value='';if(id==='status')statusFilter.value='all'}
function clearFilters(){search.value='';statusFilter.value='all'}
function recordCount(groupId:string){return groupId===activeGroup.value?records.value.length:(groupCounts.value[groupId]??0)}
function openCreate(parentId:string|null=null){editing.value=null;draft.value={code:'',name:'',parent_id:parentId,category:currentGroup.value?.label??'',unit:'',value:'',status:'active'};editorOpen.value=true;success.value=''}
function openEdit(row:DirectoryEntry){editing.value=row;draft.value={code:row.code,name:row.name,parent_id:row.parent_id??null,category:row.category??'',unit:row.unit??'',value:row.value??'',status:row.status};editorOpen.value=true;success.value=''}
async function saveRecord(){
  if(!company.value||!currentGroup.value||saving.value)return
  saving.value=true;error.value='';success.value=''
  const payload={parent_id:draft.value.parent_id||null,code:draft.value.code.trim(),name:draft.value.name.trim(),category:draft.value.category.trim()||null,unit:draft.value.unit.trim()||null,value:draft.value.value.trim()||null,status:draft.value.status}
  try{
    if(editing.value)await updateDirectoryEntry(company.value,currentGroup.value.id,editing.value.id,editing.value.revision,payload)
    else await createDirectoryEntry(company.value,currentGroup.value.id,payload)
    editorOpen.value=false;success.value=editing.value?'Запись обновлена.':'Запись добавлена.';await loadRecords()
  }catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось сохранить запись'}
  finally{saving.value=false}
}
async function removeRecord(row:DirectoryEntry){
  if(!company.value||!currentGroup.value||!writesEnabled.value)return
  if(!window.confirm('Удалить запись «'+row.name+'»?'))return
  try{await deleteDirectoryEntry(company.value,currentGroup.value.id,row.id,row.revision);success.value='Запись удалена.';await loadRecords()}
  catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось удалить запись'}
}
function rowAction(id:string,row:DirectoryEntry){if(id==='edit')openEdit(row);if(id==='delete')void removeRecord(row)}
watch([company,activeGroup],()=>{expandedCategories.value=[];editorOpen.value=false;success.value='';void loadRecords()})
onMounted(async()=>{try{await loadCompanies();if(company.value)await loadRecords()}catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось загрузить справочники'}})
</script>

<template>
  <section class="directory-hub">
    <h1 class="directory-sr-only">Справочники</h1>
    <div class="directory-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Справочники</strong><span>/</span>
      <span>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</span>
    </div>

    <BaseViewTabs :model-value="activeSection" :options="tabs" label="Группы справочников" @update:model-value="selectSection" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <div class="directory-context">
      <div><strong>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</strong><span>{{ currentGroups.length }} справочников в группе</span></div>
      <div class="directory-context-actions">
        <BaseSelectField v-if="companies.length>1" v-model="company" label="Компания" :options="companies" />
        <RouterLink class="positions-link" to="/directories/positions">Справочник должностей</RouterLink>
      </div>
    </div>

    <div class="directory-workspace">
      <nav class="directory-index" aria-label="Справочники группы">
        <div class="directory-index-heading"><strong>Разделы</strong><small>{{ currentGroups.length }} справочников</small></div>
        <BaseButton v-for="group in currentGroups" :key="group.id" type="button" variant="secondary"
          class="directory-group-button" :class="{ 'is-active': activeGroup===group.id }"
          :aria-expanded="activeGroup===group.id" aria-controls="directory-active-panel" @click="toggleGroup(group.id)">
          <span class="directory-group-copy"><strong>{{ group.label }}</strong><small>{{ group.description }}</small></span>
          <span class="directory-group-count">{{ recordCount(group.id) }}</span>
          <ChevronDown :size="16" :class="{rotated:activeGroup===group.id}" aria-hidden="true" />
        </BaseButton>
      </nav>

      <BaseCard v-if="currentGroup" id="directory-active-panel" class="directory-detail">
        <div class="directory-detail-heading">
          <div><span class="directory-eyebrow">Справочник · {{ tabs.find(tab=>tab.id===activeSection)?.label }}</span><h2>{{ currentGroup.label }}</h2><p>{{ currentGroup.description }}</p></div>
          <span class="directory-detail-count">{{ records.length }} записей</span>
        </div>
        <BaseNotice v-if="!writesEnabled" tone="info">Редактирование этого справочника закрыто серверным release flag.</BaseNotice>
        <div class="directory-toolbar">
          <label class="directory-search"><Search :size="16" aria-hidden="true" /><input v-model="search" type="search" placeholder="Поиск по названию или коду" aria-label="Поиск по справочнику" /></label>
          <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
          <BaseButton :disabled="!writesEnabled" @click="openCreate()"><Plus :size="16" /> Добавить запись</BaseButton>
        </div>
        <BaseFilterSummary :items="filterChips" label="Активные фильтры" @remove="clearFilter" @clear="clearFilters" />
        <BaseLoadingState v-if="loading" label="Загрузка справочника" />
        <BaseNotice v-if="activeGroup==='tariff-types' && !loading && !visibleRows.length" tone="info">{{ records.length ? 'По заданным фильтрам тарифы не найдены.' : 'Тарифных групп пока нет. Добавьте первую запись, если у вас есть право редактирования.' }}</BaseNotice>
        <div v-if="activeGroup==='tariff-types' && !loading && visibleRows.length" class="directory-tariff-tree" role="tree" aria-label="Иерархия тарифов">
          <div v-for="item in hierarchyRows" :key="item.row.id" class="tariff-tree-row" role="treeitem"
            :aria-level="item.level+1" :aria-expanded="item.children?expandedCategories.includes(item.row.id):undefined"
            :style="{paddingInlineStart:(12+item.level*22)+'px'}">
            <BaseButton v-if="item.children" icon-only variant="secondary" class="tariff-expand" :aria-label="'Раскрыть: '+item.row.name" @click="toggleCategory(item.row.id)">
              <ChevronDown v-if="expandedCategories.includes(item.row.id)" :size="16"/><ChevronRight v-else :size="16"/>
            </BaseButton>
            <FolderTree v-else :size="15" class="tariff-leaf-icon"/>
            <span class="tariff-name">{{ item.row.name }}</span>
            <span class="tariff-code">{{ item.row.code }}</span>
            <span class="tariff-status">{{ item.row.status==='active'?'Активно':item.row.status==='draft'?'Черновик':'Неактивно' }}</span>
            <BaseButton v-if="writesEnabled" variant="secondary" @click="openEdit(item.row)">Изменить</BaseButton>
            <BaseButton v-if="writesEnabled" variant="secondary" @click="openCreate(item.row.id)"><Plus :size="14"/> Добавить</BaseButton>
          </div>
        </div>
        <div v-if="activeGroup!=='tariff-types'" class="directory-table-scroll">
          <BaseDataTable :rows="visibleRows" :columns="columns" row-key="id" density="compact" :caption="currentGroup.label"
            empty-title="Записей нет" empty-description="Добавьте первую запись или измените условия поиска.">
            <template #cell-value="{value}">{{ value || '—' }}</template>
            <template #cell-status="{row}">
              <BaseStatusPill :tone="row.status==='active'?'success':row.status==='draft'?'warning':'danger'">
                {{ row.status==='active'?'Активно':row.status==='draft'?'Черновик':'Неактивно' }}
              </BaseStatusPill>
            </template>
            <template #cell-actions="{row}">
              <BaseActionDropdown variant="icon" :label="'Действия: '+row.name" :disabled="!writesEnabled"
                :options="[{id:'edit',label:'Редактировать'},{id:'delete',label:'Удалить'}]" @select="rowAction($event,row)" />
            </template>
          </BaseDataTable>
        </div>
      </BaseCard>
    </div>

    <BaseDrawer :open="editorOpen" :title="editing?'Редактировать запись':'Новая запись — '+(currentGroup?.label??'')" :description="currentGroup?.description??''" @close="editorOpen=false">
      <form class="directory-create-form" @submit.prevent="saveRecord">
        <BaseFormField v-model="draft.code" label="Код" required />
        <BaseFormField v-model="draft.name" label="Наименование" required />
        <BaseSelectField v-if="activeGroup==='tariff-types'" :model-value="draft.parent_id??''" @update:model-value="draft.parent_id=$event||null"
          label="Родительская группа" :options="parentOptions" />
        <BaseFormField v-model="draft.category" label="Категория" />
        <BaseFormField v-model="draft.unit" label="Единица" />
        <BaseFormField v-model="draft.value" label="Значение" />
        <BaseSelectField v-model="draft.status" label="Статус" :options="statusOptions.filter(x=>x.id!=='all')" />
        <div class="create-actions">
          <BaseButton type="button" variant="secondary" @click="editorOpen=false">Отмена</BaseButton>
          <BaseButton type="submit" :disabled="saving||!writesEnabled||!draft.code.trim()||!draft.name.trim()">{{ saving?'Сохранение…':'Сохранить' }}</BaseButton>
        </div>
      </form>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.directory-hub{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;max-width:100%}
.directory-tariff-tree{width:100%;min-width:0;border:1px solid var(--color-stroke);border-radius:8px;overflow-x:auto}
.tariff-tree-row{display:flex;align-items:center;gap:10px;min-width:650px;min-height:43px;padding:6px 12px;border-bottom:1px solid var(--color-stroke);font-size:12px}
.tariff-tree-row:last-child{border-bottom:0}
.tariff-tree-row:hover{background:var(--color-hover)}
.tariff-name{flex:1;min-width:140px;color:var(--color-text)}
.tariff-code{width:110px;flex:none;color:var(--color-muted)}
.tariff-status{width:80px;flex:none;color:var(--color-muted)}
.tariff-expand{display:grid;place-items:center;flex:none;width:23px;height:23px;border:0;background:transparent;color:var(--color-muted);cursor:pointer}
.tariff-leaf-icon{color:var(--color-muted);flex:none}
.tariff-tree-row :deep(.base-button){font-weight:500;font-size:11px;min-height:27px;height:27px;padding:4px 8px}
.directory-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.directory-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;color:var(--color-muted);font-size:12px}
.directory-breadcrumb img{width:15px;height:15px}.directory-breadcrumb strong{color:var(--color-text);font-weight:500}
.directory-context{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.directory-context>div:first-child{display:grid;gap:3px}.directory-context strong{font-size:14px}.directory-context span{color:var(--color-muted);font-size:11px}
.directory-context-actions{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.directory-context-actions :deep(.base-select-field){min-width:210px}
.positions-link{display:inline-flex;align-items:center;min-height:36px;padding:7px 11px;border:1px solid var(--color-stroke-strong);border-radius:8px;background:var(--color-surface);box-shadow:var(--shadow-control);color:var(--color-text);font-size:12px;font-weight:650}
.positions-link:hover{background:var(--color-soft);border-color:var(--color-primary-stroke)}
.directory-workspace{display:grid;grid-template-columns:minmax(224px,270px) minmax(0,1fr);gap:12px;align-items:start;min-width:0}
.directory-index{display:grid;gap:4px;padding:9px;border:1px solid var(--color-stroke);border-radius:9px;background:var(--color-surface);box-shadow:var(--shadow-card);min-width:0}
.directory-index-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 10px 12px;border-bottom:1px solid var(--color-stroke);margin-bottom:5px}
.directory-index-heading strong{font-size:13px}.directory-index-heading small{color:var(--color-muted);font-size:10px}
.directory-group-button{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;justify-content:stretch;height:auto;min-height:56px;width:100%;padding:10px 11px;border:1px solid transparent;border-radius:7px;background:transparent;backdrop-filter:none;box-shadow:none;color:var(--color-text);white-space:normal;text-align:left}
.directory-group-button.secondary:hover:not(:disabled){background:var(--color-hover)}
.directory-group-button.is-active{background:var(--color-accent-soft);border-color:var(--color-primary-stroke);color:var(--color-primary)}
.directory-group-copy{display:grid;gap:3px;min-width:0}.directory-group-copy strong{font-size:12px;line-height:17px}.directory-group-copy small{font-size:10px;line-height:14px;color:var(--color-muted);overflow-wrap:anywhere}
.directory-group-count{min-width:24px;padding:4px 6px;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:var(--color-muted);background:var(--color-soft)}
.directory-group-button svg{color:var(--color-muted);transform:rotate(-90deg);transition:transform .15s}.directory-group-button svg.rotated{color:var(--color-primary);transform:rotate(0)}
.directory-detail{min-width:0;display:grid;gap:14px;padding:17px;overflow:hidden}
.directory-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-bottom:13px;border-bottom:1px solid var(--color-stroke)}
.directory-detail-heading>div{display:grid;gap:5px}.directory-eyebrow{font-size:10px;color:var(--color-muted)}.directory-detail-heading h2{font-size:18px;line-height:24px;font-weight:750;margin:0}.directory-detail-heading p{margin:0;font-size:11px;line-height:17px;color:var(--color-muted);max-width:570px}
.directory-detail-count{padding:6px 9px;border:1px solid var(--color-stroke);border-radius:7px;font-size:11px;font-weight:700;color:var(--color-muted)}
.directory-toolbar{display:grid;grid-template-columns:minmax(190px,1fr) minmax(138px,165px) auto;gap:10px;align-items:end;min-width:0}
.directory-search{height:var(--control-height);display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--color-stroke-strong);border-radius:8px;background:var(--color-surface-raised);box-shadow:var(--shadow-control);color:var(--color-muted)}
.directory-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.directory-table-scroll{min-width:0;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain}.directory-table-scroll :deep(table){min-width:650px}
.directory-create-form{display:grid;gap:16px;min-height:calc(100dvh - 160px)}.create-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:auto;padding-top:12px;border-top:1px solid var(--color-stroke)}
@media(max-width:1050px){.directory-workspace{grid-template-columns:minmax(195px,240px) minmax(0,1fr)}.directory-toolbar{grid-template-columns:minmax(150px,1fr) minmax(120px,150px)}.directory-toolbar :deep(.base-button){grid-column:1/-1;justify-self:start}}
@media(max-width:800px){.directory-workspace{grid-template-columns:minmax(0,1fr)}.directory-index{grid-template-columns:repeat(2,minmax(0,1fr))}.directory-index-heading{grid-column:1/-1}.directory-detail{padding:14px}.directory-toolbar{grid-template-columns:minmax(0,1fr) 150px}}
@media(max-width:560px){.directory-index{display:flex;gap:5px;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}.directory-index-heading{display:none}.directory-group-button{flex:0 0 180px;min-width:180px;min-height:46px;padding:9px}.directory-group-copy small,.directory-group-button svg{display:none}.directory-detail{padding:12px}.directory-toolbar{grid-template-columns:minmax(0,1fr)}.directory-toolbar :deep(.base-button){grid-column:auto;width:100%}.create-actions :deep(.base-button){flex:1}}
</style>
