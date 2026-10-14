<script setup lang="ts">
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseViewTabs from './ui/BaseViewTabs.vue'

const { tr } = useWorkspaceI18n()

type SelectOption = { id: string; name: string }
export type RegistryGroupMode = 'none' | 'department' | 'category' | 'object'
export type RegistryTemplateState = {
  columns: Record<string, boolean>
  groupMode: RegistryGroupMode
  status: string
  department: string
  position: string
  personnelType: string
  object: string
  team: string
  category: string
  gender: string
  hiredFrom: string
  hiredTo: string
  perPage: number
}
type StoredPreset = {
  id: string
  name: string
  folder: string
  publicAccess: boolean
  defaultTemplate: boolean
  state: RegistryTemplateState
}

const props = defineProps<{
  open: boolean
  columns: Array<{ key: string; label: string }>
  current: RegistryTemplateState
  statusOptions: SelectOption[]
  departmentOptions: SelectOption[]
  positionOptions: SelectOption[]
  personnelTypeOptions: SelectOption[]
  objectOptions: SelectOption[]
  teamOptions: SelectOption[]
  categoryOptions: SelectOption[]
  genderOptions: SelectOption[]
}>()

const emit = defineEmits<{
  close: []
  apply: [state: RegistryTemplateState]
  notice: [message: string]
}>()

const STORAGE_KEY = 'hrm-employee-view-presets-v2'
const mode = ref<'select' | 'create'>('select')
const step = ref(1)
const selectedPresetId = ref('')
const presets = ref<StoredPreset[]>([])
const name = ref('')
const folder = ref('Без папки')
const publicAccess = ref(false)
const defaultTemplate = ref(false)
function cloneState(state: RegistryTemplateState): RegistryTemplateState {
  return JSON.parse(JSON.stringify(state)) as RegistryTemplateState
}
const draft = ref<RegistryTemplateState>(cloneState(props.current))

const modeOptions = [
  { id: 'select', label: 'Выбрать шаблон' },
  { id: 'create', label: 'Создать шаблон' },
]
const groupOptions: Array<{ id: RegistryGroupMode; label: string }> = [
  { id: 'none', label: 'Без группировки' },
  { id: 'department', label: 'По отделам' },
  { id: 'category', label: 'По категориям' },
  { id: 'object', label: 'По объектам' },
]
const folderOptions = computed(() => {
  const names = [...new Set(['Без папки', ...presets.value.map(item => item.folder).filter(Boolean)])]
  return names.map(item => ({ id: item, name: item }))
})
const presetOptions = computed(() => presets.value.map(item => ({
  id: item.id,
  name: item.folder && item.folder !== 'Без папки' ? item.folder + ' / ' + item.name : item.name,
})))
const selectedPreset = computed(() => presets.value.find(item => item.id === selectedPresetId.value) ?? null)
const allColumnsOn = computed(() => props.columns.every(column => draft.value.columns[column.key] !== false))

function cloneCurrent() {
  draft.value = cloneState(props.current)
}
function loadPresets() {
  presets.value = []
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown
    if (Array.isArray(parsed)) presets.value = parsed.filter(item => item && typeof item === 'object') as StoredPreset[]
  } catch { presets.value = [] }
  if (!presets.value.some(item => item.id === selectedPresetId.value))
    selectedPresetId.value = presets.value[0]?.id ?? ''
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value)) }
  catch { emit('notice', 'Не удалось сохранить шаблон в браузере') }
}
function resetCreate() {
  cloneCurrent()
  step.value = 1
  name.value = ''
  folder.value = 'Без папки'
  publicAccess.value = false
  defaultTemplate.value = false
}
function setMode(next: string) {
  if (next !== 'select' && next !== 'create') return
  mode.value = next
  if (next === 'create') resetCreate()
}
function setAllColumns(value: boolean) {
  draft.value.columns = {
    ...draft.value.columns,
    ...Object.fromEntries(props.columns.map(column => [column.key, value])),
  }
}
function next() { if (step.value < 3) step.value += 1 }
function back() { if (step.value > 1) step.value -= 1 }
function save() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  if (defaultTemplate.value)
    presets.value = presets.value.map(item => ({ ...item, defaultTemplate: false }))
  const preset: StoredPreset = {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    folder: folder.value || 'Без папки',
    publicAccess: publicAccess.value,
    defaultTemplate: defaultTemplate.value,
    state: cloneState(draft.value),
  }
  presets.value = [preset, ...presets.value]
  persist()
  selectedPresetId.value = preset.id
  mode.value = 'select'
  emit('notice', 'Шаблон «' + trimmed + '» сохранён в этом браузере')
}
function applySelected() {
  if (!selectedPreset.value) return
  emit('apply', cloneState(selectedPreset.value.state))
  emit('notice', 'Шаблон «' + selectedPreset.value.name + '» применён')
  emit('close')
}
function deleteSelected() {
  const preset = selectedPreset.value
  if (!preset) return
  presets.value = presets.value.filter(item => item.id !== preset.id)
  persist()
  selectedPresetId.value = presets.value[0]?.id ?? ''
  emit('notice', 'Шаблон «' + preset.name + '» удалён')
}
function resetDefault() {
  const preset = selectedPreset.value
  if (!preset) return
  presets.value = presets.value.map(item =>
    item.id === preset.id ? { ...item, defaultTemplate: !item.defaultTemplate }
      : preset.defaultTemplate ? item : { ...item, defaultTemplate: false })
  persist()
}

watch(() => props.open, open => {
  if (!open) return
  loadPresets()
  mode.value = presets.value.length ? 'select' : 'create'
  resetCreate()
})
</script>

<template>
  <BaseDrawer :open="open" :title="tr('Шаблоны')"
    :description="tr('Готовые представления реестра с настроенными колонками, фильтрами и группировкой')"
    @close="emit('close')">
    <BaseViewTabs :model-value="mode" :options="modeOptions" :label="tr('Режим шаблонов')"
      @update:model-value="setMode" />

    <template v-if="mode === 'select'">
      <div class="preset-select">
        <label>
          <span>{{ tr('Выберите шаблон') }}</span>
          <BaseSelectField v-model="selectedPresetId" :label="tr('Шаблон')" :options="presetOptions" />
        </label>
        <BaseNotice v-if="!presets.length" tone="info">
          {{ tr('Сохранённых шаблонов пока нет. Создайте первый шаблон для текущего реестра.') }}</BaseNotice>
        <div v-if="selectedPreset" class="preset-meta">
          <span>{{ selectedPreset.folder }}</span>
          <span v-if="selectedPreset.defaultTemplate">{{ tr('Стартовый шаблон') }}</span>
          <span v-if="selectedPreset.publicAccess">{{ tr('Публичный доступ') }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <ol class="template-progress" :aria-label="tr('Шаги создания шаблона')">
        <li :class="{ active: step === 1, done: step > 1 }"><span>1</span>{{ tr('Колонки') }}</li>
        <li :class="{ active: step === 2, done: step > 2 }"><span>2</span>{{ tr('Фильтры') }}</li>
        <li :class="{ active: step === 3 }"><span>3</span>{{ tr('Название') }}</li>
      </ol>

      <section v-if="step === 1" class="template-step">
        <h3>{{ tr('Группировка') }}</h3>
        <div class="radio-grid">
          <label v-for="option in groupOptions" :key="option.id">
            <input v-model="draft.groupMode" type="radio" :value="option.id" />
            <span>{{ option.label }}</span>
          </label>
        </div>
        <label class="master-switch">
          <span>{{ tr('Показать все колонки') }}</span>
          <input type="checkbox" :checked="allColumnsOn" @change="setAllColumns(($event.target as HTMLInputElement).checked)" />
        </label>
        <div class="column-list">
          <label v-for="column in columns" :key="column.key">
            <span>{{ column.label }}</span>
            <input v-model="draft.columns[column.key]" type="checkbox" />
          </label>
        </div>
      </section>

      <section v-if="step === 2" class="template-step">
        <h3>{{ tr('Организационные данные') }}</h3>
        <div class="filter-grid">
          <BaseSelectField v-model="draft.department" :label="tr('Отдел')" :options="departmentOptions" />
          <BaseSelectField v-model="draft.position" :label="tr('Должность')" :options="positionOptions" />
          <BaseSelectField v-model="draft.category" :label="tr('Категория')" :options="categoryOptions" />
          <BaseSelectField v-model="draft.personnelType" :label="tr('Вид персонала')" :options="personnelTypeOptions" />
          <BaseSelectField v-model="draft.object" :label="tr('Объект / место работы')" :options="objectOptions" />
          <BaseSelectField v-model="draft.team" :label="tr('Бригада')" :options="teamOptions" />
          <BaseSelectField v-model="draft.status" :label="tr('Статус сотрудника')" :options="statusOptions" />
          <BaseSelectField v-model="draft.gender" :label="tr('Пол')" :options="genderOptions" />
          <label class="date-field"><span>{{ tr('Период приёма — с') }}</span><input v-model="draft.hiredFrom" type="date" /></label>
          <label class="date-field"><span>{{ tr('Период приёма — по') }}</span><input v-model="draft.hiredTo" type="date" /></label>
        </div>
      </section>

      <section v-if="step === 3" class="template-step">
        <label class="text-field">
          <span>{{ tr('Папка') }}</span>
          <input v-model="folder" list="employee-template-folders" :placeholder="tr('Выберите или создайте новую папку')" />
          <datalist id="employee-template-folders">
            <option v-for="option in folderOptions" :key="option.id" :value="option.id" />
          </datalist>
        </label>
        <label class="text-field">
          <span>{{ tr('Название шаблона') }}</span>
          <input v-model="name" type="text" :placeholder="tr('Введите название')" />
        </label>
        <label class="toggle-line"><input v-model="publicAccess" type="checkbox" /><span>{{ tr('Установить публичный доступ') }}</span></label>
        <label class="toggle-line"><input v-model="defaultTemplate" type="checkbox" /><span>{{ tr('Сделать стартовым шаблоном') }}</span></label>
      </section>
    </template>

    <template #footer>
      <template v-if="mode === 'select'">
        <BaseButton :disabled="!selectedPreset" @click="applySelected">{{ tr('Применить') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('close')">{{ tr('Отмена') }}</BaseButton>
        <BaseButton v-if="selectedPreset" variant="secondary" @click="resetDefault">
          {{ selectedPreset.defaultTemplate ? tr('Убрать стартовый') : tr('Сделать стартовым') }}
        </BaseButton>
        <BaseButton v-if="selectedPreset" variant="secondary" @click="deleteSelected">{{ tr('Удалить') }}</BaseButton>
      </template>
      <template v-else>
        <BaseButton v-if="step > 1" variant="secondary" @click="back">{{ tr('Назад') }}</BaseButton>
        <BaseButton v-if="step < 3" @click="next">{{ tr('Далее') }}</BaseButton>
        <BaseButton v-else :disabled="!name.trim()" @click="save">{{ tr('Создать') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('close')">{{ tr('Отмена') }}</BaseButton>
      </template>
    </template>
  </BaseDrawer>
</template>

<style scoped>
.preset-select,.template-step{display:grid;gap:16px;margin-top:18px}
.preset-select>label,.text-field,.date-field{display:grid;gap:7px}
.preset-select>label>span,.text-field>span,.date-field>span{font-size:12px;font-weight:650}
.preset-meta{display:flex;gap:7px;flex-wrap:wrap}.preset-meta span{padding:5px 8px;border-radius:999px;background:var(--color-soft);color:var(--color-muted);font-size:10px}
.template-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:20px 0 0;padding:0;list-style:none}
.template-progress li{position:relative;display:flex;align-items:center;gap:7px;padding:8px 0;color:var(--color-muted);font-size:11px}
.template-progress li:not(:last-child)::after{content:"";position:absolute;left:31px;right:8px;bottom:0;height:2px;background:var(--color-stroke)}
.template-progress li span{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--color-stroke-strong);border-radius:50%;font-size:9px;background:var(--color-surface);z-index:1}
.template-progress li.active,.template-progress li.done{color:var(--color-text);font-weight:650}
.template-progress li.done span{background:var(--color-success);border-color:var(--color-success);color:var(--color-on-primary)}
.template-progress li.done:not(:last-child)::after{background:var(--color-success)}
.template-step h3{margin:0;font-size:17px}
.radio-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.radio-grid label,.toggle-line{display:flex;align-items:center;gap:9px;font-size:12px}
.radio-grid input,.toggle-line input{width:17px;height:17px;accent-color:var(--color-primary)}
.master-switch,.column-list label{display:flex;align-items:center;justify-content:space-between;gap:16px}
.master-switch{padding:10px 0;font-size:12px;font-weight:650}
.master-switch input,.column-list input{width:38px;height:21px;accent-color:var(--color-primary)}
.column-list{display:grid}
.column-list label{min-height:43px;border-bottom:1px solid var(--color-stroke);font-size:12px}
.filter-grid{display:grid;gap:13px}
.text-field input,.date-field input{
  min-height:40px;padding:9px 11px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface-raised);color:var(--color-text);font:inherit;font-size:12px
}
.toggle-line{padding:3px 0}
@media(max-width:460px){.radio-grid{grid-template-columns:1fr}.template-progress li{font-size:10px}}
</style>
