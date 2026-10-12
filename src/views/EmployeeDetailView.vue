<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import { getEmployee, type EmployeeDetail } from '../api/personnel'

const route = useRoute()
const profile = ref<EmployeeDetail | null>(null)
const loading = ref(false)
const error = ref('')
let generation = 0
const columns = [
  { key: 'department_name', label: 'Подразделение' },
  { key: 'position_name', label: 'Должность' },
  { key: 'valid_from', label: 'С даты' },
  { key: 'valid_to', label: 'По дату' },
]
async function load() {
  const current = ++generation
  const company = String(route.params.company ?? '')
  const employee = String(route.params.employee ?? '')
  loading.value = true
  error.value = ''
  profile.value = null
  try {
    const result = await getEmployee(company, employee)
    if (current === generation) profile.value = result
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось открыть карточку сотрудника'
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(() => [route.params.company, route.params.employee], load)
onMounted(load)
</script>

<template>
  <section class="employee-profile">
    <BasePageHeading title="Карточка сотрудника" description="Кадровые сведения и доступная история назначений">
      <RouterLink class="back-link" to="/employees">К реестру</RouterLink>
      <BaseButton variant="secondary" :disabled="loading" @click="load">Обновить</BaseButton>
    </BasePageHeading>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loading" label="Загрузка карточки сотрудника" />
    <template v-else-if="profile">
      <BaseCard>
        <div class="profile-grid">
          <div><span class="field-label">ФИО</span><strong>{{ profile.data.last_name }} {{ profile.data.first_name }} {{ profile.data.middle_name ?? '' }}</strong></div>
          <div><span class="field-label">Табельный номер</span><strong>{{ profile.data.personnel_number }}</strong></div>
        </div>
      </BaseCard>
      <BaseCard>
        <h2>История назначений</h2>
        <BaseDataTable :columns="columns" :rows="profile.assignments" row-key="id"
          caption="Доступная история назначений" empty-title="Назначений не найдено"
          empty-description="Для сотрудника нет доступных кадровых назначений.">
          <template #cell-valid_to="{ value }">{{ value ?? 'По настоящее время' }}</template>
        </BaseDataTable>
        <BaseNotice v-if="profile.meta.assignments_truncated" tone="info">Отображены первые 100 назначений. Полная история требует отдельного просмотра.</BaseNotice>
      </BaseCard>
    </template>
  </section>
</template>

<style scoped>
.employee-profile{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-5)}
.profile-grid>div{display:grid;gap:var(--space-2)}
.field-label{font-size:var(--font-caption-size);color:var(--color-muted)}
strong{font-size:var(--font-body-size);overflow-wrap:anywhere}
h2{font-size:var(--font-section-heading);margin:0 0 var(--space-4)}
.back-link{display:inline-flex;align-items:center;color:var(--color-primary);font-weight:600;padding:var(--space-2)}
.back-link:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:600px){.profile-grid{grid-template-columns:minmax(0,1fr)}}
</style>
