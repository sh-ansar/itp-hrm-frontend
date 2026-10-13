<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FileCheck2, FilePlus2, FileText, Paperclip } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import DocumentDraftForm from '../components/DocumentDraftForm.vue'
import DocumentUploadForm from '../components/DocumentUploadForm.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { documentFileUrl, documentTypeLabel, documentTypes, listDocuments, type DocumentRow, type DocumentType } from '../api/documents'

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
let generation = 0

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const typeOptions = [{ id: 'all', name: 'Все виды' }, ...documentTypes]
const columns = [
  { key: 'issued_on', label: 'Дата' },
  { key: 'document_type', label: 'Вид' },
  { key: 'title', label: 'Документ' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'status', label: 'Статус' },
  { key: 'file', label: 'PDF' },
]

function employeeName(row: DocumentRow): string {
  return row.last_name + ' ' + row.first_name
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
    const result = await listDocuments(selected, page.value,
      typeFilter.value === 'all' ? '' : typeFilter.value as DocumentType,
      employeeFilter.value)
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
  success.value = 'Черновик сохранён. Можно прикрепить PDF из реестра документов.'
  page.value = 1
  await loadDocuments()
}
async function fileSaved() {
  uploadTarget.value = null
  success.value = 'PDF прикреплён к черновику. Файл доступен через защищённое скачивание.'
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
    <BasePageHeading title="Документы и приказы"
      description="Защищённый реестр кадровых документов, черновиков приказов и приложенных PDF.">
      <BaseButton v-if="writesEnabled" @click="createOpen = true"><FilePlus2 :size="17" /> Новый черновик</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companiesBusy" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="filters">
        <BaseSelectField v-model="company" label="Компания" :options="companies" />
        <BaseSelectField v-model="typeFilter" label="Вид документа" :options="typeOptions" />
        <EmployeeLookupField v-if="company" :key="company" v-model="employeeFilter" :company-id="company" allow-all />
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору.</BaseNotice>
    </BaseCard>

    <div class="summary-grid">
      <BaseCard class="summary-card">
        <FileText :size="22" />
        <div><strong>{{ total }}</strong><span>Документов по фильтру</span></div>
      </BaseCard>
      <BaseCard class="summary-card">
        <FileCheck2 :size="22" />
        <div><strong>{{ rows.filter(row => row.has_file).length }}</strong><span>PDF на текущей странице</span></div>
      </BaseCard>
      <BaseCard class="summary-card">
        <Paperclip :size="22" />
        <div><strong>{{ rows.filter(row => row.status === 'draft').length }}</strong><span>Черновиков на странице</span></div>
      </BaseCard>
    </div>

    <BaseCard v-if="company">
      <div class="table-header">
        <div>
          <p class="kicker">Реестр компании</p>
          <h2>Кадровые документы</h2>
          <p class="muted">{{ selectedCompany?.name }} · Страница {{ page }} из {{ lastPage }}</p>
        </div>
        <span class="count">{{ total }} записей</span>
      </div>

      <BaseDataTable :rows="rows" :columns="columns" row-key="id" :loading="documentsBusy"
        caption="Реестр кадровых документов" empty-title="Документов пока нет"
        empty-description="После создания черновики приказов, договоров и оснований появятся здесь.">
        <template #cell-issued_on="{ row }">{{ row.issued_on ?? '—' }}</template>
        <template #cell-document_type="{ row }">
          <span class="type-label">{{ documentTypeLabel(row.document_type) }}</span>
        </template>
        <template #cell-title="{ row }">
          <div class="document-name"><strong>{{ row.title }}</strong><span>№ {{ row.document_number || 'без номера' }}</span></div>
        </template>
        <template #cell-employee="{ row }">
          <div class="employee-name"><strong>{{ employeeName(row) }}</strong><span>{{ row.personnel_number }}</span></div>
        </template>
        <template #cell-status="{ row }">
          <span class="status-pill" :class="{ 'status-pill--draft': row.status === 'draft' }">
            {{ row.status === 'draft' ? 'Черновик' : row.status }}
          </span>
        </template>
        <template #cell-file="{ row }">
          <a v-if="row.has_file" class="download-link" :href="documentFileUrl(company, row.id)">
            Скачать PDF
          </a>
          <BaseButton v-else-if="writesEnabled && row.status === 'draft'" variant="secondary"
            @click="uploadTarget = row">Прикрепить PDF</BaseButton>
          <span v-else class="muted">Не прикреплён</span>
        </template>
      </BaseDataTable>
      <BasePagination :page="page" :last-page="lastPage" :loading="documentsBusy"
        caption="Страницы реестра документов" @previous="page--" @next="page++" />
      <BaseNotice tone="info">
        Доступ к реестру ограничен кадровыми ролями. Скачивание проходит через авторизованный API; пути приватного хранилища не публикуются.
      </BaseNotice>
    </BaseCard>

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
.documents-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);min-width:0;max-width:100%;overflow-x:clip}
.documents-page>*{min-width:0;max-width:100%}
.filters{display:grid;grid-template-columns:minmax(180px,.9fr) minmax(160px,.8fr) minmax(220px,1.5fr);gap:var(--space-4);align-items:start;min-width:0}
.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4)}
.summary-card{display:flex;align-items:center;gap:var(--space-4);color:var(--color-primary)}
.summary-card div{display:grid;gap:3px;min-width:0}
.summary-card strong{font-size:24px;color:var(--color-text)}
.summary-card span{color:var(--color-muted);font-size:12px;line-height:1.4}
.table-header{display:flex;justify-content:space-between;gap:16px;align-items:end;flex-wrap:wrap;margin-bottom:var(--space-4)}
.table-header h2{font-size:var(--font-section-heading);margin:0}
.table-header .muted{margin:6px 0 0}
.kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.count{font-size:12px;color:var(--color-muted);white-space:nowrap}
.document-name,.employee-name{display:grid;gap:3px;min-width:0;overflow-wrap:anywhere}
.document-name strong,.employee-name strong{font-size:13px}
.document-name span,.employee-name span{font-size:11px;color:var(--color-muted)}
.type-label{font-size:12px;font-weight:600;white-space:nowrap}
.status-pill{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--color-soft);font-size:11px;font-weight:700;white-space:nowrap}
.status-pill--draft{background:var(--color-accent-soft);color:var(--color-primary)}
.download-link{font-size:12px;color:var(--color-primary);font-weight:700;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.download-link:focus-visible{outline:3px solid var(--color-focus)}
:deep(.base-pagination){margin-bottom:var(--space-4)}
@media(max-width:1100px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.filters :last-child{grid-column:1/-1}}
@media(max-width:740px){.filters,.summary-grid{grid-template-columns:1fr}.filters :last-child{grid-column:auto}}
</style>
