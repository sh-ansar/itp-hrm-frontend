<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { publicAsset } from '../utils/publicAsset'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
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

type GroupDefinition = { id: string; label: string; description: string }

const tabs = [
  { id: 'leave', label: 'Отпуска и лимиты' },
  { id: 'labor', label: 'Условия труда, надбавки и компенсации' },
  { id: 'tariffs', label: 'Тарифы и начисления' },
  { id: 'development', label: 'Развитие и подбор кадров' },
  { id: 'documents', label: 'Документы и основания' },
]
const groups: Record<string, GroupDefinition[]> = {
  leave: [
    { id:'leave-types',label:'Виды отпусков',description:'ежегодные, дополнительные, социальные и специальные отпуска' },
    { id:'leave-limits',label:'Лимиты отпусков',description:'правила начисления, переносы и ограничения' },
    { id:'absence-types',label:'Виды отсутствий',description:'больничные, командировки, отгулы и другие причины' },
    { id:'balance-methods',label:'Методы расчёта баланса',description:'календарные, рабочие дни и индивидуальные правила' },
  ],
  labor: [
    { id:'work-conditions',label:'Виды условий труда',description:'нормальные, вредные и особые условия труда' },
    { id:'allowance-types',label:'Виды надбавок',description:'за условия, квалификацию, стаж и режим работы' },
    { id:'compensations',label:'Компенсации',description:'компенсационные выплаты и возмещения' },
    { id:'benefits',label:'Льготы',description:'дополнительные дни и другие льготы' },
    { id:'condition-bases',label:'Основания условий труда',description:'карты, приказы и нормативные основания' },
  ],
  tariffs: [
    { id:'tariff-types',label:'Виды тарифов',description:'типы тарифов и начислений' },
    { id:'calculation-units',label:'Единицы расчёта',description:'тонна, час, смена, операция, месяц' },
    { id:'position-schemes',label:'Тарифные схемы должностей',description:'связь должностей и тарифных схем' },
    { id:'base-tariffing',label:'Основания тарификации',description:'основания применения тарифов' },
    { id:'tariff-methods',label:'Способы тарификации',description:'повременная, сдельная и комбинированная' },
    { id:'tariffs',label:'Тарифы',description:'конкретные тарифные строки' },
    { id:'cargo-types',label:'Виды грузов',description:'категории грузов' },
  ],
  development: [
    { id:'training-types',label:'Виды обучения',description:'внутреннее, внешнее и обязательное обучение' },
    { id:'training-modes',label:'Форматы обучения',description:'очное, дистанционное и на рабочем месте' },
    { id:'reserve-levels',label:'Уровни кадрового резерва',description:'корпоративный и функциональный уровни' },
    { id:'reserve-types',label:'Виды кадрового резерва',description:'оперативный и среднесрочный резерв' },
    { id:'recruiting-sources',label:'Источники подбора',description:'каналы и источники кандидатов' },
  ],
  documents: [
    { id:'document-types',label:'Виды документов',description:'договоры, приказы, основания и приложения' },
    { id:'document-statuses',label:'Статусы документов',description:'черновик, действует, подписан, закрыт' },
    { id:'personnel-bases',label:'Основания кадровых действий',description:'приём, перевод, увольнение и иные основания' },
    { id:'order-types',label:'Типы приказов',description:'классификация кадровых приказов' },
  ],
}

const companies=ref<CompanyRecord[]>([])
const company=ref('')
const activeSection=ref('leave')
const activeGroup=ref('leave-types')
const records=ref<DirectoryEntry[]>([])
const writesEnabled=ref(false)
const loading=ref(false)
const saving=ref(false)
const error=ref('')
const success=ref('')
const search=ref('')
const statusFilter=ref('all')
const editorOpen=ref(false)
const editing=ref<DirectoryEntry|null>(null)
const draft=ref({code:'',name:'',category:'',unit:'',value:'',status:'active' as DirectoryStatus})

const currentGroups=computed(()=>groups[activeSection.value]??[])
const currentGroup=computed(()=>currentGroups.value.find(x=>x.id===activeGroup.value)??null)
const statusOptions=[{id:'all',name:'Все статусы'},{id:'active',name:'Активные'},{id:'draft',name:'Черновики'},{id:'inactive',name:'Неактивные'}]
const visibleRows=computed(()=>records.value.filter(row=>{
  const q=search.value.trim().toLowerCase()
  return (statusFilter.value==='all'||row.status===statusFilter.value)
    &&(!q||[row.code,row.name,row.category??'',row.unit??'',row.value??''].join(' ').toLowerCase().includes(q))
}))
const chips=computed(()=>[
  ...(search.value?[{id:'search',label:'Поиск: '+search.value}]:[]),
  ...(statusFilter.value!=='all'?[{id:'status',label:'Статус: '+statusOptions.find(x=>x.id===statusFilter.value)?.name}]:[]),
])
const columns=[
  {key:'code',label:'Код'},{key:'name',label:'Наименование'},{key:'category',label:'Категория'},
  {key:'unit',label:'Единица'},{key:'value',label:'Значение'},{key:'status',label:'Статус'},{key:'actions',label:'Действия'},
]

async function loadCompanies(){
  const response=await listCompanies(); companies.value=response.data
  if(!companies.value.some(x=>x.id===company.value)) company.value=companies.value[0]?.id??''
}
async function loadRecords(){
  if(!company.value||!activeGroup.value)return
  loading.value=true;error.value=''
  try{const response=await listDirectoryEntries(company.value,activeGroup.value);records.value=response.data;writesEnabled.value=response.meta.writes_enabled}
  catch(cause){records.value=[];error.value=cause instanceof Error?cause.message:'Не удалось загрузить справочник'}
  finally{loading.value=false}
}
function selectSection(id:string){activeSection.value=id;activeGroup.value=groups[id]?.[0]?.id??''}
function clearFilter(id:string){if(id==='search')search.value='';if(id==='status')statusFilter.value='all'}
function openCreate(){editing.value=null;draft.value={code:'',name:'',category:currentGroup.value?.label??'',unit:'',value:'',status:'active'};editorOpen.value=true;success.value=''}
function openEdit(row:DirectoryEntry){editing.value=row;draft.value={code:row.code,name:row.name,category:row.category??'',unit:row.unit??'',value:row.value??'',status:row.status};editorOpen.value=true;success.value=''}
async function save(){
  if(!company.value||!currentGroup.value||saving.value)return
  saving.value=true;error.value='';success.value=''
  const payload={code:draft.value.code.trim(),name:draft.value.name.trim(),category:draft.value.category.trim()||null,unit:draft.value.unit.trim()||null,value:draft.value.value.trim()||null,status:draft.value.status}
  try{
    if(editing.value) await updateDirectoryEntry(company.value,currentGroup.value.id,editing.value.id,editing.value.revision,payload)
    else await createDirectoryEntry(company.value,currentGroup.value.id,payload)
    editorOpen.value=false;success.value=editing.value?'Запись обновлена.':'Запись добавлена.';await loadRecords()
  }catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось сохранить запись'}
  finally{saving.value=false}
}
async function remove(row:DirectoryEntry){
  if(!company.value||!currentGroup.value||!writesEnabled.value)return
  if(!window.confirm('Удалить запись «'+row.name+'»?'))return
  try{await deleteDirectoryEntry(company.value,currentGroup.value.id,row.id,row.revision);success.value='Запись удалена.';await loadRecords()}
  catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось удалить запись'}
}
function rowAction(id:string,row:DirectoryEntry){if(id==='edit')openEdit(row);if(id==='delete')void remove(row)}
watch([company,activeGroup],()=>void loadRecords())
onMounted(async()=>{try{await loadCompanies();if(company.value)await loadRecords()}catch(cause){error.value=cause instanceof Error?cause.message:'Не удалось загрузить справочники'}})
</script>

<template>
  <section class="directory-hub">
    <div class="directory-breadcrumb"><img :src="publicAsset('prototype-icons/Home.svg')" alt="" /><span>/</span><strong>Справочники</strong></div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseViewTabs :model-value="activeSection" :options="tabs" label="Группы справочников" @update:model-value="selectSection" />

    <div class="directory-layout">
      <BaseCard class="group-card">
        <BaseSelectField v-if="companies.length>1" v-model="company" label="Компания" :options="companies" />
        <button v-for="group in currentGroups" :key="group.id" type="button" class="group-item" :class="{active:activeGroup===group.id}" @click="activeGroup=group.id">
          <strong>{{ group.label }}</strong><small>{{ group.description }}</small>
        </button>
      </BaseCard>

      <BaseCard class="records-card">
        <div class="records-heading">
          <div><h1>{{ currentGroup?.label }}</h1><p>{{ currentGroup?.description }} · {{ records.length }} записей</p></div>
          <BaseButton :disabled="!writesEnabled" @click="openCreate">Добавить запись</BaseButton>
        </div>
        <BaseNotice v-if="!writesEnabled" tone="info">Редактирование справочников сейчас закрыто серверным release flag.</BaseNotice>
        <div class="toolbar">
          <label class="search"><Search :size="16"/><input v-model="search" type="search" placeholder="Поиск по коду и названию"></label>
          <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
        </div>
        <BaseFilterSummary :items="chips" label="Активные фильтры" @remove="clearFilter" @clear="search='';statusFilter='all'" />
        <BaseLoadingState v-if="loading" label="Загрузка справочника" />
        <BaseDataTable v-else :rows="visibleRows" :columns="columns" row-key="id" caption="Записи справочника" empty-title="Записей пока нет" empty-description="Добавьте первую запись в этот справочник.">
          <template #cell-status="{row}"><BaseStatusPill :tone="row.status==='active'?'success':'danger'">{{ row.status==='active'?'Активный':row.status==='draft'?'Черновик':'Неактивный' }}</BaseStatusPill></template>
          <template #cell-actions="{row}"><BaseActionDropdown variant="icon" :label="'Действия: '+row.name" :disabled="!writesEnabled" :options="[{id:'edit',label:'Редактировать'},{id:'delete',label:'Удалить'}]" @select="rowAction($event,row)" /></template>
        </BaseDataTable>
      </BaseCard>
    </div>

    <BaseDrawer :open="editorOpen" :title="editing?'Редактировать запись':'Добавить запись'" :description="currentGroup?.label??''" @close="editorOpen=false">
      <div class="form-grid">
        <label><span>Код</span><input v-model="draft.code" type="text"></label>
        <label><span>Наименование</span><input v-model="draft.name" type="text"></label>
        <label><span>Категория</span><input v-model="draft.category" type="text"></label>
        <label><span>Единица</span><input v-model="draft.unit" type="text"></label>
        <label><span>Значение</span><input v-model="draft.value" type="text"></label>
        <BaseSelectField v-model="draft.status" label="Статус" :options="statusOptions.filter(x=>x.id!=='all')" />
      </div>
      <template #footer><BaseButton variant="secondary" @click="editorOpen=false">Отмена</BaseButton><BaseButton :disabled="saving||!draft.code.trim()||!draft.name.trim()" @click="save">{{ saving?'Сохранение…':'Сохранить' }}</BaseButton></template>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.directory-hub{display:grid;gap:14px;min-width:0}.directory-breadcrumb{display:flex;align-items:center;gap:9px;color:var(--color-muted);font-size:12px}.directory-breadcrumb img{width:15px;height:15px}
.directory-layout{display:grid;grid-template-columns:minmax(230px,280px) minmax(0,1fr);gap:14px}.group-card{display:grid;align-content:start;gap:8px}.group-item{display:grid;gap:3px;text-align:left;border:1px solid transparent;background:transparent;color:var(--color-text);padding:10px;border-radius:8px;cursor:pointer}.group-item small{color:var(--color-muted);font-size:10px}.group-item.active,.group-item:hover{background:var(--color-soft);border-color:var(--color-stroke)}
.records-heading{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;margin-bottom:12px}.records-heading h1{margin:0;font-size:20px}.records-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}.toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 190px;gap:10px;align-items:end;margin:12px 0}.search{display:flex;align-items:center;gap:8px;height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised)}.search input{width:100%;border:0;outline:0;background:transparent;color:var(--color-text)}
.form-grid{display:grid;gap:14px}.form-grid label{display:grid;gap:6px;font-size:12px;font-weight:600}.form-grid input{height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text)}
@media(max-width:800px){.directory-layout{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}}
</style>
