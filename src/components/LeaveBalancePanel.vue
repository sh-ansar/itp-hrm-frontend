<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import EmployeeLookupField from './EmployeeLookupField.vue'
import { useLeaveBalanceCopy } from '../i18n/leaveBalances'
import {
  getEmployeeLeaveBalances, grantLeaveBalance, adjustLeaveBalance, carryLeaveBalance,
  type LeaveBalanceRow,
} from '../api/leaveBalances'

const props = defineProps<{ companyId: string; initialEmployeeId?: string; initialYear?: number }>()
const emit = defineEmits<{ changed: [] }>()
const { balanceT: t } = useLeaveBalanceCopy()
const employeeId = ref(props.initialEmployeeId ?? '')
const selectedYear = ref(String(props.initialYear ?? new Date().getFullYear()))
const yearNow = new Date().getFullYear()
const years = Array.from({ length: 9 }, (_, index) => {
  const value = String(yearNow - 5 + index)
  return { id: value, name: value }
})
const balances = ref<LeaveBalanceRow[]>([])
const previousBalances = ref<LeaveBalanceRow[]>([])
const canManage = ref(false)
const enforcement = ref(false)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const success = ref('')
let generation = 0
type Mode = 'grant' | 'adjust' | 'carry'
const editing = ref<{ mode: Mode; target: LeaveBalanceRow; source: LeaveBalanceRow | null } | null>(null)
const daysInput = ref('')
const reasonInput = ref('')
const formError = ref('')
const chosenYear = computed(() => Number(selectedYear.value))

function readable(value: number | null): string {
  return value === null ? t('unknown') : `${value} ${t('dayUnit')}`
}
function sourceFor(row: LeaveBalanceRow): LeaveBalanceRow | null {
  return previousBalances.value.find(item => item.leave_type_id === row.leave_type_id
    && item.id && item.state === 'open' && item.available_days !== null
    && item.available_days > 0 && item.pending_days === 0) ?? null
}
function canCarry(row: LeaveBalanceRow): boolean {
  return canManage.value && row.state === 'open' && !!row.id && !row.carry_from_period_id
    && sourceFor(row) !== null
}
async function load(): Promise<void> {
  const current = ++generation
  balances.value = []
  previousBalances.value = []
  error.value = ''
  if (!props.companyId || !employeeId.value || !Number.isInteger(chosenYear.value)) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [now, previous] = await Promise.all([
      getEmployeeLeaveBalances(props.companyId, employeeId.value, chosenYear.value),
      chosenYear.value > 2000
        ? getEmployeeLeaveBalances(props.companyId, employeeId.value, chosenYear.value - 1)
        : Promise.resolve(null),
    ])
    if (current !== generation) return
    balances.value = now.data
    previousBalances.value = previous?.data ?? []
    canManage.value = now.meta.can_manage
    enforcement.value = now.meta.enforcement_enabled
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : t('failed')
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(() => props.companyId, () => {
  employeeId.value = props.initialEmployeeId ?? ''
  selectedYear.value = String(props.initialYear ?? new Date().getFullYear())
  editing.value = null
  void load()
})
watch([employeeId, selectedYear], () => {
  editing.value = null
  success.value = ''
  void load()
}, { immediate: true })
function edit(mode: Mode, target: LeaveBalanceRow): void {
  if (!canManage.value || busy.value) return
  if (mode !== 'grant' && (!target.id || target.revision === null || target.state !== 'open')) return
  const source = mode === 'carry' ? sourceFor(target) : null
  if (mode === 'carry' && !source) return
  editing.value = { mode, target, source }
  daysInput.value = ''
  reasonInput.value = ''
  formError.value = ''
}
function closeEditor(): void {
  if (!busy.value) editing.value = null
}
async function save(): Promise<void> {
  if (!editing.value || !canManage.value || !employeeId.value || busy.value) return
  const context = editing.value
  const parsed = Number(daysInput.value)
  const reason = reasonInput.value.trim()
  const integer = /^-?[0-9]+$/.test(daysInput.value) && Number.isSafeInteger(parsed)
  const withinLimit = context.mode === 'grant' ? parsed >= 0 && parsed <= 366
    : context.mode === 'adjust' ? parsed !== 0 && parsed >= -366 && parsed <= 366
    : parsed >= 1 && parsed <= 366 && parsed <= (context.source?.available_days ?? 0)
  if (!integer || !withinLimit || reason.length < 5 || reason.length > 500) {
    formError.value = t('invalid')
    return
  }
  busy.value = true
  formError.value = ''
  success.value = ''
  try {
    if (context.mode === 'grant') {
      await grantLeaveBalance(props.companyId, {
        employee_id: employeeId.value,
        leave_type_id: context.target.leave_type_id,
        year: context.target.year,
        granted_days: parsed, reason,
      })
    } else if (context.mode === 'adjust' && context.target.id && context.target.revision !== null) {
      await adjustLeaveBalance(props.companyId, context.target.id, context.target.revision, parsed, reason)
    } else if (context.mode === 'carry' && context.target.id && context.target.revision !== null && context.source?.id) {
      await carryLeaveBalance(props.companyId, context.target.id, context.target.revision, context.source.id, parsed, reason)
    }
    editing.value = null
    success.value = t('success')
    await load()
    emit('changed')
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : t('failed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseCard class="leave-balances">
    <header class="leave-balances__heading">
      <div>
        <h2>{{ t('title') }}</h2>
        <p>{{ t('noAuto') }}</p>
      </div>
      <BaseSelectField v-model="selectedYear" :label="t('year')" :options="years" />
    </header>
    <EmployeeLookupField v-if="companyId" v-model="employeeId" :company-id="companyId" required />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseNotice v-if="employeeId && !error" tone="info">
      {{ enforcement ? t('enforcement') : t('inactive') }}
    </BaseNotice>
    <BaseButton v-if="error" variant="secondary" :disabled="loading" @click="load">{{ t('retry') }}</BaseButton>
    <p v-if="loading" role="status">{{ t('loading') }}</p>
    <p v-else-if="!employeeId">{{ t('selectEmployee') }}</p>
    <p v-else-if="!error && !balances.length">{{ t('noTypes') }}</p>
    <div v-else-if="!error" class="leave-balances__items">
      <section v-for="row in balances" :key="row.leave_type_id" class="leave-balances__item">
        <header>
          <h3>{{ row.leave_type_name }}</h3>
          <span>{{ t(row.state) }}</span>
        </header>
        <p v-if="row.reference_annual_days !== null" class="leave-balances__reference">
          {{ t('reference') }}: {{ readable(row.reference_annual_days) }}
        </p>
        <BaseNotice v-if="row.state === 'unconfigured'" tone="info">{{ t('missingMessage') }}</BaseNotice>
        <BaseNotice v-if="row.state === 'calendar_incomplete'" tone="info">{{ t('incompleteMessage') }}</BaseNotice>
        <BaseNotice v-if="row.state === 'closed'" tone="info">{{ t('closedExplanation') }}</BaseNotice>
        <dl class="leave-balances__figures">
          <div><dt>{{ t('grant') }}</dt><dd>{{ readable(row.granted_days) }}</dd></div>
          <div><dt>{{ t('carry') }}</dt><dd>{{ readable(row.carried_days) }}</dd></div>
          <div><dt>{{ t('adjust') }}</dt><dd>{{ readable(row.adjustment_days) }}</dd></div>
          <div><dt>{{ t('booked') }}</dt><dd>{{ readable(row.booked_days) }}</dd></div>
          <div v-if="row.actual_over_plan_days && row.actual_over_plan_days > 0">
            <dt>Факт сверх плана</dt><dd>{{ readable(row.actual_over_plan_days) }}</dd>
          </div>
          <div><dt>{{ t('pending') }}</dt><dd>{{ readable(row.pending_days) }}</dd></div>
          <div class="leave-balances__available">
            <dt>{{ t('available') }}</dt><dd>{{ readable(row.available_days) }}</dd>
          </div>
          <div v-if="row.state === 'closed'">
            <dt>{{ t('closingSnapshot') }}</dt><dd>{{ readable(row.closing_available_days) }}</dd>
          </div>
          <div v-if="row.state === 'closed'">
            <dt>{{ t('carriedOut') }}</dt><dd>{{ readable(row.carried_out_days) }}</dd>
          </div>
        </dl>
        <div v-if="canManage" class="leave-balances__actions">
          <BaseButton v-if="row.state === 'unconfigured'" variant="secondary" @click="edit('grant', row)">
            {{ t('grantAction') }}
          </BaseButton>
          <BaseButton v-if="row.state === 'open'" variant="secondary" @click="edit('adjust', row)">
            {{ t('adjustAction') }}
          </BaseButton>
          <BaseButton v-if="canCarry(row)" variant="secondary" @click="edit('carry', row)">
            {{ t('carryAction') }}
          </BaseButton>
        </div>
      </section>
    </div>
    <BaseDrawer :open="editing !== null" :title="t(editing?.mode === 'grant' ? 'grantTitle'
      : editing?.mode === 'adjust' ? 'adjustTitle' : 'carryTitle')" @close="closeEditor">
      <form v-if="editing" class="leave-balances__form" @submit.prevent="save">
        <strong>{{ editing.target.leave_type_name }} · {{ editing.target.year }}</strong>
        <p v-if="editing.mode === 'carry' && editing.source">
          {{ t('carryAvailable') }}: {{ readable(editing.source.available_days) }}
        </p>
        <BaseNotice v-if="editing.mode === 'carry'" tone="info">{{ t('yearClosed') }}</BaseNotice>
        <BaseFormField v-model="daysInput" :label="editing.mode === 'adjust' ? t('delta') : t('days')"
          type="number" required :disabled="busy" />
        <BaseFormField v-model="reasonInput" :label="t('reason')" required :disabled="busy" />
        <BaseNotice v-if="formError" tone="error">{{ formError }}</BaseNotice>
        <div class="leave-balances__actions">
          <BaseButton type="button" variant="secondary" :disabled="busy" @click="closeEditor">{{ t('cancel') }}</BaseButton>
          <BaseButton type="submit" :disabled="busy">{{ busy ? t('saving') : t('save') }}</BaseButton>
        </div>
      </form>
    </BaseDrawer>
  </BaseCard>
</template>

<style scoped>
.leave-balances{min-width:0;display:grid;gap:var(--space-4)}
.leave-balances__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap}
.leave-balances__heading h2{margin:0;font-size:var(--font-section-heading);font-weight:700}
.leave-balances__heading p{font-size:var(--font-caption-size);line-height:1.55;color:var(--color-muted);max-width:720px}
.leave-balances__heading :deep(.base-select-field){width:160px;max-width:100%}
.leave-balances__items{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--space-3)}
.leave-balances__item{display:grid;align-content:start;gap:var(--space-3);min-width:0;padding:var(--space-4);border:1px solid var(--color-stroke);border-radius:var(--radius-md)}
.leave-balances__item>header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}
.leave-balances__item h3{margin:0;font-size:var(--font-label-size)}
.leave-balances__item>header span,.leave-balances__reference{color:var(--color-muted);font-size:var(--font-caption-size)}
.leave-balances__figures{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3);margin:0}
.leave-balances__figures div{min-width:0;display:grid;gap:var(--space-1);padding:var(--space-3);background:var(--color-soft);border-radius:var(--radius-sm)}
.leave-balances__figures dt{font-size:var(--font-caption-size);color:var(--color-muted)}
.leave-balances__figures dd{margin:0;font-weight:650;color:var(--color-text);overflow-wrap:anywhere}
.leave-balances__available{border:1px solid var(--color-stroke)}
.leave-balances__actions{display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:var(--space-2)}
.leave-balances__form{display:grid;gap:var(--space-4)}
.leave-balances__form>p{margin:0;color:var(--color-muted);font-size:var(--font-caption-size)}
@media(max-width:580px){.leave-balances__heading :deep(.base-select-field){width:100%}.leave-balances__heading{display:grid}.leave-balances__actions :deep(.base-button){flex:1}}
</style>
