<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { computed, ref } from 'vue'
import { ChevronDown, Plus, Search } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
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
  { id: 'leave', label: 'Отпуска и лимиты' },
  { id: 'labor', label: 'Условия труда, надбавки и компенсации' },
  { id: 'tariffs', label: 'Тарифы и начисления' },
  { id: 'development', label: 'Развитие и подбор кадров' },
  { id: 'documents', label: 'Документы и основания' },
]

const groups: Record<string, GroupDefinition[]> = {
  leave: [
    { id: 'leave-types', label: 'Виды отпусков', description: 'ежегодные, дополнительные, социальные и специальные отпуска' },
    { id: 'leave-limits', label: 'Лимиты отпусков', description: 'правила начисления, переносы и ограничения' },
    { id: 'absence-types', label: 'Виды отсутствий', description: 'больничные, командировки, отгулы и другие причины' },
    { id: 'balance-methods', label: 'Методы расчёта баланса', description: 'календарные, рабочие дни и индивидуальные правила' },
  ],
  labor: [
    { id: 'work-conditions', label: 'Виды условий труда', description: 'нормальные, вредные и особые условия труда' },
    { id: 'allowance-types', label: 'Виды надбавок', description: 'за условия, квалификацию, стаж и режим работы' },
    { id: 'compensations', label: 'Компенсации', description: 'компенсационные выплаты и возмещения' },
    { id: 'benefits', label: 'Льготы', description: 'дополнительные дни, питание и другие льготы' },
    { id: 'condition-bases', label: 'Основания условий труда', description: 'карты, приказы и нормативные основания' },
  ],
  tariffs: [
    { id: 'tariff-types', label: 'Виды тарифов', description: 'по грузам, дополнительные работы, доплаты, внутрипортовые работы' },
    { id: 'calculation-units', label: 'Единицы расчёта', description: 'тонна, час, смена, операция, месяц' },
    { id: 'position-schemes', label: 'Тарифные схемы должностей', description: 'какие тарифы могут применяться к конкретной должности' },
    { id: 'base-tariffing', label: 'Основания тарификации', description: 'почему применяется тот или иной тариф' },
    { id: 'tariff-methods', label: 'Способы тарификации', description: 'надбавка %, по факту, GEL, комбинированный' },
    { id: 'tariffs', label: 'Тарифы', description: 'конкретные тарифные строки и группы' },
    { id: 'cargo-types', label: 'Виды грузов', description: 'сахар-сырец, зерновые, нефтепродукты, навалочные грузы' },
  ],
  development: [
    { id: 'training-types', label: 'Виды обучения', description: 'внутреннее, внешнее и обязательное обучение' },
    { id: 'training-modes', label: 'Форматы обучения', description: 'очное, дистанционное и на рабочем месте' },
    { id: 'reserve-levels', label: 'Уровни кадрового резерва', description: 'корпоративный и функциональный уровни' },
    { id: 'reserve-types', label: 'Виды кадрового резерва', description: 'оперативный и среднесрочный резерв' },
    { id: 'recruiting-sources', label: 'Источники подбора', description: 'каналы и источники кандидатов' },
  ],
  documents: [
    { id: 'document-types', label: 'Виды документов', description: 'договоры, приказы, основания и приложения' },
    { id: 'document-statuses', label: 'Статусы документов', description: 'черновик, действует, подписан, закрыт' },
    { id: 'personnel-bases', label: 'Основания кадровых действий', description: 'приём, перевод, увольнение и иные основания' },
    { id: 'order-types', label: 'Типы приказов', description: 'классификация кадровых приказов' },
  ],
}

const seeded: CatalogRecord[] = [
  { id:'l-001',group:'leave-types',code:'LEAVE-ANNUAL',name:'Ежегодный оплачиваемый отпуск',category:'Отпуск',unit:'дней',status:'active',value:'24' },
  { id:'l-002',group:'leave-types',code:'LEAVE-EXTRA',name:'Дополнительный отпуск',category:'Отпуск',unit:'дней',status:'active',value:'7' },
  { id:'l-003',group:'leave-limits',code:'LIMIT-CARRY',name:'Перенос остатка',category:'Лимит',unit:'дней',status:'active',value:'12' },
  { id:'l-004',group:'absence-types',code:'ABS-SICK',name:'Временная нетрудоспособность',category:'Отсутствие',unit:'дней',status:'active',value:null },
  { id:'l-005',group:'balance-methods',code:'BAL-WORK',name:'По рабочим дням',category:'Метод',unit:'—',status:'active',value:null },

  { id:'r-001',group:'tariff-types',code:'TRF-TYPE-001',name:'По грузам',category:'Тариф',unit:'KZT',status:'active',value:'Базовый' },
  { id:'r-002',group:'tariff-types',code:'TRF-TYPE-002',name:'Дополнительные работы',category:'Тариф',unit:'KZT',status:'active',value:'Повышенный' },
  { id:'r-003',group:'tariff-types',code:'TRF-TYPE-003',name:'Внутрипортовые работы',category:'Тариф',unit:'KZT',status:'active',value:'Ночной' },
  { id:'r-004',group:'calculation-units',code:'UNIT-HOUR',name:'Час',category:'Единица',unit:'час',status:'active',value:'1' },
  { id:'r-005',group:'calculation-units',code:'UNIT-SHIFT',name:'Смена',category:'Единица',unit:'смена',status:'active',value:'1' },
  { id:'r-006',group:'calculation-units',code:'UNIT-TON',name:'Тонна',category:'Единица',unit:'т',status:'active',value:'1' },
  { id:'r-007',group:'position-schemes',code:'SCH-ENG-01',name:'Инженерная схема',category:'Должности',unit:'месяц',status:'active',value:'5 уровней' },
  { id:'r-008',group:'position-schemes',code:'SCH-OPS-01',name:'Производственная схема',category:'Должности',unit:'час',status:'active',value:'8 уровней' },
  { id:'r-009',group:'base-tariffing',code:'BASE-2026',name:'Основная тарификация 2026',category:'Основание',unit:'KZT',status:'active',value:'2026' },
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
const currentGroup = computed(() => currentGroups.value.find(item => item.id === activeGroup.value) ?? null)
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
  if (!groups[id]) return
  activeSection.value=id
  activeGroup.value=groups[id]?.[0]?.id ?? ''
  search.value=''
  statusFilter.value='all'
}
function toggleGroup(id:string){
  if (activeGroup.value === id) return
  activeGroup.value = id
  search.value=''
  statusFilter.value='all'
}
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
function recordCount(groupId:string){return records.value.filter(row=>row.group===groupId).length}
</script>

<template>
  <section class="directory-hub">
    <h1 class="directory-sr-only">Справочники</h1>
    <div class="directory-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Справочники</strong><span>/</span>
      <span>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</span>
    </div>

    <BaseViewTabs :model-value="activeSection" :options="tabs" label="Группы справочников"
      @update:model-value="selectSection" />
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <div class="directory-context">
      <div>
        <strong>{{ tabs.find(tab=>tab.id===activeSection)?.label }}</strong>
        <span>{{ currentGroups.length }} справочников в группе</span>
      </div>
      <RouterLink class="positions-link" to="/directories/positions">Справочник должностей</RouterLink>
    </div>

    <div class="directory-workspace">
      <nav class="directory-index" aria-label="Справочники группы">
        <div class="directory-index-heading">
          <strong>Разделы</strong>
          <small>{{ currentGroups.length }} справочников</small>
        </div>
        <BaseButton v-for="group in currentGroups" :key="group.id" type="button" variant="secondary"
          class="directory-group-button" :class="{ 'is-active': activeGroup === group.id }"
          :aria-expanded="activeGroup === group.id" aria-controls="directory-active-panel"
          @click="toggleGroup(group.id)">
          <span class="directory-group-copy">
            <strong>{{ group.label }}</strong>
            <small>{{ group.description }}</small>
          </span>
          <span class="directory-group-count">{{ recordCount(group.id) }}</span>
          <ChevronDown :size="16" :class="{ rotated: activeGroup === group.id }" aria-hidden="true" />
        </BaseButton>
      </nav>

      <BaseCard v-if="currentGroup" id="directory-active-panel" class="directory-detail">
        <div class="directory-detail-heading">
          <div>
            <span class="directory-eyebrow">Справочник · {{ tabs.find(tab=>tab.id===activeSection)?.label }}</span>
            <h2>{{ currentGroup.label }}</h2>
            <p>{{ currentGroup.description }}</p>
          </div>
          <span class="directory-detail-count">{{ recordCount(currentGroup.id) }} записей</span>
        </div>
        <p v-if="!demoMode" class="directory-mode-note">Сейчас здесь показаны примеры из прототипа. Серверные изменения для этой группы ещё не подключены.</p>
        <div class="directory-toolbar">
          <label class="directory-search">
            <Search :size="16" aria-hidden="true" />
            <input v-model="search" type="search" placeholder="Поиск по названию или коду" aria-label="Поиск по справочнику" />
          </label>
          <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
          <BaseButton v-if="demoMode" @click="openCreate"><Plus :size="16" /> Добавить запись</BaseButton>
        </div>
        <BaseFilterSummary :items="filterChips" label="Активные фильтры"
          @remove="clearFilter" @clear="clearFilters" />
        <div class="directory-table-scroll">
          <BaseDataTable :rows="visibleRows" :columns="columns" row-key="id"
            density="compact" :caption="currentGroup.label"
            empty-title="Записей нет"
            empty-description="Измените условия поиска или фильтры.">
            <template #cell-value="{value}">{{ value || '—' }}</template>
            <template #cell-status="{row}">
              <BaseStatusPill :tone="row.status==='active'?'success':row.status==='draft'?'warning':'danger'">
                {{ row.status==='active'?'Активно':row.status==='draft'?'Черновик':'Неактивно' }}
              </BaseStatusPill>
            </template>
          </BaseDataTable>
        </div>
      </BaseCard>
    </div>
    <BaseDrawer :open="createOpen" :title="'Новая запись — '+(currentGroup?.label ?? '')"
      description="Демо-запись справочника. Серверный контракт будет подключён отдельно."
      @close="createOpen=false">
      <form class="directory-create-form" @submit.prevent="saveRecord">
        <label><span>Код</span><input v-model="newCode" type="text" required /></label>
        <label><span>Наименование</span><input v-model="newName" type="text" required /></label>
        <BaseNotice tone="info">
          Расширенные поля конкретного справочника будут подключены к серверному контракту после согласования модели данных.
        </BaseNotice>
        <div class="create-actions">
          <BaseButton type="button" variant="secondary" @click="createOpen=false">Отмена</BaseButton>
          <BaseButton type="submit" :disabled="!demoMode || !newName.trim() || !newCode.trim()">Сохранить</BaseButton>
        </div>
      </form>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.directory-hub{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;max-width:100%}
.directory-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.directory-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;color:var(--color-muted);font-size:12px}
.directory-breadcrumb img{width:15px;height:15px}.directory-breadcrumb strong{color:var(--color-text);font-weight:500}
.directory-context{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.directory-context>div{display:grid;gap:3px}.directory-context strong{font-size:14px}.directory-context span{color:var(--color-muted);font-size:11px}
.positions-link{display:inline-flex;align-items:center;min-height:36px;padding:7px 11px;border:1px solid var(--color-stroke-strong);border-radius:8px;background:var(--color-surface);box-shadow:var(--shadow-control);color:var(--color-text);font-size:12px;font-weight:650}
.positions-link:hover{background:var(--color-soft);border-color:var(--color-primary-stroke)}
.directory-workspace{display:grid;grid-template-columns:minmax(224px,270px) minmax(0,1fr);gap:12px;align-items:start;min-width:0}
.directory-index{display:grid;gap:4px;padding:9px;border:1px solid var(--color-stroke);border-radius:9px;background:var(--color-surface);box-shadow:var(--shadow-card);min-width:0}
.directory-index-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 10px 12px;border-bottom:1px solid var(--color-stroke);margin-bottom:5px}
.directory-index-heading strong{font-size:13px;color:var(--color-text)}.directory-index-heading small{color:var(--color-muted);font-size:10px}
.directory-group-button{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;justify-content:stretch;height:auto;min-height:56px;width:100%;padding:10px 11px;border:1px solid transparent;border-radius:7px;background:transparent;backdrop-filter:none;box-shadow:none;color:var(--color-text);font:inherit;white-space:normal;text-align:left;cursor:pointer;transition:background .15s ease,color .15s ease}
.directory-group-button.secondary:hover:not(:disabled){background:var(--color-hover)}
.directory-group-button.is-active{background:var(--color-accent-soft);border-color:var(--color-primary-stroke);color:var(--color-primary)}
.directory-group-button:focus-visible{outline:2px solid var(--color-focus);outline-offset:1px}
.directory-group-copy{display:grid;gap:3px;min-width:0}
.directory-group-copy strong{font-size:12px;line-height:17px;font-weight:700;color:inherit}
.directory-group-copy small{font-size:10px;line-height:14px;color:var(--color-muted);overflow-wrap:anywhere}
.directory-group-count{min-width:24px;padding:4px 6px;border-radius:6px;text-align:center;font-size:11px;font-weight:700;color:var(--color-muted);background:var(--color-soft)}
.directory-group-button.is-active .directory-group-count{color:var(--color-primary);background:var(--color-surface)}
.directory-group-button svg{color:var(--color-muted);transform:rotate(-90deg);transition:transform .15s}
.directory-group-button svg.rotated{color:var(--color-primary);transform:rotate(0)}
.directory-detail{min-width:0;display:grid;gap:14px;padding:17px;overflow:hidden}
.directory-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-bottom:13px;border-bottom:1px solid var(--color-stroke)}
.directory-detail-heading>div{display:grid;gap:5px;min-width:0}
.directory-eyebrow{font-size:10px;color:var(--color-muted)}
.directory-detail-heading h2{font-size:18px;line-height:24px;color:var(--color-text);font-weight:750;margin:0}
.directory-detail-heading p{margin:0;font-size:11px;line-height:17px;color:var(--color-muted);max-width:570px}
.directory-detail-count{flex:0 0 auto;padding:6px 9px;border:1px solid var(--color-stroke);border-radius:7px;font-size:11px;font-weight:700;color:var(--color-muted)}
.directory-mode-note{font-size:11px;line-height:17px;color:var(--color-muted);margin:0}
.directory-toolbar{display:grid;grid-template-columns:minmax(190px,1fr) minmax(138px,165px) auto;gap:10px;align-items:end;min-width:0}
.directory-search{height:var(--control-height);display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid var(--color-stroke-strong);border-radius:8px;background:var(--color-surface-raised);box-shadow:var(--shadow-control);color:var(--color-muted)}
.directory-search:focus-within{border-color:var(--color-primary)}
.directory-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.directory-table-scroll{min-width:0;max-width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain}
.directory-table-scroll :deep(table){min-width:650px}
.directory-create-form{display:grid;gap:16px;min-height:calc(100dvh - 160px)}
.directory-create-form label{display:grid;gap:7px}.directory-create-form label span{font-size:12px;font-weight:600}
.directory-create-form input{height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text);font:inherit}
.create-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:auto;padding-top:12px;border-top:1px solid var(--color-stroke)}
@media(prefers-reduced-motion:reduce){.directory-group-button,.directory-group-button svg{transition:none}}
@media(max-width:1050px){.directory-workspace{grid-template-columns:minmax(195px,240px) minmax(0,1fr)}.directory-toolbar{grid-template-columns:minmax(150px,1fr) minmax(120px,150px)}.directory-toolbar :deep(.base-button){grid-column:1 / -1;justify-self:start}}
@media(max-width:800px){.directory-workspace{grid-template-columns:minmax(0,1fr)}.directory-index{grid-template-columns:repeat(2,minmax(0,1fr))}.directory-index-heading{grid-column:1 / -1}.directory-group-button{min-height:51px}.directory-detail{padding:14px}.directory-toolbar{grid-template-columns:minmax(0,1fr) 150px}}
@media(max-width:560px){.directory-index{display:flex;gap:5px;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin}.directory-index-heading{display:none}.directory-group-button{flex:0 0 180px;min-width:180px;min-height:46px;padding:9px}.directory-group-copy small,.directory-group-button svg{display:none}.directory-detail{padding:12px}.directory-toolbar{grid-template-columns:minmax(0,1fr)}.directory-toolbar :deep(.base-button){grid-column:auto;width:100%}.directory-detail-heading h2{font-size:16px}.create-actions :deep(.base-button){flex:1}}
</style>
