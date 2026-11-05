<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiRequest, apiHref, requestJson } from '../api/client'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { useSaasText } from '../i18n/saas'
import BaseButton from '../components/ui/BaseButton.vue'

type Invoice={id:number;number:string;status:string;total_minor:number;currency:string;due_date:string;paid_at:string|null}
type Proof={id:number;status:string;created_at:string;review_note?:string}
type Plan={id:number;code:string;terms:{names:Record<string,string>;price_minor:number;currency:string;limits:Record<string,number>}}
type Subscription={code:string;version:number;status:string;effective_status:string;starts_at:string|null;ends_at:string|null;snapshot?:{terms?:{limits?:Record<string,number>}}}
const access=useCompanyAccessStore()
const {tr,locale}=useSaasText()
const invoices=ref<Invoice[]>([]),plans=ref<Plan[]>([]),proofs=ref<Proof[]>([])
const subscription=ref<Subscription|null>(null),billingEnabled=ref(false),enforcementEnabled=ref(false)
const usage=ref<{users:number;employees:number;storage_bytes:number}|null>(null)
const chosen=ref(''),months=ref(1),selectedInvoice=ref<Invoice|null>(null)
const file=ref<File|null>(null),busy=ref(false),loading=ref(true),error=ref(''),message=ref('')
const company=computed(()=>access.activeCompanyId)
const isAdmin=computed(()=>access.active?.role_code==='company_admin')
const selectedPlan=computed(()=>plans.value.find(p=>String(p.id)===chosen.value))
const priceText=(minor:number,currency:string)=>new Intl.NumberFormat(locale.value==='ka'?'ka-GE':locale.value,
  {style:'currency',currency,maximumFractionDigits:0}).format(minor/100)
const total=computed(()=>selectedPlan.value ? priceText(selectedPlan.value.terms.price_minor*months.value,selectedPlan.value.terms.currency) : '—')
const validPlan=computed(()=>selectedPlan.value && Number.isInteger(months.value)&&months.value>=1&&months.value<=120)
function pdfUrl(row:Invoice){return apiHref('/companies/'+company.value+'/billing/invoices/'+row.id+'/pdf')}
function chooseFile(e:Event){file.value=(e.target as HTMLInputElement).files?.[0]||null}
async function csrf(){await requestJson<void>((import.meta.env.VITE_BACKEND_PREFIX||'')+'/sanctum/csrf-cookie')}
async function load(){
  if(!company.value || !isAdmin.value){loading.value=false;return}
  loading.value=true;error.value=''
  try {
    const [sub, list, catalog]=await Promise.all([
      apiRequest<{data:Subscription|null;usage:{users:number;employees:number;storage_bytes:number};billing_enabled:boolean;enforcement_enabled:boolean}>('/companies/'+company.value+'/billing/subscription'),
      apiRequest<{data:Invoice[]}>('/companies/'+company.value+'/billing/invoices'),
      apiRequest<{data:Plan[]}>('/public/plans'),
    ])
    subscription.value=sub.data
    usage.value=sub.usage || null
    billingEnabled.value=sub.billing_enabled
    enforcementEnabled.value=sub.enforcement_enabled
    invoices.value=list.data||[]
    plans.value=catalog.data||[]
  }catch{error.value=tr('failedLoad')}finally{loading.value=false}
}
onMounted(async()=>{await access.refresh();await load()})
watch(()=>access.activeCompanyId,()=>{selectedInvoice.value=null;proofs.value=[];void load()})
async function checkout(){
  if(!validPlan.value||busy.value||!billingEnabled.value)return
  busy.value=true;error.value='';message.value=''
  try{
    await csrf()
    const res=await apiRequest<{data:Invoice}>('/companies/'+company.value+'/billing/checkout',{
      method:'POST',body:JSON.stringify({plan_version_id:Number(chosen.value),months:months.value}),
    })
    message.value=tr('invoiceCreated')+' '+res.data.number
    await load()
    await viewProofs(res.data)
  }catch{error.value=tr('failedSave')}finally{busy.value=false}
}
async function viewProofs(row:Invoice){
  selectedInvoice.value=row;proofs.value=[];file.value=null;error.value=''
  try{
    const res=await apiRequest<{data:Proof[]}>('/companies/'+company.value+'/billing/invoices/'+row.id+'/proofs')
    proofs.value=res.data||[]
  }catch{error.value=tr('failedLoad')}
}
async function upload(){
  if(!selectedInvoice.value||!file.value||busy.value||!billingEnabled.value)return
  busy.value=true;error.value='';message.value=''
  try{
    await csrf()
    const f=new FormData();f.append('file',file.value)
    await apiRequest('/companies/'+company.value+'/billing/invoices/'+selectedInvoice.value.id+'/proofs',{
      method:'POST',body:f,timeoutMs:40000,
    })
    const current=selectedInvoice.value
    file.value=null
    message.value=tr('paymentSentForReview')
    await viewProofs(current)
  }catch{error.value=tr('failedSave')}finally{busy.value=false}
}
</script>

<template>
  <main class="company-billing">
    <header class="billing-head">
      <div><p>{{ tr('brand') }} / {{ access.active?.company_name }}</p><h1>{{ tr('companyBilling') }}</h1></div>
      <RouterLink to="/settings" class="back">{{ tr('back') }}</RouterLink>
    </header>
    <p v-if="!isAdmin&&!loading" class="status-notice" role="alert">{{ tr('billingAdminOnly') }}</p>
    <p v-else-if="loading" role="status">{{ tr('loading') }}</p>
    <template v-else-if="isAdmin">
      <p v-if="error" class="status-error" role="alert">{{ error }}</p>
      <p v-if="message" class="status-success" role="status">{{ message }}</p>
      <div v-if="!billingEnabled" class="status-notice">{{ tr('billingDisabled') }}</div>
      <section class="panel">
        <h2>{{ tr('subscription') }}</h2>
        <div v-if="subscription" class="subscription-info">
          <span>{{ subscription.code }} · v{{ subscription.version }}</span>
          <strong>{{ subscription.effective_status }}</strong>
          <span>{{ tr('endDate') }}: {{ subscription.ends_at?.slice(0,10)||'—' }}</span>
        </div>
        <p v-else>{{ tr('noSubscription') }}</p>
        <div v-if="subscription?.snapshot?.terms?.limits && usage" class="usage-grid">
          <div v-for="key in ['users','employees','storage_bytes'] as const" :key="key" class="usage-item">
            <div><span>{{ key==='users'?tr('usersLimit'):key==='employees'?tr('employeeRecordsLimit'):tr('storageLimit') }}</span><strong>{{ key==='storage_bytes' ? (usage[key]/1048576).toFixed(2)+' MiB' : usage[key] }} / {{ key==='storage_bytes' ? (Number(subscription.snapshot.terms.limits[key]||0)/1048576).toFixed(2)+' MiB' : subscription.snapshot.terms.limits[key] }}</strong></div>
            <progress :value="usage[key]" :max="Number(subscription.snapshot.terms.limits[key]||1)" />
          </div>
        </div>
        <p class="muted">{{ tr('contractualPlanNotice') }}</p>
      </section>

      <section class="panel">
        <h2>{{ tr('createInvoice') }}</h2>
        <form class="checkout-form" @submit.prevent="checkout">
          <label>{{ tr('plan') }}
            <select v-model="chosen" required>
              <option value="" disabled>{{ tr('selectPlan') }}</option>
              <option v-for="plan in plans" :key="plan.id" :value="String(plan.id)">
                {{ plan.terms.names[locale]||plan.terms.names.en||plan.code }} · {{ priceText(plan.terms.price_minor,plan.terms.currency) }}
              </option>
            </select>
          </label>
          <label>{{ tr('periodMonths') }}<input v-model.number="months" type="number" min="1" max="120" required /></label>
          <div class="checkout-total">{{ tr('price') }}<strong>{{ total }}</strong></div>
          <BaseButton type="submit" :disabled="busy||!billingEnabled||!validPlan">{{ tr('createInvoice') }}</BaseButton>
        </form>
        <p class="muted">{{ tr('paymentManualNotice') }}</p>
      </section>

      <section class="panel">
        <h2>{{ tr('invoices') }}</h2>
        <div v-if="invoices.length" class="invoice-table">
          <table>
            <thead><tr><th>{{ tr('codeLabel') }}</th><th>{{ tr('status') }}</th><th>{{ tr('price') }}</th><th>{{ tr('actions') }}</th></tr></thead>
            <tbody><tr v-for="row in invoices" :key="row.id">
              <td>{{ row.number }}</td><td>{{ row.status==='paid'?tr('paid'):row.status }}</td>
              <td>{{ priceText(row.total_minor,row.currency) }}</td>
              <td class="actions"><a :href="pdfUrl(row)">{{ tr('downloadPdf') }}</a>
                <BaseButton type="button" @click="viewProofs(row)">{{ tr('paymentProof') }}</BaseButton></td>
            </tr></tbody>
          </table>
        </div>
        <p v-else class="muted">{{ tr('noResults') }}</p>
      </section>

      <section v-if="selectedInvoice" class="panel">
        <h2>{{ tr('paymentProof') }} — {{ selectedInvoice.number }}</h2>
        <ul v-if="proofs.length" class="proof-list">
          <li v-for="proof in proofs" :key="proof.id">
            <a :href="apiHref('/companies/'+company+'/billing/invoices/'+selectedInvoice.id+'/proofs/'+proof.id+'/file')">
              #{{ proof.id }}
            </a>
            <strong>{{ proof.status }}</strong><span>{{ proof.review_note||'' }}</span>
          </li>
        </ul>
        <p v-else class="muted">{{ tr('proofsEmpty') }}</p>
        <form v-if="billingEnabled&&['issued','awaiting_payment','overdue'].includes(selectedInvoice.status)"
              class="proof-upload" @submit.prevent="upload">
          <label>{{ tr('paymentProof') }} (PDF, JPG, PNG · 8 MiB)
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,application/pdf" @change="chooseFile" />
          </label>
          <BaseButton type="submit" :disabled="busy||!file">{{ tr('uploadProof') }}</BaseButton>
        </form>
        <p class="muted">{{ tr('paymentManualNotice') }}</p>
      </section>
    </template>
  </main>
</template>
<style scoped>
.company-billing{padding:32px clamp(15px,3vw,48px) 70px;max-width:1200px;margin:0 auto;color:var(--text-primary,#1b4053)}
.billing-head{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:26px}
.billing-head p{font-size:13px;color:#79909b}.billing-head h1{font-size:28px;font-weight:600;letter-spacing:-.03em;margin:5px 0}
.back,.invoice-table a,.proof-list a{color:#008cc6;text-decoration:none;font-size:13px}
.panel{background:var(--surface,#fff);border:1px solid var(--border,#dce8ed);border-radius:11px;padding:26px;margin-bottom:18px;max-width:100%;min-width:0}
.panel h2{font-size:18px;font-weight:580;margin:0 0 21px}.muted{font-size:13px;color:#708996;line-height:1.7}
.subscription-info{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;align-items:center}
.usage-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:20px 0}
.usage-item{min-width:0;display:grid;gap:8px;font-size:12px}
.usage-item>div{display:grid;gap:5px}.usage-item strong{font-size:13px;font-weight:550}
.usage-item progress{width:100%;height:8px;accent-color:#009cde}
@media(max-width:650px){.usage-grid{grid-template-columns:1fr}}
.checkout-form{display:grid;grid-template-columns:minmax(200px,1.6fr) minmax(110px,.7fr) minmax(120px,1fr) auto;gap:14px;align-items:end}
.checkout-form label,.proof-upload label{display:grid;gap:7px;font-size:13px}
.checkout-form select,.checkout-form input,.proof-upload input{font:inherit;border:1px solid #d8e6ed;padding:11px 12px;border-radius:7px;background:var(--surface,#fff);color:inherit;min-width:0}
.checkout-total{display:grid;gap:7px;font-size:13px}.checkout-total strong{font-size:18px}
.status-error,.status-success,.status-notice{padding:12px 16px;border-radius:7px;margin-bottom:16px;border:1px solid #d7e4eb;font-size:13px}
.status-error{color:#bc3737}.status-success{color:#277d6b}
.invoice-table{max-width:100%;overflow:auto}.invoice-table table{width:100%;border-collapse:collapse;text-align:left;font-size:13px;min-width:580px}
.invoice-table th,.invoice-table td{padding:14px 12px;border-bottom:1px solid #e8eff2}
.invoice-table th{font-weight:560;color:#698796}.actions{white-space:nowrap}
.actions :deep(button){border:0;background:transparent;color:#008cc6;font:inherit;margin-left:14px;cursor:pointer}
.proof-list{list-style:none;padding:0;display:grid;gap:8px}.proof-list li{display:flex;gap:12px;font-size:13px;flex-wrap:wrap}
.proof-upload{display:grid;gap:14px;margin:20px 0}.proof-upload button{justify-self:start}
@media(max-width:800px){.checkout-form{grid-template-columns:1fr 1fr}.checkout-form>*:first-child{grid-column:1/-1}}
@media(max-width:480px){.company-billing{padding:20px 14px}.panel{padding:18px}.checkout-form{grid-template-columns:1fr}.checkout-form>*:first-child{grid-column:auto}}
</style>
