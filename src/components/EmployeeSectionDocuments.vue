<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import { documentFileUrl, listDocuments, type DocumentRow, type DocumentSection } from '../api/documents'

const props = defineProps<{
  companyId: string
  employeeId: string
  section: DocumentSection
}>()
const rows = ref<DocumentRow[]>([])
const page = ref(1)
const lastPage = ref(1)
const busy = ref(false)
const error = ref('')
let generation = 0
async function load() {
  const current = ++generation
  busy.value = true
  error.value = ''
  try {
    const response = await listDocuments(props.companyId, page.value, '', props.employeeId, '', {
      section_key: props.section,
    })
    if (current !== generation) return
    rows.value = response.data.filter(row => row.employee_id === props.employeeId
      && row.section_key === props.section)
    lastPage.value = response.meta.last_page
  } catch (cause) {
    if (current !== generation) return
    rows.value = []
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить документы раздела'
  } finally {
    if (current === generation) busy.value = false
  }
}
watch(() => [props.companyId, props.employeeId, props.section], () => {
  page.value = 1
  void load()
}, { immediate: true })
watch(page, () => { void load() })
</script>

<template>
  <section v-if="rows.length || error" class="employee-section-documents" aria-label="Документы раздела">
    <div class="employee-section-documents-heading">
      <h3>Документы раздела</h3>
      <RouterLink to="/documents">Все документы</RouterLink>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <ul v-else>
      <li v-for="row in rows" :key="row.id">
        <div>
          <strong>{{ row.title }}</strong>
          <span v-if="row.description">{{ row.description }}</span>
          <span v-if="row.tags?.length">{{ row.tags.join(' · ') }}</span>
        </div>
        <a v-if="row.has_file" :href="documentFileUrl(companyId, row.id)"
          target="_blank" rel="noopener">Посмотреть PDF</a>
        <span v-else>PDF не прикреплён</span>
      </li>
    </ul>
    <div v-if="lastPage > 1" class="employee-section-documents-pagination">
      <BaseButton variant="secondary" size="sm" :disabled="busy || page <= 1" @click="page--">Назад</BaseButton>
      <span>{{ page }} / {{ lastPage }}</span>
      <BaseButton variant="secondary" size="sm" :disabled="busy || page >= lastPage" @click="page++">Далее</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.employee-section-documents{display:grid;gap:10px;padding:12px 0;border-top:1px solid var(--color-stroke);min-width:0}
.employee-section-documents-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.employee-section-documents h3{margin:0;font-size:14px;font-weight:600}
.employee-section-documents-heading a{color:var(--color-text);font-size:12px;text-decoration:underline}
.employee-section-documents>ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.employee-section-documents li{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--color-stroke);padding:6px 0;font-size:12px}
.employee-section-documents li>div{display:grid;gap:3px;min-width:0}
.employee-section-documents li strong{color:var(--color-text);font-weight:600}
.employee-section-documents li span{color:var(--color-muted);overflow-wrap:anywhere}
.employee-section-documents li a{color:var(--color-text);text-decoration:underline;text-underline-offset:3px}
.employee-section-documents-pagination{display:flex;align-items:center;justify-content:flex-end;gap:9px}
</style>
