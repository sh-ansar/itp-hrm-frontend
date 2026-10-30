<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarRange, Check, Grid3X3, RotateCcw, UsersRound } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSearchField from './ui/BaseSearchField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  getWorktimeMatrix, bulkEditWorktimeMatrix,
  type WorktimeMatrixFilters, type WorktimeMatrixResponse,
  type WorktimeMatrixRow, type WorktimeMatrixCell,
  type WorktimeMatrixBulkResponse,
} from '../api/worktime'

const props = defineProps<{ companyId: string; month: string }>()
const emit = defineEmits<{ updated: [] }>()
const startOfMonth = (month: string) => month + '-01'
function endOfMonth(month: string): string {
  const [year, number] = month.split('-').map(Number)
  if (!year || !number || number < 1 || number > 12) return ''
  return month + '-' + String(new Date(Date.UTC(year, number, 0)).getUTCDate()).padStart(2, '0')
}
const from = ref(startOfMonth(props.month))
const to = ref(endOfMonth(props.month))
const q = ref('')
const department = ref('')
const schedule = ref('')
const status = ref<'all' | 'recorded' | 'unrecorded'>('all')
const groupBy = ref<'department' | 'schedule' | 'none'>('department')
const page = ref(1)
const pageSize = ref('30')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const result = ref<WorktimeMatrixResponse | null>(null)
const selected = ref<Set<string>>(new Set())
const operation = ref<'fill_missing' | 'set_worked'>('fill_missing')
const hours = ref('8')
const overwriteExisting = ref(false)
const confirmation = ref(false)
const preview = ref<WorktimeMatrixBulkResponse | null>(null)
const previewSignature = ref('')
let generation = 0

const dateValid = computed(() => {
  const diff = (Date.parse(to.value + 'T00:00:00Z') - Date.parse(from.value + 'T00:00:00Z')) / 86400000
  return Number.isInteger(diff) && diff >= 0 && diff <= 61
})
const optionsDepartment = computed(() => [
  { id: '', name: 'Все подразделения' },
  ...(result.value?.meta.filters.departments ?? []),
])
const optionsSchedule = computed(() => [
  { id: '', name: 'Все графики' },
  ...(result.value?.meta.filters.schedules ?? []),
])
const rowData = computed(() => result.value?.data.rows ?? [])
const dates = computed(() => result.value?.data.dates ?? [])
type GroupEntry = { kind: 'group'; id: string; label: string } | { kind: 'row'; id: string; row: WorktimeMatrixRow }
const displayRows = computed<GroupEntry[]>(() => {
  const output: GroupEntry[] = []
  let previous = ''
  for (const row of rowData.value) {
    const group = groupBy.value === 'department' ? (row.department_name || 'Без подразделения')
      : groupBy.value === 'schedule' ? (row.schedule_name || 'Без графика') : ''
    if (groupBy.value !== 'none' && group !== previous) {
      output.push({ kind: 'group', id: 'group:' + group + ':' + row.employee_id, label: group })
      previous = group
    }
    output.push({ kind: 'row', id: row.employee_id, row })
  }
  return output
})
const selectedKeys = computed(() => [...selected.value].sort())
const selectedPeople = computed(() => new Set(selectedKeys.value.map(key => key.split('|')[0])).size)
const selectedDates = computed(() => new Set(selectedKeys.value.map(key => key.split('|')[1])).size)
const wantedHours = computed(() => {
  const parsed = Number(hours.value.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 24) return null
  const minutes = Math.round(parsed * 60)
  return Number.isInteger(minutes) ? minutes : null
})
const signature = computed(() => JSON.stringify([
  props.companyId, selectedKeys.value, operation.value, wantedHours.value, overwriteExisting.value,
]))
const canPreview = computed(() => !saving.value && !loading.value && !!result.value?.meta.can_edit
  && selected.value.size > 0 && selected.value.size <= 2500 && selectedPeople.value <= 50
  && selectedDates.value <= 62 && (operation.value === 'fill_missing' || wantedHours.value !== null))
const canApply = computed(() => canPreview.value && !!preview.value
  && confirmation.value && previewSignature.value === signature.value
  && preview.value.meta.can_apply && /^[a-f0-9]{64}$/.test(preview.value.meta.preview_token))

const keyFor = (employeeId: string, date: string) => employeeId + '|' + date
const selectedCell = (employeeId: string, date: string) => selected.value.has(keyFor(employeeId, date))
function changeSelection(keys: string[], enabled: boolean) {
  const next = new Set(selected.value)
  for (const key of keys) {
    if (enabled) next.add(key)
    else next.delete(key)
  }
  if (next.size > 2500 || new Set([...next].map(key => key.split('|')[0])).size > 50) {
    error.value = 'В одной операции можно выбрать до 50 сотрудников и 2500 ячеек.'
    return
  }
  selected.value = next
  error.value = ''
}
function toggleCell(row: WorktimeMatrixRow, cell: WorktimeMatrixCell) {
  if (!result.value?.meta.can_edit || !cell.editable) return
  const key = keyFor(row.employee_id, cell.date)
  changeSelection([key], !selected.value.has(key))
}
function keysForRow(row: WorktimeMatrixRow) {
  return row.days.filter(day => day.editable).map(day => keyFor(row.employee_id, day.date))
}
function toggleRow(row: WorktimeMatrixRow) {
  const keys = keysForRow(row)
  if (!keys.length) return
  changeSelection(keys, !keys.every(key => selected.value.has(key)))
}
function toggleDate(date: string) {
  const keys = rowData.value.flatMap(row => row.days
    .filter(day => day.date === date && day.editable)
    .map(day => keyFor(row.employee_id, date)))
  if (keys.length) changeSelection(keys, !keys.every(key => selected.value.has(key)))
}
function selectMissing() {
  const keys = rowData.value.flatMap(row => row.days
    .filter(day => day.editable && day.state === 'missing')
    .map(day => keyFor(row.employee_id, day.date)))
  changeSelection(keys, true)
}
function selectVisible() {
  changeSelection(rowData.value.flatMap(keysForRow), true)
}
function clearSelected() {
  selected.value = new Set()
}
function formatHours(minutes: number | null): string {
  return minutes === null ? '—' : (Math.round(minutes / 60 * 100) / 100).toLocaleString('ru-RU')
}
function cellText(cell: WorktimeMatrixCell): string {
  if (cell.state === 'outside_employment') return '—'
  if (cell.state === 'leave') return 'ОТ'
  if (cell.state === 'absence') return 'Н'
  if (cell.state === 'unknown_shift' || cell.state === 'unconfigured') return '?'
  if (cell.worked_minutes !== null) return formatHours(cell.worked_minutes)
  if (cell.state === 'rest') return 'В'
  if (cell.state === 'future') return '·'
  return '—'
}
function cellTitle(cell: WorktimeMatrixCell): string {
  const statusText = {
    recorded: 'Зарегистрировано', leave: 'Отпуск', absence: 'Отсутствие', rest: 'Выходной',
    missing: 'Нет фактических часов', future: 'Будущий день', unknown_shift: 'Не подтверждён сменный план',
    unconfigured: 'Нет производственного календаря', outside_employment: 'Вне периода трудоустройства',
  }[cell.state]
  return [cell.date, statusText, 'План: ' + formatHours(cell.planned_minutes) + ' ч',
    'Факт: ' + formatHours(cell.worked_minutes) + ' ч',
    cell.shift_code ? 'Смена: ' + cell.shift_code : '', cell.locked ? 'Период закрыт' : ''].filter(Boolean).join(' · ')
}
function dateLabel(value: string) {
  const d = new Date(value + 'T00:00:00Z')
  return {
    number: value.slice(8, 10),
    weekday: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(d),
  }
}
function messageForError(cause: unknown) {
  const status = (cause as { status?: number })?.status
  if (status === 404) return 'Матрица пока не включена для этой организации.'
  if (status === 403) return 'Недостаточно прав для выбранного периода или сотрудников.'
  if (status === 409) return 'Данные изменились или период закрыт. Обновите и повторите проверку.'
  if (status === 422) return 'Проверьте период, сотрудников и выбранные часы.'
  return cause instanceof Error ? cause.message : 'Не удалось загрузить или сохранить табель.'
}
async function load() {
  const requestGeneration = ++generation
  if (!props.companyId || !dateValid.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await getWorktimeMatrix(props.companyId, {
      from: from.value, to: to.value, q: q.value.trim(),
      department_id: department.value || undefined, schedule_id: schedule.value || undefined,
      status: status.value, group_by: groupBy.value,
      page: page.value, per_page: Number(pageSize.value),
    })
    if (requestGeneration !== generation) return
    result.value = response
    if (page.value > response.meta.last_page && response.meta.last_page >= 1) {
      page.value = response.meta.last_page
      void load()
    }
  } catch (cause) {
    if (requestGeneration !== generation) return
    result.value = null
    error.value = messageForError(cause)
  } finally {
    if (requestGeneration === generation) loading.value = false
  }
}
function applyFilters() {
  if (!dateValid.value) {
    error.value = 'Допустимый диапазон — от 1 до 62 последовательных дней.'
    return
  }
  clearSelected()
  page.value = 1
  preview.value = null
  success.value = ''
  void load()
}
function setPage(next: number) {
  if (next < 1 || next > (result.value?.meta.last_page ?? 0)) return
  page.value = next
  void load()
}
function allMonth() {
  from.value = startOfMonth(props.month)
  to.value = endOfMonth(props.month)
  applyFilters()
}
function buildPayload(apply: boolean) {
  return {
    cells: selectedKeys.value.map(key => {
      const [employee_id, date] = key.split('|')
      return { employee_id, date }
    }),
    operation: operation.value, ...(operation.value === 'set_worked' ? { worked_minutes: wantedHours.value! } : {}),
    overwrite_existing: overwriteExisting.value,
    apply,
    ...(apply ? { confirm: true, preview_token: preview.value!.meta.preview_token } : {}),
  }
}
async function runBulk(apply: boolean) {
  if (saving.value || !(apply ? canApply.value : canPreview.value)) return
  saving.value = true
  error.value = ''
  success.value = ''
  const before = signature.value
  try {
    const response = await bulkEditWorktimeMatrix(props.companyId, buildPayload(apply))
    if (before !== signature.value) {
      error.value = 'Выбор изменился. Проверьте ещё раз.'
      return
    }
    if (apply) {
      success.value = 'Сохранено: ' + response.data.new_entries + ' новых, '
        + response.data.updates + ' изменённых записей.'
      clearSelected()
      preview.value = null
      confirmation.value = false
      emit('updated')
      await load()
    } else {
      preview.value = response
      previewSignature.value = before
    }
  } catch (cause) {
    preview.value = null
    confirmation.value = false
    error.value = messageForError(cause)
  } finally { saving.value = false }
}

watch([from, to], () => {
  // Never preserve hidden selections when the date interval has changed.
  clearSelected()
})
watch(signature, () => {
  preview.value = null
  previewSignature.value = ''
  confirmation.value = false
})
watch(() => [props.companyId, props.month], () => {
  ++generation
  from.value = startOfMonth(props.month)
  to.value = endOfMonth(props.month)
  q.value = ''
  department.value = ''
  schedule.value = ''
  status.value = 'all'
  groupBy.value = 'department'
  page.value = 1
  clearSelected()
  result.value = null
  success.value = ''
  void load()
}, { immediate: true })
</script>

<template>
  <div class="matrix-root">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <div class="matrix-intro">
      <div>
        <h3><Grid3X3 :size="19" aria-hidden="true" /> Календарная матрица</h3>
        <p>Сотрудники по строкам, даты по столбцам. План и факт показаны раздельно.</p>
      </div>
      <span v-if="result">{{ result.meta.total }} сотрудников · {{ dates.length }} дней</span>
    </div>

    <div class="matrix-filters">
      <BaseFormField v-model="from" label="С даты" type="date" />
      <BaseFormField v-model="to" label="По дату" type="date" />
      <BaseSearchField v-model="q" label="Поиск по ФИО или табельному номеру"
        placeholder="ФИО или табельный номер" />
      <BaseSelectField v-model="department" label="Подразделение" :options="optionsDepartment" />
      <BaseSelectField v-model="schedule" label="График работы" :options="optionsSchedule" />
      <BaseSelectField v-model="status" label="Заполненность"
        :options="[{ id: 'all', name: 'Любая' }, { id: 'recorded', name: 'Есть записи' },
          { id: 'unrecorded', name: 'Нет записей' }]" />
      <BaseSelectField v-model="groupBy" label="Группировать"
        :options="[{ id: 'department', name: 'По подразделениям' },
          { id: 'schedule', name: 'По графикам' }, { id: 'none', name: 'Без группировки' }]" />
      <BaseButton variant="secondary" :disabled="loading" @click="allMonth">
        <CalendarRange :size="16" aria-hidden="true" /> Весь месяц
      </BaseButton>
      <BaseButton :disabled="loading || !dateValid" @click="applyFilters">Показать</BaseButton>
    </div>

    <BaseNotice v-if="!dateValid" tone="warning">Выберите период не длиннее 62 дней.
      Он может включать даты двух соседних месяцев.</BaseNotice>
    <BaseNotice v-else-if="result && !result.meta.calendar_complete" tone="warning">
      Производственный календарь заполнен не полностью. Такие дни нельзя проставить массово.</BaseNotice>
    <BaseNotice v-if="result?.meta.manager_scope_policy && !result.meta.can_edit" tone="info">
      Матрица доступна для просмотра. Редактирование определяется кадровой ролью и полномочиями на период.</BaseNotice>

    <div v-if="result?.meta.can_edit" class="matrix-selection-tools">
      <BaseButton variant="secondary" :disabled="loading || !rowData.length" @click="selectVisible">
        <UsersRound :size="16" aria-hidden="true" /> Выбрать доступные
      </BaseButton>
      <BaseButton variant="secondary" :disabled="loading || !rowData.length" @click="selectMissing">
        Выбрать незаполненные
      </BaseButton>
      <BaseButton variant="secondary" :disabled="!selected.size" @click="clearSelected">
        Снять выделение
      </BaseButton>
      <span aria-live="polite">Выделено {{ selected.size }} ячеек · {{ selectedPeople }} сотрудников · {{ selectedDates }} дат</span>
    </div>
    <p v-if="result?.meta.can_edit" class="matrix-tip">
      Нажимайте ячейки по отдельности, название сотрудника — для всей строки,
      дату — для столбца. Выделение сохраняется при переходе по страницам.
      Будущие даты и закрытые периоды недоступны для ввода факта.
    </p>

    <div v-if="loading" class="matrix-loading" role="status">Загрузка календарной матрицы…</div>
    <div v-else-if="result" class="matrix-scroller" role="region" aria-label="Табель по сотрудникам и дням"
      tabindex="0">
      <table class="matrix-table">
        <caption class="visually-hidden">Табель сотрудников за период {{ from }} — {{ to }}</caption>
        <thead>
          <tr>
            <th scope="col" class="matrix-person-head matrix-sticky">Сотрудник / должность</th>
            <th v-for="date in dates" :key="date.date" scope="col"
              :class="['matrix-date-head', { 'matrix-holiday': date.day_type === 'holiday' || date.day_type === 'weekend' }]">
              <button type="button" :disabled="!result.meta.can_edit || date.locked"
                :title="'Выделить дату ' + date.date" @click="toggleDate(date.date)">
                <span>{{ dateLabel(date.date).weekday }}</span>
                <strong>{{ dateLabel(date.date).number }}</strong>
              </button>
            </th>
            <th scope="col" class="matrix-total-head">План / факт</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in displayRows" :key="item.id">
            <tr v-if="item.kind === 'group'" class="matrix-group">
              <th :colspan="dates.length + 2" scope="rowgroup">{{ item.label }}</th>
            </tr>
            <tr v-else :data-employee-id="item.row.employee_id">
              <th scope="row" class="matrix-person matrix-sticky">
                <button v-if="result.meta.can_edit" type="button" class="matrix-person-toggle"
                  :aria-label="'Выделить все доступные даты: ' + item.row.full_name"
                  @click="toggleRow(item.row)">
                  {{ item.row.full_name }}
                </button>
                <strong v-else>{{ item.row.full_name }}</strong>
                <small>{{ item.row.personnel_number }} · {{ item.row.position_name || '—' }}</small>
                <small>{{ item.row.schedule_name || 'График не назначен' }}</small>
              </th>
              <td v-for="cell in item.row.days" :key="cell.date" :data-date="cell.date"
                :class="['matrix-day', 'state-' + cell.state, { 'is-selected': selectedCell(item.row.employee_id, cell.date), 'is-locked': cell.locked }]">
                <button type="button" class="matrix-cell" :title="cellTitle(cell)"
                  :disabled="!result.meta.can_edit || !cell.editable"
                  :aria-label="item.row.full_name + ': ' + cellTitle(cell)"
                  :aria-pressed="selectedCell(item.row.employee_id, cell.date)"
                  @click="toggleCell(item.row, cell)">
                  <strong>{{ cellText(cell) }}</strong>
                  <small v-if="cell.state === 'recorded' && cell.planned_minutes !== null">/{{ formatHours(cell.planned_minutes) }}</small>
                  <small v-else-if="cell.shift_code">{{ cell.shift_code }}</small>
                </button>
              </td>
              <td class="matrix-total">
                <strong>{{ formatHours(item.row.summary.planned_minutes) }} / {{ formatHours(item.row.summary.worked_minutes) }}</strong>
                <small>{{ item.row.summary.missing_days }} незаполн.</small>
              </td>
            </tr>
          </template>
          <tr v-if="!rowData.length"><td :colspan="dates.length + 2" class="matrix-empty">
            Сотрудники по выбранным условиям не найдены.</td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="result" class="matrix-pagination">
      <BaseSelectField v-model="pageSize" label="Строк на странице"
        :options="[{ id: '20', name: '20' }, { id: '30', name: '30' }, { id: '50', name: '50' }]"
        @update:model-value="page = 1; void load()" />
      <div>
        <BaseButton variant="secondary" :disabled="page <= 1 || loading" @click="setPage(page - 1)">Назад</BaseButton>
        <span>{{ page }} / {{ Math.max(1, result.meta.last_page) }}</span>
        <BaseButton variant="secondary" :disabled="page >= result.meta.last_page || loading" @click="setPage(page + 1)">Далее</BaseButton>
      </div>
    </div>

    <section v-if="result?.meta.can_edit && selected.size" class="matrix-action-panel">
      <div class="matrix-action-head">
        <div>
          <h4>Массовая операция</h4>
          <p>Будут затронуты только выделенные ячейки. Остальные даты не изменяются.</p>
        </div>
        <span>{{ selected.size }} ячеек</span>
      </div>
      <div class="matrix-action-fields">
        <BaseSelectField v-model="operation" label="Действие"
          :options="[{ id: 'fill_missing', name: 'Заполнить пустые по плану' },
            { id: 'set_worked', name: 'Установить отработанные часы' }]" />
        <BaseFormField v-if="operation === 'set_worked'" v-model="hours"
          type="number" label="Отработано, часов" min="0" max="24" />
      </div>
      <label v-if="operation === 'set_worked'" class="matrix-confirm">
        <input v-model="overwriteExisting" type="checkbox" :disabled="saving" />
        <span>Разрешить изменение существующих явок (записи об отпусках, неявках и сверхурочных защищены)</span>
      </label>
      <BaseNotice v-if="operation === 'set_worked' && wantedHours === null" tone="warning">
        Введите число часов от 0 до 24.</BaseNotice>
      <div class="matrix-action-buttons">
        <BaseButton variant="secondary" :disabled="!canPreview" @click="runBulk(false)">
          <RotateCcw :size="16" aria-hidden="true" /> Проверить изменения
        </BaseButton>
      </div>
      <div v-if="preview" class="matrix-preview" aria-live="polite">
        <h4>Предпросмотр операции</h4>
        <div class="matrix-preview-counters">
          <div><span>Будет создано</span><strong>{{ preview.data.new_entries }}</strong></div>
          <div><span>Будет изменено</span><strong>{{ preview.data.updates }}</strong></div>
          <div><span>Конфликтов</span><strong>{{ preview.data.blocking_count }}</strong></div>
        </div>
        <dl>
          <div><dt>Уже заполнено (пропуск)</dt><dd>{{ preview.data.skipped_recorded }}</dd></div>
          <div><dt>Отпуск</dt><dd>{{ preview.data.skipped_leave }}</dd></div>
          <div><dt>Неявка</dt><dd>{{ preview.data.skipped_absence }}</dd></div>
          <div><dt>Выходной / нет рабочих часов</dt><dd>{{ preview.data.skipped_nonworking }}</dd></div>
          <div><dt>Будущие даты</dt><dd>{{ preview.data.skipped_future }}</dd></div>
          <div><dt>Неизвестный сменный план</dt><dd>{{ preview.data.unknown_shift }}</dd></div>
          <div><dt>Вне периода трудоустройства</dt><dd>{{ preview.data.outside_employment }}</dd></div>
          <div v-if="preview.data.missing_calendar"><dt>Нет календаря</dt><dd>{{ preview.data.missing_calendar }}</dd></div>
          <div v-if="preview.data.locked_cells"><dt>Закрытые месяцы</dt><dd>{{ preview.data.locked_cells }}</dd></div>
          <div v-if="preview.data.existing_requires_overwrite"><dt>Нужно подтвердить замену</dt><dd>{{ preview.data.existing_requires_overwrite }}</dd></div>
          <div v-if="preview.data.protected_actual"><dt>Защищённый факт</dt><dd>{{ preview.data.protected_actual }}</dd></div>
        </dl>
        <BaseNotice v-if="!preview.meta.can_apply" tone="warning">
          Изменение заблокировано: устраните конфликты и выполните проверку повторно.</BaseNotice>
        <label v-else class="matrix-confirm">
          <input v-model="confirmation" type="checkbox" :disabled="saving" />
          <span>Подтверждаю массовое изменение {{ preview.data.candidate_count }} записей по результатам проверки</span>
        </label>
        <BaseButton :disabled="!canApply" @click="runBulk(true)">
          <Check :size="16" aria-hidden="true" /> Сохранить в табель
        </BaseButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.matrix-root{display:grid;gap:13px;min-width:0;color:var(--color-text)}
.matrix-intro{display:flex;align-items:start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.matrix-intro h3{margin:0;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600}
.matrix-intro p,.matrix-intro>span{margin:5px 0 0;font-size:12px;color:var(--color-muted)}
.matrix-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:end}
.matrix-filters :deep(.registry-search){max-width:none}
.matrix-filters :deep(.base-select-field){max-width:none}
.matrix-filters :deep(.base-button){width:100%}
.matrix-selection-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.matrix-selection-tools>span,.matrix-tip{font-size:12px;color:var(--color-muted)}
.matrix-tip{margin:0;line-height:1.5}
.matrix-loading,.matrix-empty{padding:25px;text-align:center;font-size:13px;color:var(--color-muted)}
.matrix-scroller{width:100%;min-width:0;max-height:570px;overflow:auto;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface)}
.matrix-scroller:focus-visible{outline:2px solid var(--color-primary)}
.matrix-table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:12px;line-height:1.3}
.matrix-table th,.matrix-table td{border-right:1px solid var(--color-stroke);border-bottom:1px solid var(--color-stroke);padding:0}
.matrix-table thead th{position:sticky;top:0;z-index:4;background:var(--color-surface-raised);height:53px}
.matrix-table .matrix-sticky{position:sticky;left:0;min-width:238px;width:238px;max-width:238px;z-index:3}
.matrix-table thead .matrix-sticky{z-index:6}
.matrix-person-head{text-align:left;padding:10px 12px!important}
.matrix-date-head{width:62px;min-width:62px}
.matrix-date-head button{width:100%;height:100%;display:grid;place-items:center;gap:3px;border:0;background:transparent;color:var(--color-text);font:inherit;cursor:pointer}
.matrix-date-head button:disabled{cursor:default}
.matrix-date-head button>span{font-size:10px;color:var(--color-muted);text-transform:capitalize}
.matrix-date-head button>strong{font-size:13px;font-weight:600}
.matrix-date-head.matrix-holiday{background:var(--color-soft)}
.matrix-total-head{min-width:92px;padding:8px!important}
.matrix-group th{padding:10px 12px;text-align:left;background:var(--color-soft);color:var(--color-text);font-weight:600}
.matrix-person{background:var(--color-surface);text-align:left;padding:8px 11px!important}
.matrix-person strong,.matrix-person-toggle{display:block;margin:0;font-size:12px;line-height:1.45;font-weight:600}
.matrix-person-toggle{max-width:100%;padding:0;color:var(--color-text);border:0;background:transparent;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-color:var(--color-stroke)}
.matrix-person small{display:block;font-size:10px;color:var(--color-muted);font-weight:400;margin-top:2px}
.matrix-day{min-width:62px;width:62px;background:var(--color-surface)}
.matrix-day.state-rest,.matrix-day.state-future{background:var(--color-soft)}
.matrix-day.state-leave,.matrix-day.state-absence{background:var(--color-surface-raised)}
.matrix-day.state-unknown_shift,.matrix-day.state-unconfigured{color:var(--color-muted)}
.matrix-day.is-locked{background:var(--color-soft)}
.matrix-day.is-selected{box-shadow:inset 0 0 0 2px var(--color-primary);background:var(--color-surface-raised)}
.matrix-cell{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;border:0;background:transparent;width:62px;height:47px;padding:4px;cursor:pointer;font:inherit;color:inherit}
.matrix-cell strong{font-size:12px;font-weight:600}
.matrix-cell small{font-size:9px;opacity:.75}
.matrix-cell:disabled{cursor:default}
.matrix-cell:focus-visible,.matrix-date-head button:focus-visible,.matrix-person-toggle:focus-visible{outline:2px solid var(--color-primary);outline-offset:-2px}
.matrix-total{min-width:99px;padding:8px!important;text-align:center;background:var(--color-surface)}
.matrix-total strong,.matrix-total small{display:block;white-space:nowrap}
.matrix-total strong{font-size:11px;font-weight:600}
.matrix-total small{margin-top:4px;font-size:10px;color:var(--color-muted)}
.matrix-pagination{display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap}
.matrix-pagination :deep(.base-select-field){max-width:180px}
.matrix-pagination>div:last-child{display:flex;align-items:center;gap:10px;font-size:12px}
.matrix-action-panel{display:grid;gap:14px;border:1px solid var(--color-stroke);border-radius:10px;padding:14px;background:var(--color-surface-raised)}
.matrix-action-head{display:flex;align-items:start;justify-content:space-between;gap:10px}
.matrix-action-head h4,.matrix-preview h4{margin:0;font-size:14px;font-weight:600}
.matrix-action-head p,.matrix-action-head>span{margin:3px 0 0;color:var(--color-muted);font-size:11px}
.matrix-action-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:end}
.matrix-confirm{display:flex;align-items:start;gap:9px;font-size:12px;line-height:1.5}
.matrix-confirm input{margin-top:3px;accent-color:var(--color-primary)}
.matrix-action-buttons{display:flex;gap:8px}
.matrix-preview{display:grid;gap:12px;border-top:1px solid var(--color-stroke);padding-top:14px}
.matrix-preview-counters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.matrix-preview-counters>div{display:grid;gap:6px;background:var(--color-surface);padding:10px;border:1px solid var(--color-stroke);border-radius:8px}
.matrix-preview-counters span{font-size:11px;color:var(--color-muted)}
.matrix-preview-counters strong{font-size:19px;font-weight:600}
.matrix-preview dl{display:grid;gap:5px;margin:0}
.matrix-preview dl>div{display:flex;justify-content:space-between;font-size:12px;gap:10px}
.matrix-preview dt{color:var(--color-muted)}.matrix-preview dd{margin:0;font-weight:600}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:1060px){.matrix-filters{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:680px){.matrix-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.matrix-table .matrix-sticky{min-width:184px;width:184px;max-width:184px}}
@media(max-width:440px){.matrix-filters,.matrix-action-fields{grid-template-columns:1fr}.matrix-pagination :deep(.base-select-field){max-width:unset}}
</style>
