<script setup lang="ts">
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { FileCheck2, Paperclip } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import OrderReviewControls from './OrderReviewControls.vue'
import { useOrderReviewCopy } from '../i18n/orderReview'
import BaseStatusPill from './ui/BaseStatusPill.vue'
import type { DocumentRow } from '../api/documents'
import { documentFileUrl, documentTypeLabel } from '../api/documents'
import { getDemoDocumentUrl } from '../mocks/demoDocumentFiles'
import { useDocumentSharingCopy } from '../i18n/documentSharing'

const { tr } = useWorkspaceI18n()
const { sharing } = useDocumentSharingCopy()
const { orderCopy } = useOrderReviewCopy()
const fmt = useUiFormatters()

const props = defineProps<{
  rows: DocumentRow[]
  companyId: string
  writesEnabled: boolean
  orderApprovalsEnabled?: boolean
  canReviewOrders?: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ upload: [row: DocumentRow]; share: [row: DocumentRow]; orderChanged: [status: string] }>()
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

function employeeName(row: DocumentRow): string {
  return [row.last_name, row.first_name].filter(Boolean).join(' ')
}
function statusLabel(status: string): string {
  if (status === 'submitted' || status === 'approved' || status === 'rejected') return orderCopy.value[status]
  return tr(status === 'draft' ? 'Черновик' : 'Документ')
}
function displayDate(value: string | null): string {
  return fmt.date(value)
}
</script>

<template>
  <div class="document-mobile-list">
    <p v-if="loading" class="document-mobile-empty">{{ tr('Загрузка документов…') }}</p>
    <p v-else-if="!rows.length" class="document-mobile-empty">{{ tr('Документы не найдены.') }}</p>

    <article v-for="row in rows" :key="row.id" class="document-mobile-card">
      <header>
        <div>
          <span class="document-type">{{ documentTypeLabel(row.document_type) }}</span>
          <strong>{{ row.title }}</strong>
          <small>№ {{ row.document_number || tr('без номера') }}</small>
        </div>
        <BaseStatusPill :tone="row.status === 'draft' ? 'info' : row.status === 'submitted' ? 'warning' : row.status === 'rejected' ? 'danger' : 'success'">
          {{ statusLabel(row.status) }}
        </BaseStatusPill>
      </header>

      <dl>
        <div><dt>{{ tr('Дата') }}</dt><dd>{{ displayDate(row.issued_on) }}</dd></div>
        <div>
          <dt>{{ tr('Сотрудник') }}</dt>
          <dd>
            <RouterLink :to="{ name:'employee-detail', params:{ company:companyId, employee:row.employee_id }, query:{ tab:'documents' } }">
              {{ employeeName(row) }}
            </RouterLink>
            <span>{{ row.personnel_number }}</span>
          </dd>
        </div>
        <div v-if="row.personnel_action_id">
          <dt>{{ tr('Связь') }}</dt><dd>{{ tr('Кадровое действие') }}</dd>
        </div>
      </dl>

      <footer>
        <BaseStatusPill :tone="row.employee_visible ? 'success' : 'info'">
          {{ row.employee_visible ? sharing.available : sharing.private }}
        </BaseStatusPill>
        <BaseButton v-if="!demoMode && writesEnabled && row.has_file &&
            (row.employee_visible || ['order','contract'].includes(row.document_type)) &&
            (row.employee_visible || row.document_type !== 'order' || !orderApprovalsEnabled || row.status === 'approved')"
          variant="secondary" @click="emit('share', row)">
          {{ row.employee_visible ? sharing.revoke : sharing.share }}
        </BaseButton>
        <a v-if="row.has_file && demoMode && getDemoDocumentUrl(row.id)"
          class="download-link" :href="documentFileUrl(companyId, row.id)" target="_blank" rel="noopener">
          <FileCheck2 :size="15" /> {{ tr('Открыть PDF') }}</a>
        <span v-else-if="row.has_file && demoMode" class="file-ready">
          <FileCheck2 :size="15" /> {{ tr('Демо: файл недоступен') }}</span>
        <a v-else-if="row.has_file" class="download-link" :href="documentFileUrl(companyId,row.id)" target="_blank" rel="noopener">
          <FileCheck2 :size="15" /> {{ tr('Открыть PDF') }}</a>
        <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary" @click="emit('upload',row)">
          <Paperclip :size="15" /> {{ tr('Прикрепить PDF') }}</BaseButton>
        <span v-else class="file-missing">{{ tr('PDF не прикреплён') }}</span>
        <OrderReviewControls v-if="!demoMode && orderApprovalsEnabled && row.document_type === 'order'"
          :company-id="companyId" :row="row" :enabled="!!orderApprovalsEnabled"
          :review-enabled="!!canReviewOrders" @changed="emit('orderChanged', $event)" />
      </footer>
    </article>
  </div>
</template>

<style scoped>
.document-mobile-list{display:grid;gap:10px}
.document-mobile-empty{margin:0;padding:22px 10px;text-align:center;color:var(--color-muted);font-size:var(--font-caption-size)}
.document-mobile-card{
  display:grid;gap:12px;min-width:0;padding:13px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.document-mobile-card header{display:flex;align-items:start;justify-content:space-between;gap:10px}
.document-mobile-card header>div{display:grid;gap:3px;min-width:0}
.document-type{color:var(--color-primary);font-size:10px;line-height:1.3;font-weight:700}
.document-mobile-card header strong{color:var(--color-text);font-size:13px;line-height:1.4;overflow-wrap:anywhere}
.document-mobile-card header small{color:var(--color-muted);font-size:10px}
.document-mobile-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}
.document-mobile-card dl div{display:grid;gap:4px;min-width:0;padding:9px;background:var(--color-soft);border-radius:var(--radius-sm)}
.document-mobile-card dl div:nth-child(2){grid-column:span 2}
.document-mobile-card dt{color:var(--color-muted);font-size:10px}
.document-mobile-card dd{display:grid;gap:2px;margin:0;color:var(--color-text);font-size:12px;line-height:1.4;overflow-wrap:anywhere}
.document-mobile-card dd a{color:var(--color-text);font-weight:600}
.document-mobile-card dd a:hover{color:var(--color-primary)}
.document-mobile-card dd span{color:var(--color-muted);font-size:10px}
 .document-mobile-card footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--color-stroke)}
.file-ready,.download-link,.file-missing{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600}
.file-ready,.download-link{color:var(--color-primary)}
.file-missing{color:var(--color-muted)}
@media(max-width:420px){.document-mobile-card dl{grid-template-columns:1fr}.document-mobile-card dl div:nth-child(2){grid-column:auto}.document-mobile-card footer :deep(.base-button){width:100%}}
</style>
