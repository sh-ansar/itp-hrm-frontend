<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarRange, Check, Layers3, RotateCcw, UsersRound } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSearchField from './ui/BaseSearchField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { localTodayISO } from '../utils/localDate'
import {
  listWorkScheduleTemplates, getWorkSchedulePattern, saveWorkSchedulePattern, bulkPlanWorkSchedule,
  type WorkScheduleTemplate, type WorkScheduleCycleDay, type WorkSchedulePattern,
  type BulkWorktimePlanResponse,
} from '../api/worktime'

type EmployeeOption = { employee_id: string; full_name: string; department: string }
const props = defineProps<{
  open: boolean
  companyId: string
  employees: EmployeeOption[]
  initialScheduleId?: string
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const templates = ref<WorkScheduleTemplate[]>([])
const scheduleId = ref('')
const scheduleRevision = ref(0)
const canEditPatterns = ref(false)
const busy = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')
const view = ref<'assign' | 'pattern'>('assign')
const calendarPolicy = ref<WorkSchedulePattern['calendar_policy']>('cycle')
const cycleDays = ref<WorkScheduleCycleDay[]>([])
const from = ref(localTodayISO())
const to = ref(localTodayISO().slice(0, 4) + '-12-31')
const offset = ref('0')
const replaceFuture = ref(false)
const selectedIds = ref<string[]>([])
const employeeQuery = ref('')
const department = ref('')
const confirmed = ref(false)
const preview = ref<BulkWorktimePlanResponse | null>(null)
const previewSignature = ref('')
let loadingGeneration = 0

const scheduleOptions = computed(() => templates.value.map(item => ({
  id: item.id, name: item.name + ' · ' + item.code,
})))
const currentTemplate = computed(() => templates.value.find(item => item.id === scheduleId.value) ?? null)
const departmentOptions = computed(() => [
  { id: '', name: 'Все подразделения' },
  ...[...new Set(props.employees.map(item => item.department).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ru')).map(name => ({ id: name, name })),
])
const shownEmployees = computed(() => {
  const q = employeeQuery.value.trim().toLocaleLowerCase('ru')
  return props.employees.filter(item => (!department.value || item.department === department.value)
    && (!q || (item.full_name + ' ' + item.department).toLocaleLowerCase('ru').includes(q)))
})
const offsetOptions = computed(() => cycleDays.value.map((day, index) => ({
  id: String(index), name: `День ${index + 1} · ${day.minutes ? day.minutes / 60 + ' ч' : 'выходной'}`,
})))
const rangeIsValid = computed(() => {
  const diff = (Date.parse(to.value + 'T00:00:00Z') - Date.parse(from.value + 'T00:00:00Z')) / 86400000
  return Number.isInteger(diff) && diff >= 0 && diff <= 365
})
const signature = computed(() => JSON.stringify([
  props.companyId, scheduleId.value, scheduleRevision.value, [...selectedIds.value].sort(),
  from.value, to.value, offset.value, replaceFuture.value,
]))
const canPreview = computed(() => !busy.value && !loading.value && !!scheduleId.value
  && scheduleRevision.value > 0 && cycleDays.value.length > 0
  && selectedIds.value.length > 0 && selectedIds.value.length <= 200 && rangeIsValid.value)
const canApply = computed(() => canPreview.value && confirmed.value && preview.value !== null
  && previewSignature.value === signature.value && preview.value.meta.can_apply
  && /^[a-f0-9]{64}$/.test(preview.value.meta.preview_token))
const previewMetrics = computed(() => preview.value?.data ?? null)
const totalHours = computed(() => Math.round((previewMetrics.value?.planned_minutes ?? 0) / 60 * 100) / 100)

function resetMessages() { error.value = ''; success.value = '' }
function choosePreset(preset: 'office' | 'shift' | 'six') {
  if (preset === 'office') {
    calendarPolicy.value = 'company'
    cycleDays.value = Array.from({ length: 7 }, (_, i) => ({
      minutes: i < 5 ? 480 : 0, shift_code: null,
    }))
  } else if (preset === 'six') {
    calendarPolicy.value = 'company'
    cycleDays.value = Array.from({ length: 7 }, (_, i) => ({
      minutes: i < 6 ? 420 : 0, shift_code: null,
    }))
  } else {
    calendarPolicy.value = 'cycle'
    cycleDays.value = [
      { minutes: 720, shift_code: 'D' }, { minutes: 720, shift_code: 'D' },
      { minutes: 0, shift_code: null }, { minutes: 0, shift_code: null },
    ]
  }
}
function setCycleMinutes(index: number, input: string) {
  const value = Number(input)
  cycleDays.value = cycleDays.value.map((day, i) => i === index
    ? { ...day, minutes: Number.isFinite(value) ? Math.round(value * 60) : 0 } : day)
}
function setCycleCode(index: number, input: string) {
  cycleDays.value = cycleDays.value.map((day, i) => i === index
    ? { ...day, shift_code: input.trim() || null } : day)
}
function addCycleDay() {
  if (cycleDays.value.length < 60) cycleDays.value = [...cycleDays.value, { minutes: 480, shift_code: 'D' }]
}
function removeCycleDay(index: number) {
  if (cycleDays.value.length > 1) cycleDays.value = cycleDays.value.filter((_, i) => i !== index)
}
function endOfYear() { to.value = from.value.slice(0, 4) + '-12-31' }
function selectShown() {
  selectedIds.value = [...new Set([...selectedIds.value, ...shownEmployees.value.map(row => row.employee_id)])].slice(0, 200)
}
function formatDate(value: string) { return value.slice(8, 10) + '.' + value.slice(5, 7) }
function handleApiError(cause: unknown, fallback: string) {
  const status = (cause as { status?: number })?.status
  if (status === 409) error.value = 'Данные изменились или есть конфликт. Обновите предпросмотр.'
  else if (status === 403) error.value = 'Недостаточно прав для выбранных сотрудников.'
  else if (status === 422) error.value = 'Проверьте период, график, сотрудников и производственный календарь.'
  else error.value = cause instanceof Error ? cause.message : fallback
}

async function loadPattern() {
  const current = ++loadingGeneration
  if (!props.open || !props.companyId || !scheduleId.value) return
  loading.value = true
  try {
    const result = await getWorkSchedulePattern(props.companyId, scheduleId.value)
    if (current !== loadingGeneration) return
    scheduleRevision.value = result.meta.schedule_revision
    if (result.data) {
      calendarPolicy.value = result.data.calendar_policy
      cycleDays.value = result.data.days.map(item => ({ ...item }))
    } else {
      choosePreset(currentTemplate.value?.schedule_type === 'standard' ? 'office' : 'shift')
    }
    offset.value = '0'
  } catch (cause) {
    if (current !== loadingGeneration) return
    cycleDays.value = []
    handleApiError(cause, 'Не удалось загрузить шаблон графика')
  } finally {
    if (current === loadingGeneration) loading.value = false
  }
}
async function loadTemplates() {
  if (!props.open || !props.companyId) return
  const current = ++loadingGeneration
  loading.value = true
  resetMessages()
  try {
    const result = await listWorkScheduleTemplates(props.companyId)
    if (current !== loadingGeneration) return
    templates.value = result.data
    canEditPatterns.value = result.meta.can_edit_patterns
    scheduleId.value = templates.value.find(item => item.id === props.initialScheduleId)?.id
      ?? templates.value.find(item => item.id === scheduleId.value)?.id
      ?? templates.value[0]?.id ?? ''
    await loadPattern()
  } catch (cause) {
    if (current !== loadingGeneration) return
    handleApiError(cause, 'Не удалось загрузить справочник графиков')
    templates.value = []
  } finally {
    if (current === loadingGeneration) loading.value = false
  }
}
async function savePattern() {
  if (busy.value || !canEditPatterns.value || !scheduleId.value || !scheduleRevision.value) return
  if (calendarPolicy.value === 'company' && cycleDays.value.length !== 7) {
    error.value = 'Для календарного графика требуется 7 дней — с понедельника по воскресенье.'
    return
  }
  if (!cycleDays.value.some(day => day.minutes > 0)
    || cycleDays.value.some(day => !Number.isInteger(day.minutes) || day.minutes < 0 || day.minutes > 1440)) {
    error.value = 'Укажите рабочие часы от 0 до 24. Хотя бы один день должен быть рабочим.'
    return
  }
  busy.value = true
  resetMessages()
  try {
    await saveWorkSchedulePattern(props.companyId, scheduleId.value, scheduleRevision.value,
      calendarPolicy.value, cycleDays.value.map(day => ({ ...day, shift_code: day.shift_code || null })))
    await loadTemplates()
    success.value = 'Новая версия шаблона сохранена. Ранее назначенные планы не изменены.'
  } catch (cause) {
    handleApiError(cause, 'Не удалось сохранить цикл')
  } finally { busy.value = false }
}
async function submitPlan(apply: boolean) {
  if (busy.value || (apply ? !canApply.value : !canPreview.value)) return
  const before = signature.value
  busy.value = true
  resetMessages()
  try {
    const result = await bulkPlanWorkSchedule(props.companyId, scheduleId.value, {
      employee_ids: [...selectedIds.value], from: from.value, to: to.value,
      schedule_revision: scheduleRevision.value,
      cycle_offset: Number(offset.value), replace_future_plans: replaceFuture.value, apply,
      ...(apply ? { confirm: true, preview_token: preview.value!.meta.preview_token } : {}),
    })
    if (before !== signature.value || !props.open) {
      error.value = 'Выбор изменился. Выполните проверку заново.'
      return
    }
    if (apply) {
      preview.value = null
      confirmed.value = false
      success.value = `График назначен: ${result.data.employee_count} сотрудников, ${result.data.date_count} дней.`
      emit('saved')
    } else {
      preview.value = result
      previewSignature.value = before
    }
  } catch (cause) {
    preview.value = null
    confirmed.value = false
    handleApiError(cause, 'Не удалось проверить или применить график')
  } finally { busy.value = false }
}
watch(signature, () => { preview.value = null; previewSignature.value = ''; confirmed.value = false })
watch(scheduleId, () => { if (props.open) void loadPattern() })
watch(() => [props.open, props.companyId], () => {
  if (!props.open) return
  selectedIds.value = []
  employeeQuery.value = ''
  department.value = ''
  view.value = 'assign'
  from.value = localTodayISO()
  endOfYear()
  replaceFuture.value = false
  void loadTemplates()
}, { immediate: true })
</script>

<template>
  <BaseDrawer :open="open" title="Планирование графиков"
    description="Создание графика на период · отдельно от фактических явок"
    @close="!busy && emit('close')">
    <div class="cycle-planner">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
      <BaseNotice v-if="loading" tone="info">Загрузка графиков…</BaseNotice>

      <BaseSelectField v-model="scheduleId" label="Шаблон графика" :options="scheduleOptions"
        :disabled="busy || loading || !templates.length" />
      <div v-if="canEditPatterns" class="planner-tabs" role="tablist" aria-label="Режим планирования">
        <button type="button" role="tab" :aria-selected="view === 'assign'"
          :class="{ active: view === 'assign' }" @click="view = 'assign'">
          <UsersRound :size="16" aria-hidden="true" /> Назначение
        </button>
        <button type="button" role="tab" :aria-selected="view === 'pattern'"
          :class="{ active: view === 'pattern' }" @click="view = 'pattern'">
          <Layers3 :size="16" aria-hidden="true" /> Конструктор
        </button>
      </div>

      <template v-if="view === 'pattern' && canEditPatterns">
        <section class="planner-section">
          <h3>Шаблон сменного цикла</h3>
          <p>Новые версии шаблона не меняют уже сохранённые планы сотрудников.</p>
          <div class="preset-buttons">
            <BaseButton variant="secondary" @click="choosePreset('office')">Офисный 5/2</BaseButton>
            <BaseButton variant="secondary" @click="choosePreset('shift')">Сменный 2/2</BaseButton>
            <BaseButton variant="secondary" @click="choosePreset('six')">Шестидневный</BaseButton>
          </div>
          <BaseSelectField v-model="calendarPolicy" label="Правило повторения"
            :options="[{ id: 'company', name: 'Неделя с учётом праздников компании' },
              { id: 'cycle', name: 'Непрерывный цикл смен и выходных' }]" :disabled="busy" />
          <div class="planner-days">
            <div v-for="(day, index) in cycleDays" :key="index" class="planner-day">
              <span class="planner-day-number">{{ calendarPolicy === 'company'
                ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index] : 'День ' + (index + 1) }}</span>
              <label>
                <span>Часов</span>
                <input type="number" min="0" max="24" step="1" :value="day.minutes / 60"
                  :disabled="busy" @input="setCycleMinutes(index, ($event.target as HTMLInputElement).value)" />
              </label>
              <label>
                <span>Смена</span>
                <input type="text" maxlength="32" placeholder="—" :value="day.shift_code ?? ''"
                  :disabled="busy || day.minutes === 0"
                  @input="setCycleCode(index, ($event.target as HTMLInputElement).value)" />
              </label>
              <button type="button" class="remove-cycle-day" :disabled="busy || cycleDays.length <= 1"
                :aria-label="'Удалить день ' + (index + 1)" @click="removeCycleDay(index)">×</button>
            </div>
          </div>
          <BaseButton v-if="calendarPolicy === 'cycle'" variant="secondary"
            :disabled="busy || cycleDays.length >= 60" @click="addCycleDay">
            Добавить день цикла
          </BaseButton>
          <BaseNotice tone="info">0 часов — выходной. Для недельного графика дни идут с понедельника.
            Для непрерывного цикла первый день — дата начала назначения с выбранной фазой.</BaseNotice>
        </section>
      </template>

      <template v-else>
        <section class="planner-section">
          <h3>Сотрудники</h3>
          <BaseSearchField v-model="employeeQuery" label="Поиск сотрудников"
            placeholder="ФИО или подразделение" :disabled="busy" />
          <BaseSelectField v-model="department" label="Подразделение"
            :options="departmentOptions" :disabled="busy" />
          <div class="planner-selection">
            <BaseButton variant="secondary" :disabled="busy || !shownEmployees.length"
              @click="selectShown">Выбрать показанных</BaseButton>
            <BaseButton variant="secondary" :disabled="busy || !selectedIds.length"
              @click="selectedIds = []">Снять выбор</BaseButton>
            <span>{{ selectedIds.length }} выбрано</span>
          </div>
          <div class="planner-employees" role="group" aria-label="Сотрудники для назначения">
            <label v-for="employee in shownEmployees" :key="employee.employee_id" class="planner-employee">
              <input v-model="selectedIds" type="checkbox" :value="employee.employee_id" :disabled="busy" />
              <span><strong>{{ employee.full_name }}</strong><small>{{ employee.department }}</small></span>
            </label>
            <span v-if="!shownEmployees.length" class="planner-empty">Сотрудники не найдены</span>
          </div>
        </section>

        <section class="planner-section">
          <h3>Период и последовательность</h3>
          <div class="planner-dates">
            <BaseFormField v-model="from" label="С даты" type="date" :disabled="busy" />
            <BaseFormField v-model="to" label="По дату" type="date" :disabled="busy" />
          </div>
          <BaseButton variant="secondary" :disabled="busy" @click="endOfYear">
            <CalendarRange :size="16" aria-hidden="true" /> До конца года
          </BaseButton>
          <BaseSelectField v-if="calendarPolicy === 'cycle' && cycleDays.length"
            v-model="offset" label="Начальная фаза цикла" :options="offsetOptions" :disabled="busy" />
          <label class="planner-replace">
            <input v-model="replaceFuture" type="checkbox" :disabled="busy" />
            <span>Заменить уже назначенные планы только за выбранный период</span>
          </label>
          <BaseNotice v-if="!rangeIsValid" tone="warning">Укажите период не более 366 дней,
            начиная с сегодняшней даты или позднее.</BaseNotice>
          <p class="planner-hint">План можно создать на весь год. Сохранённые фактические явки
            и утверждённые табели не изменяются.</p>
        </section>
        <section v-if="previewMetrics" class="planner-section planner-preview" aria-live="polite">
          <h3>Предварительная проверка</h3>
          <div class="planner-totals">
            <div><span>Сотрудников</span><strong>{{ previewMetrics.employee_count }}</strong></div>
            <div><span>Рабочих дней</span><strong>{{ previewMetrics.planned_workdays }}</strong></div>
            <div><span>Выходных</span><strong>{{ previewMetrics.planned_rest_days }}</strong></div>
            <div><span>Плановых часов</span><strong>{{ totalHours }}</strong></div>
          </div>
          <div class="planner-issues">
            <div v-if="previewMetrics.missing_calendar"><span>Не заполнен календарь</span><strong>{{ previewMetrics.missing_calendar }}</strong></div>
            <div v-if="previewMetrics.outside_employment"><span>Нет назначения в штате</span><strong>{{ previewMetrics.outside_employment }}</strong></div>
            <div v-if="previewMetrics.locked_days"><span>Закрытые периоды</span><strong>{{ previewMetrics.locked_days }}</strong></div>
            <div v-if="previewMetrics.recorded_actual"><span>Уже есть фактические записи</span><strong>{{ previewMetrics.recorded_actual }}</strong></div>
            <div v-if="previewMetrics.overlapping_leave"><span>Пересечение с отпуском</span><strong>{{ previewMetrics.overlapping_leave }}</strong></div>
            <div v-if="previewMetrics.overlapping_absence"><span>Пересечение с отсутствием</span><strong>{{ previewMetrics.overlapping_absence }}</strong></div>
            <div v-if="previewMetrics.existing_plans"><span>Уже назначенные дни</span><strong>{{ previewMetrics.existing_plans }}</strong></div>
          </div>
          <BaseNotice v-if="!preview?.meta.can_apply" tone="warning">
            Обнаружены конфликты: {{ previewMetrics.blocking_count }}. Исправьте их перед сохранением.
          </BaseNotice>
          <div v-if="previewMetrics.sample.length" class="planner-samples">
            <div v-for="day in previewMetrics.sample" :key="day.employee_id + day.date"
              :class="['planner-sample', { off: day.planned_minutes === 0 }]">
              <small>{{ formatDate(day.date) }}</small>
              <strong>{{ day.planned_minutes ? day.planned_minutes / 60 + ' ч' : 'В' }}</strong>
            </div>
          </div>
          <label v-if="preview?.meta.can_apply" class="planner-confirm">
            <input v-model="confirmed" type="checkbox" :disabled="busy" />
            <span>Подтверждаю назначение указанным сотрудникам на выбранный период</span>
          </label>
        </section>
      </template>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="emit('close')">Закрыть</BaseButton>
      <BaseButton v-if="view === 'pattern' && canEditPatterns"
        :disabled="busy || loading || !scheduleId" @click="savePattern">
        <Check :size="16" aria-hidden="true" /> Сохранить шаблон
      </BaseButton>
      <template v-else>
        <BaseButton variant="secondary" :disabled="!canPreview" @click="submitPlan(false)">
          <RotateCcw :size="16" aria-hidden="true" /> Проверить
        </BaseButton>
        <BaseButton :disabled="!canApply" @click="submitPlan(true)">Назначить график</BaseButton>
      </template>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.cycle-planner{display:grid;gap:18px;min-width:0}
.planner-tabs{display:flex;gap:2px;border-bottom:1px solid var(--color-stroke)}
.planner-tabs button{display:flex;align-items:center;gap:7px;padding:10px 14px;border:0;
  border-bottom:2px solid transparent;background:transparent;color:var(--color-muted);cursor:pointer;font:inherit;font-size:13px}
.planner-tabs button.active{border-bottom-color:var(--color-primary);color:var(--color-text)}
.planner-section{display:grid;gap:12px;min-width:0;padding-bottom:17px;border-bottom:1px solid var(--color-stroke)}
.planner-section h3{margin:0;font-size:14px;font-weight:600}
.planner-section>p,.planner-hint{margin:0;font-size:12px;line-height:1.5;color:var(--color-muted)}
.preset-buttons,.planner-selection{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.planner-selection span{font-size:12px;color:var(--color-muted)}
.planner-employees{max-height:240px;overflow:auto;border:1px solid var(--color-stroke);border-radius:8px;padding:3px}
.planner-employee{display:flex;align-items:flex-start;gap:10px;padding:9px;border-bottom:1px solid var(--color-stroke)}
.planner-employee:last-child{border:0}
.planner-employee input,.planner-replace input,.planner-confirm input{margin-top:3px;accent-color:var(--color-primary)}
.planner-employee span{display:grid;gap:2px;min-width:0}
.planner-employee strong{font-size:12px;font-weight:500}
.planner-employee small,.planner-empty{font-size:11px;color:var(--color-muted)}
.planner-empty{padding:12px;display:block}
.planner-dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.planner-replace,.planner-confirm{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.45}
.planner-days{display:grid;gap:6px}
.planner-day{display:grid;grid-template-columns:56px minmax(0,1fr) minmax(0,1fr) 30px;align-items:end;gap:8px;
  padding:8px;border:1px solid var(--color-stroke);border-radius:8px}
.planner-day-number{font-size:12px;color:var(--color-muted);padding-bottom:11px}
.planner-day label{display:grid;gap:5px;font-size:11px;color:var(--color-muted)}
.planner-day input{width:100%;min-width:0;height:35px;padding:0 8px;border-radius:7px;
  border:1px solid var(--color-stroke);background:var(--color-surface-raised);color:var(--color-text);font:inherit}
.planner-day input:focus-visible{outline:2px solid var(--color-primary)}
.remove-cycle-day{height:35px;border:0;background:transparent;color:var(--color-muted);cursor:pointer}
.planner-preview{background:var(--color-surface-raised);padding:12px;border:1px solid var(--color-stroke);border-radius:10px}
.planner-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.planner-totals>div{display:grid;gap:5px;padding:9px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:7px}
.planner-totals span,.planner-issues span{font-size:11px;color:var(--color-muted)}
.planner-totals strong{font-size:18px;font-weight:600}
.planner-issues{display:grid;gap:6px}
.planner-issues>div{display:flex;justify-content:space-between;gap:12px;font-size:12px}
.planner-samples{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.planner-sample{display:grid;gap:5px;text-align:center;padding:7px 2px;border:1px solid var(--color-stroke);
  border-radius:6px;background:var(--color-surface)}
.planner-sample small{font-size:10px;color:var(--color-muted)}
.planner-sample strong{font-size:11px;font-weight:600}
.planner-sample.off{background:var(--color-surface-secondary,var(--color-soft));color:var(--color-muted)}
@media(max-width:440px){.planner-samples{grid-template-columns:repeat(5,minmax(0,1fr))}
  .planner-dates{grid-template-columns:1fr}.planner-day{grid-template-columns:46px 1fr 1fr 25px;gap:5px}}
</style>
