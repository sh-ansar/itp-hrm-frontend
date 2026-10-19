<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { ApiError } from '../api/client'
import { submitPersonnelOrder, decidePersonnelOrder } from '../api/orderApprovals'
import type { DocumentRow } from '../api/documents'
import { useOrderReviewCopy } from '../i18n/orderReview'
import { useSessionStore } from '../stores/session'

const props = defineProps<{
  companyId: string
  row: DocumentRow
  enabled: boolean
  reviewEnabled: boolean
}>()
const emit = defineEmits<{ changed: [status: string] }>()
const { orderCopy: copy } = useOrderReviewCopy()
const session = useSessionStore()
type Mode = 'submit' | 'approve' | 'reject'
const mode = ref<Mode | null>(null)
const comment = ref('')
const busy = ref(false)
const error = ref('')
const isOrder = computed(() => props.enabled && props.row.document_type === 'order')
const isAuthor = computed(() => props.row.created_by_user_id != null
  && props.row.created_by_user_id === session.user?.id)
const showSubmit = computed(() => isOrder.value && isAuthor.value && props.row.status === 'draft')
const canSubmit = computed(() => showSubmit.value && props.row.has_file
  && !!props.row.document_number && !!props.row.issued_on && !props.row.employee_visible)
const showReview = computed(() => isOrder.value && props.reviewEnabled
  && props.row.status === 'submitted' && session.user?.id !== props.row.created_by_user_id
  && session.user?.id !== props.row.submitted_by_user_id)
const prompt = computed(() => mode.value === 'submit' ? copy.value.submitQuestion
  : mode.value === 'approve' ? copy.value.approveQuestion : copy.value.rejectQuestion)
const valid = computed(() => mode.value !== 'reject' || comment.value.trim().length >= 5)

function open(next: Mode): void {
  if (busy.value) return
  mode.value = next
  comment.value = ''
  error.value = ''
}
function close(): void {
  if (busy.value) return
  mode.value = null
  error.value = ''
}
async function confirm(): Promise<void> {
  const selected = mode.value
  if (!selected || busy.value || !valid.value) {
    error.value = copy.value.rejectionReason
    return
  }
  // Never allow UI to circumvent server authorization.
  if (selected === 'submit' ? !canSubmit.value : !showReview.value) return
  busy.value = true
  error.value = ''
  try {
    const response = selected === 'submit'
      ? await submitPersonnelOrder(props.companyId, props.row.id, props.row.revision)
      : await decidePersonnelOrder(props.companyId, props.row.id, props.row.revision,
        selected === 'approve' ? 'approved' : 'rejected', selected === 'reject' ? comment.value.trim() : null)
    mode.value = null
    emit('changed', response.data.status)
  } catch (cause) {
    error.value = cause instanceof ApiError && cause.status === 409
      ? copy.value.stale : copy.value.failed
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="isOrder" class="order-review-controls">
    <p v-if="row.status === 'rejected' && row.review_note" class="order-review-controls__note">
      {{ row.review_note }}
    </p>
    <div class="order-review-controls__buttons">
      <BaseButton v-if="showSubmit" variant="secondary" size="sm" :disabled="!canSubmit || busy"
        @click="open('submit')">{{ copy.submit }}</BaseButton>
      <BaseButton v-if="showReview" variant="secondary" size="sm" :disabled="busy"
        @click="open('approve')">{{ copy.approve }}</BaseButton>
      <BaseButton v-if="showReview" variant="secondary" size="sm" :disabled="busy"
        @click="open('reject')">{{ copy.reject }}</BaseButton>
    </div>
    <p v-if="showSubmit && !canSubmit" class="order-review-controls__note">{{ copy.missing }}</p>
    <BaseDialog :open="mode !== null" :title="copy.title" @close="close">
      <div class="order-review-controls__dialog">
        <strong>{{ row.title }}</strong>
        <p>{{ prompt }}</p>
        <BaseNotice tone="info">{{ copy.notice }}</BaseNotice>
        <label v-if="mode === 'reject'" class="order-review-controls__reason">
          {{ copy.reason }}
          <textarea v-model="comment" rows="3" maxlength="500" :disabled="busy" required />
        </label>
        <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="busy" @click="close">{{ copy.cancel }}</BaseButton>
        <BaseButton :disabled="busy || !valid" @click="confirm">
          {{ busy ? copy.saving : copy.confirm }}
        </BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.order-review-controls{display:grid;gap:var(--space-2);min-width:0}
.order-review-controls__buttons{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.order-review-controls__note{font-size:var(--font-caption-size);color:var(--color-muted);margin:0;line-height:1.5;max-width:270px;overflow-wrap:anywhere}
.order-review-controls__dialog{display:grid;gap:var(--space-3)}
.order-review-controls__dialog p{margin:0;line-height:1.5}
.order-review-controls__reason{display:grid;gap:var(--space-2);font-size:var(--font-caption-size)}
.order-review-controls__reason textarea{width:100%;min-width:0;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);font:inherit;padding:var(--space-3);color:var(--color-text);background:var(--color-surface-raised)}
@media(max-width:580px){.order-review-controls__buttons :deep(button){flex:1;min-width:130px}.order-review-controls__note{max-width:100%}}
</style>
