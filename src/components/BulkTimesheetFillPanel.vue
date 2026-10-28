<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { fillMissingTimesheetBulk, type BulkTimesheetFillResponse } from '../api/worktime'

type Employee = { employee_id: string; full_name: string; department: string }
const props = defineProps<{ open: boolean; companyId: string; month: string; employees: Employee[]; initialDate?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const selected = ref<string[]>([])
const search = ref('')
const startDate = ref('')
const endDate = ref('')
const preview = ref<BulkTimesheetFillResponse | null>(null)
const previewSignature = ref('')
const confirmed = ref(false)
const busy = ref(false)
const error = ref('')
const created = ref<number | null>(null)
const monthStart = computed(() => props.month + '-01')
const monthEnd = computed(() => {
  const [year, month] = props.month.split('-').map(Number)
  if (!year || month < 1 || month > 12) return ''
  return props.month + '-' + String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')
})
const filtered = computed(() => props.employees.filter(item =>
  (item.full_name + ' ' + item.department).toLocaleLowerCase().includes(search.value.toLocaleLowerCase().trim())))
const signature = computed(() => JSON.stringify([props.companyId, props.month, [...selected.value].sort(), startDate.value, endDate.value]))
const dates = computed(() => {
  if (!monthEnd.value || startDate.value < monthStart.value || endDate.value > monthEnd.value || startDate.value > endDate.value) return []
  const from = Date.parse(startDate.value + 'T00:00:00Z')
  const to = Date.parse(endDate.value + 'T00:00:00Z')
  const count = Math.round((to - from) / 86400000) + 1
  if (!Number.isInteger(count) || count < 1 || count > 31) return []
  return Array.from({ length: count }, (_, i) => new Date(from + i * 86400000).toISOString().slice(0, 10))
})
const canPreview = computed(() => selected.value.length > 0 && selected.value.length <= 100 && dates.value.length > 0 && !busy.value)
const canApply = computed(() => !busy.value && confirmed.value && !!preview.value
  && previewSignature.value === signature.value && !preview.value.meta.period_locked
  && /^[a-f0-9]{64}$/.test(preview.value.meta.preview_token ?? '')
  && preview.value.data.candidate_count > 0)

watch(() => [props.open, props.companyId, props.month], () => {
  if (!props.open) return
  selected.value = []
  search.value = ''
  startDate.value = props.initialDate?.startsWith(props.month + '-') ? props.initialDate : monthStart.value
  endDate.value = props.initialDate?.startsWith(props.month + '-') ? props.initialDate : monthEnd.value
  preview.value = null
  created.value = null
  previewSignature.value = ''
  confirmed.value = false
  error.value = ''
}, { immediate: true })
watch(signature, () => {
  preview.value = null
  previewSignature.value = ''
  confirmed.value = false
  created.value = null
  error.value = ''
})
function selectShown() {
  selected.value = [...new Set([...selected.value, ...filtered.value.map(item => item.employee_id)])].slice(0, 100)
}
async function run(apply: boolean) {
  if (busy.value || (apply ? !canApply.value : !canPreview.value)) return
  const before = signature.value
  busy.value = true
  error.value = ''
  try {
    const result = await fillMissingTimesheetBulk(props.companyId, {
      month: props.month, employee_ids: [...selected.value], dates: dates.value,
      apply, ...(apply ? { confirm: true, preview_token: preview.value!.meta.preview_token } : {}),
    })
    if (before !== signature.value || !props.open) { error.value = 'Выбор изменился. Выполните проверку повторно.'; return }
    if (apply) {
      created.value = result.meta.created_count
      preview.value = null
      previewSignature.value = ''
      confirmed.value = false
      emit('saved')
    } else {
      preview.value = result
      previewSignature.value = before
    }
  } catch (cause) {
    const status = (cause as { status?: number })?.status
    if (status === 409) {
      preview.value = null
      previewSignature.value = ''
      confirmed.value = false
    }
    error.value = status === 409 ? 'Данные изменились с момента проверки или период закрыт. Выполните проверку повторно.'
      : status === 422 ? 'Проверьте даты, сотрудников и календарь компании.'
      : 'Ошибка проверки или сохранения. Обновите данные и повторите.'
  } finally { busy.value = false }
}
</script>

<template>
  <BaseDrawer :open="open" title="Массовое заполнение табеля"
    description="Только пустые явки: не затрагивает уже введённые дни, отпуска и неявки."
    close-label="Закрыть" @close="!busy && emit('close')">
    <div class="bulk-fill">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="created !== null" tone="success">Создано записей: {{ created }}</BaseNotice>
      <label class="bulk-fill-search">
        <span>Поиск сотрудников</span>
        <input v-model="search" type="search" placeholder="ФИО или подразделение" :disabled="busy" />
      </label>
      <div class="bulk-fill-selection">
        <BaseButton variant="secondary" :disabled="busy" @click="selectShown">Выбрать всех показанных</BaseButton>
        <BaseButton variant="secondary" :disabled="busy || selected.length === 0" @click="selected = []">Снять выбор</BaseButton>
        <span>Выбрано: <strong>{{ selected.length }}</strong></span>
      </div>
      <div class="bulk-fill-people" role="group" aria-label="Выбор сотрудников">
        <label v-for="person in filtered" :key="person.employee_id" class="bulk-fill-person">
          <input v-model="selected" type="checkbox" :value="person.employee_id" :disabled="busy" />
          <span><strong>{{ person.full_name }}</strong><small>{{ person.department }}</small></span>
        </label>
        <p v-if="!filtered.length">Сотрудники не найдены.</p>
      </div>
      <div class="bulk-fill-dates">
        <BaseFormField v-model="startDate" label="С даты" type="date" :disabled="busy" />
        <BaseFormField v-model="endDate" label="По дату" type="date" :disabled="busy" />
      </div>
      <p class="bulk-fill-hint">Сначала проверьте расчёт, затем подтвердите сохранение. Выходные, даты до трудоустройства, отпуска, неявки и уже заполненные дни пропускаются.</p>
      <BaseNotice v-if="!canPreview && !busy && created === null" tone="info">
        Выберите сотрудников и корректный диапазон дат внутри месяца.
      </BaseNotice>
      <div v-if="preview" class="bulk-fill-preview" aria-live="polite">
        <strong>Будет создано записей: {{ preview.data.candidate_count }}</strong>
        <dl>
          <div><dt>Уже заполнено</dt><dd>{{ preview.data.already_recorded }}</dd></div>
          <div><dt>До трудоустройства</dt><dd>{{ preview.data.outside_employment }}</dd></div>
          <div><dt>Отпуск</dt><dd>{{ preview.data.approved_leave }}</dd></div>
          <div><dt>Неявка</dt><dd>{{ preview.data.recorded_absence }}</dd></div>
          <div><dt>Выходные и праздники</dt><dd>{{ preview.data.nonworking_date }}</dd></div>
          <div><dt>Будущие даты (не отмечаются как явка)</dt><dd>{{ preview.data.future_date ?? 0 }}</dd></div>
        </dl>
        <label class="bulk-fill-confirm">
          <input v-model="confirmed" type="checkbox" :disabled="busy || preview.meta.period_locked || !preview.data.candidate_count" />
          <span>Подтверждаю заполнение только отсутствующих явок</span>
        </label>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="emit('close')">Закрыть</BaseButton>
      <BaseButton variant="secondary" :disabled="!canPreview" @click="run(false)">
        {{ busy ? 'Проверка…' : 'Проверить' }}
      </BaseButton>
      <BaseButton :disabled="!canApply" @click="run(true)">
        {{ busy ? 'Сохранение…' : 'Заполнить табель' }}
      </BaseButton>
    </template>
  </BaseDrawer>
</template>
<style scoped>
.bulk-fill{display:grid;gap:14px;min-width:0}
.bulk-fill-search{display:grid;gap:6px;font-size:12px}
.bulk-fill-search input{width:100%;border-radius:8px;border:1px solid var(--color-stroke);background:var(--color-surface);color:var(--color-text);padding:9px;font:inherit}
.bulk-fill-selection{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.bulk-fill-selection span{font-size:12px;color:var(--color-muted)}
.bulk-fill-people{max-height:260px;overflow:auto;border:1px solid var(--color-stroke);border-radius:8px;display:grid;padding:4px}
.bulk-fill-person{display:flex;align-items:start;gap:9px;padding:8px;border-bottom:1px solid var(--color-stroke)}
.bulk-fill-person:last-child{border:0}
.bulk-fill-person input{margin-top:3px;accent-color:var(--color-primary)}
.bulk-fill-person span{min-width:0;display:grid;gap:2px}
.bulk-fill-person strong{font-weight:500;font-size:12px}
.bulk-fill-person small,.bulk-fill-hint{font-size:11px;color:var(--color-muted);line-height:1.5}
.bulk-fill-dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.bulk-fill-hint{margin:0}
.bulk-fill-preview{display:grid;gap:10px;padding:12px;border:1px solid var(--color-stroke);border-radius:8px}
.bulk-fill-preview>strong{font-size:14px}
.bulk-fill-preview dl{display:grid;gap:6px;margin:0}
.bulk-fill-preview dl>div{display:flex;justify-content:space-between;gap:12px;font-size:12px}
.bulk-fill-preview dt{color:var(--color-muted)}
.bulk-fill-preview dd{margin:0;font-weight:600}
.bulk-fill-confirm{display:flex;gap:8px;align-items:start;font-size:12px}
.bulk-fill-confirm input{margin-top:3px}
@media(max-width:540px){.bulk-fill-dates{grid-template-columns:1fr}}
</style>
