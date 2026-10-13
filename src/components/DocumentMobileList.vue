<script setup lang="ts">
import { FileText, Paperclip } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import { documentFileUrl, documentTypeLabel, type DocumentRow } from '../api/documents'

const props = defineProps<{
  rows: DocumentRow[]
  companyId: string
  writesEnabled: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ upload: [row: DocumentRow] }>()

function employeeName(row: DocumentRow) {
  return [row.last_name,row.first_name].filter(Boolean).join(' ')
}
function statusLabel(value: string) {
  if (value === 'draft') return 'Черновик'
  if (value === 'active') return 'Активный'
  return value || '—'
}
function displayDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  return value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(0,4)
}
</script>

<template>
  <div class="document-mobile-list">
    <p v-if="loading" class="document-mobile-empty">Загрузка документов…</p>
    <p v-else-if="!rows.length" class="document-mobile-empty">Документы не найдены.</p>

    <article v-for="row in rows" :key="row.id" class="document-mobile-card">
      <header>
        <span class="document-type"><FileText :size="15" /> {{ documentTypeLabel(row.document_type) }}</span>
        <time>{{ displayDate(row.issued_on) }}</time>
      </header>

      <div class="document-mobile-title">
        <strong>{{ row.title }}</strong>
        <span>№ {{ row.document_number || 'без номера' }}</span>
      </div>

      <RouterLink class="document-employee"
        :to="{ name:'employee-detail', params:{ company:companyId, employee:row.employee_id }, query:{ tab:'documents' } }">
        <span><strong>{{ employeeName(row) }}</strong><small>{{ row.personnel_number }}</small></span>
        <span class="document-open">Открыть карточку</span>
      </RouterLink>

      <footer>
        <span class="status-pill" :class="{ 'status-pill--draft': row.status === 'draft' }">{{ statusLabel(row.status) }}</span>
        <a v-if="row.has_file" class="file-link" :href="documentFileUrl(companyId,row.id)">
          <Paperclip :size="14" /> PDF
        </a>
        <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary"
          @click="emit('upload',row)">Прикрепить PDF</BaseButton>
        <span v-else class="file-empty">Без PDF</span>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.document-mobile-list{display:grid;gap:10px}
.document-mobile-empty{margin:0;padding:22px 10px;text-align:center;color:var(--color-muted);font-size:var(--font-caption-size)}
.document-mobile-card{
  display:grid;gap:11px;min-width:0;padding:13px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.document-mobile-card header{display:flex;align-items:center;justify-content:space-between;gap:10px}
.document-type{display:inline-flex;align-items:center;gap:5px;color:var(--color-primary);font-size:11px;font-weight:600}
.document-mobile-card time{color:var(--color-muted);font-size:11px;white-space:nowrap}
.document-mobile-title{display:grid;gap:3px;min-width:0}
.document-mobile-title strong{color:var(--color-text);font-size:14px;line-height:1.35;overflow-wrap:anywhere}
.document-mobile-title span{color:var(--color-muted);font-size:11px}
.document-employee{
  display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;
  border-radius:var(--radius-sm);background:var(--color-soft)
}
.document-employee>span:first-child{display:grid;gap:2px;min-width:0}
.document-employee strong{color:var(--color-text);font-size:12px;line-height:1.35}
.document-employee small{color:var(--color-muted);font-size:10px}
.document-open{flex:none;color:var(--color-primary);font-size:10px;font-weight:600}
.document-mobile-card footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:9px;border-top:1px solid var(--color-stroke)}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:10px;font-weight:700}
.status-pill--draft{background:var(--color-accent-soft);color:var(--color-primary)}
.file-link{display:inline-flex;align-items:center;gap:4px;color:var(--color-primary);font-size:11px;font-weight:700}
.file-empty{color:var(--color-muted);font-size:11px}
.document-mobile-card footer :deep(.base-button){height:34px;min-height:34px;font-size:11px}
</style>
