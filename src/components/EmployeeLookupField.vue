<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseSearchField from './ui/BaseSearchField.vue'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
const { tr } = useWorkspaceI18n()
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { listEmployees, type EmployeeRecord } from '../api/personnel'

const props = withDefaults(defineProps<{
  companyId: string
  modelValue: string
  required?: boolean
  disabled?: boolean
  allowAll?: boolean
  compact?: boolean
}>(), { required: false, disabled: false, allowAll: false, compact: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const query = ref('')
const employees = ref<EmployeeRecord[]>([])
const loading = ref(false)
const total = ref(0)
const error = ref('')
let generation = 0

const options = computed(() => [
  ...(props.allowAll ? [{ id: '', name: tr('Все сотрудники') }] : []),
  ...employees.value.map(item => ({
    id: item.id,
    name: [item.last_name, item.first_name, item.middle_name].filter(Boolean).join(' ')
      + ' · ' + item.personnel_number,
  })),
])

async function lookup() {
  const current = ++generation
  loading.value = true
  error.value = ''
  total.value = 0
  employees.value = []
  emit('update:modelValue', '')
  try {
    const result = await listEmployees(props.companyId, 1, query.value.trim())
    if (current !== generation) return
    employees.value = result.data
    total.value = result.meta.total
    if (result.data.length === 1) emit('update:modelValue', result.data[0].id)
  } catch (cause) {
    if (current !== generation) return
    error.value = cause instanceof Error ? cause.message : 'Не удалось выполнить поиск сотрудников'
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(() => props.companyId, () => {
  query.value = ''
  lookup()
}, { immediate: true })
</script>

<template>
  <div class="lookup" :class="{ 'lookup--compact': compact }">
    <div class="search-row" @keydown.enter.prevent="!loading && !disabled && lookup()">
      <BaseSearchField v-model="query" label="Поиск сотрудника" placeholder="ФИО или табельный номер" :disabled="loading || disabled" />
      <BaseButton type="button" variant="secondary" :disabled="loading || disabled" @click="lookup">
        <Search :size="16" /> {{ loading ? tr('Поиск…') : tr('Найти') }}
      </BaseButton>
    </div>
    <BaseSelectField
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
      label="Сотрудник"
      :hide-label="compact"
      :placeholder="allowAll ? '' : 'Выберите сотрудника'"
      :options="options"
      :required="required"
      :disabled="disabled || loading"
    />
    <p v-if="total > employees.length" class="hint">Показаны первые {{ employees.length }} из {{ total }}. Уточните поиск, чтобы выбрать нужного сотрудника.</p>
    <p v-else-if="!loading && total === 0 && !error" class="hint">Сотрудников не найдено.</p>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
  </div>
</template>

<style scoped>
.lookup{display:grid;gap:var(--space-3);min-width:0}
.search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:var(--space-2)}
.search-row :deep(button){display:inline-flex;align-items:center;gap:8px}
.hint{margin:0;font-size:12px;color:var(--color-muted);line-height:1.5}
@media(max-width:480px){.search-row{grid-template-columns:1fr}.search-row :deep(button){justify-content:center}}
.lookup--compact{grid-template-columns:minmax(0,1.4fr) minmax(170px,1fr);align-items:center;gap:10px}
.lookup--compact .search-row{align-items:center}
.lookup--compact :deep(.registry-search){max-width:none}
.lookup--compact :deep(.base-select-field){max-width:none}
.lookup--compact>.hint,.lookup--compact>.base-notice{grid-column:1/-1}
@media(max-width:650px){.lookup--compact{grid-template-columns:minmax(0,1fr)}.lookup--compact .search-row{grid-template-columns:minmax(0,1fr) auto}}
</style>
