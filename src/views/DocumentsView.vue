<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { useDocumentSharingCopy } from '../i18n/documentSharing'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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
import BaseFormField from '../components/ui/BaseFormField.vue'
import DocumentMetadataForm from '../components/DocumentMetadataForm.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import DocumentMobileList from '../components/DocumentMobileList.vue'
import EmployeeLookupField from '../components/EmployeeLookupField.vue'
import DocumentDraftForm from '../components/DocumentDraftForm.vue'
import DocumentUploadForm from '../components/DocumentUploadForm.vue'
import OrderReviewControls from '../components/OrderReviewControls.vue'
import { useOrderReviewCopy } from '../i18n/orderReview'
import { getDemoDocumentUrl } from '../mocks/demoDocumentFiles'
import { listCompanies, type CompanyRecord } from '../api/organization'
import {
  documentFileUrl,
  documentTypeLabel,
  documentTypes,
  documentSections,
  listDocuments,
  setEmployeeDocumentVisibility,
  type DocumentRow,
  type DocumentType,
  type DocumentSection,
} from '../api/documents'

const { tr } = useWorkspaceI18n()
const { sharing } = useDocumentSharingCopy()
const { orderCopy } = useOrderReviewCopy()
const route = useRoute()
type OrderStatusFilter = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected'
function queryType(): string {
  const requested = route.query.type
  return typeof requested === 'string' && documentTypes.some(type => type.id === requested) ? requested : 'all'
}
function queryStatus(): OrderStatusFilter {
  const requested = route.query.status
  return requested === 'draft' || requested === 'submitted' || requested === 'approved' || requested === 'rejected'
    ? requested : 'all'
}
const fmt = useUiFormatters()

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const companiesBusy = ref(false)
const documentsBusy = ref(false)
const rows = ref<DocumentRow[]>([])
const error = ref('')
const success = ref('')
const writesEnabled = ref(false)
const orderApprovalsEnabled = ref(false)
const canReviewOrders = ref(false)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const typeFilter = ref(queryType())
const statusFilter = ref<OrderStatusFilter>(queryType() === 'order' ? queryStatus() : 'all')
const statusOptions = computed(() => [
  { id: 'all', name: tr('Все статусы') },
  ...(['draft', 'submitted', 'approved', 'rejected'] as const)
    .map(status => ({ id: status, name: orderCopy.value[status] })),
])
const employeeFilter = ref('')
const searchText = ref('')
const tagText = ref('')
const sectionFilter = ref<DocumentSection | ''>('')
const metadataTarget = ref<DocumentRow | null>(null)
const createOpen = ref(false)
const uploadTarget = ref<DocumentRow | null>(null)
const shareTarget = ref<DocumentRow | null>(null)
const shareBusy = ref(false)
const shareError = ref('')
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
let generation = 0

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const typeTabs = [
  { id: 'all', label: 'Все документы' },
  ...documentTypes.map(item => ({ id: item.id, label: item.name })),
]
const pagePdfCount = computed(() => rows.value.filter(row => row.has_file).length)
const pageDraftCount = computed(() => rows.value.filter(row => row.status === 'draft').length)

const columns = computed(() => [
  { key: 'issued_on', label: 'Дата' },
  { key: 'document_type', label: 'Вид' },
  { key: 'title', label: 'Документ' },
  { key: 'metadata', label: 'Теги' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'relation', label: 'Связь' },
  { key: 'status', label: 'Статус' },
  { key: 'file', label: 'PDF' },
  { key: 'employee_access', label: sharing.value.access },
])

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

async function loadCompanies() {
  companiesBusy.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = preferCompany(companies.value)
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
  orderApprovalsEnabled.value = false
  canReviewOrders.value = false
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
      typeFilter.value === 'order' && statusFilter.value !== 'all' ? statusFilter.value : '',
      { search: searchText.value, tag: tagText.value, section_key: sectionFilter.value || undefined },
    )
    if (current !== generation) return
    rows.value = result.data
    total.value = result.meta.total
    lastPage.value = result.meta.last_page
    writesEnabled.value = result.meta.document_writes_enabled
    orderApprovalsEnabled.value = !!result.meta.order_approvals_enabled
    canReviewOrders.value = !!result.meta.can_review_orders
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


function canShare(row: DocumentRow): boolean {
  return !demoMode && writesEnabled.value && row.has_file && ['order', 'contract'].includes(row.document_type)
    && (row.document_type !== 'order' || !orderApprovalsEnabled.value || row.status === 'approved')
}
async function orderChanged(_status: string): Promise<void> {
  success.value = orderCopy.value.confirmed
  await loadDocuments()
}
function showShareDialog(row: DocumentRow): void {
  if (!canShare(row) && !row.employee_visible) return
  shareTarget.value = row
  shareError.value = ''
}
function closeShareDialog(): void {
  if (shareBusy.value) return
  shareTarget.value = null
  shareError.value = ''
}
async function confirmShare(): Promise<void> {
  const target = shareTarget.value
  if (!target || shareBusy.value || demoMode || !company.value) return
  const currentCompany = company.value
  shareBusy.value = true
  shareError.value = ''
  error.value = ''
  success.value = ''
  try {
    await setEmployeeDocumentVisibility(currentCompany, target.id, target.revision, !target.employee_visible)
    if (company.value === currentCompany) {
      shareTarget.value = null
      success.value = target.employee_visible
        ? sharing.value.revokeMessage
        : sharing.value.sharedMessage
      await loadDocuments()
    }
  } catch (cause) {
    shareError.value = cause instanceof Error ? cause.message : 'Не удалось изменить доступ. Обновите реестр.'
  } finally {
    shareBusy.value = false
  }
}

watch(company, () => {
  page.value = 1
  typeFilter.value = queryType()
  statusFilter.value = typeFilter.value === 'order' ? queryStatus() : 'all'
  employeeFilter.value = ''
  searchText.value = ''
  tagText.value = ''
  sectionFilter.value = ''
  createOpen.value = false
  uploadTarget.value = null
  shareTarget.value = null
  shareError.value = ''
  success.value = ''
})
watch([company, page, typeFilter, employeeFilter, statusFilter, searchText, tagText, sectionFilter], loadDocuments)
watch([typeFilter, employeeFilter, statusFilter, searchText, tagText, sectionFilter], () => { page.value = 1 })
watch(typeFilter, value => { if (value !== 'order') statusFilter.value = 'all' })
watch(() => [route.query.type, route.query.status], () => {
  typeFilter.value = queryType()
  statusFilter.value = typeFilter.value === 'order' ? queryStatus() : 'all'
})
onMounted(loadCompanies)
</script>

<template>
  <section class="documents-page">
    <div class="documents-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
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

      <div class="documents-filter-row" role="search" aria-label="Единые фильтры реестра документов">
        <BaseFormField v-model="searchText" label="Поиск документов" placeholder="Название, описание или тег" />
        <BaseFormField v-model="tagText" label="Тег" placeholder="Например: грамота" />
        <BaseSelectField v-model="sectionFilter" label="Раздел карточки" :options="[{ id: '', name: 'Все разделы' }, ...documentSections]" />
        <EmployeeLookupField v-if="company" :key="company" v-model="employeeFilter" :company-id="company" allow-all compact />
        <BaseSelectField v-if="orderApprovalsEnabled && typeFilter === 'order'"
          v-model="statusFilter" label="Статус приказа" :options="statusOptions" />
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

      <BaseCard class="documents-register hrm-flat-panel">
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
                <span v-if="row.description" class="document-description">{{ row.description }}</span>
              </div>
            </template>
            <template #cell-metadata="{ row }">
              <div class="document-tag-cell">
                <span v-for="tag in (row.tags ?? [])" :key="tag" class="document-tag">{{ tag }}</span>
                <BaseButton v-if="writesEnabled" variant="secondary" size="sm"
                  :aria-label="'Теги и описание: ' + row.title" @click="metadataTarget = row">
                  Изменить
                </BaseButton>
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
              <div class="order-status-cell">
                <BaseStatusPill :tone="row.status === 'draft' ? 'info' : row.status === 'submitted' ? 'warning' : row.status === 'rejected' ? 'danger' : 'success'">
                  {{ statusLabel(row.status) }}
                </BaseStatusPill>
                <OrderReviewControls v-if="!demoMode && orderApprovalsEnabled && row.document_type === 'order'"
                  :company-id="company" :row="row" :enabled="orderApprovalsEnabled"
                  :review-enabled="canReviewOrders" @changed="orderChanged" />
              </div>
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

            <template #cell-employee_access="{ row }">
              <div class="document-access">
                <BaseStatusPill :tone="row.employee_visible ? 'success' : 'info'">
                  {{ row.employee_visible ? sharing.available : sharing.private }}
                </BaseStatusPill>
                <BaseButton v-if="!demoMode && writesEnabled && (canShare(row) || row.employee_visible)"
                  variant="secondary" @click="showShareDialog(row)">
                  {{ row.employee_visible ? sharing.revoke : sharing.share }}
                </BaseButton>
              </div>
            </template>
          </BaseDataTable>
        </div>

        <div class="documents-mobile">
          <DocumentMobileList :rows="rows" :company-id="company" :writes-enabled="writesEnabled"
            :order-approvals-enabled="orderApprovalsEnabled" :can-review-orders="canReviewOrders"
            :loading="documentsBusy" @upload="uploadTarget = $event" @share="showShareDialog"
            @order-changed="orderChanged" />
        </div>

        <BasePagination :page="page" :last-page="lastPage" :loading="documentsBusy"
          :caption="tr('Страницы реестра документов')" @previous="page--" @next="page++" />
      </BaseCard>

    </template>

    <BaseDialog :open="createOpen" :title="tr('Новый черновик документа')" @close="createOpen = false">
      <DocumentDraftForm v-if="createOpen && company" :key="company" :company-id="company"
        :order-approvals-enabled="orderApprovalsEnabled"
        @saved="documentSaved" @cancelled="createOpen = false" />
    </BaseDialog>
    <BaseDialog :open="metadataTarget !== null" title="Описание и теги документа"
      @close="metadataTarget = null">
      <DocumentMetadataForm v-if="metadataTarget" :key="metadataTarget.id + ':' + metadataTarget.revision"
        :company-id="company" :document="metadataTarget" @cancelled="metadataTarget = null"
        @saved="metadataTarget = null; loadDocuments()" />
    </BaseDialog>
    <BaseDialog :open="uploadTarget !== null" :title="tr('Прикрепить PDF')" @close="uploadTarget = null">
      <DocumentUploadForm v-if="uploadTarget" :key="uploadTarget.id + ':' + uploadTarget.revision"
        :company-id="company" :document="uploadTarget" @saved="fileSaved" @cancelled="uploadTarget = null" />
    </BaseDialog>

    <BaseDialog :open="shareTarget !== null" :title="sharing.title" @close="closeShareDialog">
      <div v-if="shareTarget" class="sharing-confirmation">
        <strong>{{ shareTarget.title }}</strong>
        <BaseNotice v-if="shareError" tone="error">{{ shareError }}</BaseNotice>
        <p v-if="shareTarget.employee_visible">
          {{ sharing.revokeQuestion }}
        </p>
        <p v-else>
          {{ sharing.shareQuestion }}
        </p>
        <BaseNotice tone="info">
          {{ sharing.notice }}
        </BaseNotice>
      </div>
      <template #footer>
        <BaseButton variant="secondary" :disabled="shareBusy" @click="closeShareDialog">{{ sharing.cancel }}</BaseButton>
        <BaseButton :disabled="shareBusy" @click="confirmShare">
          {{ shareTarget?.employee_visible ? sharing.revoke : sharing.share }}
        </BaseButton>
      </template>
    </BaseDialog>
  </section>
</template>

<style scoped>
.documents-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.documents-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.documents-breadcrumb img{width:15px;height:15px}
.documents-breadcrumb strong{color:var(--color-text);font-weight:500}
.documents-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.documents-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:600;letter-spacing:-.025em}
.documents-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.documents-heading-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.documents-heading-controls :deep(.base-select-field){width:220px;max-width:220px}
.documents-filter-row{display:flex;align-items:end;justify-content:flex-start;gap:var(--space-3);flex-wrap:wrap;min-width:0}
.documents-filter-row :deep(.base-select-field){width:210px;max-width:100%}
.documents-filter-row :deep(.base-field){min-width:180px;max-width:260px}
.documents-filter-row :deep(.lookup){flex:1;max-width:850px;min-width:0}
.documents-filter-row :deep(.lookup .base-select-field){width:100%}
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
.document-description{color:var(--color-muted);font-size:11px;line-height:1.4}
.document-tag-cell{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.document-tag{border:1px solid var(--color-stroke);border-radius:5px;padding:2px 6px;font-size:11px;color:var(--color-text)}
.document-name strong,.employee-name a{color:var(--color-text);font-size:13px;font-weight:600}
.employee-name a:hover{color:var(--color-primary)}
.document-name span,.employee-name span{font-size:11px;color:var(--color-muted)}
.type-label{font-size:12px;font-weight:600;white-space:nowrap}
.relation-label{font-size:11px;color:var(--color-muted);white-space:nowrap}
.download-link,.file-ready{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--color-primary);font-weight:700;white-space:nowrap}
.download-link{text-decoration:underline;text-underline-offset:3px}
.download-link:focus-visible{outline:3px solid var(--color-focus)}
.muted{color:var(--color-muted);font-size:11px}
.document-access{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.order-status-cell{display:grid;align-items:start;justify-items:start;gap:var(--space-2);min-width:0}
.document-access :deep(.base-button){font-size:11px}
.sharing-confirmation{display:grid;gap:12px;overflow-wrap:anywhere}
.sharing-confirmation p{margin:0;line-height:1.55}

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
  .documents-filter-row :deep(.base-select-field){width:100%}
  .summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
</style>
