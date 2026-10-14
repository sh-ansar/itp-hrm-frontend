<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import { useAppI18n } from '../i18n'

const router = useRouter()
const { t } = useAppI18n()
const storageKey = 'hrm-onboarding-complete-v1'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const step = ref(1)
const saved = ref(false)

const lastName = ref(demoMode ? 'Ибраева' : '')
const firstName = ref(demoMode ? 'Алия' : '')
const middleName = ref(demoMode ? 'Сериковна' : '')
const email = ref(demoMode ? 'a.ibraeva@company.local' : '')
const phone = ref(demoMode ? '+7 701 555 21 10' : '')
const gender = ref(demoMode ? 'female' : '')
const department = ref(demoMode ? 'Департамент по работе с персоналом' : '')
const position = ref(demoMode ? 'HR бизнес-партнёр' : '')
const office = ref(demoMode ? 'Астана, головной офис' : '')
const startDate = ref(demoMode ? '2026-10-01' : '')

const workplaceChecks = ref({
  corporateEmail: true,
  messenger: true,
  hrmAccess: true,
  sharedFolders: true,
  laptop: true,
  workplace: true,
  pass: false,
  phone: false,
})
const responsibilityChecks = ref({
  confidentiality: false,
  informationSecurity: false,
  internalPolicies: false,
})

const steps = computed(() => [
  { id: 1, label: t('onboarding.stepPersonal') },
  { id: 2, label: t('onboarding.stepWorkplace') },
  { id: 3, label: t('onboarding.stepResponsibility') },
])
const genderOptions = computed(() => [
  { id: 'female', name: t('onboarding.female') },
  { id: 'male', name: t('onboarding.male') },
])
const workplaceComplete = computed(() =>
  workplaceChecks.value.corporateEmail
  && workplaceChecks.value.messenger
  && workplaceChecks.value.hrmAccess
  && workplaceChecks.value.sharedFolders
  && workplaceChecks.value.laptop
  && workplaceChecks.value.workplace,
)
const responsibilityComplete = computed(() =>
  Object.values(responsibilityChecks.value).every(Boolean),
)
const canContinue = computed(() => {
  if (step.value === 1) return Boolean(lastName.value.trim() && firstName.value.trim() && email.value.trim())
  if (step.value === 2) return workplaceComplete.value
  return responsibilityComplete.value
})

function next() {
  saved.value = false
  if (!canContinue.value) return
  if (step.value < 3) step.value += 1
}
function previous() {
  saved.value = false
  if (step.value > 1) step.value -= 1
}
async function finish() {
  if (!responsibilityComplete.value) return
  try {
    localStorage.setItem(storageKey, JSON.stringify({ completedAt: new Date().toISOString() }))
  } catch { /* A blocked browser store must not block the user from continuing. */ }
  saved.value = true
  await router.push('/')
}
</script>

<template>
  <section class="onboarding-page">
    <div class="onboarding-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>{{ t('onboarding.title') }}</strong>
    </div>

    <header class="onboarding-heading">
      <h1>{{ t('onboarding.title') }}</h1>
      <p>{{ t('onboarding.intro') }}</p>
    </header>

    <ol class="onboarding-stepper" :aria-label="t('onboarding.progress')">
      <li v-for="item in steps" :key="item.id"
        :class="{ active: step === item.id, complete: step > item.id }"
        :aria-current="step === item.id ? 'step' : undefined">
        <span class="step-marker">{{ step > item.id ? '✓' : item.id }}</span>
        <span>{{ item.label }}</span>
      </li>
    </ol>

    <BaseNotice v-if="saved" tone="success">{{ t('onboarding.complete') }}</BaseNotice>

    <BaseCard v-if="step === 1" class="onboarding-card">
      <div class="section-title">
        <div class="avatar">АИ</div>
        <div>
          <h2>{{ t('onboarding.personalHeading') }}</h2>
          <p>{{ t('onboarding.personalHelp') }}</p>
        </div>
      </div>
      <div class="onboarding-grid">
        <BaseFormField v-model="lastName" :label="t('onboarding.lastName')" required />
        <BaseFormField v-model="firstName" :label="t('onboarding.firstName')" required />
        <BaseFormField v-model="middleName" :label="t('onboarding.middleName')" />
        <BaseSelectField v-model="gender" :label="t('onboarding.gender')" :options="genderOptions" />
        <BaseFormField v-model="email" :label="t('onboarding.email')" type="email" required />
        <BaseFormField v-model="phone" :label="t('onboarding.phone')" />
        <BaseFormField v-model="department" :label="t('onboarding.department')" />
        <BaseFormField v-model="position" :label="t('onboarding.position')" />
        <BaseFormField v-model="office" :label="t('onboarding.office')" />
        <BaseFormField v-model="startDate" :label="t('onboarding.startDate')" type="date" />
      </div>
    </BaseCard>

    <BaseCard v-else-if="step === 2" class="onboarding-card">
      <div class="section-title">
        <div class="section-symbol">02</div>
        <div>
          <h2>{{ t('onboarding.workplaceHeading') }}</h2>
          <p>{{ t('onboarding.workplaceHelp') }}</p>
        </div>
      </div>
      <div class="check-grid">
        <section>
          <h3>{{ t('onboarding.digitalAccess') }}</h3>
          <label><input v-model="workplaceChecks.corporateEmail" type="checkbox" /><span><strong>{{ t('onboarding.corporateEmail') }}</strong><small>{{ t('onboarding.corporateEmailHelp') }}</small></span></label>
          <label><input v-model="workplaceChecks.messenger" type="checkbox" /><span><strong>{{ t('onboarding.messenger') }}</strong><small>{{ t('onboarding.messengerHelp') }}</small></span></label>
          <label><input v-model="workplaceChecks.hrmAccess" type="checkbox" /><span><strong>ITP HRM</strong><small>{{ t('onboarding.hrmAccessHelp') }}</small></span></label>
          <label><input v-model="workplaceChecks.sharedFolders" type="checkbox" /><span><strong>{{ t('onboarding.sharedFolders') }}</strong><small>{{ t('onboarding.sharedFoldersHelp') }}</small></span></label>
        </section>
        <section>
          <h3>{{ t('onboarding.physicalWorkplace') }}</h3>
          <label><input v-model="workplaceChecks.laptop" type="checkbox" /><span><strong>{{ t('onboarding.laptop') }}</strong><small>{{ t('onboarding.laptopHelp') }}</small></span></label>
          <label><input v-model="workplaceChecks.workplace" type="checkbox" /><span><strong>{{ t('onboarding.workplace') }}</strong><small>{{ t('onboarding.workplaceHelpItem') }}</small></span></label>
          <label><input v-model="workplaceChecks.pass" type="checkbox" /><span><strong>{{ t('onboarding.pass') }}</strong><small>{{ t('onboarding.passHelp') }}</small></span></label>
          <label><input v-model="workplaceChecks.phone" type="checkbox" /><span><strong>{{ t('onboarding.workPhone') }}</strong><small>{{ t('onboarding.workPhoneHelp') }}</small></span></label>
        </section>
      </div>
      <BaseNotice v-if="!workplaceComplete" tone="info">{{ t('onboarding.requiredWorkplace') }}</BaseNotice>
    </BaseCard>

    <BaseCard v-else class="onboarding-card">
      <div class="section-title">
        <div class="section-symbol">03</div>
        <div>
          <h2>{{ t('onboarding.responsibilityHeading') }}</h2>
          <p>{{ t('onboarding.responsibilityHelp') }}</p>
        </div>
      </div>
      <div class="responsibility-list">
        <label>
          <input v-model="responsibilityChecks.confidentiality" type="checkbox" />
          <span><strong>{{ t('onboarding.confidentiality') }}</strong><small>{{ t('onboarding.confidentialityHelp') }}</small></span>
        </label>
        <label>
          <input v-model="responsibilityChecks.informationSecurity" type="checkbox" />
          <span><strong>{{ t('onboarding.informationSecurity') }}</strong><small>{{ t('onboarding.informationSecurityHelp') }}</small></span>
        </label>
        <label>
          <input v-model="responsibilityChecks.internalPolicies" type="checkbox" />
          <span><strong>{{ t('onboarding.internalPolicies') }}</strong><small>{{ t('onboarding.internalPoliciesHelp') }}</small></span>
        </label>
      </div>
    </BaseCard>

    <footer class="onboarding-actions">
      <BaseButton v-if="step > 1" variant="secondary" @click="previous">{{ t('onboarding.back') }}</BaseButton>
      <BaseButton v-if="step < 3" :disabled="!canContinue" @click="next">{{ t('onboarding.next') }}</BaseButton>
      <BaseButton v-else :disabled="!canContinue" @click="finish">{{ t('onboarding.finish') }}</BaseButton>
    </footer>
  </section>
</template>

<style scoped>
.onboarding-page{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;min-width:0;max-width:100%}
.onboarding-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;color:var(--color-muted);font-size:12px}
.onboarding-breadcrumb img{width:15px;height:15px}.onboarding-breadcrumb strong{color:var(--color-text);font-weight:500}
.onboarding-heading{display:grid;gap:5px}.onboarding-heading h1{margin:0;font-size:23px;line-height:30px;font-weight:700;letter-spacing:-.02em}.onboarding-heading p{margin:0;color:var(--color-muted);font-size:12px;line-height:18px}
.onboarding-stepper{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;list-style:none;margin:2px 0;padding:0}
.onboarding-stepper li{position:relative;display:flex;align-items:center;gap:8px;min-width:0;padding:9px 12px 9px 0;color:var(--color-muted);font-size:11px;font-weight:600}
.onboarding-stepper li:not(:last-child)::after{content:'';position:absolute;left:32px;right:0;bottom:0;height:2px;background:var(--color-stroke-strong)}
.onboarding-stepper li.active,.onboarding-stepper li.complete{color:var(--color-success)}
.onboarding-stepper li.active::after,.onboarding-stepper li.complete::after{background:var(--color-success)}
.step-marker{display:grid;place-items:center;flex:0 0 23px;width:23px;height:23px;border:1px solid currentColor;border-radius:50%;background:var(--color-surface);font-size:10px}
.onboarding-card{min-width:0}
.section-title{display:flex;align-items:center;gap:12px;margin-bottom:20px}.section-title h2{margin:0;font-size:17px;line-height:23px}.section-title p{margin:3px 0 0;color:var(--color-muted);font-size:11px;line-height:16px}
.avatar,.section-symbol{display:grid;place-items:center;flex:0 0 54px;width:54px;height:54px;border-radius:50%;background:var(--color-accent-soft);color:var(--color-primary);border:1px solid var(--color-primary-stroke);font-size:13px;font-weight:800}
.section-symbol{border-radius:10px}
.onboarding-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px}
.check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}.check-grid section{display:grid;align-content:start;gap:0}.check-grid h3{margin:0 0 8px;font-size:13px}
.check-grid label,.responsibility-list label{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;min-height:58px;padding:11px 0;border-bottom:1px solid var(--color-stroke)}
.check-grid input,.responsibility-list input{width:17px;height:17px;margin:2px 0 0;accent-color:var(--color-primary)}
.check-grid label>span,.responsibility-list label>span{display:grid;gap:3px}.check-grid strong,.responsibility-list strong{font-size:12px}.check-grid small,.responsibility-list small{color:var(--color-muted);font-size:10px;line-height:15px}
.responsibility-list{display:grid;max-width:850px}
.onboarding-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
@media(max-width:760px){
  .onboarding-stepper{grid-template-columns:1fr;gap:4px}.onboarding-stepper li{padding:5px 0}.onboarding-stepper li::after{display:none}
  .onboarding-grid,.check-grid{grid-template-columns:1fr}.section-title{align-items:flex-start}.onboarding-actions :deep(.base-button){flex:1}
}
</style>
