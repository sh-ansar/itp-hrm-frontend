<script setup lang="ts">
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { computed, onMounted, ref, watch } from 'vue'
import { FileCheck2, FilePlus2, FileText, Paperclip } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import DocumentMobileList from '../components/DocumentMobileList.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import DocumentDraftForm from '../components/DocumentDraftForm.vue'
import DocumentUploadForm from '../components/DocumentUploadForm.vue'
import { getDemoDocumentUrl } from '../mocks/demoDocumentFiles'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  documentFileUrl,
  documentTypeLabel,
  documentTypes,
  listDocuments,
  type DocumentRow,
  type DocumentType,
} from '../api/documents'

const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

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
const typeTabs = [
  { id: 'all', label: 'Все документы' },
  ...documentTypes.map(item => ({ id: item.id, label: item.name })),
]
const pagePdfCount = computed(() => rows.value.filter(row => row.has_file).length)
const pageDraftCount = computed(() => rows.value.filter(row => row.status === 'draft').length)

const columns = [
  { key: 'issued_on', label: 'Дата' },
  { key: 'document_type', label: 'Вид' },
  { key: 'title', label: 'Документ' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'relation', label: 'Связь' },
  { key: 'status', label: 'Статус' },
  { key: 'file', label: 'PDF' },
]

function employeeName(row: DocumentRow): string {
  return [row.last_name, row.first_name].filter(Boolean).join(' ')
}
function statusLabel(status: string): string {
  return tr(status === 'draft' ? 'Черновик' : 'Документ')
}
function displayDate(value: string | null): string {
  return fmt.date(value)
}

async function loadCompanies() {
  companiesBusy.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = companies.value[0]?.id ?? ''
    } else {
      await loadDocuments()
    }
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
  success.value = 'Черновик сохранён. PDF можно прикрепить из реестра документов.'
  page.value = 1
  await loadDocuments()
}
async function fileSaved() {
  uploadTarget.value = null
  success.value = demoMode
    ? 'PDF добавлен в демоверсию. Открыть его можно до обновления страницы; на сервер файл не отправляется.'
    : 'PDF прикреплён к документу.'
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
watch([company, page, typeFilter, employeeFilter], loadDocuments)
watch([typeFilter, employeeFilter], () => { page.value = 1 })
onMounted(loadCompanies)
</script>

<template>
  <section class="documents-page">
    <div class="documents-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>{{ tr('Документы и приказы') }}</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseLoadingState v-if="companiesBusy" :label="tr('Загрузка компаний')" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">{{ tr('Нет доступных компаний.') }}</BaseNotice>

    <template v-else-if="companies.length">
      <div class="documents-heading">
        <div>
          <h1>{{ tr('Документы и приказы') }}</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="documents-heading-controls">
          <BaseSelectField v-model="company" :label="tr('Компания')" :options="companies" />
          <BaseButton v-if="writesEnabled" @click="createOpen = true">
            <FilePlus2 :size="17" /> {{ tr('Новый черновик') }}</BaseButton>
        </div>
      </div>

      <BaseViewTabs v-model="typeFilter" :options="typeTabs" :label="tr('Виды кадровых документов')" />

      <div class="documents-filter-row">
        <EmployeeLookupField v-if="company" :key="company" v-model="employeeFilter" :company-id="company" allow-all />
      </div>

      <div class="summary-grid" :aria-label="tr('Сводка документов')">
        <BaseCard class="summary-card">
          <FileText :size="19" aria-hidden="true" />
          <span>{{ tr('Документы') }}</span>
          <strong>{{ documentsBusy ? '…' : total }}</strong>
          <small>{{ tr('по выбранному фильтру') }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <FileCheck2 :size="19" aria-hidden="true" />
          <span>PDF</span>
          <strong>{{ documentsBusy ? '…' : pagePdfCount }}</strong>
          <small>{{ tr('на текущей странице') }}</small>
        </BaseCard>
        <BaseCard class="summary-card">
          <Paperclip :size="19" aria-hidden="true" />
          <span>{{ tr('Черновики') }}</span>
          <strong>{{ documentsBusy ? '…' : pageDraftCount }}</strong>
          <small>{{ tr('на текущей странице') }}</small>
        </BaseCard>
      </div>

      <BaseCard class="documents-register">
        <div class="register-heading">
          <div>
            <h2>{{ tr('Кадровые документы') }}</h2>
            <p>{{ tr('Черновики, приказы, договоры и основания сотрудников.') }}</p>
          </div>
          <span>{{ fmt.number(total, 0) }} {{ tr('записей') }}</span>
        </div>

        <div class="documents-desktop">
          <BaseDataTable :rows="rows" :columns="columns" row-key="id" :loading="documentsBusy"
            :caption="tr('Реестр кадровых документов')" :empty-title="tr('Документы не найдены')"
            :empty-description="tr('Созданные кадровые документы появятся здесь.')">
            <template #cell-issued_on="{ row }">{{ displayDate(row.issued_on) }}</template>
            <template #cell-document_type="{ row }">
              <span class="type-label">{{ documentTypeLabel(row.document_type) }}</span>
            </template>
            <template #cell-title="{ row }">
              <div class="document-name">
                <strong>{{ row.title }}</strong>
                <span>№ {{ row.document_number || tr('без номера') }}</span>
              </div>
            </template>
            <template #cell-employee="{ row }">
              <div class="employee-name">
                <RouterLink :to="{ name:'employee-detail', params:{ company, employee:row.employee_id }, query:{ tab:'documents' } }">
                  {{ employeeName(row) }}
                </RouterLink>
                <span>{{ row.personnel_number }}</span>
              </div>
            </template>
            <template #cell-relation="{ row }">
              <span class="relation-label">{{ row.personnel_action_id ? tr('Кадровое действие') : '—' }}</span>
            </template>
            <template #cell-status="{ row }">
              <BaseStatusPill :tone="row.status === 'draft' ? 'info' : 'success'">
                {{ statusLabel(row.status) }}
              </BaseStatusPill>
            </template>
            <template #cell-file="{ row }">
              <a v-if="row.has_file && demoMode && getDemoDocumentUrl(row.id)" class="download-link"
                :href="documentFileUrl(company, row.id)" target="_blank" rel="noopener">
                <FileCheck2 :size="15" /> {{ tr('Открыть PDF') }}</a>
              <span v-else-if="row.has_file && demoMode" class="file-ready">
                <FileCheck2 :size="15" /> {{ tr('Демо: файл недоступен') }}</span>
              <a v-else-if="row.has_file" class="download-link" :href="documentFileUrl(company, row.id)" target="_blank" rel="noopener">
                {{ tr('Открыть PDF') }}</a>
              <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary"
                @click="uploadTarget = row">{{ tr('Прикрепить PDF') }}</BaseButton>
              <span v-else class="muted">{{ tr('Не прикреплён') }}</span>
            </template>
          </BaseDataTable>
        </div>

        <div class="documents-mobile">
          <DocumentMobileList :rows="rows" :company-id="company" :writes-enabled="writesEnabled"
            :loading="documentsBusy" @upload="uploadTarget = $event" />
        </div>

        <BasePagination :page="page" :last-page="lastPage" :loading="documentsBusy"
          :caption="tr('Страницы реестра документов')" @previous="page--" @next="page++" />
      </BaseCard>

      <BaseNotice tone="info">
        {{ demoMode
          ? tr('Демонстрация: PDF хранится только в текущем окне браузера до перезагрузки. Образцы без загруженного файла не открываются.')
          : tr('Реестр доступен только кадровым ролям. PDF хранится приватно и скачивается через авторизованный API.') }}
      </BaseNotice>
    </template>

    <BaseDialog :open="createOpen" :title="tr('Новый черновик документа')" @close="createOpen = false">
      <DocumentDraftForm v-if="createOpen && company" :key="company" :company-id="company"
        @saved="documentSaved" @cancelled="createOpen = false" />
    </BaseDialog>
    <BaseDialog :open="uploadTarget !== null" :title="tr('Прикрепить PDF')" @close="uploadTarget = null">
      <DocumentUploadForm v-if="uploadTarget" :key="uploadTarget.id + ':' + uploadTarget.revision"
        :company-id="company" :document="uploadTarget" @saved="fileSaved" @cancelled="uploadTarget = null" />
    </BaseDialog>
  </section>
</template>

<style scoped>
.documents-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.documents-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.documents-breadcrumb img{width:15px;height:15px}
.documents-breadcrumb strong{color:var(--color-text);font-weight:500}
.documents-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.documents-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.documents-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.documents-heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.documents-heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.documents-filter-row{display:flex;align-items:end;justify-content:flex-end;min-width:0}
.documents-filter-row :deep(.lookup){width:min(420px,100%)}
.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.summary-card{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:start;gap:5px 9px;min-height:104px}
.summary-card svg{grid-column:2;grid-row:1;color:var(--color-primary);justify-self:end}
.summary-card>span{grid-column:1;grid-row:1;color:var(--color-muted);font-size:12px;font-weight:600}
.summary-card>strong{grid-column:1/-1;color:var(--color-primary);font-size:24px;line-height:1.1}
.summary-card>small{grid-column:1/-1;color:var(--color-muted);font-size:10px;line-height:1.4}
.documents-register{min-width:0}
.register-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.register-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.register-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.register-heading>span{color:var(--color-muted);font-size:11px}
.document-name,.employee-name{display:grid;gap:3px;min-width:0;overflow-wrap:anywhere}
.document-name strong,.employee-name a{color:var(--color-text);font-size:13px;font-weight:600}
.employee-name a:hover{color:var(--color-primary)}
.document-name span,.employee-name span{font-size:11px;color:var(--color-muted)}
.type-label{font-size:12px;font-weight:600;white-space:nowrap}
.relation-label{font-size:11px;color:var(--color-muted);white-space:nowrap}
.download-link,.file-ready{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--color-primary);font-weight:700;white-space:nowrap}
.download-link{text-decoration:underline;text-underline-offset:3px}
.download-link:focus-visible{outline:3px solid var(--color-focus)}
.muted{color:var(--color-muted);font-size:11px}
.documents-mobile{display:none}
.documents-register :deep(.base-pagination){margin-top:14px}
@media(max-width:900px){.summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){
  .documents-desktop{display:none}
  .documents-mobile{display:block}
  .summary-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
}
@media(max-width:650px){
  .documents-heading-controls{display:grid;grid-template-columns:1fr;width:100%}
  .documents-heading-controls :deep(.base-select-field){width:100%;max-width:none}
  .documents-heading-controls :deep(.base-button){width:100%}
  .documents-filter-row{justify-content:stretch}
  .documents-filter-row :deep(.lookup){width:100%}
  .summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
</style>
