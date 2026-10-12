<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import { listCompanies, listDepartments, type CompanyRecord, type DepartmentRecord } from '../api/organization'

const companies = ref<CompanyRecord[]>([])
const departments = ref<DepartmentRecord[]>([])
const selectedCompany = ref('')
const loadingCompanies = ref(false)
const loadingDepartments = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const lastPage = ref(1)
const departmentNames = computed(() => new Map(departments.value.map(item => [item.id, item.name])))
// Hierarchy is assembled only from visible rows on the current page. A missing parent
// is not treated as a root: it may be scoped out or on another page.
const hierarchyRows = computed(() => {
  const lookup = new Map(departments.value.map(item => [item.id, item]))
  const depths = new Map<string, number>()
  const visiting = new Set<string>()
  function depthOf(id: string): number {
    if (depths.has(id)) return depths.get(id)!
    if (visiting.has(id)) return 0 // broken/cyclic legacy data, never recurse forever
    visiting.add(id)
    const node = lookup.get(id)
    const depth = node?.parent_id && lookup.has(node.parent_id)
      ? Math.min(depthOf(node.parent_id) + 1, 12) : 0
    visiting.delete(id)
    depths.set(id, depth)
    return depth
  }
  return departments.value.map(item => ({
    ...item, depth: depthOf(item.id),
    parentLabel: !item.parent_id ? 'Верхний уровень'
      : (departmentNames.value.get(item.parent_id) ?? 'Родитель вне текущего списка'),
  }))
})
let generation = 0

async function loadCompanies() {
  loadingCompanies.value = true
  error.value = ''
  try {
    const result = await listCompanies()
    companies.value = result.data
    selectedCompany.value = companies.value[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить организации'
  } finally { loadingCompanies.value = false }
}

watch(selectedCompany, () => { page.value = 1 })
watch([selectedCompany, page], async ([id, currentPage]) => {
  const current = ++generation
  departments.value = []
  total.value = 0
  if (!id) return
  loadingDepartments.value = true
  error.value = ''
  try {
    const result = await listDepartments(id, currentPage)
    if (current !== generation) return
    departments.value = result.data
    total.value = result.meta.total
    lastPage.value = result.meta.last_page
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Ошибка загрузки подразделений'
  } finally { if (current === generation) loadingDepartments.value = false }
})

onMounted(loadCompanies)
</script>

<template>
  <section class="organization-page">
    <BasePageHeading title="Организационная структура" description="Компании и подразделения, доступные вашей учётной записи">
      <BaseButton variant="secondary" :disabled="loadingCompanies" @click="loadCompanies">Обновить</BaseButton>
    </BasePageHeading>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseCard>
      <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="selector">
        <BaseSelectField v-model="selectedCompany" label="Компания" :options="companies" />
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>
    <BaseCard v-if="selectedCompany">
      <div class="section-title"><h2>Подразделения</h2><span class="muted">Всего: {{ total }}</span></div>
      <BaseNotice v-if="total > departments.length" tone="info">Отображена только текущая страница. Для полной иерархии перейдите по страницам; скрытые подразделения не раскрываются.</BaseNotice>
      <BaseDataTable row-key="id" caption="Подразделения компании"
        :loading="loadingDepartments"
        :columns="[{key:'name',label:'Подразделение'},{key:'parentLabel',label:'Родитель'}]"
        :rows="hierarchyRows" empty-title="Подразделения не найдены"
        empty-description="Для выбранной компании нет доступных подразделений." >
        <template #cell-name="{ row }"><span class="hierarchy-label" :style="{ '--depth': Math.min(Number(row.depth), 12) }">{{ row.depth ? '↳ ' : '' }}{{ row.name }}</span></template>
        <template #cell-parentLabel="{ value }">{{ value }}</template>
      </BaseDataTable>
      <BasePagination :page="page" :last-page="lastPage" :loading="loadingDepartments"
        caption="Страницы подразделений" @previous="page--" @next="page++" />
    </BaseCard>
  </section>
</template>

<style scoped>
.organization-page{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
.section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.section-title{margin-bottom:18px}
.section-title h2{font-size:var(--font-section-heading);margin:0}
.selector{display:grid;gap:8px;max-width:540px}
.hierarchy-label{display:inline-block;padding-inline-start:clamp(0px,calc(var(--depth) * 15px),180px);max-width:100%;overflow-wrap:anywhere}
</style>
