<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MailCheck, LockKeyhole, Building2, CheckCircle2 } from 'lucide-vue-next'
import { apiRequest, requestJson } from '../../api/client'
import { usePublicSiteText } from '../../i18n/publicSite'
import type { SaasKey } from '../../i18n/saas'
const { tr, locale, serverLocale } = usePublicSiteText()
const route = useRoute()
const router = useRouter()
type LegalRow = { id: number; type: string; locale: string; jurisdiction: string; version: number; title: string }
const legal = ref<LegalRow[]>([])
const enabled = ref(false)
const legalReady = ref(false)
const jurisdiction = ref<'KZ' | 'GE'>('KZ')
const checking = ref(true)
const step = ref<'email' | 'verify' | 'company' | 'done'>('email')
const busy = ref(false)
const message = ref('')
const error = ref('')
const email = ref('')
const code = ref('')
const token = ref('')
const name = ref('')
const company = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const accepted = ref(false)
const website = ref('')
const selectedPlan = computed(() => typeof route.query.plan === 'string' ? route.query.plan : '')
const types: Record<string, SaasKey> = {
  offer: 'offer', privacy: 'privacy', 'tariff-policy': 'tariffPolicy',
  'acceptable-use': 'acceptableUse', 'personal-data-consent': 'personalConsent',
}
const legalForLocale = computed(() => legal.value)
function legalName(type: string) { return types[type] ? tr(types[type]) : type }
async function csrf() {
  const prefix = import.meta.env.VITE_BACKEND_PREFIX || ''
  await requestJson<void>(prefix + '/sanctum/csrf-cookie')
}
async function refreshLegal() {
  const terms = await apiRequest<{ data: LegalRow[]; ready: boolean }>(
    '/public/legal/required?locale=' + serverLocale.value + '&jurisdiction=' + jurisdiction.value)
  legal.value = terms.data || []
  legalReady.value = terms.ready === true && legal.value.length === 5
  accepted.value = false
}
async function setup() {
  checking.value = true
  try {
    const c = await apiRequest<{ registration_enabled: boolean }>('/public/capabilities')
    enabled.value = c.registration_enabled === true
    await refreshLegal()
  } catch { error.value = tr('failedLoad') }
  finally { checking.value = false }
}
onMounted(setup)
watch([serverLocale, jurisdiction], () => {
  if (step.value !== 'email') { step.value = 'email'; token.value = ''; code.value = '' }
  legalReady.value = false
  void refreshLegal().catch(() => { legalReady.value = false; error.value = tr('failedLoad') })
})
async function start() {
  if (busy.value || !enabled.value || !legalReady.value || !email.value.trim()) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    await csrf()
    await apiRequest('/public/registration/start', {
      method: 'POST', body: JSON.stringify({ email: email.value.trim(), locale: serverLocale.value, jurisdiction: jurisdiction.value, website: website.value }),
    })
    step.value = 'verify'
  } catch { error.value = tr('registrationError') }
  finally { busy.value = false }
}
async function verify() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true; error.value = ''
  try {
    await csrf()
    const result = await apiRequest<{registration_token: string}>('/public/registration/verify', {
      method: 'POST', body: JSON.stringify({ email: email.value.trim(), code: code.value }),
    })
    token.value = result.registration_token
    code.value = ''
    step.value = 'company'
  } catch { error.value = tr('registrationError') }
  finally { busy.value = false }
}
async function complete() {
  if (busy.value || !accepted.value || password.value !== passwordConfirmation.value) return
  busy.value = true; error.value = ''
  try {
    await csrf()
    await apiRequest('/public/registration/complete', {
      method: 'POST', body: JSON.stringify({
        email: email.value.trim(), registration_token: token.value, name: name.value.trim(),
        company: company.value.trim(), password: password.value,
        password_confirmation: passwordConfirmation.value,
        accepted_legal_ids: legalForLocale.value.map(row => row.id),
        locale: serverLocale.value, jurisdiction: jurisdiction.value,
        plan_code: selectedPlan.value || null,
      }),
    })
    token.value = ''; password.value = ''; passwordConfirmation.value = ''
    step.value = 'done'
  } catch { error.value = tr('registrationError') }
  finally { busy.value = false }
}
function back() { error.value = ''; if (step.value === 'verify') step.value = 'email'; else if (step.value === 'company') step.value = 'verify' }
</script>
<template>
  <div class="registration-screen">
    <nav class="breadcrumb"><RouterLink :to="{ name: 'public.home' }">{{ tr('home') }}</RouterLink><span>/</span><span>{{ tr('registration') }}</span></nav>
    <section class="registration-card">
      <header><span class="register-icon"><MailCheck v-if="step==='email' || step==='verify'" :size="25" /><Building2 v-else-if="step==='company'" :size="25" /><CheckCircle2 v-else :size="25" /></span>
        <h1>{{ tr('registration') }}</h1><p>{{ step === 'done' ? tr('registrationSuccess') : tr('step2') }}</p>
      </header>
      <p v-if="selectedPlan" class="chosen-plan">{{ tr('plan') }}: {{ selectedPlan }}</p>
      <p v-if="locale!==serverLocale" class="chosen-plan">{{tr('legalLanguageFallback')}}</p>
      <p v-if="checking" role="status">{{ tr('loading') }}</p>
      <div v-else-if="!enabled" class="register-alert" role="status">{{ tr('unavailableRegistration') }}</div>
      <template v-else-if="!legalReady"><div class="register-alert" role="status">{{ tr('legalPending') }}</div><label class="jurisdiction-choice">{{ tr('jurisdiction') }}<select v-model="jurisdiction"><option value="KZ">{{ tr('countryKZ') }}</option><option value="GE">{{ tr('countryGE') }}</option></select></label></template>
      <template v-else>
        <div class="register-progress" aria-hidden="true"><span :class="{ done: step !== 'email' }"></span><span :class="{ done: step === 'company' || step === 'done' }"></span><span :class="{ done: step === 'done' }"></span></div>
        <p v-if="error" role="alert" class="register-alert">{{ error }}</p>
        <form v-if="step==='email'" @submit.prevent="start">
          <label>{{ tr('jurisdiction') }}<select v-model="jurisdiction"><option value="KZ">{{ tr('countryKZ') }}</option><option value="GE">{{ tr('countryGE') }}</option></select></label>
          <label>{{ tr('email') }}<input v-model.trim="email" required type="email" autocomplete="email" maxlength="254" /></label>
          <input v-model="website" class="robot-check" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button type="submit" :disabled="busy">{{ busy ? tr('loading') : tr('sendCode') }}</button>
        </form>
        <form v-else-if="step==='verify'" @submit.prevent="verify">
          <p class="email-hint">{{ email }}</p>
          <label>{{ tr('code') }}<input v-model.trim="code" required type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" /></label>
          <button type="submit" :disabled="busy || code.length !== 6">{{ busy ? tr('loading') : tr('verifyCode') }}</button>
          <button type="button" class="back-button" @click="back">{{ tr('back') }}</button>
        </form>
        <form v-else-if="step==='company'" @submit.prevent="complete">
          <label>{{ tr('accountName') }}<input v-model.trim="name" required minlength="2" maxlength="120" autocomplete="name" /></label>
          <label>{{ tr('companyName') }}<input v-model.trim="company" required minlength="2" maxlength="200" autocomplete="organization" /></label>
          <label>{{ tr('password') }}<input v-model="password" required type="password" minlength="12" autocomplete="new-password" /></label>
          <label>{{ tr('confirmPassword') }}<input v-model="passwordConfirmation" required type="password" minlength="12" autocomplete="new-password" /></label>
          <label class="consent-check"><input v-model="accepted" type="checkbox" required /><span>{{ tr('acceptTerms') }}</span></label>
          <ul class="legal-links"><li v-for="document in legalForLocale" :key="document.type">
            <RouterLink target="_blank" rel="noopener" :to="{ name: 'public.legal', params: { type: document.type }, query: { jurisdiction } }">{{ legalName(document.type) }}</RouterLink>
          </li></ul>
          <button type="submit" :disabled="busy || !accepted || password !== passwordConfirmation">{{ busy ? tr('loading') : tr('finishRegistration') }}</button>
          <button type="button" class="back-button" @click="back">{{ tr('back') }}</button>
        </form>
        <div v-else-if="step==='done'" class="register-done">
          <LockKeyhole :size="42" /><p>{{ tr('registrationSuccess') }}</p>
          <button type="button" @click="router.push('/login')">{{ tr('login') }}</button>
        </div>
      </template>
    </section>
  </div>
</template>
<style scoped>
.registration-screen{max-width:1240px;margin:auto;padding:40px 20px 90px;min-height:66vh;box-sizing:border-box}
.breadcrumb{display:flex;gap:12px;font-size:13px;color:#668491;margin-bottom:24px}.breadcrumb a{color:inherit;text-decoration:none}
.registration-card{max-width:520px;margin:0 auto;padding:42px;background:white;border:1px solid #dce9ef;border-radius:14px;box-shadow:0 15px 45px #19496310}
.registration-card header{text-align:center;margin-bottom:26px}.registration-card h1{font-size:28px;font-weight:650;letter-spacing:-.025em;margin:17px 0 8px}
.registration-card header p{font-size:14px;color:#718b96;margin:0}.register-icon{margin:auto;display:grid;place-items:center;height:56px;width:56px;background:#e6f6fc;color:#009cde;border-radius:12px}
.chosen-plan{background:#eef8fc;padding:12px;border-radius:7px;font-size:13px}
.register-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:20px 0 27px}.register-progress span{height:5px;background:#dfebf1;border-radius:4px}.register-progress .done{background:#009cde}
form{display:grid;gap:17px}.registration-card label{display:grid;gap:8px;font-size:13px;font-weight:550}
.registration-card select{width:100%;height:43px;border:1px solid #d7e5ec;border-radius:7px;background:white;color:inherit;font:inherit;padding:9px 12px}
.jurisdiction-choice{display:grid;gap:8px;margin-top:18px;font-size:13px}
.registration-card input:not([type=checkbox]){box-sizing:border-box;width:100%;min-height:43px;border:1px solid #d7e5ec;background:white;border-radius:7px;padding:9px 12px;font:inherit;font-size:14px;color:#1b3b47}
.registration-card input:focus{outline:2px solid #8fdcf6;outline-offset:1px}
.registration-card form>button,.register-done button{border:1px solid #009cde;border-radius:7px;background:#009cde;color:white;font:inherit;font-size:14px;min-height:44px;cursor:pointer}
.registration-card button:disabled{opacity:.5;cursor:not-allowed}.registration-card form>.back-button{background:white;border-color:#d3e5ec;color:#2476a0}
.register-alert{padding:15px;background:#f4f7fa;color:#516e7c;border:1px solid #dfebf1;border-radius:8px;font-size:14px;line-height:1.5}
.email-hint{color:#597b8b;font-size:14px}.consent-check{display:flex!important;align-items:flex-start;gap:10px!important;line-height:1.5}.consent-check input{margin:3px 0}
.legal-links{display:flex;flex-wrap:wrap;gap:6px 15px;list-style:none;padding:0;margin:-7px 0 4px}.legal-links a{font-size:12px;color:#007faf}
.register-done{text-align:center}.register-done svg{color:#009cde}.register-done button{width:100%;margin-top:15px}.robot-check{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important}
@media(max-width:620px){.registration-screen{padding:25px 15px 60px}.registration-card{padding:26px 19px}}
</style>
