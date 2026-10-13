<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
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
    if (!companies.value.some(item => item.id === company.value)) {
      company.value = companies.value[0]?.id ?? ''
    }
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
    <BasePageHeading
      title="Справочники"
      description="Кадровые классификаторы, которые используются в карточках сотрудников и штатном расписании."
    >
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

    <BaseCard>
      <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="toolbar">
        <BaseSelectField v-model="company" label="Компания" :options="companies" />
        <div class="summary">
          <span>Должностей</span>
          <strong>{{ total }}</strong>
          <small>{{ selectedCompany?.name }}</small>
        </div>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>

    <BaseCard v-if="company">
      <div class="section-heading">
        <div class="title-block">
          <div class="section-icon"><BriefcaseBusiness :size="21" /></div>
          <div>
            <h2>Должности</h2>
            <p class="muted">Наименования должностей без количества ставок. Ставки задаются в штатном расписании.</p>
          </div>
        </div>
        <BaseButton v-if="positionWritesEnabled" @click="createRecord"><Plus :size="17" /> Добавить должность</BaseButton>
      </div>

      <BaseDataTable
        :rows="positions"
        :columns="columns"
        row-key="id"
        :loading="busy"
        caption="Справочник должностей компании"
        empty-title="Должностей пока нет"
        empty-description="Добавьте первую должность для выбранной компании."
      >
        <template #cell-name="{ value }"><strong>{{ value }}</strong></template>
        <template #cell-actions="{ row }">
          <div class="row-actions">
            <BaseButton variant="secondary" @click="editRecord(row)"><Pencil :size="15" /> Изменить</BaseButton>
            <BaseButton variant="secondary" @click="deleteCandidate = row"><Trash2 :size="15" /> Удалить</BaseButton>
          </div>
        </template>
      </BaseDataTable>

      <BasePagination
        :page="page"
        :last-page="pages"
        :loading="busy"
        caption="Страницы справочника должностей"
        @previous="page--"
        @next="page++"
      />
    </BaseCard>

    <BaseDialog :open="editorOpen" :title="editingPosition ? 'Изменить должность' : 'Новая должность'" @close="editorOpen = false">
      <PositionForm
        v-if="company"
        :key="editingPosition?.id ?? 'new'"
        :company-id="company"
        :edit="editingPosition"
        @saved="saved"
        @cancelled="editorOpen = false"
      />
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
.directories-page{display:grid;gap:var(--space-4);min-width:0;max-width:100%;overflow-x:clip}
.directories-page>*{min-width:0;max-width:100%}
.toolbar{display:flex;align-items:end;justify-content:space-between;gap:20px;flex-wrap:wrap;min-width:0;max-width:100%}
.toolbar :deep(.base-select-field){flex:1 1 280px;min-width:0;max-width:100%}
.summary{display:grid;gap:2px;min-width:0;max-width:100%;padding:10px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.summary span,.summary small{font-size:11px;color:var(--color-muted)}
.summary strong{font-size:20px}
.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.title-block{display:flex;gap:12px;align-items:flex-start;min-width:0;max-width:100%}
.title-block>div:last-child{min-width:0;max-width:100%}
.title-block .muted{overflow-wrap:anywhere}
.section-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--color-accent-soft);color:var(--color-primary)}
h2{margin:0;font-size:var(--font-section-heading)}
.title-block .muted{margin:6px 0 0;font-size:13px}
.row-actions{display:flex;gap:8px;flex-wrap:wrap}
.delete-copy{display:grid;gap:var(--space-4)}
.delete-copy p{margin:0}
.delete-actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.toolbar{display:grid;grid-template-columns:minmax(0,1fr)}.summary{width:100%}.section-heading :deep(button){width:100%}.delete-actions :deep(button){flex:1}}
</style>
