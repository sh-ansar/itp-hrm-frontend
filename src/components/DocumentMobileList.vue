<script setup lang="ts">
import { FileCheck2, Paperclip } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import type { DocumentRow } from '../api/documents'
import { documentFileUrl, documentTypeLabel } from '../api/documents'
import { getDemoDocumentUrl } from '../mocks/demoDocumentFiles'

const props = defineProps<{
  rows: DocumentRow[]
  companyId: string
  writesEnabled: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ upload: [row: DocumentRow] }>()
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

function employeeName(row: DocumentRow): string {
  return [row.last_name, row.first_name].filter(Boolean).join(' ')
}
function statusLabel(status: string): string {
  return status === 'draft' ? 'Черновик' : 'Документ'
}
function displayDate(value: string | null): string {
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
        <div>
          <span class="document-type">{{ documentTypeLabel(row.document_type) }}</span>
          <strong>{{ row.title }}</strong>
          <small>№ {{ row.document_number || 'без номера' }}</small>
        </div>
        <span class="status-pill" :class="{ 'status-pill--draft': row.status === 'draft' }">
          {{ statusLabel(row.status) }}
        </span>
      </header>

      <dl>
        <div><dt>Дата</dt><dd>{{ displayDate(row.issued_on) }}</dd></div>
        <div>
          <dt>Сотрудник</dt>
          <dd>
            <RouterLink :to="{ name:'employee-detail', params:{ company:companyId, employee:row.employee_id }, query:{ tab:'documents' } }">
              {{ employeeName(row) }}
            </RouterLink>
            <span>{{ row.personnel_number }}</span>
          </dd>
        </div>
        <div v-if="row.personnel_action_id">
          <dt>Связь</dt><dd>Кадровое действие</dd>
        </div>
      </dl>

      <footer>
        <a v-if="row.has_file && demoMode && getDemoDocumentUrl(row.id)"
          class="download-link" :href="documentFileUrl(companyId, row.id)" target="_blank" rel="noopener">
          <FileCheck2 :size="15" /> Открыть PDF
        </a>
        <span v-else-if="row.has_file && demoMode" class="file-ready">
          <FileCheck2 :size="15" /> Демо: файл недоступен
        </span>
        <a v-else-if="row.has_file" class="download-link" :href="documentFileUrl(companyId,row.id)" target="_blank" rel="noopener">
          <FileCheck2 :size="15" /> Открыть PDF
        </a>
        <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary" @click="emit('upload',row)">
          <Paperclip :size="15" /> Прикрепить PDF
        </BaseButton>
        <span v-else class="file-missing">PDF не прикреплён</span>
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
.status-pill{display:inline-flex;flex:none;padding:5px 8px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:10px;font-weight:700}
.status-pill--draft{background:var(--color-accent-soft);color:var(--color-primary)}
.document-mobile-card dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0}
.document-mobile-card dl div{display:grid;gap:4px;min-width:0;padding:9px;background:var(--color-soft);border-radius:var(--radius-sm)}
.document-mobile-card dl div:nth-child(2){grid-column:span 2}
.document-mobile-card dt{color:var(--color-muted);font-size:10px}
.document-mobile-card dd{display:grid;gap:2px;margin:0;color:var(--color-text);font-size:12px;line-height:1.4;overflow-wrap:anywhere}
.document-mobile-card dd a{color:var(--color-text);font-weight:600}
.document-mobile-card dd a:hover{color:var(--color-primary)}
.document-mobile-card dd span{color:var(--color-muted);font-size:10px}
.document-mobile-card footer{display:flex;align-items:center;justify-content:flex-end;padding-top:10px;border-top:1px solid var(--color-stroke)}
.file-ready,.download-link,.file-missing{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600}
.file-ready,.download-link{color:var(--color-primary)}
.file-missing{color:var(--color-muted)}
@media(max-width:420px){.document-mobile-card dl{grid-template-columns:1fr}.document-mobile-card dl div:nth-child(2){grid-column:auto}.document-mobile-card footer :deep(.base-button){width:100%}}
</style>
