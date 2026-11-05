<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Minus } from 'lucide-vue-next'
import { apiRequest } from '../../api/client'
import { useSaasText, type SaasKey } from '../../i18n/saas'
type Plan = { id: number; code: string; terms: {
  names: Record<string, string>; descriptions?: Record<string, string>;
  price_minor: number; currency: string; period_months?: number; limits: Record<string, number>;
  modules: Record<string, boolean> } }
const plans = ref<Plan[]>([])
const loading = ref(true)
const failed = ref(false)
const router = useRouter()
const { tr, locale } = useSaasText()
const labels: Record<string, SaasKey> = {
  employees: 'employees', staffing: 'staffing', vacations: 'vacations', worktime: 'worktime',
  personnel: 'personnel', documents: 'documents', reporting: 'reporting', development: 'development', roles: 'roles',
}
function title(p: Plan) { return p.terms.names[locale.value] || p.terms.names.en || p.code }
function formatPrice(p: Plan) { return new Intl.NumberFormat(locale.value === 'ka' ? 'ka-GE' : locale.value,
  { style: 'currency', currency: p.terms.currency, maximumFractionDigits: 0 })
  .format(p.terms.price_minor / 100) }
function bytes(n: number | undefined) {
  const value = Number(n ?? 0)
  return value >= 1073741824 ? (value / 1073741824).toLocaleString() + ' GiB'
    : (value / 1048576).toLocaleString() + ' MiB'
}
async function load() {
  loading.value = true
  failed.value = false
  try {
    const result = await apiRequest<{data: Plan[]}>('/public/plans')
    plans.value = result.data || []
  } catch {
    failed.value = true
  } finally { loading.value = false }
}
onMounted(load)

function choose(plan: Plan) { void router.push({ name: 'public.register', query: { plan: plan.code } }) }
</script>

<template>
  <section class="saas-plans" :aria-busy="loading">
    <div v-if="loading" class="saas-plans-message" role="status">{{ tr('loading') }}</div>
    <div v-else-if="failed" class="saas-plans-message" role="alert">
      {{ tr('failedLoad') }} <button type="button" @click="load">{{ tr('retry') }}</button>
    </div>
    <div v-else-if="!plans.length" class="saas-plans-message">{{ tr('noPlans') }}</div>
    <div v-else class="saas-plans-grid">
      <article v-for="plan in plans" :key="plan.id" class="saas-plan-card" :data-plan="plan.code">
        <h3>{{ title(plan) }}</h3>
        <p class="saas-plan-description">{{ plan.terms.descriptions?.[locale] || plan.terms.descriptions?.en }}</p>
        <div class="saas-price">{{ formatPrice(plan) }}<small>{{ tr('perMonth') }}</small></div>
        <ul class="saas-plan-limits">
          <li><Check :size="16" />{{ tr('usersLimit') }}: {{ plan.terms.limits.users }}</li>
          <li><Check :size="16" />{{ tr('employeeRecordsLimit') }}: {{ plan.terms.limits.employees ?? '—' }}</li>
          <li><Check :size="16" />{{ tr('companiesLimit') }}: {{ plan.terms.limits.companies }}</li>
          <li><Check :size="16" />{{ tr('storageLimit') }}: {{ bytes(plan.terms.limits.storage_bytes) }}</li>
          <li><Check :size="16" />{{ tr('maxFile') }}: {{ bytes(plan.terms.limits.max_file_bytes) }}</li>
        </ul>
        <p class="saas-module-label">{{ tr('availableModules') }}</p>
        <ul class="saas-plan-modules">
          <li v-for="(enabled, module) in plan.terms.modules" :key="module" :class="{ disabled: !enabled }">
            <Check v-if="enabled" :size="16" /><Minus v-else :size="16" />
            {{ labels[module] ? tr(labels[module]) : module }}
          </li>
        </ul>
        <button class="saas-select-plan" type="button" @click="choose(plan)">{{ tr('selectPlan') }}</button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.saas-plans-message{border:1px solid #ddebf1;border-radius:10px;padding:30px;text-align:center;font-size:14px;color:#607d8a;background:white}
.saas-plans-message button{margin-left:12px;border:0;background:transparent;color:#008cc6;cursor:pointer;font:inherit}
.saas-plans-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.saas-plan-card{display:flex;flex-direction:column;padding:29px 27px;background:#fff;border:1px solid #dceaf1;border-radius:13px;min-width:0}
.saas-plan-card h3{font-size:24px;font-weight:600;letter-spacing:-.03em;margin:0 0 8px}
.saas-plan-description{margin:0;min-height:42px;font-size:13px;line-height:1.6;color:#6e8996}
.saas-price{font-size:30px;font-weight:640;margin:22px 0 16px;color:#164257;letter-spacing:-.035em}
.saas-price small{font-size:12px;color:#78909b;display:block;font-weight:450;letter-spacing:0;margin-top:3px}
.saas-plan-limits,.saas-plan-modules{list-style:none;padding:0;margin:0}
.saas-plan-limits{padding-bottom:18px;border-bottom:1px solid #e6eff4}
.saas-plan-limits li,.saas-plan-modules li{display:flex;align-items:center;gap:9px;padding:5px 0;font-size:13px;line-height:1.45}
.saas-plan-limits svg,.saas-plan-modules svg{color:#009cde;flex:0 0 16px}
.saas-module-label{font-size:12px;font-weight:600;margin:20px 0 9px}
.saas-plan-modules{flex:1;margin-bottom:24px}.saas-plan-modules .disabled{opacity:.43}
.saas-select-plan{min-height:43px;border:1px solid #009cde;border-radius:8px;background:#009cde;color:#fff;font:inherit;font-size:14px;font-weight:550;cursor:pointer}
.saas-select-plan:hover{background:#0087c1}
@media(max-width:1000px){.saas-plans-grid{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.saas-plans-grid{grid-template-columns:1fr}.saas-plan-card{padding:23px}}
</style>
