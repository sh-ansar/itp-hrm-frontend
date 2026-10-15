<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, RefreshCw } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BasePagination from './ui/BasePagination.vue'
import BaseStatusPill from './ui/BaseStatusPill.vue'
import EmployeeLookupField from './EmployeeLookupField.vue'
import { useBonusWorkflowI18n } from '../i18n/bonusWorkflow'
import { localTodayISO } from '../utils/localDate'
import { useSessionStore } from '../stores/session'
import { useUiFormatters } from '../composables/useUiFormatters'
import { ApiError } from '../api/client'
import {
  getEmployeeBonuses, createEmployeeBonus, updateEmployeeBonus, transitionEmployeeBonus,
  type EmployeeBonusRecord, type BonusInput, type BonusKind,
} from '../api/bonuses'

const props = defineProps<{ companyId: string }>()
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const { t } = useBonusWorkflowI18n()
const fmt = useUiFormatters()
const session = useSessionStore()

const available = ref(false)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const info = ref('')
const rows = ref<EmployeeBonusRecord[]>([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const canApprove = ref(false)
const editorOpen = ref(false)
const editing = ref<EmployeeBonusRecord | null>(null)
const rejecting = ref<EmployeeBonusRecord | null>(null)
const rejectReason = ref('')
const employeeId = ref('')
const kind = ref<BonusKind>('performance')
const awardOn = ref('')
const amount = ref('')
const currency = ref('KZT')
const basis = ref('')
const note = ref('')
const requestKey = ref(crypto.randomUUID())
let generation = 0

const kindOptions = computed(() => ([
  { id: 'one_time', name: t('one_time') },
  { id: 'performance', name: t('performance') },
  { id: 'holiday', name: t('holiday') },
  { id: 'other', name: t('other') },
]))
const currencyOptions = [
  { id: 'KZT', name: 'KZT' }, { id: 'GEL', name: 'GEL' },
  { id: 'USD', name: 'USD' }, { id: 'EUR', name: 'EUR' }, { id: 'RUB', name: 'RUB' },
]
const myId = computed(() => String(session.user?.id ?? ''))
function bonusLabel(row: EmployeeBonusRecord): string {
  return t(row.bonus_kind)
}
function personName(row: EmployeeBonusRecord): string {
  return [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ') || row.personnel_number || row.employee_id
}
function canDecide(row: EmployeeBonusRecord): boolean {
  return row.status === 'submitted'
    && canApprove.value
    && String(row.created_by_user_id) !== myId.value
    && String(row.submitted_by_user_id) !== myId.value
}
async function load() {
  const current = ++generation
  rows.value = []
  error.value = ''
  if (!props.companyId || demoMode) {
    available.value = false
    loading.value = false
    return
  }
  loading.value = true
  try {
    const result = await getEmployeeBonuses(props.companyId, page.value)
    if (current !== generation) return
    available.value = true
    rows.value = result.data
    canApprove.value = result.meta.can_approve
    page.value = result.meta.current_page
    lastPage.value = result.meta.last_page
    total.value = result.meta.total
  } catch (cause) {
    if (current !== generation) return
    available.value = false
    if (cause instanceof ApiError && cause.status === 404) return
    error.value = cause instanceof ApiError && cause.status === 403 ? t('denied') : t('error')
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(() => props.companyId, () => {
  page.value = 1
  editorOpen.value = false
  rejecting.value = null
  void load()
}, { immediate: true })

function createNew() {
  editing.value = null
  employeeId.value = ''
  kind.value = 'performance'
  awardOn.value = localTodayISO()
  amount.value = ''
  currency.value = 'KZT'
  basis.value = ''
  note.value = ''
  requestKey.value = crypto.randomUUID()
  error.value = ''
  editorOpen.value = true
}
function openEdit(row: EmployeeBonusRecord) {
  if (row.status !== 'draft') return
  editing.value = row
  employeeId.value = row.employee_id
  kind.value = row.bonus_kind
  awardOn.value = row.award_on
  amount.value = row.amount
  currency.value = row.currency
  basis.value = row.basis_reference
  note.value = row.note ?? ''
  error.value = ''
  editorOpen.value = true
}
function failed(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 409) error.value = t('conflict')
  else if (cause instanceof ApiError && cause.status === 403) error.value = t('denied')
  else if (cause instanceof ApiError && cause.status === 422) error.value = t('validate')
  else error.value = t('error')
}
async function save() {
  if (busy.value || !available.value) return
  const sum = amount.value.trim()
  if (!employeeId.value || !awardOn.value || !/^\d{1,12}(\.\d{1,2})?$/.test(sum)
      || Number(sum) <= 0 || !basis.value.trim()) {
    error.value = t('validate')
    return
  }
  const data: BonusInput = {
    employee_id: employeeId.value,
    bonus_kind: kind.value,
    award_on: awardOn.value,
    amount: sum,
    currency: currency.value,
    basis_reference: basis.value.trim(),
    note: note.value.trim() || null,
  }
  busy.value = true
  error.value = ''
  try {
    if (editing.value) await updateEmployeeBonus(props.companyId, editing.value, data)
    else await createEmployeeBonus(props.companyId, data, requestKey.value)
    info.value = t('saved')
    editorOpen.value = false
    page.value = 1
    await load()
  } catch (cause) {
    failed(cause)
  } finally {
    busy.value = false
  }
}
async function transition(row: EmployeeBonusRecord, operation: 'submit' | 'cancel' | 'approved' | 'rejected', comment: string | null = null) {
  if (busy.value || !available.value) return
  if (operation === 'rejected' && !comment?.trim()) { error.value = t('rejectReason'); return }
  if (!window.confirm(t('confirm'))) return
  busy.value = true
  error.value = ''
  try {
    await transitionEmployeeBonus(props.companyId, row, operation, comment)
    info.value = t(operation === 'submit' ? 'sent' : operation === 'approved' ? 'approvedNotice'
      : operation === 'rejected' ? 'rejectedNotice' : 'cancelledNotice')
    rejecting.value = null
    rejectReason.value = ''
    await load()
  } catch (cause) {
    failed(cause)
  } finally {
    busy.value = false
  }
}
function setPage(value: number) {
  if (busy.value || value < 1 || value > lastPage.value) return
  page.value = value
  void load()
}
</script>

<template>
  <BaseCard class="bonus-panel">
    <div class="bonus-heading">
      <div>
        <h2>{{ t('title') }}</h2>
        <p>{{ t('description') }}</p>
      </div>
      <div class="bonus-heading-actions">
        <BaseButton v-if="available" :disabled="busy || loading" @click="createNew">
          <Plus :size="16" /> {{ t('new') }}
        </BaseButton>
        <BaseButton v-if="available" variant="secondary" :disabled="busy || loading" @click="load">
          <RefreshCw :size="16" /> {{ t('refresh') }}
        </BaseButton>
      </div>
    </div>
    <BaseNotice v-if="demoMode" tone="info">{{ t('demo') }}</BaseNotice>
    <BaseNotice v-else-if="!available && !error && !loading" tone="info">{{ t('unavailable') }}</BaseNotice>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="info" tone="success">{{ info }}</BaseNotice>
    <p class="bonus-explanation">{{ t('noPayment') }}</p>
    <template v-if="available">
      <div class="bonus-list-heading">
        <h3>{{ t('list') }}</h3><span>{{ total }}</span>
      </div>
      <p v-if="loading" class="bonus-explanation">{{ t('saving') }}</p>
      <p v-else-if="!rows.length" class="bonus-explanation">{{ t('noRecords') }}</p>
      <div v-else class="bonus-list">
        <article v-for="row in rows" :key="row.id" class="bonus-row">
          <div class="bonus-details">
            <strong>{{ personName(row) }}</strong>
            <p>{{ bonusLabel(row) }} · {{ fmt.date(row.award_on) }}</p>
            <p class="bonus-money">{{ row.amount }} {{ row.currency }}</p>
            <small>{{ t('by') }}: {{ row.basis_reference }}</small>
            <p v-if="row.decision_comment" class="bonus-decision">{{ t('decisionComment') }}: {{ row.decision_comment }}</p>
          </div>
          <div class="bonus-row-side">
            <BaseStatusPill :tone="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : row.status === 'submitted' ? 'warning' : 'info'">
              {{ t(row.status) }}
            </BaseStatusPill>
            <div class="bonus-row-actions">
              <BaseButton v-if="row.status === 'draft'" variant="secondary" :disabled="busy" @click="openEdit(row)">{{ t('edit') }}</BaseButton>
              <BaseButton v-if="row.status === 'draft'" :disabled="busy" @click="transition(row, 'submit')">{{ t('submit') }}</BaseButton>
              <BaseButton v-if="['draft','submitted'].includes(row.status)" variant="secondary" :disabled="busy"
                @click="transition(row, 'cancel')">{{ t('cancel') }}</BaseButton>
              <template v-if="canDecide(row)">
                <BaseButton :disabled="busy" @click="transition(row, 'approved')">{{ t('approve') }}</BaseButton>
                <BaseButton variant="secondary" :disabled="busy" @click="rejectReason = ''; rejecting = row">{{ t('reject') }}</BaseButton>
              </template>
            </div>
          </div>
        </article>
      </div>
      <BasePagination :page="page" :last-page="lastPage" :loading="loading || busy"
        :caption="t('pagination')" @previous="setPage(page - 1)" @next="setPage(page + 1)"
        @select-page="setPage($event)" />
    </template>
  </BaseCard>

  <BaseDrawer :open="editorOpen" :title="editing ? t('edit') : t('new')" :close-label="t('close')"
    :description="t('noPayment')" @close="!busy && (editorOpen = false)">
    <form class="bonus-form" @submit.prevent="save">
      <div v-if="editing" class="bonus-selected-employee">
        <strong>{{ t('employee') }}</strong>
        <span>{{ personName(editing) }}</span>
      </div>
      <EmployeeLookupField v-else v-model="employeeId" :company-id="companyId" required :disabled="busy" />
      <BaseSelectField v-model="kind" :label="t('kind')" :options="kindOptions" required :disabled="busy" />
      <BaseFormField v-model="awardOn" type="date" :label="t('awardOn')" required :disabled="busy" />
      <div class="bonus-money-fields">
        <BaseFormField v-model="amount" type="number" :label="t('amount')" required :disabled="busy" />
        <BaseSelectField v-model="currency" :label="t('currency')" :options="currencyOptions" required :disabled="busy" />
      </div>
      <BaseFormField v-model="basis" :label="t('basis')" :placeholder="t('basisPlaceholder')" required :disabled="busy" />
      <label class="bonus-textarea"><span>{{ t('note') }}</span>
        <textarea v-model="note" rows="4" maxlength="2000" :disabled="busy" :placeholder="t('notePlaceholder')" />
      </label>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="editorOpen = false">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="busy" @click="save">{{ busy ? t('saving') : t('save') }}</BaseButton>
    </template>
  </BaseDrawer>

  <BaseDrawer :open="!!rejecting" :title="t('reject')" :close-label="t('close')"
    :description="t('rejectReason')" @close="!busy && (rejecting = null)">
    <label class="bonus-textarea"><span>{{ t('reason') }}</span>
      <textarea v-model="rejectReason" rows="5" maxlength="2000" :disabled="busy" />
    </label>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="rejecting = null">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="busy || !rejectReason.trim()" @click="rejecting && transition(rejecting, 'rejected', rejectReason)">{{ t('reject') }}</BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.bonus-panel{min-width:0}
.bonus-heading{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.bonus-heading h2{font-size:17px;margin:0;color:var(--color-text)}
.bonus-heading p{margin:5px 0 0;font-size:12px;color:var(--color-muted);line-height:1.5}
.bonus-heading-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.bonus-explanation{margin:13px 0;color:var(--color-muted);font-size:12px;line-height:1.5}
.bonus-list-heading{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--color-stroke);padding-top:16px}
.bonus-list-heading h3{margin:0;font-size:14px;color:var(--color-text)}
.bonus-list-heading span{font-size:12px;color:var(--color-muted)}
.bonus-list{display:grid;gap:9px;margin-top:13px}
.bonus-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border:1px solid var(--color-stroke);background:var(--color-surface-raised);padding:13px;border-radius:var(--radius-sm);min-width:0}
.bonus-details{min-width:0}
.bonus-details strong{color:var(--color-text);font-size:14px}
.bonus-details p{margin:5px 0;color:var(--color-muted);font-size:12px}
.bonus-details .bonus-money{color:var(--color-text);font-size:17px;font-weight:750;font-variant-numeric:tabular-nums}
.bonus-details small{font-size:11px;color:var(--color-muted);overflow-wrap:anywhere}
.bonus-details .bonus-decision{color:var(--color-warning)}
.bonus-row-side{display:grid;justify-items:end;gap:12px;min-width:0}
.bonus-row-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:5px}
.bonus-form{display:grid;gap:14px}
.bonus-money-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,150px);gap:10px}
.bonus-textarea{display:grid;gap:7px;font-size:12px;color:var(--color-text)}
.bonus-textarea textarea{width:100%;min-height:98px;resize:vertical;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text);font:inherit;padding:10px}
.bonus-selected-employee{display:grid;gap:6px;font-size:12px;color:var(--color-text)}
@media(max-width:700px){.bonus-row{display:grid}.bonus-row-side{justify-items:start}.bonus-row-actions{justify-content:flex-start}}
@media(max-width:440px){.bonus-heading-actions{width:100%}.bonus-heading-actions :deep(.base-button){flex:1}.bonus-money-fields{grid-template-columns:minmax(0,1fr)}}
</style>
