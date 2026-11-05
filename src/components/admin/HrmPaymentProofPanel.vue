<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { apiRequest, apiHref, requestJson } from '../../api/client'
import { useSaasText } from '../../i18n/saas'
import BaseButton from '../ui/BaseButton.vue'
type Invoice = { id:number;number:string;status:string;total_minor:number;currency:string }
type Proof = { id:number;status:string;mime:string;size:number;created_at:string;review_note?:string }
const props = defineProps<{ invoice:Invoice;canWrite:boolean }>()
const emit = defineEmits<{ updated:[] }>()
const {tr}=useSaasText()
const proofs=ref<Proof[]>([])
const selectedFile=ref<File|null>(null)
const busy=ref(false),loading=ref(true),error=ref('')
const note=ref(''),reference=ref(''),amount=ref(0)
const canUpload=computed(()=>['issued','awaiting_payment','overdue'].includes(props.invoice.status))
const invoiceUrl=computed(()=>apiHref('/platform-admin/invoices/'+props.invoice.id+'/print'))
const pdfUrl=computed(()=>apiHref('/platform-admin/invoices/'+props.invoice.id+'/pdf'))
function proofUrl(p:Proof){return apiHref('/platform-admin/invoices/'+props.invoice.id+'/proofs/'+p.id+'/file')}
async function csrf(){await requestJson<void>((import.meta.env.VITE_BACKEND_PREFIX||'')+'/sanctum/csrf-cookie')}
async function load(){
  loading.value=true
  try{const result=await apiRequest<{data:Proof[]}>('/platform-admin/invoices/'+props.invoice.id+'/proofs');proofs.value=result.data||[]}
  catch{error.value=tr('failedLoad')}
  finally{loading.value=false}
}
onMounted(load)
watch(()=>props.invoice.id,()=>{proofs.value=[];selectedFile.value=null;note.value='';reference.value='';void load()})
function chooseFile(e:Event){selectedFile.value=(e.target as HTMLInputElement).files?.[0]||null}
async function upload(){
  if(busy.value||!selectedFile.value)return
  busy.value=true;error.value=''
  try{
    await csrf()
    const form=new FormData();form.append('file',selectedFile.value)
    await apiRequest('/platform-admin/invoices/'+props.invoice.id+'/proofs',{method:'POST',body:form,timeoutMs:40000})
    selectedFile.value=null;await load();emit('updated')
  }catch{error.value=tr('failedSave')}finally{busy.value=false}
}
async function review(proof:Proof,decision:'accepted'|'rejected'){
  if(busy.value||note.value.trim().length<12)return
  if(decision==='accepted'&&(reference.value.trim().length<5||amount.value<=0))return
  busy.value=true;error.value=''
  try{
    await csrf()
    const payload:Record<string,unknown>={decision,review_note:note.value.trim()}
    if(decision==='accepted'){
      payload.bank_reference=reference.value.trim()
      payload.received_amount_minor=Math.round(amount.value*100)
    }
    await apiRequest('/platform-admin/invoices/'+props.invoice.id+'/proofs/'+proof.id+'/review',{
      method:'POST',body:JSON.stringify(payload),
    })
    note.value='';reference.value='';await load();emit('updated')
  }catch{error.value=tr('failedSave')}finally{busy.value=false}
}
</script>

<template>
  <div class="payment-panel">
    <div class="payment-head">
      <div><strong>{{ invoice.number }}</strong><p>{{ tr('status') }}: {{ invoice.status==='paid'?tr('paid'):invoice.status }}</p></div>
      <div class="payment-links"><a :href="pdfUrl">{{ tr('downloadPdf') }}</a><a :href="invoiceUrl" target="_blank" rel="noopener noreferrer">{{ tr('printInvoice') }}</a></div>
    </div>
    <p v-if="error" role="alert" class="payment-error">{{ error }}</p>
    <form v-if="canWrite && canUpload" class="payment-upload" @submit.prevent="upload">
      <label>{{ tr('paymentProof') }} (PDF, JPG, PNG · 8 MiB)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" @change="chooseFile" />
      </label>
      <BaseButton type="submit" :disabled="busy || !selectedFile">{{ tr('uploadProof') }}</BaseButton>
    </form>
    <p v-if="loading" role="status">{{ tr('loading') }}</p>
    <p v-else-if="proofs.length===0" class="muted">{{ tr('proofsEmpty') }}</p>
    <div v-else class="payment-proofs">
      <article v-for="proof in proofs" :key="proof.id" class="payment-proof">
        <div class="payment-proof-head">
          <a :href="proofUrl(proof)" target="_blank" rel="noopener noreferrer">{{ tr('paymentProof') }} #{{ proof.id }}</a>
          <span>{{ proof.status==='accepted'?tr('approved'):proof.status==='rejected'?tr('rejectedPayment'):tr('awaitingPayment') }}</span>
        </div>
        <small>{{ proof.mime }} · {{ (proof.size/1048576).toFixed(2) }} MiB · {{ proof.created_at?.slice(0,10) }}</small>
        <p v-if="proof.review_note" class="muted">{{ proof.review_note }}</p>
        <form v-if="canWrite && proof.status==='pending' && canUpload" class="payment-review" @submit.prevent="review(proof,'accepted')">
          <label>{{ tr('bankReference') }}<input v-model.trim="reference" required minlength="5" maxlength="120" /></label>
          <label>{{ tr('bankVerifiedAmount') }} ({{ invoice.currency }})<input v-model.number="amount" type="number" min="0.01" step="0.01" :placeholder="String(invoice.total_minor/100)" required /></label>
          <label class="review-full">{{ tr('reviewNote') }}<textarea v-model.trim="note" minlength="12" maxlength="500" rows="2" required /></label>
          <div class="review-full review-actions">
            <BaseButton type="submit" :disabled="busy || note.trim().length<12 || reference.trim().length<5">{{ tr('confirmPaid') }}</BaseButton>
            <BaseButton type="button" :disabled="busy || note.trim().length<12" @click="review(proof,'rejected')">{{ tr('rejectedPayment') }}</BaseButton>
          </div>
        </form>
      </article>
    </div>
  </div>
</template>
<style scoped>
.payment-panel{display:grid;gap:16px;min-width:0}
.payment-head,.payment-proof-head{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap}
.payment-head{padding-bottom:14px;border-bottom:1px solid #e1ebf0}
.payment-links{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.payment-head p,.muted,.payment-proof small{color:#738c99;font-size:12px}
.payment-panel a{color:#008bc3;text-decoration:none;font-size:13px}
.payment-panel a:hover{text-decoration:underline}
.payment-upload,.payment-review{display:grid;gap:12px}
.payment-panel label{display:grid;gap:7px;font-size:13px}
.payment-panel input,.payment-panel textarea{width:100%;min-width:0;box-sizing:border-box;font:inherit;padding:10px 12px;border:1px solid #d7e4ec;border-radius:7px;background:white;color:inherit}
.payment-upload button{justify-self:start}
.payment-proofs{display:grid;gap:13px;max-height:52vh;overflow:auto}
.payment-proof{padding:17px;border:1px solid #e1ebf0;border-radius:8px;min-width:0}
.payment-review{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px}
.review-full{grid-column:1/-1}
.review-actions{display:flex;gap:9px;flex-wrap:wrap}
.payment-error{font-size:13px;color:#bb3535}
@media(max-width:650px){.payment-review{grid-template-columns:1fr}}
</style>
