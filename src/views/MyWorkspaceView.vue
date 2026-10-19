<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { useUiPreferencesStore } from '../stores/uiPreferences'
import { useLeaveWorkflowI18n } from '../i18n/leaveWorkflow'
import { getOwnWorkspace, saveOwnLeave, transitionOwnLeave, type OwnWorkspace, type OwnRequest } from '../api/selfService'

const access = useCompanyAccessStore()
const ui = useUiPreferencesStore()
const { t } = useLeaveWorkflowI18n()
const copy = computed(() => ({
  ru: ['Мой кабинет', 'Мои отпуска', 'Мои заявки', 'Подать заявку', 'Учётная запись не связана с сотрудником. Обратитесь к администратору компании.', 'Настройки', 'Нет отпусков', 'Компания', 'Предыдущая', 'Следующая'],
  kk: ['Менің кабинетім', 'Менің демалыстарым', 'Менің өтінімдерім', 'Өтінім беру', 'Тіркелгі қызметкермен байланыстырылмаған. Компания әкімшісіне хабарласыңыз.', 'Баптаулар', 'Демалыстар жоқ', 'Компания', 'Алдыңғы', 'Келесі'],
  en: ['My workspace', 'My leave', 'My requests', 'Request leave', 'Your account is not linked to an employee. Contact your company administrator.', 'Settings', 'No leave records', 'Company', 'Previous', 'Next'],
  ka: ['ჩემი კაბინეტი', 'ჩემი შვებულებები', 'ჩემი მოთხოვნები', 'მოთხოვნის გაგზავნა', 'ანგარიში თანამშრომელთან არ არის დაკავშირებული. მიმართეთ კომპანიის ადმინისტრატორს.', 'პარამეტრები', 'შვებულებები არ არის', 'კომპანია', 'წინა', 'შემდეგი'],
}[ui.locale]))
const workspace = ref<OwnWorkspace | null>(null)
const loading = ref(false), busy = ref(false), error = ref(''), success = ref('')
const open = ref(false), editing = ref<OwnRequest>()
const type = ref(''), start = ref(''), end = ref(''), note = ref('')
const requestsPage = ref(1), leavesPage = ref(1)
let generation = 0
async function load() {
  const current = ++generation
  workspace.value = null; error.value = ''; loading.value = true
  try {
    const result = await getOwnWorkspace(access.activeCompanyId, requestsPage.value, leavesPage.value)
    if (current === generation) workspace.value = result
  } catch (cause) { if (current === generation) error.value = cause instanceof Error ? cause.message : t('failed') }
  finally { if (current === generation) loading.value = false }
}
watch(() => access.activeCompanyId, () => { open.value = false; requestsPage.value = 1; leavesPage.value = 1; void load() }, { immediate: true })
watch([requestsPage, leavesPage], () => void load())
function edit(request?: OwnRequest) {
  editing.value = request; type.value = request?.leave_type_id ?? ''
  start.value = request?.planned_started_on ?? ''; end.value = request?.planned_ended_on ?? ''; note.value = request?.note ?? ''
  error.value = ''; success.value = ''; open.value = true
}
async function perform(action: () => Promise<unknown>) {
  if (busy.value) return
  busy.value = true; error.value = ''; success.value = ''
  try { await action(); open.value = false; await load(); if (!error.value) success.value = t('saved') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : t('failed') }
  finally { busy.value = false }
}
function save() {
  if (!type.value || !start.value || !end.value || end.value < start.value) { error.value = t('checkFields'); return }
  void perform(() => saveOwnLeave(access.activeCompanyId, { leave_type_id: type.value, planned_started_on: start.value, planned_ended_on: end.value, note: note.value || null }, editing.value))
}
function status(request: OwnRequest) {
  return t(request.status === 'submitted' ? 'awaiting' : request.status)
}
</script>

<template>
  <section class="own-workspace">
    <header><h1>{{ copy[0] }}</h1><RouterLink to="/settings">{{ copy[5] }}</RouterLink></header>
    <BaseSelectField v-if="access.companies.length > 1" :model-value="access.activeCompanyId" :label="copy[7] ?? ''"
      :options="access.companies.map(c => ({ id: c.company_id, name: c.company_name }))" @update:model-value="access.chooseCompany" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <p v-if="loading" role="status">{{ t('saving') }}</p>
    <BaseButton v-if="error && !open" variant="secondary" @click="load">{{ t('refresh') }}</BaseButton>
    <template v-if="workspace">
      <BaseNotice v-if="!workspace.data.employee">{{ copy[4] }}</BaseNotice>
      <template v-else>
        <BaseCard><h2>{{ workspace.data.employee.last_name }} {{ workspace.data.employee.first_name }} {{ workspace.data.employee.middle_name }}</h2>
          <p>{{ workspace.data.employee.personnel_number }} · {{ access.active?.company_name }}</p></BaseCard>
        <BaseCard>
          <header><h2>{{ copy[2] }}</h2><BaseButton v-if="workspace.meta.can_request" :disabled="busy || !workspace.data.leave_types.length" @click="edit()">{{ copy[3] }}</BaseButton></header>
          <BaseNotice v-if="workspace.meta.can_request && !workspace.data.leave_types.length">{{ t('noTypes') }}</BaseNotice>
          <p v-if="!workspace.data.requests.length">{{ t('noRequests') }}</p>
          <article v-for="request in workspace.data.requests" :key="request.id">
            <strong>{{ request.leave_type_name }}</strong><p>{{ request.planned_started_on }} — {{ request.planned_ended_on }} · {{ request.planned_days }} · {{ status(request) }}</p>
            <p v-if="request.note">{{ request.note }}</p><p v-if="request.decision_comment">{{ t('decisionComment') }}: {{ request.decision_comment }}</p>
            <div v-if="workspace.meta.can_request" class="actions">
              <BaseButton v-if="request.status === 'draft'" variant="secondary" :disabled="busy" @click="edit(request)">{{ t('edit') }}</BaseButton>
              <BaseButton v-if="request.status === 'draft'" :disabled="busy" @click="perform(() => transitionOwnLeave(access.activeCompanyId, request, 'submit'))">{{ t('submit') }}</BaseButton>
              <BaseButton v-if="['draft', 'submitted'].includes(request.status)" variant="secondary" :disabled="busy" @click="perform(() => transitionOwnLeave(access.activeCompanyId, request, 'cancel'))">{{ t('cancel') }}</BaseButton>
            </div>
          </article>
          <div class="actions"><BaseButton :disabled="loading || requestsPage === 1" variant="secondary" @click="requestsPage--">{{ copy[8] }}</BaseButton>
            <span>{{ requestsPage }} / {{ workspace.meta.requests_last_page }}</span><BaseButton :disabled="loading || requestsPage >= workspace.meta.requests_last_page" variant="secondary" @click="requestsPage++">{{ copy[9] }}</BaseButton></div>
        </BaseCard>
        <BaseCard><h2>{{ copy[1] }}</h2><p v-if="!workspace.data.leaves.length">{{ copy[6] }}</p>
          <article v-for="leave in workspace.data.leaves" :key="leave.id"><strong>{{ leave.leave_type_name }}</strong>
            <p>{{ leave.planned_started_on }} — {{ leave.planned_ended_on }} · {{ leave.planned_days }}</p>
            <p v-if="leave.actual_started_on">{{ leave.actual_started_on }} — {{ leave.actual_ended_on ?? '…' }} · {{ leave.actual_days ?? '—' }}</p></article>
          <div class="actions"><BaseButton :disabled="loading || leavesPage === 1" variant="secondary" @click="leavesPage--">{{ copy[8] }}</BaseButton>
            <span>{{ leavesPage }} / {{ workspace.meta.leaves_last_page }}</span><BaseButton :disabled="loading || leavesPage >= workspace.meta.leaves_last_page" variant="secondary" @click="leavesPage++">{{ copy[9] }}</BaseButton></div>
        </BaseCard>
      </template>
    </template>
    <BaseDrawer :open="open" :title="copy[3] ?? ''" @close="!busy && (open = false)">
      <form id="own-leave-form" class="own-form" @submit.prevent="save">
        <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
        <BaseSelectField v-model="type" :label="t('type')" :options="workspace?.data.leave_types ?? []" :required="true" :disabled="busy" :placeholder="t('type')" />
        <BaseFormField v-model="start" :label="t('start')" type="date" required :disabled="busy" />
        <BaseFormField v-model="end" :label="t('end')" type="date" required :disabled="busy" />
        <BaseFormField v-model="note" :label="t('reason')" :disabled="busy" />
        <p>{{ t('help') }}</p>
      </form>
      <template #footer><BaseButton variant="secondary" :disabled="busy" @click="open = false">{{ t('close') }}</BaseButton>
        <BaseButton type="submit" form="own-leave-form" :disabled="busy">{{ editing ? t('updateDraft') : t('saveDraft') }}</BaseButton></template>
    </BaseDrawer>
  </section>
</template>
<style scoped>
.own-workspace,.own-form{display:grid;gap:var(--space-4);min-width:0}
header,.actions{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}
h1,h2,p{overflow-wrap:anywhere}h2{font-size:var(--font-body-size)}
article{padding:var(--space-4) 0;border-top:1px solid var(--color-stroke)}
.actions{justify-content:flex-start}a{color:var(--color-primary)}
</style>