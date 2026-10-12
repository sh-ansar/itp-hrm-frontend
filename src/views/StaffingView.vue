<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BasePagination from '../components/ui/BasePagination.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import { listCompanies, type CompanyRecord, type PagedResponse } from '../api/organization'
import { apiRequest } from '../api/client'

interface PositionRow extends Record<string, unknown> { id: string; name: string }
const companies=ref<CompanyRecord[]>([])
const company=ref('')
const rows=ref<PositionRow[]>([])
const page=ref(1)
const pages=ref(1)
const total=ref(0)
const busy=ref(false)
const companyBusy=ref(false)
const error=ref('')
const selectedName=computed(()=>companies.value.find(item=>item.id===company.value)?.name ?? '')
let generation=0
async function refresh(){
  companyBusy.value=true
  error.value=''
  try {
    const result=await listCompanies()
    companies.value=result.data
    if(!companies.value.some(item=>item.id===company.value)) company.value=companies.value[0]?.id ?? ''
  } catch(cause) {
    error.value=cause instanceof Error?cause.message:'Не удалось загрузить компании'
    companies.value=[]
    company.value=''
  } finally { companyBusy.value=false }
}
watch(company,()=>{page.value=1})
watch([company,page],async ([id,currentPage])=>{
  const token=++generation
  rows.value=[]
  total.value=0
  pages.value=1
  if(!id){busy.value=false;return}
  busy.value=true
  error.value=''
  try {
    const result=await apiRequest<PagedResponse<PositionRow>>(`/companies/${encodeURIComponent(id)}/positions?page=${currentPage}&per_page=25`)
    if(token!==generation)return
    rows.value=result.data
    total.value=result.meta.total
    pages.value=result.meta.last_page
  } catch(cause) {
    if(token===generation)error.value=cause instanceof Error?cause.message:'Не удалось получить должности'
  } finally {if(token===generation)busy.value=false}
})
onMounted(refresh)
</script>

<template>
  <section class="staffing-page">
    <BasePageHeading title="Должности и штатное расписание" description="Справочник должностей компании. Версии штатного расписания ещё не утверждены.">
      <BaseButton variant="secondary" :disabled="companyBusy" @click="refresh">Обновить</BaseButton>
    </BasePageHeading>
    <BaseNotice tone="info">Пока доступен справочник должностей только для чтения. Штатные единицы, вакансии, версии и утверждение штатного расписания разрабатываются отдельно.</BaseNotice>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseCard>
      <BaseLoadingState v-if="companyBusy" label="Загрузка компаний" />
      <BaseSelectField v-else-if="companies.length" v-model="company" label="Компания" :options="companies" />
      <BaseNotice v-else-if="!error" tone="info">Нет доступных компаний.</BaseNotice>
    </BaseCard>
    <BaseCard v-if="company">
      <div class="heading"><h2>Должности</h2><span class="muted">{{ selectedName }} · Всего: {{ total }}</span></div>
      <BaseDataTable :rows="rows" row-key="id" :loading="busy"
        :columns="[{key:'name',label:'Наименование должности'}]"
        caption="Справочник должностей компании" empty-title="Должностей пока нет"
        empty-description="Для выбранной компании нет доступных должностей." />
      <BasePagination :page="page" :last-page="pages" :loading="busy"
        caption="Страницы справочника должностей" @previous="page--" @next="page++" />
    </BaseCard>
  </section>
</template>

<style scoped>
.staffing-page{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
.heading{display:flex;justify-content:space-between;align-items:center;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-4)}
.heading h2{font-size:var(--font-section-heading);margin:0}
</style>
