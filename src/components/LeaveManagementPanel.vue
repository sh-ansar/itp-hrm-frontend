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
import EmployeeLookupField from './EmployeeLookupField.vue'
import { useLeaveWorkflowI18n } from '../i18n/leaveWorkflow'
import { useLeaveCategoryI18n } from '../i18n/leaveCategory'
import { useUiFormatters } from '../composables/useUiFormatters'
import { useSessionStore } from '../stores/session'
import { ApiError } from '../api/client'
import {
  getLeaveRequests, getLeaveTypes, createLeaveRequest, updateLeaveRequest,
  createLeaveType, submitLeaveRequest, cancelLeaveRequest, decideLeaveRequest,
  type LeaveRequestRecord, type LeaveTypeRecord, type LeavePlanInput,
  type LeaveCategory, type LeaveTypeInput,
} from '../api/leaves'

const props = defineProps<{ companyId: string }>()
const emit = defineEmits<{ published: [] }>()
const { t } = useLeaveWorkflowI18n()
const { ct } = useLeaveCategoryI18n()
const fmt = useUiFormatters()
const session = useSessionStore()
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const info = ref('')
const types = ref<LeaveTypeRecord[]>([])
const requests = ref<LeaveRequestRecord[]>([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const canApprove = ref(false)
const canManageTypes = ref(false)
const editorOpen = ref(false)
const typeOpen = ref(false)
const rejectionTarget = ref<LeaveRequestRecord | null>(null)
const rejectComment = ref('')
const editing = ref<LeaveRequestRecord | null>(null)
const employeeId = ref('')
const leaveTypeId = ref('')
const startedOn = ref('')
const endedOn = ref('')
const note = ref('')
const typeCode = ref('')
const typeName = ref('')
const annualDays = ref('24')
const calculation = ref<'calendar_days' | 'working_days'>('calendar_days')
const category = ref<LeaveCategory>('ordinary')
const supportsProtectedTypes = ref(false)
let loadGeneration = 0

const typeOptions = computed(() => types.value.map(item => ({ id: item.id, name: item.name })))
const selectedEmployeeName = computed(() => editing.value
  ? [editing.value.last_name, editing.value.first_name, editing.value.middle_name].filter(Boolean).join(' ')
  : '')
const myUserId = computed(() => String(session.user?.id ?? ''))
const calcOptions = computed(() => [
  { id: 'calendar_days', name: t('calendarDays') },
  { id: 'working_days', name: t('workingDays') },
])
const categoryOptions = computed(() => ([
  { id: 'ordinary', name: ct('ordinary') },
  { id: 'maternity', name: ct('maternity') },
  { id: 'childcare', name: ct('childcare') },
  { id: 'medical', name: ct('medical') },
]))
watch(category, value => {
  if (value !== 'ordinary') {
    calculation.value = 'calendar_days'
    annualDays.value = ''
  } else if (!annualDays.value.trim()) {
    annualDays.value = '24'
  }
})
function statusLabel(status: LeaveRequestRecord['status']): string {
  return status === 'submitted' ? t('awaiting') : t(status)
}
async function load() {
  const current = ++loadGeneration
  if (!props.companyId) return
  loading.value = true
  error.value = ''
  try {
    const [kinds, records] = await Promise.all([
      getLeaveTypes(props.companyId),
      getLeaveRequests(props.companyId, page.value),
    ])
    if (current !== loadGeneration) return
    types.value = kinds.data
    // Avoid silently creating ordinary leave on old Laravel versions.
    supportsProtectedTypes.value = ['maternity', 'childcare', 'medical'].every(
      item => kinds.meta.supported_categories?.includes(item as LeaveCategory),
    )
    requests.value = records.data
    canManageTypes.value = kinds.meta.can_manage_leave_types
    canApprove.value = records.meta.can_approve_leave_requests
    page.value = records.meta.current_page
    lastPage.value = records.meta.last_page
    total.value = records.meta.total
  } catch (cause) {
    if (current !== loadGeneration) return
    error.value = cause instanceof ApiError && cause.status === 403 ? t('noPermission') : t('failed')
  } finally {
    if (current === loadGeneration) loading.value = false
  }
}
watch(() => props.companyId, () => {
  page.value = 1
  editorOpen.value = false
  typeOpen.value = false
  rejectionTarget.value = null
  category.value = 'ordinary'
  void load()
}, { immediate: true })

function openCreate() {
  editing.value = null
  employeeId.value = ''
  leaveTypeId.value = types.value[0]?.id ?? ''
  startedOn.value = ''
  endedOn.value = ''
  note.value = ''
  error.value = ''
  editorOpen.value = true
}
function openEdit(row: LeaveRequestRecord) {
  if (row.status !== 'draft') return
  editing.value = row
  employeeId.value = row.employee_id
  leaveTypeId.value = row.leave_type_id
  startedOn.value = row.planned_started_on
  endedOn.value = row.planned_ended_on
  note.value = row.note ?? ''
  error.value = ''
  editorOpen.value = true
}
function closeEditor() {
  if (busy.value) return
  editorOpen.value = false
}
function operationFailed(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 409) error.value = t('stale')
  else if (cause instanceof ApiError && cause.status === 422) error.value = t('checkFields')
  else if (cause instanceof ApiError && cause.status === 403) error.value = t('noPermission')
  else error.value = t('failed')
}
async function savePlan() {
  if (busy.value) return
  if (!employeeId.value || !leaveTypeId.value || !startedOn.value || !endedOn.value || startedOn.value > endedOn.value) {
    error.value = t('checkFields')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const payload: LeavePlanInput = {
      employee_id: employeeId.value,
      leave_type_id: leaveTypeId.value,
      planned_started_on: startedOn.value,
      planned_ended_on: endedOn.value,
      note: note.value.trim() || null,
    }
    if (editing.value) {
      await updateLeaveRequest(props.companyId, editing.value.id, payload, editing.value.revision)
    } else {
      await createLeaveRequest(props.companyId, payload)
    }
    info.value = t('saved')
    editorOpen.value = false
    page.value = 1
    await load()
  } catch (cause) {
    operationFailed(cause)
  } finally {
    busy.value = false
  }
}
async function addType() {
  if (busy.value) return
  const code = typeCode.value.trim().toLowerCase()
  if (!/^[a-z0-9_]{1,64}$/.test(code) || !typeName.value.trim()) {
    error.value = t('checkFields')
    return
  }
  const days = category.value === 'ordinary' && annualDays.value.trim()
    ? Number(annualDays.value) : null
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 366)) {
    error.value = t('checkFields')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const payload: LeaveTypeInput = {
      code, name: typeName.value.trim(), annual_days: days,
      balance_method: category.value === 'ordinary' ? calculation.value : 'calendar_days',
    }
    if (supportsProtectedTypes.value) payload.category = category.value
    await createLeaveType(props.companyId, payload)
    typeOpen.value = false
    typeName.value = ''
    typeCode.value = ''
    category.value = 'ordinary'
    info.value = t('typeSaved')
    await load()
  } catch (cause) {
    operationFailed(cause)
  } finally {
    busy.value = false
  }
}
async function transition(row: LeaveRequestRecord, action: 'submit' | 'cancel' | 'approved' | 'rejected', comment: string | null = null) {
  if (busy.value) return
  if (action === 'rejected' && !comment?.trim()) { error.value = t('rejectReason'); return }
  if (!window.confirm(t('confirmed'))) return
  busy.value = true
  error.value = ''
  try {
    if (action === 'submit') await submitLeaveRequest(props.companyId, row.id, row.revision)
    else if (action === 'cancel') await cancelLeaveRequest(props.companyId, row.id, row.revision)
    else await decideLeaveRequest(props.companyId, row.id, row.revision, action, comment?.trim() || null)
    info.value = t(action === 'submit' ? 'submitted' : action === 'cancel' ? 'cancelled' : action)
    rejectionTarget.value = null
    await load()
    if (action === 'approved') emit('published')
  } catch (cause) {
    operationFailed(cause)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseCard class="leave-management">
    <div class="leave-management-heading">
      <div>
        <h2>{{ t('title') }}</h2>
        <p>{{ t('description') }}</p>
      </div>
      <div class="leave-management-actions">
        <BaseButton v-if="canManageTypes" variant="secondary" :disabled="loading || busy"
          @click="typeOpen = true"><Plus :size="16" /> {{ t('newType') }}</BaseButton>
        <BaseButton :disabled="loading || busy || !types.length"
          @click="openCreate"><Plus :size="16" /> {{ t('newRequest') }}</BaseButton>
        <BaseButton variant="secondary" :disabled="loading || busy" @click="load">
          <RefreshCw :size="16" /> {{ t('refresh') }}</BaseButton>
      </div>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="info" tone="success">{{ info }}</BaseNotice>
    <p class="leave-management-help">{{ t('help') }}</p>
    <BaseNotice v-if="!types.length && !loading" tone="info">{{ t('noTypes') }}</BaseNotice>
    <div v-if="loading" class="leave-management-help">{{ t('saving') }}</div>
    <template v-else>
      <h3>{{ t('requests') }} ({{ total }})</h3>
      <p v-if="!requests.length" class="leave-management-help">{{ t('noRequests') }}</p>
      <div v-else class="leave-management-list">
        <article v-for="row in requests" :key="row.id" class="leave-management-row">
          <div class="leave-management-info">
            <strong>{{ [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' ') }}</strong>
            <p>{{ row.leave_type_name }} · {{ fmt.date(row.planned_started_on) }} — {{ fmt.date(row.planned_ended_on) }}</p>
            <small>{{ t('plannedDays') }}: {{ fmt.number(row.planned_days, 0) }} · {{ t('status') }}: {{ statusLabel(row.status) }}</small>
            <p v-if="row.decision_comment" class="leave-management-comment">{{ row.decision_comment }}</p>
          </div>
          <div class="leave-management-row-actions">
            <BaseButton v-if="row.status === 'draft'" variant="secondary" :disabled="busy" @click="openEdit(row)">{{ t('edit') }}</BaseButton>
            <BaseButton v-if="row.status === 'draft'" :disabled="busy" @click="transition(row, 'submit')">{{ t('submit') }}</BaseButton>
            <BaseButton v-if="['draft','submitted'].includes(row.status)" variant="secondary" :disabled="busy"
              @click="transition(row, 'cancel')">{{ t('cancel') }}</BaseButton>
            <template v-if="row.status === 'submitted' && canApprove && String(row.created_by_user_id) !== myUserId">
              <BaseButton :disabled="busy" @click="transition(row, 'approved')">{{ t('approve') }}</BaseButton>
              <BaseButton variant="secondary" :disabled="busy" @click="rejectionTarget = row">{{ t('reject') }}</BaseButton>
            </template>
          </div>
        </article>
      </div>
      <BasePagination :page="page" :last-page="lastPage" :loading="loading || busy" :caption="t('page')"
        @previous="page = Math.max(1, page - 1); load()"
        @next="page = Math.min(lastPage, page + 1); load()"
        @select-page="page = $event; load()" />
    </template>
    <p class="leave-management-help">{{ t('noOverwrite') }}</p>
  </BaseCard>

  <BaseDrawer :open="editorOpen" :title="editing ? t('edit') : t('newRequest')"
    :description="t('approvedHint')" :close-label="t('close')" @close="closeEditor">
    <form id="leave-request-editor" class="leave-form" @submit.prevent="savePlan">
      <div v-if="editing" class="leave-existing-employee"><strong>{{ t('employee') }}</strong><span>{{ selectedEmployeeName }}</span></div>
      <EmployeeLookupField v-else v-model="employeeId" :company-id="companyId" required :disabled="busy" />
      <BaseSelectField v-model="leaveTypeId" :label="t('type')" :options="typeOptions" required :disabled="busy" />
      <BaseFormField v-model="startedOn" type="date" :label="t('start')" required :disabled="busy" />
      <BaseFormField v-model="endedOn" type="date" :label="t('end')" required :disabled="busy" />
      <label class="leave-textarea"><span>{{ t('reason') }}</span><textarea v-model="note" rows="3" maxlength="2000" :disabled="busy" :placeholder="t('optional')" /></label>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <p class="leave-management-help">{{ t('help') }}</p>
    </form>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="closeEditor">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="busy" @click="savePlan">{{ busy ? t('saving') : (editing ? t('updateDraft') : t('saveDraft')) }}</BaseButton>
    </template>
  </BaseDrawer>

  <BaseDrawer :open="typeOpen" :title="t('newType')" :description="t('companyTypes')"
    :close-label="t('close')" @close="typeOpen = false">
    <div class="leave-form">
      <BaseSelectField v-if="supportsProtectedTypes" v-model="category"
        :label="ct('category')" :options="categoryOptions" :disabled="busy" />
      <BaseNotice v-if="supportsProtectedTypes && category !== 'ordinary'" tone="info">{{ ct('hint') }}</BaseNotice>
      <BaseFormField v-model="typeCode" :label="t('typeCode')" required :disabled="busy" />
      <BaseFormField v-model="typeName" :label="t('typeName')" required :disabled="busy" />
      <BaseFormField v-model="annualDays" type="number" :label="t('annualDays')"
        :disabled="busy || category !== 'ordinary'" />
      <BaseSelectField v-model="calculation" :label="t('method')" :options="calcOptions"
        :disabled="busy || category !== 'ordinary'" />
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="typeOpen = false">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="busy" @click="addType">{{ t('newType') }}</BaseButton>
    </template>
  </BaseDrawer>

  <BaseDrawer :open="!!rejectionTarget" :title="t('reject')" :description="t('rejectReason')"
    :close-label="t('close')" @close="rejectionTarget = null">
    <label class="leave-textarea"><span>{{ t('decisionComment') }}</span>
      <textarea v-model="rejectComment" rows="5" maxlength="2000" :placeholder="t('rejectReason')" />
    </label>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="rejectionTarget = null">{{ t('close') }}</BaseButton>
      <BaseButton :disabled="busy || !rejectComment.trim()" @click="rejectionTarget && transition(rejectionTarget, 'rejected', rejectComment)">{{ t('reject') }}</BaseButton>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.leave-management{min-width:0}
.leave-management-heading{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.leave-management-heading h2{margin:0;color:var(--color-text);font-size:17px}
.leave-management-heading p{margin:4px 0 0;font-size:12px;color:var(--color-muted)}
.leave-management-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.leave-management-help{margin:10px 0;color:var(--color-muted);font-size:12px;line-height:1.5}
.leave-management h3{font-size:14px;font-weight:600;color:var(--color-text);margin:14px 0 10px}
.leave-management-list{display:grid;gap:8px}
.leave-management-row{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0;border:1px solid var(--color-stroke);background:var(--color-surface-raised);padding:12px;border-radius:7px}
.leave-management-info{min-width:0}
.leave-management-info strong{font-size:13px;color:var(--color-text)}
.leave-management-info p{font-size:12px;color:var(--color-muted);margin:4px 0}
.leave-management-info small{font-size:11px;color:var(--color-text)}
.leave-management-info .leave-management-comment{color:var(--color-warning)}
.leave-management-row-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}
.leave-form{display:grid;gap:15px;min-width:0}
.leave-textarea{display:grid;gap:6px;width:100%;font-size:12px;color:var(--color-text)}
.leave-textarea textarea{width:100%;min-height:90px;resize:vertical;border:1px solid var(--color-stroke);border-radius:7px;background:var(--color-surface-raised);color:var(--color-text);font:inherit;padding:9px}
.leave-existing-employee{display:grid;gap:6px;font-size:12px;color:var(--color-text)}
@media(max-width:700px){.leave-management-row{display:grid}.leave-management-row-actions{justify-content:flex-start}}
@media(max-width:480px){.leave-management-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.leave-management-actions :deep(button){white-space:normal;height:auto;min-height:36px}.leave-management-actions :deep(button:first-child){grid-column:1/-1}}
</style>
