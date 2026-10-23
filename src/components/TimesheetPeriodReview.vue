<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import {
  getWorktimePeriod,
  transitionWorktimePeriod,
  type WorktimePeriodStatus,
  type WorktimePeriodResponse,
} from '../api/worktime'
import { ApiError } from '../api/client'

const props = defineProps<{ companyId: string; month: string }>()
const emit = defineEmits<{ status: [status: WorktimePeriodStatus | null] }>()
const period = ref<WorktimePeriodResponse | null>(null)
const pending = ref(false)
const unavailable = ref(false)
const error = ref('')
const reason = ref('')
let sequence = 0

const statusText: Record<WorktimePeriodStatus, string> = {
  draft: 'Черновик',
  submitted: 'На утверждении',
  approved: 'Утверждено · период закрыт',
}

async function refresh() {
  const current = ++sequence
  period.value = null
  error.value = ''
  unavailable.value = false
  reason.value = ''
  emit('status', null)
  if (!props.companyId || !props.month) return
  pending.value = true
  try {
    const data = await getWorktimePeriod(props.companyId, props.month)
    if (sequence !== current) return
    period.value = data
    emit('status', data.data.status)
  } catch (cause) {
    if (sequence !== current) return
    if (cause instanceof ApiError && cause.status === 404) {
      // The opt-in backend feature is absent or disabled: legacy editor stays usable.
      unavailable.value = true
    } else {
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить состояние табеля'
    }
  } finally {
    if (sequence === current) pending.value = false
  }
}

async function change(action: 'submit' | 'approve' | 'reopen') {
  if (!period.value || pending.value) return
  pending.value = true
  error.value = ''
  try {
    await transitionWorktimePeriod(
      props.companyId, props.month, period.value.data.revision, action,
      action === 'reopen' ? reason.value : undefined,
    )
    await refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось изменить состояние табеля'
    pending.value = false
  }
}

watch(() => [props.companyId, props.month], () => { void refresh() }, { immediate: true })
</script>

<template>
  <div v-if="!unavailable" class="period-review" aria-label="Согласование табельного периода">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div v-if="period" class="period-review__row">
      <div class="period-review__text">
        <strong>Согласование табеля</strong>
        <span>{{ statusText[period.data.status] }}</span>
      </div>
      <div class="period-review__actions">
        <BaseButton v-if="period.data.status === 'draft' && period.meta.can_submit"
          variant="secondary" :disabled="pending" @click="change('submit')">Отправить на утверждение</BaseButton>
        <BaseButton v-if="period.data.status === 'submitted' && period.meta.can_approve"
          :disabled="pending" @click="change('approve')">Утвердить период</BaseButton>
        <template v-if="period.data.status === 'approved' && period.meta.can_reopen">
          <label class="period-review__reason">
            <span>Причина повторного открытия</span>
            <input v-model.trim="reason" type="text" maxlength="500" minlength="5"
              placeholder="Укажите причину исправления" />
          </label>
          <BaseButton variant="secondary" :disabled="pending || reason.length < 5"
            @click="change('reopen')">Открыть для исправления</BaseButton>
        </template>
      </div>
    </div>
    <p v-if="pending && !period" class="period-review__loading" role="status">Загрузка состояния табеля…</p>
    <p v-if="period?.data.status === 'submitted' || period?.data.status === 'approved'"
      class="period-review__locked">
      Изменение табельных дней запрещено на сервере до повторного открытия.
    </p>
  </div>
</template>

<style scoped>
.period-review{display:grid;gap:8px;min-width:0;margin-bottom:12px;padding:12px 14px;
  border:1px solid var(--color-stroke);border-radius:var(--radius-md);
  background:var(--color-surface-raised)}
.period-review__row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.period-review__text{display:grid;gap:4px}
.period-review__text strong{font-size:13px;font-weight:600;color:var(--color-text)}
.period-review__text span,.period-review__locked,.period-review__loading{font-size:12px;color:var(--color-muted)}
.period-review__actions{display:flex;gap:9px;align-items:end;flex-wrap:wrap;min-width:0}
.period-review__reason{display:grid;gap:5px;min-width:180px}
.period-review__reason span{font-size:11px;color:var(--color-muted)}
.period-review__reason input{height:36px;max-width:100%;border:1px solid var(--color-stroke);
  border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-text);
  padding:0 10px;font:inherit;font-size:12px}
.period-review__reason input:focus-visible{outline:2px solid var(--color-primary);outline-offset:1px}
.period-review__locked,.period-review__loading{margin:0}
@media(max-width:650px){
  .period-review__actions{width:100%}
  .period-review__actions :deep(.base-button){width:100%}
  .period-review__reason{width:100%}
  .period-review__reason input{width:100%}
}
</style>
