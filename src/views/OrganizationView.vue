<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { listCompanies, listDepartments, type CompanyRecord, type DepartmentRecord } from '../api/organization'

const companies = ref<CompanyRecord[]>([])
const departments = ref<DepartmentRecord[]>([])
const selectedCompany = ref('')
const loadingCompanies = ref(false)
const loadingDepartments = ref(false)
const error = ref('')
const total = ref(0)
const departmentNames = computed(() => new Map(departments.value.map(item => [item.id, item.name])))
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

watch(selectedCompany, async (id) => {
  const current = ++generation
  departments.value = []
  total.value = 0
  if (!id) return
  loadingDepartments.value = true
  error.value = ''
  try {
    const result = await listDepartments(id)
    if (current !== generation) return
    departments.value = result.data
    total.value = result.meta.total
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Ошибка загрузки подразделений'
  } finally { if (current === generation) loadingDepartments.value = false }
})

onMounted(loadCompanies)
</script>

<template>
  <section class="organization-page">
    <div class="page-heading">
      <div>
        <h1 class="page-title">Организационная структура</h1>
        <p class="muted">Компании и подразделения, доступные вашей учётной записи</p>
      </div>
      <BaseButton variant="secondary" :disabled="loadingCompanies" @click="loadCompanies">Обновить</BaseButton>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseCard>
      <BaseLoadingState v-if="loadingCompanies" label="Загрузка компаний" />
      <div v-else-if="companies.length" class="selector">
        <label for="organization-company">Компания</label>
        <select id="organization-company" v-model="selectedCompany">
          <option v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</option>
        </select>
      </div>
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний. Обратитесь к администратору доступа.</BaseNotice>
    </BaseCard>
    <BaseCard v-if="selectedCompany">
      <div class="section-title"><h2>Подразделения</h2><span class="muted">Всего: {{ total }}</span></div>
      <BaseDataTable row-key="id" caption="Подразделения компании"
        :loading="loadingDepartments"
        :columns="[{key:'name',label:'Название подразделения'},{key:'parent_id',label:'Родительское подразделение'}]"
        :rows="departments" empty-title="Подразделения не найдены"
        empty-description="Для выбранной компании нет доступных подразделений." >
        <template #cell-parent_id="{ value }">{{ !value ? 'Корневое подразделение' : (departmentNames.get(String(value)) ?? 'Родитель вне доступного списка') }}</template>
      </BaseDataTable>
      <p v-if="total > departments.length" class="muted paging-note">
        Показаны первые {{ departments.length }} из {{ total }} подразделений. Постраничная навигация появится в следующем этапе.
      </p>
    </BaseCard>
  </section>
</template>

<style scoped>
.organization-page{display:grid;gap:20px}
.page-heading,.section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.page-heading p{margin:0}
.section-title{margin-bottom:18px}
.section-title h2{font-size:20px;margin:0}
.selector{display:grid;gap:8px;max-width:540px}
.selector label{font-size:14px;font-weight:600;color:var(--color-text)}
.selector select{min-height:var(--control-height);width:100%;padding:10px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit}
.selector select:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.paging-note{font-size:13px;line-height:1.5;margin:14px 0 0}
@media(max-width:600px){.page-heading{align-items:flex-start}.page-heading :deep(button){width:100%}}
</style>
