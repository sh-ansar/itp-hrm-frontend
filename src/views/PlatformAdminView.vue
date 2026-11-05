<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, WalletCards, FileText, ScrollText, ShieldCheck, CreditCard, ChevronLeft,
  ChevronRight, Plus, Settings, ArrowLeft, X, Check, AlertCircle } from 'lucide-vue-next'
import { apiRequest, requestJson } from '../api/client'
import { useSaasText, type SaasKey } from '../i18n/saas'
import { publicAsset } from '../utils/publicAsset'
import BaseButton from '../components/ui/BaseButton.vue'
import HrmPaymentProofPanel from '../components/admin/HrmPaymentProofPanel.vue'
type Item = Record<string, any>
type Plan = { id:number;code:string;version:number;status:string;is_public:boolean;terms:{
  names:Record<string,string>;descriptions:Record<string,string>;currency:string;
  price_minor:number;period_months?:number;limits:Record<string,number>;modules:Record<string,boolean> }}
const { tr, locale } = useSaasText()
const route = useRoute()
const router = useRouter()
const titles = [
  { id:'companies',label:'companies',icon:Building2,permission:'companies.read' },
  { id:'plans',label:'pricing',icon:CreditCard,permission:'plans.read' },
  { id:'payments',label:'payments',icon:WalletCards,permission:'billing.read' },
  { id:'documents',label:'legalDocuments',icon:FileText,permission:'legal.read' },
  { id:'consents',label:'consents',icon:ScrollText,permission:'legal.read' },
  { id:'access',label:'access',icon:ShieldCheck,permission:'platform.manage' },
] as const
const permissions = ref<string[]>([])
const initialLoading = ref(true)
const error = ref('')
const notice = ref('')
const busy = ref(false)
const rows = ref<Item[]>([])
const total = ref(0)
const page = ref(1)
const lastPage = ref(1)
const search = ref('')
const overview = ref<Item | null>(null)
const detail = ref<Item | null>(null)
const users = ref<Item[]>([])
const plans = ref<Plan[]>([])
const companyOptions = ref<Item[]>([])
const modal = ref<''|'plan'|'legal'|'legal-view'|'payment'|'invoice'|'subscription'|'profile'|'grant'>('')
const selectedInvoice = ref<Item | null>(null)
const legalView = ref<Item | null>(null)
const approvalNote = ref('')
const confirm = ref<{ title:string; execute:()=>Promise<unknown> } | null>(null)
const planForm = ref({
  code: '', names:{ru:'',en:'',ka:''}, descriptions:{ru:'',en:'',ka:''},
  monthly_price_minor:0, currency:'KZT', period_months:1, display_order:0,
  limits:{users:2,companies:1,employees:50,storage_bytes:1073741824,max_file_bytes:36700160},
  modules:{employees:true,staffing:true,vacations:false,worktime:false,personnel:true,documents:true,reporting:false,development:false,roles:true},
  is_public:true,
})
const displayedPrice = computed({
  get: () => planForm.value.monthly_price_minor / 100,
  set: (value:number) => { planForm.value.monthly_price_minor = Math.round(Number(value) * 100) },
})
const legalForm = ref({ type:'privacy', locale:'ru', jurisdiction:'KZ', acceptance:'acknowledged', title:'', body:'', required:true, effective_at:'' })
const invoiceForm = ref({ company_id:'', plan_version_id:'', due_date:'', months:1, tax_basis_points:0 })
const subscription = ref({company_id:'',plan_version_id:'',ends_at:''})
const grantForm = ref({user_id:'',permission:'companies.read'})
const profileForm = ref({company_id:'',legal_name:'',registration_number:'',address:'',bank:'',iban:'',bic:'',signatory:'',tax_basis_points:0,service_name:''})
const moduleKeys = ['employees','staffing','personnel','vacations','worktime','documents','reporting','development','roles'] as const
const legalTypes = ['offer','tariff-policy','acceptable-use','personal-data-consent','privacy']
const allPermissions = ['platform.manage','companies.read','users.write','plans.read','plans.write',
  'subscriptions.write','billing.read','billing.write','legal.read','legal.write','legal.approve','legal.publish']
const section = computed(() => titles.find(s => s.id === route.params.section)?.id || 'companies')
const allowed = (name:string) => permissions.value.includes('platform.manage') || permissions.value.includes(name)
const visibleTabs = computed(() => titles.filter(s => allowed(s.permission)))
const title = computed(() => tr(titles.find(s => s.id === section.value)?.label || 'admin'))
const planOptions = computed(() => plans.value.filter(p => p.status === 'published'))
const columnConfig: Record<string,{key:string;label:SaasKey}[]> = {
  companies:[{key:'name',label:'company'},{key:'users_count',label:'employees'},{key:'plan_code',label:'plan'},{key:'subscription_status',label:'status'},{key:'created_at',label:'createdAt'}],
  plans:[{key:'code',label:'codeLabel'},{key:'name',label:'name'},{key:'version',label:'version'},{key:'price',label:'price'},{key:'status',label:'status'}],
  payments:[{key:'number',label:'codeLabel'},{key:'organization',label:'company'},{key:'total',label:'price'},{key:'status',label:'status'},{key:'due_date',label:'createdAt'}],
  documents:[{key:'title',label:'name'},{key:'type',label:'legalType'},{key:'locale',label:'legalLocale'},{key:'jurisdiction',label:'jurisdiction'},{key:'version',label:'version'},{key:'status',label:'status'}],
  consents:[{key:'email',label:'email'},{key:'title',label:'name'},{key:'version',label:'version'},{key:'accepted_at',label:'createdAt'}],
  access:[{key:'email',label:'email'},{key:'permission',label:'permission'},{key:'created_at',label:'createdAt'}],
}
function currency(amount:number|string,currency='KZT'){
  return new Intl.NumberFormat(locale.value === 'ka' ? 'ka-GE' : locale.value, {style:'currency',currency,maximumFractionDigits:0}).format(Number(amount||0)/100)
}
function shortDate(raw:unknown){
  if (typeof raw !== 'string' || !raw) return '—'
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString(locale.value === 'ka' ? 'ka-GE' : locale.value)
}
function text(row:Item,key:string){
  if (key === 'created_at' || key === 'due_date' || key === 'accepted_at') return shortDate(row[key])
  if (key === 'name' && section.value === 'plans') return (row as Plan).terms?.names?.[locale.value] || row.code
  if (key === 'price') return currency(row.terms?.price_minor ?? row.total_minor,row.terms?.currency ?? row.currency)
  if (key === 'status' || key === 'subscription_status') {
    const mapped:Record<string,SaasKey> = {draft:'draft',published:'published',approved:'approved',archived:'archived',active:'active',pending_payment:'awaitingPayment',awaiting_payment:'awaitingPayment',overdue:'overdue',paid:'paid'}
    return mapped[row[key]] ? tr(mapped[row[key]]) : String(row[key] || '—')
  }
  return String(row[key] ?? '—')
}
async function fetchAdmin<T>(path:string, options:RequestInit = {}) { return apiRequest<T>('/platform-admin'+path,options) }
async function csrf(){ await requestJson<void>((import.meta.env.VITE_BACKEND_PREFIX || '') + '/sanctum/csrf-cookie') }
async function mutate(path:string, method:'POST'|'PUT'|'DELETE', payload?:unknown) {
  await csrf()
  return fetchAdmin(path,{method, ...(payload !== undefined ? {body:JSON.stringify(payload)} : {})})
}
async function load() {
  error.value = ''
  try {
    if (!permissions.value.length) {
      const access = await fetchAdmin<{permissions:string[]; stats:Item; commercial_enabled:boolean}>('/overview')
      permissions.value = access.permissions
      overview.value = access
    }
    if (!allowed(titles.find(s => s.id === section.value)?.permission || 'platform.manage')) {
      rows.value = []; total.value = 0; return
    }
    if (section.value === 'plans') {
      const response = await fetchAdmin<{data:Plan[]}>('/plans')
      plans.value = response.data || []
      rows.value = plans.value as Item[]
      total.value = rows.value.length; lastPage.value = 1
    } else if (section.value === 'access') {
      const response = await fetchAdmin<{data:Item[]}>('/grants')
      rows.value = response.data || []; total.value = rows.value.length; lastPage.value = 1
    } else {
      const paths:Record<string,string> = {
        companies:'/companies',payments:'/invoices',documents:'/legal',consents:'/consents',
      }
      const query = new URLSearchParams({page:String(page.value)})
      if (section.value === 'companies' && search.value.trim()) query.set('search', search.value.trim())
      const response = await fetchAdmin<{data:Item[];total:number;last_page:number}>(paths[section.value]+'?'+query.toString())
      rows.value = response.data || []
      if (section.value === 'payments' && selectedInvoice.value) {
        const updated = rows.value.find((item) => item.id === selectedInvoice.value?.id)
        if (updated) selectedInvoice.value = updated
      }
      total.value = response.total || 0
      lastPage.value = response.last_page || 1
    }
  } catch { error.value = tr('failedLoad'); rows.value = [] }
  finally { initialLoading.value = false }
}
onMounted(load)
watch(() => route.params.section, () => {
  page.value = 1; search.value = ''; detail.value = null; void load()
})
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value = 1; void load() }, 250) })
async function action(operation:()=>Promise<unknown>){
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await operation(); modal.value = ''; confirm.value = null; notice.value = tr('messageSaved'); await load() }
  catch { error.value = tr('failedSave') }
  finally { busy.value = false }
}
function ask(title:string,execute:()=>Promise<unknown>) { confirm.value = {title,execute} }
async function openCompany(row:Item) {
  try {
    const [company,userData] = await Promise.all([
      fetchAdmin<Item>('/companies/'+row.id),
      fetchAdmin<{data:Item[]}>('/companies/'+row.id+'/users'),
    ])
    detail.value = company; users.value = userData.data || []
  } catch { error.value = tr('failedLoad') }
}
async function editPlan(row?:Plan) {
  if (row) {
    const t = row.terms
    planForm.value = {
      code:row.code, names:{ru:t.names.ru||'',en:t.names.en||'',ka:t.names.ka||''},
      descriptions:{ru:t.descriptions?.ru||'',en:t.descriptions?.en||'',ka:t.descriptions?.ka||''},
      monthly_price_minor:t.price_minor,currency:t.currency,period_months:t.period_months || 1,display_order:(row as Item).display_order ?? 0,
      limits:{users:t.limits.users||1,companies:1,employees:t.limits.employees||50,storage_bytes:t.limits.storage_bytes||1073741824,max_file_bytes:t.limits.max_file_bytes||36700160},
      modules:{...planForm.value.modules,...t.modules},is_public:row.is_public,
    }
  } else {
    planForm.value = {
      code:'',names:{ru:'',en:'',ka:''},descriptions:{ru:'',en:'',ka:''},
      monthly_price_minor:0,currency:'KZT',period_months:1,display_order:0,
      limits:{users:2,companies:1,employees:50,storage_bytes:1073741824,max_file_bytes:36700160},
      modules:{employees:true,staffing:true,vacations:false,worktime:false,personnel:true,documents:true,reporting:false,development:false,roles:true},
      is_public:true,
    }
  }
  modal.value = 'plan'
}
async function editLegal(row?: Item) {
  legalForm.value = {type:'privacy',locale:locale.value,jurisdiction:'KZ',acceptance:'acknowledged',title:'',body:'',required:true,effective_at:''}
  if (row) {
    try {
      const result = await fetchAdmin<{data:Item}>('/legal/'+row.id)
      const d = result.data
      legalForm.value = {type:d.type,locale:d.locale,jurisdiction:d.jurisdiction||'KZ',acceptance:d.acceptance||'accepted',title:d.title,body:d.body,required:!!d.required,effective_at:d.effective_at ? String(d.effective_at).slice(0,16).replace(' ','T') : ''}
    } catch { error.value = tr('failedLoad'); return }
  }
  modal.value = 'legal'
}
async function viewLegal(row:Item) {
  try {
    const result = await fetchAdmin<{data:Item}>('/legal/'+row.id)
    legalView.value = result.data
    modal.value = 'legal-view'
  } catch { error.value = tr('failedLoad') }
}
function approveLegal(row:Item) {
  approvalNote.value = ''
  ask(tr('approve'),()=>mutate('/legal/'+row.id+'/status','PUT',{status:'approved',approval_note:approvalNote.value}))
}
function openPayment(row:Item){selectedInvoice.value = row;modal.value = 'payment'}
async function openInvoice() {
  await loadPlans()
  const [companies,supplier] = await Promise.all([
    fetchAdmin<{data:Item[]}>('/companies?per_page=100'),
    fetchAdmin<{data:Item}>('/billing/supplier'),
  ])
  companyOptions.value = companies.data || []
  invoiceForm.value = {company_id:'',plan_version_id:'',due_date:new Date(Date.now()+14*86400000).toISOString().slice(0,10),months:1,tax_basis_points:Number(supplier.data?.tax_basis_points||0)}
  modal.value = 'invoice'
}
async function loadPlans() {
  const res = await fetchAdmin<{data:Plan[]}>('/plans')
  plans.value = res.data || []
}
async function openSubscription(row:Item) {
  await loadPlans()
  subscription.value = {company_id:row.id,plan_version_id:'',ends_at:''}
  modal.value = 'subscription'
}
async function openProfile(companyId='') {
  const url = companyId ? '/companies/'+companyId+'/billing' : '/billing/supplier'
  const res = await fetchAdmin<{data:Item}>(url)
  profileForm.value = {
    company_id:companyId,
    legal_name:String(res.data.legal_name||''),registration_number:String(res.data.registration_number||''),
    address:String(res.data.address||''),bank:String(res.data.bank||''),
    iban:String(res.data.iban||''),bic:String(res.data.bic||''),
    signatory:String(res.data.signatory||''),tax_basis_points:Number(res.data.tax_basis_points||0),
    service_name:String(res.data.service_name||''),
  }
  modal.value = 'profile'
}
async function saveProfile() {
  const {company_id, ...fields} = profileForm.value
  await action(() => mutate(company_id ? '/companies/'+company_id+'/billing' : '/billing/supplier','PUT',fields))
}
function paginate(next:number) { if(next<1||next>lastPage.value)return;page.value=next;void load() }
</script>

<template>
  <div class="platform-admin">
    <aside class="admin-nav">
      <RouterLink class="admin-brand" :to="{name:'public.home'}">
        <img :src="publicAsset('brand/itp-mark.svg')" width="45" height="34" alt="ITP" />
        <span><b>ITP HRM</b><small>{{ tr('admin') }}</small></span>
      </RouterLink>
      <nav :aria-label="tr('admin')">
        <RouterLink v-for="tab in visibleTabs" :key="tab.id" :to="{name:'platform-admin',params:{section:tab.id}}"
          :class="{selected:section===tab.id}"><component :is="tab.icon" :size="19" /><span>{{ tr(tab.label) }}</span></RouterLink>
      </nav>
      <div class="admin-nav-footer">
        <RouterLink to="/app"><ArrowLeft :size="18"/>{{ tr('returnToApp') }}</RouterLink>
        <RouterLink :to="{name:'public.home'}"><Building2 :size="18"/>{{ tr('home') }}</RouterLink>
      </div>
    </aside>
    <main class="admin-body">
      <header class="admin-heading">
        <div><p>{{ tr('adminTitle') }}</p><h1>{{ title }}</h1></div>
        <div class="admin-heading-actions">
          <BaseButton v-if="section==='plans'&&allowed('plans.write')" @click="editPlan()"><Plus :size="17"/>{{ tr('createPlan') }}</BaseButton>
          <BaseButton v-if="section==='payments'&&allowed('billing.write')" @click="openProfile()"><Settings :size="17"/>{{ tr('edit') }}</BaseButton>
          <BaseButton v-if="section==='payments'&&allowed('billing.write')" @click="openInvoice()"><Plus :size="17"/>{{ tr('createInvoice') }}</BaseButton>
          <BaseButton v-if="section==='documents'&&allowed('legal.write')" @click="editLegal()"><Plus :size="17"/>{{ tr('createLegal') }}</BaseButton>
          <BaseButton v-if="section==='access'&&allowed('platform.manage')" @click="modal='grant'"><Plus :size="17"/>{{ tr('grant') }}</BaseButton>
        </div>
      </header>
      <p v-if="section==='payments' && overview?.commercial_enabled===false" class="admin-alert">{{ tr('billingDisabled') }}</p>
      <p v-if="error" role="alert" class="admin-alert error"><AlertCircle :size="18"/>{{ error }}</p>
      <p v-if="notice" role="status" class="admin-alert success"><Check :size="18"/>{{ notice }}</p>
      <div v-if="initialLoading" role="status">{{ tr('loading') }}</div>
      <template v-else>
        <div class="admin-toolbar">
          <input v-if="section==='companies'" v-model.trim="search" type="search" :placeholder="tr('search')" :aria-label="tr('search')" />
          <span>{{ tr('count') }}: {{ total }}</span>
        </div>
        <div v-if="detail && section==='companies'" class="admin-detail">
          <div class="detail-head"><h2>{{ detail.organization?.name }}</h2><BaseButton @click="detail=null">{{ tr('back') }}</BaseButton></div>
          <p>{{ tr('plan') }}: {{ detail.subscription?.plan_code || '—' }}</p>
          <BaseButton v-if="allowed('subscriptions.write')" @click="openSubscription(detail.organization)">{{ tr('assignPlan') }}</BaseButton>
          <BaseButton v-if="allowed('billing.write')" @click="openProfile(detail.organization.id)">{{ tr('edit') }}</BaseButton>
          <h3>{{ tr('employees') }} ({{ users.length }})</h3>
          <div v-for="u in users" :key="u.id" class="detail-row"><span>{{ u.name }} · {{ u.email }}</span><span>{{ u.role_code }}</span></div>
        </div>
        <div class="admin-table-wrap">
          <table>
            <thead><tr><th v-for="col in columnConfig[section]" :key="col.key">{{ tr(col.label) }}</th><th>{{ tr('actions') }}</th></tr></thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td v-for="col in columnConfig[section]" :key="col.key">{{ text(row,col.key) }}</td>
                <td class="table-actions">
                  <BaseButton v-if="section==='payments'" @click="openPayment(row)">{{ tr('details') }}</BaseButton>
                  <BaseButton v-if="section==='companies'" @click="openCompany(row)">{{ tr('open') }}</BaseButton>
                  <BaseButton v-if="section==='companies'&&allowed('subscriptions.write')" @click="openSubscription(row)">{{ tr('assignPlan') }}</BaseButton>
                  <template v-if="section==='plans'&&allowed('plans.write')">
                    <BaseButton @click="editPlan(row as Plan)">{{ tr('edit') }}</BaseButton>
                    <BaseButton v-if="row.status==='draft'" @click="ask(tr('publish'),()=>mutate('/plans/'+row.id+'/status','PUT',{status:'published'}))">{{ tr('publish') }}</BaseButton>
                    <BaseButton v-if="row.status==='published'" @click="ask(tr('archive'),()=>mutate('/plans/'+row.id+'/status','PUT',{status:'archived'}))">{{ tr('archive') }}</BaseButton>
                  </template>
                  <template v-if="section==='payments'&&allowed('billing.write')">
                    <BaseButton v-if="row.status==='draft'" @click="ask(tr('issue'),()=>mutate('/invoices/'+row.id+'/status','PUT',{status:'issued'}))">{{ tr('issue') }}</BaseButton>
                    <BaseButton v-if="row.status==='issued'" @click="ask(tr('awaitingPayment'),()=>mutate('/invoices/'+row.id+'/status','PUT',{status:'awaiting_payment'}))">{{ tr('awaitingPayment') }}</BaseButton>
                    <BaseButton v-if="row.status==='awaiting_payment'" @click="ask(tr('overdue'),()=>mutate('/invoices/'+row.id+'/status','PUT',{status:'overdue'}))">{{ tr('overdue') }}</BaseButton>
                  </template>
                  <template v-if="section==='documents'">
                    <BaseButton @click="viewLegal(row)">{{ tr('details') }}</BaseButton>
                    <BaseButton v-if="row.status==='draft'&&allowed('legal.write')" @click="editLegal(row)">{{ tr('edit') }}</BaseButton>
                    <BaseButton v-if="row.status==='draft'&&allowed('legal.approve')" @click="approveLegal(row)">{{ tr('approve') }}</BaseButton>
                  </template>
                  <BaseButton v-if="section==='documents'&&row.status==='approved'&&allowed('legal.publish')"
                    @click="ask(tr('publish'),()=>mutate('/legal/'+row.id+'/status','PUT',{status:'published'}))">{{ tr('publish') }}</BaseButton>
                  <BaseButton v-if="section==='access'&&allowed('platform.manage')" @click="ask(tr('revoke'),()=>mutate('/grants/'+row.id,'DELETE'))">{{ tr('revoke') }}</BaseButton>
                </td>
              </tr>
              <tr v-if="rows.length===0"><td :colspan="columnConfig[section].length+1" class="empty">{{ tr('noResults') }}</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="lastPage>1" class="admin-pagination">
          <BaseButton :disabled="page<=1" @click="paginate(page-1)"><ChevronLeft :size="17"/></BaseButton>
          <span>{{ page }} / {{ lastPage }}</span>
          <BaseButton :disabled="page>=lastPage" @click="paginate(page+1)"><ChevronRight :size="17"/></BaseButton>
        </div>
      </template>
    </main>
    <div v-if="modal" class="admin-overlay" role="presentation" @click.self="modal=''">
      <section class="admin-modal" role="dialog" aria-modal="true" :aria-label="tr('edit')">
        <header><h2>{{ modal==='plan'?tr('createPlan'):modal==='legal'?tr('createLegal'):modal==='payment'?tr('paymentProof'):modal==='invoice'?tr('createInvoice'):modal==='subscription'?tr('assignPlan'):modal==='grant'?tr('grant'):tr('edit') }}</h2>
          <BaseButton class="modal-close" :aria-label="tr('cancel')" @click="modal=''"><X :size="20"/></BaseButton></header>
        <HrmPaymentProofPanel v-if="modal==='payment' && selectedInvoice" :invoice="selectedInvoice as any" :can-write="allowed('billing.write')" @updated="load" />
        <form v-else-if="modal==='plan'" @submit.prevent="action(()=>mutate('/plans','POST',planForm))">
          <label>{{ tr('codeLabel') }}<input v-model.trim="planForm.code" required pattern="[a-z][a-z0-9_-]{1,47}" /></label>
          <div class="form-cols"><label v-for="lang in ['ru','en','ka']" :key="lang">{{ tr('name') }} ({{lang}})<input v-model.trim="planForm.names[lang as 'ru'|'en'|'ka']" required maxlength="120" /></label></div>
          <div class="form-cols"><label v-for="lang in ['ru','en','ka']" :key="lang">{{ tr('description') }} ({{lang}})<input v-model.trim="planForm.descriptions[lang as 'ru'|'en'|'ka']" maxlength="180" /></label></div>
          <div class="form-cols"><label>{{ tr('price') }} ({{ planForm.currency }})<input v-model.number="displayedPrice" type="number" min="0" max="10000000000" step="0.01" required /></label>
          <label>{{ tr('currency') }}<select v-model="planForm.currency"><option v-for="c in ['KZT','USD','EUR','GEL']" :key="c">{{ c }}</option></select></label></div>
          <div class="form-cols"><label v-for="key in ['users','employees','storage_bytes','max_file_bytes'] as const" :key="key">{{ key==='users'?tr('usersLimit'):key==='employees'?tr('employeeRecordsLimit'):key==='storage_bytes'?tr('storageLimit'):tr('maxFile') }}<input v-model.number="planForm.limits[key]" type="number" min="1" required /></label></div>
          <div class="form-cols"><label>{{ tr('periodMonths') }}<input v-model.number="planForm.period_months" type="number" min="1" max="120" required /></label><label>{{ tr('displayOrder') }}<input v-model.number="planForm.display_order" type="number" min="-10000" max="10000" required /></label></div>
          <fieldset><legend>{{ tr('availableModules') }}</legend><div class="form-checks">
            <label v-for="m in moduleKeys" :key="m" class="check-label"><input v-model="planForm.modules[m]" type="checkbox"/>{{ tr(m) }}</label>
          </div></fieldset>
          <label class="check-label"><input v-model="planForm.is_public" type="checkbox"/>{{ tr('publicPlan') }}</label>
          <BaseButton type="submit" :disabled="busy">{{ tr('save') }}</BaseButton>
        </form>
        <form v-else-if="modal==='legal'" @submit.prevent="action(()=>mutate('/legal','POST',{...legalForm,effective_at:legalForm.effective_at.replace('T',' ')}))">
          <p class="admin-alert">{{ tr('legalDraftReviewNotice') }}</p>
          <label>{{ tr('legalType') }}<select v-model="legalForm.type"><option v-for="type in legalTypes" :key="type" :value="type">{{ type }}</option></select></label>
          <label>{{ tr('legalLocale') }}<select v-model="legalForm.locale"><option value="ru">RU</option><option value="en">EN</option><option value="ka">GE</option></select></label>
          <label>{{ tr('jurisdiction') }}<select v-model="legalForm.jurisdiction"><option value="KZ">{{ tr('countryKZ') }}</option><option value="GE">{{ tr('countryGE') }}</option></select></label>
          <label>{{ tr('effectiveDate') }}<input v-model="legalForm.effective_at" type="datetime-local" required /></label>
          <label>{{ tr('legalRequired') }}<select v-model="legalForm.acceptance"><option value="accepted">accepted</option><option value="acknowledged">acknowledged</option><option value="consented">consented</option></select></label>
          <label>{{ tr('name') }}<input v-model.trim="legalForm.title" required maxlength="200"/></label>
          <label>{{ tr('legalBody') }}<textarea v-model="legalForm.body" rows="10" required minlength="80" maxlength="200000" /></label>
          <label class="check-label"><input v-model="legalForm.required" type="checkbox"/>{{ tr('legalRequired') }}</label>
          <BaseButton type="submit" :disabled="busy">{{ tr('save') }}</BaseButton>
        </form>
        <article v-else-if="modal==='legal-view' && legalView" class="legal-admin-review">
          <p><strong>{{ legalView.title }}</strong> · {{ legalView.jurisdiction }} / {{ legalView.locale }} · v{{ legalView.version }} · {{ legalView.status }}</p>
          <p>{{ tr('effectiveDate') }}: {{ legalView.effective_at || '—' }}</p>
          <p class="legal-hash">SHA-256: {{ legalView.sha256 }}</p>
          <div class="legal-review-body">{{ legalView.body }}</div>
        </article>
        <form v-else-if="modal==='invoice'" @submit.prevent="action(()=>mutate('/invoices','POST',{...invoiceForm,plan_version_id:Number(invoiceForm.plan_version_id)}))">
          <label>{{ tr('company') }}<select v-model="invoiceForm.company_id" required><option value="" disabled>{{ tr('selectCompany') }}</option>
            <option v-for="row in companyOptions" :key="row.id" :value="row.id">{{ row.name }}</option></select></label>
          <label>{{ tr('plan') }}<select v-model="invoiceForm.plan_version_id" required><option value="" disabled>{{ tr('plan') }}</option>
            <option v-for="p in planOptions" :key="p.id" :value="String(p.id)">{{ p.code }} · v{{ p.version }}</option></select></label>
          <label>{{ tr('dueDate') }}<input v-model="invoiceForm.due_date" type="date" required /></label>
          <label>{{ tr('periodMonths') }}<input v-model.number="invoiceForm.months" type="number" min="1" max="120" required /></label>
          <label>{{ tr('taxRate') }}<input v-model.number="invoiceForm.tax_basis_points" type="number" min="0" max="10000" readonly /></label>
          <BaseButton type="submit" :disabled="busy">{{ tr('createInvoice') }}</BaseButton>
        </form>
        <form v-else-if="modal==='subscription'" @submit.prevent="action(()=>mutate('/companies/'+subscription.company_id+'/subscription','PUT',{plan_version_id:Number(subscription.plan_version_id),ends_at:subscription.ends_at||null}))">
          <label>{{ tr('plan') }}<select v-model="subscription.plan_version_id" required><option value="" disabled>{{ tr('plan') }}</option>
            <option v-for="p in planOptions" :key="p.id" :value="String(p.id)">{{ p.code }} · v{{ p.version }}</option></select></label>
          <label>{{ tr('endDate') }}<input v-model="subscription.ends_at" type="date"/></label>
          <BaseButton type="submit" :disabled="busy">{{ tr('assignPlan') }}</BaseButton>
        </form>
        <form v-else-if="modal==='profile'" @submit.prevent="saveProfile">
          <label v-for="field in ['legal_name','registration_number','address','bank','iban','bic','signatory','service_name'] as const" :key="field">
            {{ tr(field as SaasKey) }}<input v-model.trim="profileForm[field]" required maxlength="500"/></label>
          <label>{{ tr('taxRate') }}<input v-model.number="profileForm.tax_basis_points" type="number" min="0" max="10000"/></label>
          <BaseButton type="submit" :disabled="busy">{{ tr('save') }}</BaseButton>
        </form>
        <form v-else-if="modal==='grant'" @submit.prevent="action(()=>mutate('/grants','POST',{user_id:Number(grantForm.user_id),permission:grantForm.permission}))">
          <label>{{ tr('userId') }}<input v-model.trim="grantForm.user_id" type="number" min="1" required/></label>
          <label>{{ tr('permission') }}<select v-model="grantForm.permission"><option v-for="p in allPermissions" :key="p" :value="p">{{ p }}</option></select></label>
          <BaseButton type="submit" :disabled="busy">{{ tr('grant') }}</BaseButton>
        </form>
      </section>
    </div>
    <div v-if="confirm" class="admin-overlay" role="presentation" @click.self="confirm=null">
      <section class="admin-confirm" role="alertdialog" aria-modal="true" :aria-label="tr('confirmAction')">
        <h2>{{ tr('confirmAction') }}</h2><p>{{ confirm.title }}</p>
        <label v-if="section==='documents' && confirm.title===tr('approve')" class="legal-approval-note">{{ tr('approvalReference') }}<textarea v-model.trim="approvalNote" rows="3" minlength="15" maxlength="5000" required></textarea></label>
        <div><BaseButton class="secondary" @click="confirm=null">{{ tr('cancel') }}</BaseButton>
          <BaseButton :disabled="busy || (section==='documents' && confirm.title===tr('approve') && approvalNote.length<15)" @click="action(confirm!.execute)">{{ tr('approve') }}</BaseButton></div>
      </section>
    </div>
  </div>
</template>
<style scoped>
.platform-admin{--c:#009cde;--ink:#173b4c;display:grid;grid-template-columns:255px minmax(0,1fr);min-height:100dvh;background:#f6f9fb;color:var(--ink)}
.admin-nav{background:white;border-right:1px solid #e0e9ee;display:flex;flex-direction:column;min-height:100dvh;gap:20px;padding:20px 14px;box-sizing:border-box}
.admin-brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;padding:0 10px 14px;border-bottom:1px solid #e5edf2}.admin-brand span{display:grid;gap:3px}.admin-brand b{font-size:18px}.admin-brand small{font-size:11px;color:#6192ac}
.admin-nav nav{display:grid;align-content:start;gap:4px}.admin-nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;border-radius:7px;padding:12px;font-size:13px}.admin-nav nav a.selected{background:#e5f7fd;color:#0086bf}.admin-nav nav a:hover,.admin-nav-footer a:hover{background:#eff7fa}.admin-nav-footer{margin-top:auto;border-top:1px solid #e9eff3;padding-top:14px;display:grid}
.admin-body{min-width:0;padding:34px clamp(20px,3vw,52px)}.admin-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:30px}.admin-heading p{color:#78909c;font-size:13px;margin:0 0 9px}.admin-heading h1{font-size:29px;font-weight:650;margin:0;letter-spacing:-.03em}
.admin-heading-actions{display:flex;gap:9px;flex-wrap:wrap}.platform-admin button{font:inherit;cursor:pointer}.admin-heading-actions button,.admin-detail button{display:inline-flex;align-items:center;gap:7px;border:1px solid #d1e3ea;background:white;color:#1674a0;font-size:13px;padding:10px 13px;border-radius:7px}
.admin-heading-actions button:last-child{border-color:#009cde;background:#009cde;color:white}
.admin-toolbar{min-height:48px;display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:14px;font-size:13px;color:#698593}
.admin-toolbar input{max-width:400px;width:100%;min-height:41px;border:1px solid #dce8ec;border-radius:7px;background:white;padding:9px 13px;font:inherit}
.admin-table-wrap{overflow-x:auto;background:white;border:1px solid #dde8ed;border-radius:11px}
table{width:100%;border-collapse:collapse;min-width:650px;text-align:left;font-size:13px}
th{font-weight:550;color:#678392;background:#f3f8fa}td,th{padding:15px 17px;border-bottom:1px solid #eef3f5;vertical-align:middle}tr:last-child td{border-bottom:0}
.table-actions{white-space:nowrap}.table-actions button{border:1px solid #d8e8ee;border-radius:6px;background:white;color:#137ca9;margin:3px;padding:7px 9px;font-size:12px}
.table-actions button:hover{background:#eff8fb}.empty{text-align:center;color:#8aa1a9;padding:40px}
.admin-pagination{display:flex;justify-content:flex-end;align-items:center;gap:15px;margin:20px 0;color:#7695a3;font-size:13px}.admin-pagination button{background:white;border:1px solid #d9e8ee;padding:7px;border-radius:6px}
.admin-detail{background:white;border:1px solid #dbe9ed;border-radius:10px;padding:22px;margin-bottom:20px;font-size:13px}.admin-detail h2{margin:0;font-size:21px}.detail-head{display:flex;justify-content:space-between;align-items:center}.admin-detail h3{font-size:15px;margin:24px 0 10px}.detail-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid #eef3f5}
.admin-alert{padding:13px 15px;border:1px solid #f3dfbd;background:#fff9ee;color:#755c31;border-radius:8px;font-size:13px;display:flex;gap:8px;align-items:center}.admin-alert.error{background:#fff1f0;border-color:#ffdbd8;color:#ab4545}.admin-alert.success{background:#effbf5;border-color:#c7e6d6;color:#23835b}
.admin-overlay{position:fixed;inset:0;background:#0e263b91;z-index:100;display:grid;place-items:center;padding:18px;box-sizing:border-box}
.admin-modal,.admin-confirm{background:white;border-radius:13px;box-shadow:0 30px 80px #0a243044;width:min(800px,100%);max-height:90dvh;overflow-y:auto;padding:28px;box-sizing:border-box}.admin-modal header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.admin-modal h2,.admin-confirm h2{font-size:23px;font-weight:650;margin:0}.modal-close{border:0;background:transparent;color:#7e99a4}
.admin-modal form{display:grid;gap:15px}.admin-modal label{display:grid;gap:6px;font-size:13px;font-weight:500}.admin-modal input:not([type=checkbox]),.admin-modal select,.admin-modal textarea{width:100%;box-sizing:border-box;min-height:40px;border:1px solid #d5e6ec;padding:9px 12px;border-radius:7px;color:#12394b;background:white;font:inherit;font-size:13px}.admin-modal textarea{min-height:170px;resize:vertical}.form-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.admin-modal fieldset{border:1px solid #e3edf2;border-radius:9px;padding:14px}.admin-modal legend{font-size:13px}.form-checks{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.admin-modal .check-label{display:flex;align-items:center;gap:8px}.admin-modal form>button,.admin-confirm button:not(.secondary){background:#009cde;color:white;border:1px solid #009cde;border-radius:7px;min-height:42px;padding:9px 14px}
 .legal-admin-review{font-size:13px;line-height:1.6}.legal-admin-review .legal-hash{overflow-wrap:anywhere;color:#718997}.legal-review-body{white-space:pre-wrap;max-height:55vh;overflow:auto;padding:16px;background:#f6f9fa;border:1px solid #e0e9ee;border-radius:8px}.legal-approval-note{display:grid;gap:8px;font-size:13px;margin:12px 0 20px}.legal-approval-note textarea{font:inherit;padding:10px;border:1px solid #d1e3ea;border-radius:7px;resize:vertical}
.admin-confirm{max-width:440px}.admin-confirm p{font-size:14px;margin:23px 0}.admin-confirm>div{display:flex;justify-content:flex-end;gap:12px}.admin-confirm button{padding:10px 16px;border-radius:7px;border:1px solid #d9e8ee}.admin-confirm .secondary{background:white;color:#426b80}
@media(max-width:860px){.platform-admin{grid-template-columns:1fr}.admin-nav{min-height:0;border-right:0;border-bottom:1px solid #dfe9ee;gap:8px}.admin-brand{padding-bottom:10px}.admin-nav nav{display:flex;overflow-x:auto;gap:4px}.admin-nav nav a{white-space:nowrap}.admin-nav-footer{display:none}.admin-body{padding:22px 14px}}
@media(max-width:560px){.admin-modal{padding:22px 15px}.form-cols{grid-template-columns:1fr}.form-checks{grid-template-columns:1fr 1fr}.admin-heading h1{font-size:24px}}
</style>
