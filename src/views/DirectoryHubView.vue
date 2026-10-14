<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import BaseRegistryMetricCard from '../components/ui/BaseRegistryMetricCard.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'

type CatalogRecord = {
  id: string
  group: string
  code: string
  name: string
  category: string
  unit: string
  status: 'active' | 'inactive' | 'draft'
  value?: string | null
}
type GroupDefinition = { id: string; label: string; description: string }

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const activeSection = ref('tariffs')
const activeGroup = ref('tariff-types')
const search = ref('')
const statusFilter = ref('all')
const createOpen = ref(false)
const newName = ref('')
const newCode = ref('')
const success = ref('')

const tabs = [
  { id: 'labor', label: 'Условия труда, надбавки и компенсации' },
  { id: 'tariffs', label: 'Тарифы и начисления' },
  { id: 'development', label: 'Развитие и подбор кадров' },
  { id: 'documents', label: 'Документы и основания' },
  { id: 'positions', label: 'Должности' },
]

const groups: Record<string, GroupDefinition[]> = {
  labor: [
    { id: 'work-conditions', label: 'Виды условий труда', description: 'Нормальные, вредные и особые условия труда' },
    { id: 'allowance-types', label: 'Виды надбавок', description: 'Надбавки за условия, квалификацию и стаж' },
    { id: 'compensations', label: 'Компенсации', description: 'Компенсационные выплаты и льготы' },
    { id: 'benefits', label: 'Льготы', description: 'Дополнительные дни, питание и прочие льготы' },
    { id: 'condition-bases', label: 'Основания условий труда', description: 'Карты, приказы и нормативные основания' },
  ],
  tariffs: [
    { id: 'tariff-types', label: 'Виды тарифов', description: 'Категории и типы тарифов' },
    { id: 'calculation-units', label: 'Единицы расчёта', description: 'Час, смена, тонна, рейс и другие единицы' },
    { id: 'position-schemes', label: 'Тарифные схемы должностей', description: 'Схемы тарификации по должностям' },
    { id: 'base-tariffing', label: 'Основная тарификация', description: 'Базовые правила начисления' },
    { id: 'tariff-methods', label: 'Способы тарификации', description: 'Повременная, сдельная и смешанная схемы' },
    { id: 'tariffs', label: 'Тарифы', description: 'Действующие ставки и значения' },
    { id: 'cargo-types', label: 'Виды грузов', description: 'Классификация грузов для расчётов' },
  ],
  development: [
    { id: 'training-types', label: 'Виды обучения', description: 'Внутреннее, внешнее и обязательное обучение' },
    { id: 'training-modes', label: 'Форматы обучения', description: 'Очное, дистанционное и на рабочем месте' },
    { id: 'reserve-levels', label: 'Уровни кадрового резерва', description: 'Корпоративный и функциональный уровни' },
    { id: 'reserve-types', label: 'Виды кадрового резерва', description: 'Оперативный и среднесрочный резерв' },
    { id: 'recruiting-sources', label: 'Источники подбора', description: 'Каналы и источники кандидатов' },
  ],
  documents: [
    { id: 'document-types', label: 'Виды документов', description: 'Договоры, приказы, основания и приложения' },
    { id: 'document-statuses', label: 'Статусы документов', description: 'Черновик, действует, подписан, закрыт' },
    { id: 'personnel-bases', label: 'Основания кадровых действий', description: 'Основания приёма, перевода и увольнения' },
    { id: 'order-types', label: 'Типы приказов', description: 'Классификация кадровых приказов' },
  ],
}

const seeded: CatalogRecord[] = [
  { id:'r-001',group:'tariff-types',code:'TRF-TYPE-001',name:'Базовый тариф',category:'Тариф',unit:'KZT',status:'active',value:'Базовый' },
  { id:'r-002',group:'tariff-types',code:'TRF-TYPE-002',name:'Повышенный тариф',category:'Тариф',unit:'KZT',status:'active',value:'Повышенный' },
  { id:'r-003',group:'tariff-types',code:'TRF-TYPE-003',name:'Ночной тариф',category:'Тариф',unit:'KZT',status:'active',value:'Ночной' },
  { id:'r-004',group:'calculation-units',code:'UNIT-HOUR',name:'Час',category:'Единица',unit:'час',status:'active',value:'1' },
  { id:'r-005',group:'calculation-units',code:'UNIT-SHIFT',name:'Смена',category:'Единица',unit:'смена',status:'active',value:'1' },
  { id:'r-006',group:'calculation-units',code:'UNIT-TON',name:'Тонна',category:'Единица',unit:'т',status:'active',value:'1' },
  { id:'r-007',group:'position-schemes',code:'SCH-ENG-01',name:'Инженерная схема',category:'Должности',unit:'месяц',status:'active',value:'5 уровней' },
  { id:'r-008',group:'position-schemes',code:'SCH-OPS-01',name:'Производственная схема',category:'Должности',unit:'час',status:'active',value:'8 уровней' },
  { id:'r-009',group:'base-tariffing',code:'BASE-2026',name:'Основная тарификация 2026',category:'Правило',unit:'KZT',status:'active',value:'2026' },
  { id:'r-010',group:'tariff-methods',code:'METHOD-TIME',name:'Повременная',category:'Метод',unit:'час',status:'active',value:'По табелю' },
  { id:'r-011',group:'tariff-methods',code:'METHOD-PIECE',name:'Сдельная',category:'Метод',unit:'ед.',status:'active',value:'По объёму' },
  { id:'r-012',group:'tariffs',code:'TRF-ENG-L3',name:'Инженер L3',category:'Ставка',unit:'KZT/мес',status:'active',value:'620 000' },
  { id:'r-013',group:'tariffs',code:'TRF-OPS-H',name:'Оператор / час',category:'Ставка',unit:'KZT/час',status:'active',value:'3 900' },
  { id:'r-014',group:'cargo-types',code:'CARGO-GEN',name:'Генеральный груз',category:'Груз',unit:'т',status:'active',value:'Класс 1' },
  { id:'r-015',group:'cargo-types',code:'CARGO-BULK',name:'Навалочный груз',category:'Груз',unit:'т',status:'active',value:'Класс 2' },

  { id:'r-101',group:'work-conditions',code:'WC-NORMAL',name:'Нормальные условия труда',category:'Условия труда',unit:'—',status:'active',value:'00-0' },
  { id:'r-102',group:'work-conditions',code:'WC-HARMFUL',name:'Вредные условия труда',category:'Условия труда',unit:'—',status:'active',value:'27-2' },
  { id:'r-103',group:'allowance-types',code:'ALLOW-QUAL',name:'За квалификацию',category:'Надбавка',unit:'%',status:'active',value:'5–20%' },
  { id:'r-104',group:'allowance-types',code:'ALLOW-NIGHT',name:'За ночные часы',category:'Надбавка',unit:'%',status:'active',value:'50%' },
  { id:'r-105',group:'compensations',code:'COMP-MEAL',name:'Компенсация питания',category:'Компенсация',unit:'KZT/день',status:'active',value:'2 500' },
  { id:'r-106',group:'benefits',code:'BEN-LEAVE',name:'Дополнительный отпуск',category:'Льгота',unit:'дней',status:'active',value:'7' },
  { id:'r-107',group:'condition-bases',code:'BASIS-WC',name:'Карта оценки условий труда',category:'Основание',unit:'—',status:'active',value:null },

  { id:'r-201',group:'training-types',code:'TRN-INT',name:'Внутреннее обучение',category:'Обучение',unit:'—',status:'active',value:null },
  { id:'r-202',group:'training-types',code:'TRN-EXT',name:'Внешнее обучение',category:'Обучение',unit:'—',status:'active',value:null },
  { id:'r-203',group:'training-modes',code:'TRN-REMOTE',name:'Дистанционное',category:'Формат',unit:'—',status:'active',value:null },
  { id:'r-204',group:'training-modes',code:'TRN-PERSON',name:'Очное',category:'Формат',unit:'—',status:'active',value:null },
  { id:'r-205',group:'reserve-levels',code:'RES-CORP',name:'Корпоративный',category:'Резерв',unit:'—',status:'active',value:null },
  { id:'r-206',group:'reserve-types',code:'RES-OPER',name:'Оперативный',category:'Резерв',unit:'—',status:'active',value:null },
  { id:'r-207',group:'recruiting-sources',code:'REC-REF',name:'Рекомендация сотрудника',category:'Подбор',unit:'—',status:'active',value:null },

  { id:'r-301',group:'document-types',code:'DOC-ORDER',name:'Приказ',category:'Документ',unit:'—',status:'active',value:null },
  { id:'r-302',group:'document-types',code:'DOC-CONTRACT',name:'Трудовой договор',category:'Документ',unit:'—',status:'active',value:null },
  { id:'r-303',group:'document-statuses',code:'DOC-ACTIVE',name:'Действует',category:'Статус',unit:'—',status:'active',value:null },
  { id:'r-304',group:'document-statuses',code:'DOC-DRAFT',name:'Черновик',category:'Статус',unit:'—',status:'active',value:null },
  { id:'r-305',group:'personnel-bases',code:'BASIS-HIRE',name:'Приём на работу',category:'Основание',unit:'—',status:'active',value:null },
  { id:'r-306',group:'personnel-bases',code:'BASIS-TRANSFER',name:'Перевод',category:'Основание',unit:'—',status:'active',value:null },
  { id:'r-307',group:'order-types',code:'ORDER-HR',name:'Кадровый приказ',category:'Приказ',unit:'—',status:'active',value:null },
]
const records = ref<CatalogRecord[]>(seeded)

const currentGroups = computed(() => groups[activeSection.value] ?? [])
const currentGroup = computed(() => currentGroups.value.find(item => item.id === activeGroup.value) ?? currentGroups.value[0] ?? null)
const statusOptions = [
  { id:'all',name:'Все статусы' },
  { id:'active',name:'Активные' },
  { id:'draft',name:'Черновики' },
  { id:'inactive',name:'Неактивные' },
]
const visibleRows = computed(() => records.value.filter(row =>
  row.group === currentGroup.value?.id
  && (statusFilter.value === 'all' || row.status === statusFilter.value)
  && (!search.value.trim() || [row.code,row.name,row.category,row.unit,row.value ?? ''].join(' ').toLowerCase().includes(search.value.trim().toLowerCase()))
))
const sectionRecordCount = computed(() => records.value.filter(row => currentGroups.value.some(group => group.id === row.group)).length)
const activeCount = computed(() => records.value.filter(row => currentGroups.value.some(group => group.id === row.group) && row.status === 'active').length)
const groupsWithData = computed(() => currentGroups.value.filter(group => records.value.some(row => row.group === group.id)).length)
const draftCount = computed(() => records.value.filter(row => currentGroups.value.some(group => group.id === row.group) && row.status === 'draft').length)
const filterChips = computed(() => [
  ...(search.value ? [{id:'search',label:'Поиск: '+search.value}] : []),
  ...(statusFilter.value !== 'all' ? [{id:'status',label:'Статус: '+(statusOptions.find(item=>item.id===statusFilter.value)?.name ?? statusFilter.value)}] : []),
])
const columns = [
  { key:'code',label:'Код' },
  { key:'name',label:'Наименование' },
  { key:'category',label:'Категория' },
  { key:'unit',label:'Единица' },
  { key:'value',label:'Значение' },
  { key:'status',label:'Статус' },
]
function selectSection(id:string){
  activeSection.value=id
  if(id==='positions') return
  activeGroup.value=groups[id]?.[0]?.id ?? ''
  search.value=''
  statusFilter.value='all'
}
function selectGroup(id:string){activeGroup.value=id;search.value='';statusFilter.value='all'}
function clearFilter(id:string){if(id==='search')search.value='';if(id==='status')statusFilter.value='all'}
function clearFilters(){search.value='';statusFilter.value='all'}
function openCreate(){newName.value='';newCode.value='';createOpen.value=true;success.value=''}
function saveRecord(){
  if(!demoMode || !currentGroup.value || !newName.value.trim() || !newCode.value.trim()) return
  records.value.unshift({
    id:crypto.randomUUID(),group:currentGroup.value.id,code:newCode.value.trim().toUpperCase(),
    name:newName.value.trim(),category:currentGroup.value.label,unit:'—',status:'active',value:null,
  })
  createOpen.value=false
  success.value='Запись добавлена в справочник.'
}
</script>

<template>
  <section class="directory-hub">
    <h1 class="directory-sr-only">Справочники</h1>
    <div class="directory-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Справочники</strong><span>/</span>
      <span>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</span>
    </div>

    <BaseViewTabs :model-value="activeSection" :options="tabs" label="Группы справочников"
      @update:model-value="selectSection" />
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <template v-if="activeSection === 'positions'">
      <BaseCard class="positions-link-card">
        <div>
          <h1>Должности</h1>
          <p>Справочник должностей компании сохранён как отдельный рабочий реестр.</p>
        </div>
        <RouterLink class="positions-link" to="/directories/positions">Открыть справочник должностей →</RouterLink>
      </BaseCard>
    </template>

    <template v-else>
      <BaseKpiGrid label="Сводка по справочникам">
        <BaseRegistryMetricCard title="Записей справочника" :value="sectionRecordCount"
          description="во всех реестрах раздела" icon="/prototype-icons/Info.svg" />
        <BaseRegistryMetricCard title="Активные справочники" :value="groupsWithData"
          description="реестров содержат данные" icon="/prototype-icons/Info.svg" />
        <BaseRegistryMetricCard title="Активные записи" :value="activeCount"
          description="используются в расчётах и процессах" icon="/prototype-icons/Info.svg" />
        <BaseRegistryMetricCard title="Черновики" :value="draftCount"
          description="ожидают публикации" icon="/prototype-icons/Info.svg" />
      </BaseKpiGrid>

      <div class="directory-layout">
        <BaseCard class="directory-tree">
          <div class="tree-heading">
            <div><h2>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</h2><span>{{ currentGroups.length }} справочников</span></div>
          </div>
          <BaseButton v-for="group in currentGroups" :key="group.id" type="button" variant="secondary" class="tree-item"
            :class="{active:activeGroup===group.id}" @click="selectGroup(group.id)">
            <span><strong>{{ group.label }}</strong><small>{{ group.description }}</small></span>
            <em>{{ records.filter(row=>row.group===group.id).length }}</em>
          </BaseButton>
        </BaseCard>

        <BaseCard class="directory-register">
          <div class="register-heading">
            <div>
              <h1>{{ currentGroup?.label }}</h1>
              <p>{{ currentGroup?.description }}</p>
            </div>
            <BaseButton :disabled="!demoMode" @click="openCreate"><Plus :size="16" /> Добавить</BaseButton>
          </div>

          <div class="directory-toolbar">
            <label class="directory-search">
              <Search :size="16" aria-hidden="true" />
              <input v-model="search" type="search" placeholder="Поиск" aria-label="Поиск по справочнику" />
            </label>
            <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
          </div>
          <BaseFilterSummary :items="filterChips" label="Активные фильтры"
            @remove="clearFilter" @clear="clearFilters" />

          <BaseDataTable :rows="visibleRows" :columns="columns" row-key="id"
            :caption="currentGroup?.label || 'Справочник'"
            empty-title="Записей нет"
            empty-description="Добавьте первую запись или измените фильтры.">
            <template #cell-value="{value}">{{ value || '—' }}</template>
            <template #cell-status="{row}">
              <BaseStatusPill :tone="row.status==='active'?'success':row.status==='draft'?'warning':'danger'">
                {{ row.status==='active'?'Активно':row.status==='draft'?'Черновик':'Неактивно' }}
              </BaseStatusPill>
            </template>
          </BaseDataTable>
        </BaseCard>
      </div>
    </template>

    <BaseDialog :open="createOpen" :title="'Новая запись — '+(currentGroup?.label ?? '')" @close="createOpen=false">
      <form class="directory-create-form" @submit.prevent="saveRecord">
        <label><span>Код</span><input v-model="newCode" type="text" required /></label>
        <label><span>Наименование</span><input v-model="newName" type="text" required /></label>
        <BaseNotice tone="info">Расширенные поля конкретного справочника будут подключены к серверному контракту после согласования модели данных.</BaseNotice>
        <div class="create-actions">
          <BaseButton type="button" variant="secondary" @click="createOpen=false">Отмена</BaseButton>
          <BaseButton type="submit" :disabled="!demoMode || !newName.trim() || !newCode.trim()">Сохранить</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </section>
</template>

<style scoped>
.directory-hub{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;max-width:100%}
.directory-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.directory-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;color:var(--color-muted);font-size:12px}
.directory-breadcrumb img{width:15px;height:15px}.directory-breadcrumb strong{color:var(--color-text);font-weight:500}
.directory-layout{display:grid;grid-template-columns:minmax(235px,300px) minmax(0,1fr);gap:14px;align-items:start}
.directory-tree{padding:0;overflow:hidden}.tree-heading{padding:14px 15px;border-bottom:1px solid var(--color-stroke)}
.tree-heading>div{display:grid;gap:2px}.tree-heading h2{margin:0;font-size:14px;line-height:20px}.tree-heading span{color:var(--color-muted);font-size:10px}
.tree-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border:0;border-bottom:1px solid var(--color-stroke);background:transparent;color:var(--color-text);text-align:left}
.tree-item:last-child{border-bottom:0}.tree-item:hover{background:var(--color-hover)}.tree-item.active{background:var(--color-accent-soft);color:var(--color-primary)}
.tree-item>span{display:grid;gap:2px;min-width:0}.tree-item strong{font-size:11px;line-height:16px}.tree-item small{color:var(--color-muted);font-size:9px;line-height:13px}.tree-item em{font-style:normal;color:var(--color-muted);font-size:10px}
.directory-register{min-width:0}.register-heading{display:flex;align-items:end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}.register-heading h1{margin:0;font-size:19px;line-height:26px}.register-heading p{margin:3px 0 0;color:var(--color-muted);font-size:11px}
.directory-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 190px;gap:10px;align-items:end;margin-bottom:9px}
.directory-search{height:var(--control-height);display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);box-shadow:var(--shadow-control);color:var(--color-muted)}
.directory-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.positions-link-card{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}.positions-link-card h1{margin:0;font-size:20px}.positions-link-card p{margin:5px 0 0;color:var(--color-muted);font-size:12px}.positions-link{color:var(--color-primary);font-size:12px;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.directory-create-form{display:grid;gap:16px}.directory-create-form label{display:grid;gap:7px}.directory-create-form label span{font-size:12px;font-weight:600}.directory-create-form input{height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text);font:inherit}.create-actions{display:flex;justify-content:flex-end;gap:9px;padding-top:6px}
@media(max-width:880px){.directory-layout{grid-template-columns:1fr}.directory-tree{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.tree-heading{grid-column:1/-1}.tree-item{border-right:1px solid var(--color-stroke)}}
@media(max-width:620px){.directory-tree{grid-template-columns:1fr}.tree-heading{grid-column:auto}.directory-toolbar{grid-template-columns:1fr}.positions-link-card{align-items:flex-start}.create-actions :deep(.base-button){flex:1}}
</style>
