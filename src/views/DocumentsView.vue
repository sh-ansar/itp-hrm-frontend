<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FilePlus2 } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import DocumentDraftForm from '../components/DocumentDraftForm.vue'
import DocumentMobileList from '../components/DocumentMobileList.vue'
import DocumentUploadForm from '../components/DocumentUploadForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  documentFileUrl,
  documentTypeLabel,
  documentTypes,
  listDocuments,
  type DocumentRow,
  type DocumentType,
} from '../api/documents'

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const companiesBusy = ref(false)
const documentsBusy = ref(false)
const rows = ref<DocumentRow[]>([])
const error = ref('')
const success = ref('')
const writesEnabled = ref(false)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const typeFilter = ref('all')
const employeeFilter = ref('')
const createOpen = ref(false)
const uploadTarget = ref<DocumentRow | null>(null)
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
let generation = 0

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const typeOptions = [{ id: 'all', name: 'Все виды документов' }, ...documentTypes]
const columns = [
  { key: 'issued_on', label: 'Дата' },
  { key: 'document_type', label: 'Вид' },
  { key: 'title', label: 'Документ' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'status', label: 'Статус' },
  { key: 'file', label: 'PDF' },
]

function employeeName(row: DocumentRow): string {
  return [row.last_name,row.first_name].filter(Boolean).join(' ')
}
function statusLabel(value: string): string {
  if (value === 'draft') return 'Черновик'
  if (value === 'active') return 'Активный'
  return value || '—'
}
function displayDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return '—'
  return value.slice(8,10)+'.'+value.slice(5,7)+'.'+value.slice(0,4)
}
function openDocument(row: DocumentRow) {
  if (demoMode) {
    success.value = 'PDF прикреплён к документу. Скачивание файла доступно в защищённом рабочем контуре.'
    return
  }
  window.location.assign(documentFileUrl(company.value,row.id))
}

async function loadCompanies() {
  companiesBusy.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value))
      company.value = companies.value[0]?.id ?? ''
    else
      await loadDocuments()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    companiesBusy.value = false
  }
}

async function loadDocuments() {
  const current = ++generation
  const selected = company.value
  rows.value = []
  writesEnabled.value = false
  if (!selected) {
    total.value = 0
    lastPage.value = 1
    documentsBusy.value = false
    return
  }
  documentsBusy.value = true
  error.value = ''
  try {
    const result = await listDocuments(
      selected,
      page.value,
      typeFilter.value === 'all' ? '' : typeFilter.value as DocumentType,
      employeeFilter.value,
    )
    if (current !== generation) return
    rows.value = result.data
    total.value = result.meta.total
    lastPage.value = result.meta.last_page
    writesEnabled.value = result.meta.document_writes_enabled
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить документы'
    total.value = 0
    lastPage.value = 1
  } finally {
    if (current === generation) documentsBusy.value = false
  }
}

async function documentSaved() {
  createOpen.value = false
  success.value = 'Черновик документа создан.'
  page.value = 1
  await loadDocuments()
}
async function fileSaved() {
  uploadTarget.value = null
  success.value = 'PDF прикреплён к документу.'
  await loadDocuments()
}

watch(company, () => {
  page.value = 1
  typeFilter.value = 'all'
  employeeFilter.value = ''
  createOpen.value = false
  uploadTarget.value = null
  success.value = ''
})
watch([company,page,typeFilter,employeeFilter], loadDocuments)
watch([typeFilter,employeeFilter], () => { page.value = 1 })
onMounted(loadCompanies)
</script>

<template>
  <section class="documents-page">
    <div class="documents-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Документы и приказы</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseLoadingState v-if="companiesBusy" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="documents-heading">
        <div>
          <h1>Документы и приказы</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="documents-heading-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseButton v-if="writesEnabled" @click="createOpen = true">
            <FilePlus2 :size="17" /> Новый черновик
          </BaseButton>
        </div>
      </div>

      <div class="documents-toolbar">
        <BaseSelectField v-model="typeFilter" label="Вид документа" :options="typeOptions" />
        <EmployeeLookupField v-if="company" :key="company" v-model="employeeFilter" :company-id="company" allow-all />
      </div>

      <BaseCard class="documents-register">
        <div class="section-heading">
          <div>
            <h2>Кадровые документы</h2>
            <p>Приказы, договоры, основания и приложенные PDF.</p>
          </div>
          <span>{{ total }} записей</span>
        </div>

        <div class="documents-desktop">
          <BaseDataTable :rows="rows" :columns="columns" row-key="id" :loading="documentsBusy"
            caption="Реестр кадровых документов" empty-title="Документы не найдены"
            empty-description="Измените фильтры или создайте новый черновик.">
            <template #cell-issued_on="{ row }">{{ displayDate(row.issued_on) }}</template>
            <template #cell-document_type="{ row }">
              <span class="type-label">{{ documentTypeLabel(row.document_type) }}</span>
            </template>
            <template #cell-title="{ row }">
              <div class="document-name">
                <strong>{{ row.title }}</strong>
                <span>№ {{ row.document_number || 'без номера' }}</span>
              </div>
            </template>
            <template #cell-employee="{ row }">
              <RouterLink class="employee-name"
                :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'documents' } }">
                <strong>{{ employeeName(row) }}</strong><span>{{ row.personnel_number }}</span>
              </RouterLink>
            </template>
            <template #cell-status="{ row }">
              <span class="status-pill" :class="{ 'status-pill--draft': row.status === 'draft' }">
                {{ statusLabel(row.status) }}
              </span>
            </template>
            <template #cell-file="{ row }">
              <BaseButton v-if="row.has_file" variant="secondary" @click="openDocument(row)">Открыть PDF</BaseButton>
              <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary"
                @click="uploadTarget = row">Прикрепить PDF</BaseButton>
              <span v-else class="file-empty">Без PDF</span>
            </template>
          </BaseDataTable>
        </div>

        <div class="documents-mobile">
          <DocumentMobileList :rows="rows" :company-id="company" :writes-enabled="writesEnabled"
            :loading="documentsBusy" @upload="uploadTarget = $event" />
        </div>

        <BasePagination :page="page" :last-page="lastPage" :loading="documentsBusy"
          caption="Страницы реестра документов" @previous="page--" @next="page++" />
      </BaseCard>
    </template>

    <BaseDialog :open="createOpen" title="Новый черновик документа" @close="createOpen = false">
      <DocumentDraftForm v-if="createOpen && company" :key="company" :company-id="company"
        @saved="documentSaved" @cancelled="createOpen = false" />
    </BaseDialog>
    <BaseDialog :open="uploadTarget !== null" title="Прикрепить PDF" @close="uploadTarget = null">
      <DocumentUploadForm v-if="uploadTarget" :key="uploadTarget.id + ':' + uploadTarget.revision"
        :company-id="company" :document="uploadTarget" @saved="fileSaved" @cancelled="uploadTarget = null" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.documents-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%}
.documents-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.documents-breadcrumb img{width:15px;height:15px}
.documents-breadcrumb strong{color:var(--color-text);font-weight:500}
.documents-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.documents-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.documents-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.documents-heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.documents-heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.documents-toolbar{
  display:grid;grid-template-columns:minmax(190px,.55fr) minmax(0,1.45fr);
  align-items:start;gap:12px;padding:14px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card)
}
.documents-register{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-heading>span{color:var(--color-muted);font-size:11px}
.document-name{display:grid;gap:3px;min-width:150px;overflow-wrap:anywhere}
.document-name strong{color:var(--color-text);font-size:13px}
.document-name span{font-size:11px;color:var(--color-muted)}
.employee-name{display:grid;gap:3px;min-width:130px}
.employee-name strong{color:var(--color-text);font-size:13px}
.employee-name span{color:var(--color-muted);font-size:11px}
.employee-name:hover strong{color:var(--color-primary)}
.type-label{font-size:12px;font-weight:600;white-space:nowrap}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:10px;font-weight:700;white-space:nowrap}
.status-pill--draft{background:var(--color-accent-soft);color:var(--color-primary)}
.file-empty{color:var(--color-muted);font-size:11px}
.documents-desktop :deep(.base-button){height:34px;min-height:34px;font-size:11px}
.documents-mobile{display:none}
:deep(.base-pagination){margin-top:14px}
@media(max-width:860px){
  .documents-toolbar{grid-template-columns:1fr}
}
@media(max-width:760px){
  .documents-desktop{display:none}
  .documents-mobile{display:block}
}
@media(max-width:650px){
  .documents-heading-controls{display:grid;grid-template-columns:1fr;width:100%}
  .documents-heading-controls :deep(.base-select-field){width:100%;max-width:none}
  .documents-heading-controls :deep(.base-button){width:100%}
  .documents-toolbar{padding:12px}
}
</style>
