<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref, watch } from 'vue'
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import PositionForm from '../components/PositionForm.vue'
import {
  deletePosition,
  listCompanies,
  listPositions,
  type CompanyRecord,
  type PositionRecord,
} from '../api/organization'

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const positions = ref<PositionRecord[]>([])
const companyBusy = ref(false)
const busy = ref(false)
const positionWritesEnabled = ref(false)
const error = ref('')
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const editorOpen = ref(false)
const editingPosition = ref<PositionRecord | null>(null)
const deleteCandidate = ref<PositionRecord | null>(null)
const deleting = ref(false)

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const columns = computed(() => [
  { key: 'name', label: 'Наименование должности' },
  ...(positionWritesEnabled.value ? [{ key: 'actions', label: '' }] : []),
])

async function loadCompanies() {
  companyBusy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!companies.value.some(item => item.id === company.value)) company.value = preferCompany(companies.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
    companies.value = []
    company.value = ''
  } finally {
    companyBusy.value = false
  }
}

async function loadPositions() {
  if (!company.value) return
  busy.value = true
  error.value = ''
  try {
    const response = await listPositions(company.value, page.value)
    positions.value = response.data
    pages.value = response.meta.last_page
    total.value = response.meta.total
    positionWritesEnabled.value = response.meta.position_writes_enabled
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить должности'
    positions.value = []
    positionWritesEnabled.value = false
  } finally {
    busy.value = false
  }
}

function createRecord() {
  editingPosition.value = null
  editorOpen.value = true
}
function editRecord(row: PositionRecord) {
  editingPosition.value = row
  editorOpen.value = true
}
async function saved() {
  editorOpen.value = false
  editingPosition.value = null
  await loadPositions()
}
async function confirmDelete() {
  if (!deleteCandidate.value || !company.value) return
  deleting.value = true
  error.value = ''
  try {
    await deletePosition(company.value, deleteCandidate.value.id, deleteCandidate.value.revision)
    deleteCandidate.value = null
    await loadPositions()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить должность'
    deleteCandidate.value = null
  } finally {
    deleting.value = false
  }
}

watch(company, () => { page.value = 1 })
watch([company, page], loadPositions)
onMounted(loadCompanies)
</script>

<template>
  <section class="directories-page">
    <div class="directories-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Справочники</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
    <BaseNotice v-else-if="!companies.length && !error" tone="info">Нет доступных компаний.</BaseNotice>

    <template v-else-if="companies.length">
      <div class="directories-heading">
        <div>
          <h1>Справочники</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="directories-controls">
          <BaseSelectField v-model="company" label="Компания" :options="companies" />
          <BaseButton v-if="positionWritesEnabled" @click="createRecord">
            <Plus :size="17" /> Добавить должность
          </BaseButton>
        </div>
      </div>

      <BaseCard class="directory-summary">
        <div class="summary-icon"><BriefcaseBusiness :size="19" aria-hidden="true" /></div>
        <div><span>Должности</span><small>Справочник компании</small></div>
        <strong>{{ busy ? '…' : total }}</strong>
      </BaseCard>

      <BaseCard class="directory-register">
        <div class="section-heading">
          <div>
            <h2>Должности</h2>
            <p>Наименования должностей. Количество ставок и вакансии ведутся в штатном расписании.</p>
          </div>
          <span>{{ total }} записей</span>
        </div>

        <div class="directory-desktop">
          <BaseDataTable :rows="positions" :columns="columns" row-key="id" :loading="busy"
            caption="Справочник должностей компании" empty-title="Должностей пока нет"
            empty-description="Добавьте первую должность для выбранной компании.">
            <template #cell-name="{ value }"><strong class="position-name">{{ value }}</strong></template>
            <template #cell-actions="{ row }">
              <div class="row-actions">
                <BaseButton icon-only variant="secondary" :aria-label="'Изменить должность ' + row.name" @click="editRecord(row)">
                  <Pencil :size="15" />
                </BaseButton>
                <BaseButton icon-only variant="secondary" :aria-label="'Удалить должность ' + row.name" @click="deleteCandidate = row">
                  <Trash2 :size="15" />
                </BaseButton>
              </div>
            </template>
          </BaseDataTable>
        </div>

        <div class="directory-mobile">
          <article v-for="row in positions" :key="row.id" class="position-card">
            <div>
              <strong>{{ row.name }}</strong>
              <span>Должность</span>
            </div>
            <div v-if="positionWritesEnabled" class="position-card-actions">
              <BaseButton icon-only variant="secondary" :aria-label="'Изменить должность ' + row.name" @click="editRecord(row)">
                <Pencil :size="15" />
              </BaseButton>
              <BaseButton icon-only variant="secondary" :aria-label="'Удалить должность ' + row.name" @click="deleteCandidate = row">
                <Trash2 :size="15" />
              </BaseButton>
            </div>
          </article>
          <p v-if="!busy && !positions.length" class="mobile-empty">Должностей пока нет.</p>
        </div>

        <BasePagination :page="page" :last-page="pages" :loading="busy"
          caption="Страницы справочника должностей" @previous="page--" @next="page++" />
      </BaseCard>

      <BaseNotice tone="info">
        Подразделения управляются в разделе «Оргструктура и штатка», чтобы не дублировать один и тот же справочник.
      </BaseNotice>
    </template>

    <BaseDialog :open="editorOpen" :title="editingPosition ? 'Изменить должность' : 'Новая должность'" @close="editorOpen = false">
      <PositionForm v-if="company" :key="editingPosition?.id ?? 'new'"
        :company-id="company" :edit="editingPosition" @saved="saved" @cancelled="editorOpen = false" />
    </BaseDialog>

    <BaseDialog :open="!!deleteCandidate" title="Удалить должность" @close="deleteCandidate = null">
      <div class="delete-copy">
        <BaseNotice tone="warning">
          Должность нельзя удалить, если она уже используется в истории назначений или штатном расписании.
        </BaseNotice>
        <p v-if="deleteCandidate"><strong>{{ deleteCandidate.name }}</strong></p>
        <div class="delete-actions">
          <BaseButton variant="secondary" :disabled="deleting" @click="deleteCandidate = null">Отмена</BaseButton>
          <BaseButton :disabled="deleting" @click="confirmDelete">{{ deleting ? 'Удаление…' : 'Удалить' }}</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<style scoped>
.directories-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.directories-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.directories-breadcrumb img{width:15px;height:15px}
.directories-breadcrumb strong{color:var(--color-text);font-weight:500}
.directories-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.directories-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-.025em}
.directories-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.directories-controls{display:flex;align-items:end;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.directories-controls :deep(.base-select-field){width:220px;max-width:220px}
.directory-summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;min-height:74px}
.summary-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:var(--radius-sm);background:var(--color-accent-soft);color:var(--color-primary)}
.directory-summary>div:nth-child(2){display:grid;gap:3px}
.directory-summary span{color:var(--color-text);font-size:12px;font-weight:500}
.directory-summary small{color:var(--color-muted);font-size:10px}
.directory-summary>strong{color:var(--color-text);font-size:20px;font-weight:600}
.directory-register{min-width:0}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.section-heading h2{margin:0;color:var(--color-text);font-size:16px;line-height:1.35;font-weight:600}
.section-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px;line-height:1.4}
.section-heading>span{color:var(--color-muted);font-size:11px}
.position-name{color:var(--color-text);font-size:13px}
.row-actions{display:flex;justify-content:flex-end;gap:7px}
.directory-mobile{display:none}
.position-card{
  display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;
  border:1px solid var(--color-stroke);border-radius:var(--radius-md);
  background:var(--color-surface);box-shadow:var(--shadow-card)
}
.position-card>div:first-child{display:grid;gap:3px;min-width:0}
.position-card strong{color:var(--color-text);font-size:13px;overflow-wrap:anywhere}
.position-card span{color:var(--color-muted);font-size:10px}
.position-card-actions{display:flex;gap:6px;flex:none}
.mobile-empty{margin:0;padding:20px;text-align:center;color:var(--color-muted);font-size:11px}
.directory-register :deep(.base-pagination){margin-top:14px}
.delete-copy{display:grid;gap:var(--space-4)}
.delete-copy p{margin:0}
.delete-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:700px){.directory-desktop{display:none}.directory-mobile{display:grid;gap:8px}}
@media(max-width:650px){
  .directories-controls{display:grid;grid-template-columns:1fr;width:100%}
  .directories-controls :deep(.base-select-field){width:100%;max-width:none}
  .directories-controls :deep(.base-button){width:100%}
  .delete-actions :deep(.base-button){flex:1}
}
</style>
