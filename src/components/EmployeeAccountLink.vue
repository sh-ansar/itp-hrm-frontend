<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'
import { listEmployees } from '../api/personnel'
import { getEmployeeLink, saveEmployeeLink } from '../api/selfService'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'

const props = defineProps<{ company: string; user: number }>()
const ui = useUiPreferencesStore()
const copy = computed(() => ({
  ru: ['Кабинет сотрудника', 'Явная связь с кадровой записью. Имя и email не используются для автоматического сопоставления.', 'Поиск сотрудника', 'Найти', 'Кадровая запись', 'Сохранить связь', 'Не связан', 'Связь учётной записи сохранена.', 'Не удалось выполнить операцию. Обновите данные.'],
  kk: ['Қызметкер кабинеті', 'Кадрлық жазбамен нақты байланыс. Аты мен email автоматты сәйкестендіру үшін пайдаланылмайды.', 'Қызметкерді іздеу', 'Табу', 'Кадрлық жазба', 'Байланысты сақтау', 'Байланыстырылмаған', 'Тіркелгі байланысы сақталды.', 'Әрекет орындалмады. Деректерді жаңартыңыз.'],
  en: ['Employee workspace', 'Explicit personnel record link. Names and emails are never matched automatically.', 'Find employee', 'Search', 'Personnel record', 'Save link', 'Not linked', 'Account link saved.', 'Operation failed. Reload the data.'],
  ka: ['თანამშრომლის კაბინეტი', 'პირდაპირი კავშირი საკადრო ჩანაწერთან. სახელით და email-ით ავტომატური დაკავშირება არ ხდება.', 'თანამშრომლის ძიება', 'ძიება', 'საკადრო ჩანაწერი', 'კავშირის შენახვა', 'არ არის დაკავშირებული', 'ანგარიშის კავშირი შენახულია.', 'ოპერაცია ვერ შესრულდა. განაახლეთ მონაცემები.'],
}[ui.locale]))
const employee = ref(''), revision = ref(0), search = ref(''), error = ref(''), success = ref('')
const options = ref<{ id: string; name: string }[]>([])
const busy = ref(false), ready = ref(false)
let generation = 0
async function find() {
  busy.value = true; error.value = ''
  try {
    const result = await listEmployees(props.company, 1, search.value, 'all', 100)
    options.value = [{ id: '', name: copy.value[6] ?? '' }, ...result.data.map(e => ({ id: e.id, name: `${e.last_name} ${e.first_name} · ${e.personnel_number}` }))]
    if (employee.value && !options.value.some(e => e.id === employee.value)) options.value.push({ id: employee.value, name: employee.value })
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сотрудников' }
  finally { busy.value = false }
}
watch(() => [props.company, props.user], async () => {
  const current = ++generation
  ready.value = false; success.value = ''; employee.value = ''; options.value = []
  try {
    const result = await getEmployeeLink(props.company, props.user)
    if (current !== generation) return
    employee.value = result.data?.employee_id ?? ''; revision.value = result.data?.revision ?? 0
    await find(); ready.value = true
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить связь' }
}, { immediate: true })
async function save() {
  busy.value = true; error.value = ''; success.value = ''
  try {
    const result = await saveEmployeeLink(props.company, props.user, { employee_id: employee.value || null, revision: revision.value })
    revision.value = result.data.revision; success.value = copy.value[7] ?? ''
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить связь. Обновите данные.' }
  finally { busy.value = false }
}
</script>
<template>
  <section class="account-link">
    <h3>{{ copy[0] }}</h3><p>{{ copy[1] }}</p>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice><BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseFormField v-model="search" :label="copy[2] ?? ''" :disabled="busy || !ready" />
    <BaseButton variant="secondary" :disabled="busy || !ready" @click="find">{{ copy[3] }}</BaseButton>
    <BaseSelectField v-model="employee" :label="copy[4] ?? ''" :options="options" :disabled="busy || !ready" />
    <BaseButton :disabled="busy || !ready" @click="save">{{ copy[5] }}</BaseButton>
  </section>
</template>
<style scoped>.account-link{display:grid;gap:var(--space-3);padding-top:var(--space-4);border-top:1px solid var(--color-stroke)}p{overflow-wrap:anywhere}</style>