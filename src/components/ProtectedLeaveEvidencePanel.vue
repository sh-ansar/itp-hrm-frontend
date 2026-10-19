<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { useProtectedEvidenceCopy } from '../i18n/protectedEvidence'
import { uploadProtectedEvidence, reviewProtectedEvidence, privateEvidenceFileUrl,
  type EvidenceRequest } from '../api/protectedLeaveEvidence'

const props = defineProps<{
  companyId: string
  request: EvidenceRequest
  canUpload: boolean
  canReview: boolean
  required: boolean
}>()
const emit = defineEmits<{ changed: [] }>()
const { evidenceCopy: copy } = useProtectedEvidenceCopy()
const fileId = useId()
const selected = ref<File | null>(null)
const reviewComment = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
const protectedType = computed(() => ['maternity', 'childcare', 'medical'].includes(props.request.category ?? ''))
const status = computed(() => props.request.evidence_status ?? null)
const canAttach = computed(() => props.canUpload && ['draft', 'submitted'].includes(props.request.status)
  && (!status.value || status.value === 'rejected'))
const showReview = computed(() => props.canReview && props.request.status === 'submitted'
  && status.value === 'pending' && !!props.request.evidence_revision)
function onFile(event: Event) {
  selected.value = (event.target as HTMLInputElement).files?.[0] ?? null
  error.value = ''
}
async function upload(): Promise<void> {
  if (busy.value || !selected.value || !canAttach.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await uploadProtectedEvidence(props.companyId, props.request.id, props.request.revision, selected.value)
    selected.value = null
    success.value = copy.value.changed
    emit('changed')
  } catch (cause) {
    // The backend never returns sensitive medical data here; client errors are
    // normalized, not copied verbatim to the employee-facing UI.
    const code = cause instanceof Error ? cause.name : 'Unknown'
    const reason = cause instanceof Error ? cause.message : 'Unknown error'
    console.warn('HRM_PROTECTED_UPLOAD_DIAGNOSTIC', { code, reason,
      requestRevision: props.request.revision, hasEmployeeCompany: !!props.companyId })
    error.value = copy.value.failed
  } finally {
    busy.value = false
  }
}
async function review(decision: 'verified' | 'rejected'): Promise<void> {
  if (busy.value || !showReview.value || !props.request.evidence_revision) return
  if (decision === 'rejected' && !reviewComment.value.trim()) {
    error.value = copy.value.noReason
    return
  }
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await reviewProtectedEvidence(props.companyId, props.request.id,
      props.request.evidence_revision, decision, decision === 'rejected' ? reviewComment.value.trim() : null)
    reviewComment.value = ''
    success.value = copy.value.reviewed
    emit('changed')
  } catch {
    error.value = copy.value.failed
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="protectedType" class="protected-evidence" :aria-label="copy.title">
    <div class="protected-evidence__header">
      <strong>{{ copy.title }}</strong>
      <span :class="['protected-evidence__status', status ? 'is-' + status : '']">
        {{ status ? copy[status] : copy.noFile }}
      </span>
    </div>
    <p class="protected-evidence__help">{{ copy.help }}</p>
    <BaseNotice v-if="required && status !== 'verified'" tone="info">{{ copy.required }}</BaseNotice>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <a v-if="status" :href="privateEvidenceFileUrl(companyId, request.id)"
      download="supporting-document.pdf" rel="noreferrer" class="protected-evidence__download">
      {{ copy.download }}
    </a>
    <div v-if="canAttach" class="protected-evidence__upload">
      <label :for="fileId">{{ copy.title }} (PDF, 5 MB)</label>
      <input :id="fileId" type="file" accept="application/pdf,.pdf"
        :disabled="busy" @change="onFile" />
      <BaseButton type="button" variant="secondary" :disabled="busy || !selected" @click="upload">
        {{ busy ? copy.uploadBusy : status === 'rejected' ? copy.replacing : copy.upload }}
      </BaseButton>
    </div>
    <div v-if="showReview" class="protected-evidence__review">
      <label>{{ copy.reason }}
        <textarea v-model="reviewComment" rows="2" maxlength="500" :disabled="busy" />
      </label>
      <div class="protected-evidence__actions">
        <BaseButton type="button" :disabled="busy" @click="review('verified')">{{ copy.verify }}</BaseButton>
        <BaseButton type="button" variant="secondary" :disabled="busy || !reviewComment.trim()"
          @click="review('rejected')">{{ copy.reject }}</BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.protected-evidence{display:grid;gap:var(--space-2);margin-top:var(--space-3);padding:var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--radius-md);min-width:0}
.protected-evidence__header{display:flex;justify-content:space-between;gap:var(--space-2);align-items:center;flex-wrap:wrap}
.protected-evidence__header strong{font-size:var(--font-label-size)}
.protected-evidence__status{font-size:var(--font-caption-size);color:var(--color-muted)}
.protected-evidence__status.is-verified{color:var(--color-success)}
.protected-evidence__status.is-rejected{color:var(--color-warning)}
.protected-evidence__help{margin:0;font-size:var(--font-caption-size);color:var(--color-muted);line-height:1.5}
.protected-evidence__upload,.protected-evidence__review{display:grid;gap:var(--space-2);max-width:100%;min-width:0}
.protected-evidence__upload label,.protected-evidence__review label{display:grid;gap:var(--space-2);font-size:var(--font-caption-size)}
.protected-evidence__upload input,.protected-evidence__review textarea{width:100%;max-width:100%;font:inherit;border:1px solid var(--color-stroke);background:var(--color-surface-raised);color:var(--color-text);padding:var(--space-2);border-radius:var(--radius-sm)}
.protected-evidence__upload :deep(button){justify-self:start}
.protected-evidence__download{font-size:var(--font-caption-size);text-decoration:underline;overflow-wrap:anywhere}
.protected-evidence__actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}
@media(max-width:580px){.protected-evidence__actions :deep(button),.protected-evidence__upload :deep(button){width:100%;justify-content:center}}
</style>
