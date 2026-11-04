<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LockKeyhole, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseStatusPill from './ui/BaseStatusPill.vue'
import {
  createCompanyRoleTemplate,
  updateCompanyRoleTemplate,
  deleteCompanyRoleTemplate,
  type CustomRoleTemplate,
  type RoleCatalogRecord,
  type SystemRoleCode,
} from '../api/roles'

const props = defineProps<{
  company: string
  roleCatalog: RoleCatalogRecord[]
  templates: CustomRoleTemplate[]
  enabled: boolean
}>()
const emit = defineEmits<{ changed: [] }>()

const labels: Record<SystemRoleCode, string> = {
  company_admin: 'Администратор компании',
  hr_specialist: 'HR-специалист',
  department_manager: 'Руководитель подразделения',
  employee: 'Сотрудник',
}
const capabilityLabels: Record<string, string> = {
  'overview.view': 'Главная страница',
  'employees.view': 'Просмотр сотрудников',
  'employees.extended_view': 'Расширенные данные сотрудников',
  'organization.view': 'Организационная структура',
  'staffing.view': 'Штатное расписание',
  'personnel_actions.view': 'Кадровые процессы',
  'worktime.view': 'Графики и табель',
  'leaves.view': 'Отпуска',
  'documents.view': 'Кадровые документы',
  'directories.view': 'Справочники',
  'development.view': 'Обучение и кадровый резерв',
  'reports.view': 'Отчёты и аналитика',
  'settings.view': 'Настройки профиля',
  'self_service.view': 'Мой кабинет',
  'roles.interface': 'Просмотр управления ролями',
  'roles.assign': 'Назначение ролей',
  'employees.write': 'Изменение сотрудников',
  'staffing.write': 'Изменение штатки',
  'documents.write': 'Создание и изменение документов',
  'directories.write': 'Редактирование справочников',
  'worktime.write': 'Ввод и планирование рабочего времени',
  'worktime.calendar.edit': 'Редактирование календаря',
  'leave.requests.manage': 'Управление отпусками',
  'leave.requests.approve': 'Утверждение отпусков',
  'leave.requests.review': 'Рассмотрение руководителем',
  'leaves.evidence.view': 'Медицинские документы к отпускам',
  'leave.types.manage': 'Категории отпусков',
  'bonuses.view': 'Просмотр премий',
  'bonuses.manage': 'Создание и изменение премий',
  'bonuses.approve': 'Утверждение премий',
}
const groups = [
  { title: 'Разделы системы', codes: [
    'overview.view', 'employees.view', 'employees.extended_view', 'organization.view', 'staffing.view',
    'personnel_actions.view', 'worktime.view', 'leaves.view', 'documents.view', 'directories.view',
    'development.view', 'reports.view',
  ] },
  { title: 'Кадровые операции', codes: [
    'employees.write', 'staffing.write', 'documents.write', 'directories.write',
    'worktime.write', 'worktime.calendar.edit',
  ] },
  { title: 'Отпуска и поощрения', codes: [
    'leave.requests.manage', 'leave.requests.review', 'leave.requests.approve', 'leave.types.manage', 'leaves.evidence.view',
    'bonuses.view', 'bonuses.manage', 'bonuses.approve',
  ] },
  { title: 'Системные права', codes: ['settings.view', 'self_service.view', 'roles.interface', 'roles.assign'] },
]
const baseOptions: Array<{ id: Exclude<SystemRoleCode, 'company_admin'>; name: string }> = [
  { id: 'employee', name: 'Сотрудник' },
  { id: 'department_manager', name: 'Руководитель подразделения' },
  { id: 'hr_specialist', name: 'HR-специалист' },
]
const editable = new Set(Object.keys(capabilityLabels).filter(code =>
  !['roles.interface', 'roles.assign', 'settings.view', 'self_service.view'].includes(code),
))
const selected = ref('system:company_admin')
const saving = ref(false)
const error = ref('')
const success = ref('')
const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const draftName = ref('')
const draftCode = ref('')
const draftDescription = ref('')
const draftBase = ref<Exclude<SystemRoleCode, 'company_admin'>>('employee')
const draftStatus = ref<'active' | 'archived'>('active')
const draftCapabilities = ref<Record<string, boolean>>({})

const selectedTemplate = computed(() => props.templates.find(item => item.id === selected.value) ?? null)
const systemCode = computed(() => selected.value.startsWith('system:')
  ? selected.value.slice(7) as SystemRoleCode : null)
const selectedSystem = computed(() => props.roleCatalog.find(row => row.code === systemCode.value))
const selectedName = computed(() => selectedTemplate.value?.name
  ?? (systemCode.value ? labels[systemCode.value] : 'Роль'))
const selectedPermissions = computed(() => selectedTemplate.value?.capabilities ?? selectedSystem.value?.capabilities ?? {})
const selectedBase = computed(() => selectedTemplate.value?.base_role ?? systemCode.value)
const baseCapabilities = computed(() => props.roleCatalog.find(r => r.code === draftBase.value)?.capabilities ?? {})
const currentTemplate = computed(() => props.templates.find(item => item.id === editingId.value) ?? null)
const draftInvalid = computed(() => !draftName.value.trim() || !draftCode.value.trim()
  || !/^[a-z][a-z0-9_]{1,47}$/.test(draftCode.value))

watch(() => props.company, () => {
  selected.value = 'system:company_admin'
  drawerOpen.value = false
  error.value = ''
  success.value = ''
})
watch(() => props.templates, list => {
  if (selected.value.startsWith('system:')) return
  if (!list.some(x => x.id === selected.value)) selected.value = 'system:company_admin'
})

function defaults(base: Exclude<SystemRoleCode, 'company_admin'>) {
  const caps = props.roleCatalog.find(item => item.code === base)?.capabilities ?? {}
  return Object.fromEntries(Object.entries(caps).map(([code, value]) => [
    code, value && editable.has(code),
  ]))
}
function beginCreate() {
  editingId.value = null
  draftName.value = ''
  draftCode.value = 'role_' + Date.now().toString(36)
  draftDescription.value = ''
  draftBase.value = 'employee'
  draftStatus.value = 'active'
  draftCapabilities.value = defaults('employee')
  error.value = ''
  drawerOpen.value = true
}
function beginEdit(template: CustomRoleTemplate) {
  editingId.value = template.id
  draftName.value = template.name
  draftCode.value = template.code
  draftDescription.value = template.description ?? ''
  draftBase.value = template.base_role
  draftStatus.value = template.status
  draftCapabilities.value = { ...template.capabilities }
  error.value = ''
  drawerOpen.value = true
}
function changeBase(base: string) {
  if (!baseOptions.some(row => row.id === base)) return
  draftBase.value = base as Exclude<SystemRoleCode, 'company_admin'>
  draftCapabilities.value = defaults(draftBase.value)
}
function setPermission(code: string, value: boolean) {
  if (!editable.has(code) || !baseCapabilities.value[code]) return
  draftCapabilities.value = { ...draftCapabilities.value, [code]: value }
}
async function save() {
  if (!props.company || !props.enabled || saving.value || draftInvalid.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    if (editingId.value) {
      const row = currentTemplate.value
      if (!row) throw Error('Роль больше не найдена. Обновите страницу.')
      await updateCompanyRoleTemplate(props.company, row.id, {
        revision: row.revision,
        name: draftName.value.trim(),
        description: draftDescription.value.trim() || null,
        capabilities: draftCapabilities.value,
        status: draftStatus.value,
      })
      success.value = 'Роль обновлена. Изменения доступа применяются сервером сразу.'
    } else {
      const created = await createCompanyRoleTemplate(props.company, {
        code: draftCode.value.trim(),
        name: draftName.value.trim(),
        description: draftDescription.value.trim() || null,
        base_role: draftBase.value,
        capabilities: draftCapabilities.value,
      })
      selected.value = created.data.id
      success.value = 'Новая роль создана. Теперь её можно назначить пользователям.'
    }
    drawerOpen.value = false
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить роль'
  } finally {
    saving.value = false
  }
}
async function remove() {
  const row = currentTemplate.value
  if (!props.enabled || !row || row.assigned_count > 0 || saving.value) return
  if (!window.confirm('Удалить роль «' + row.name + '»? Действие необратимо.')) return
  saving.value = true
  error.value = ''
  try {
    await deleteCompanyRoleTemplate(props.company, row.id, row.revision)
    selected.value = 'system:company_admin'
    drawerOpen.value = false
    success.value = 'Неиспользуемая роль удалена.'
    emit('changed')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось удалить роль'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="company-role-editor">
    <div class="matrix-top">
      <div>
        <h1>Создание роли и её права</h1>
        <p>Роли компании, матрица разрешений и безопасные профили доступа</p>
      </div>
      <BaseButton v-if="enabled" @click="beginCreate"><Plus :size="18" /> Добавить роль</BaseButton>
    </div>
    <BaseNotice v-if="!enabled" tone="info">
      Создание дополнительных ролей отключено. Системные права доступны для просмотра.
    </BaseNotice>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <div class="matrix-workspace">
      <nav class="role-catalog" aria-label="Роли компании">
        <h2>Системные роли</h2>
        <button v-for="role in roleCatalog" :key="role.code" type="button"
          :class="['catalog-entry', { 'catalog-entry--active': selected === 'system:' + role.code }]"
          :aria-current="selected === 'system:' + role.code ? 'true' : undefined"
          @click="selected = 'system:' + role.code">
          <LockKeyhole :size="15" />
          <span>{{ labels[role.code] }}</span>
        </button>
        <h2>Роли компании <span>{{ templates.length }}</span></h2>
        <button v-for="template in templates" :key="template.id" type="button"
          :class="['catalog-entry', { 'catalog-entry--active': selected === template.id }]"
          :aria-current="selected === template.id ? 'true' : undefined"
          @click="selected = template.id">
          <ShieldCheck :size="15" />
          <span>{{ template.name }}</span>
          <small v-if="template.status === 'archived'">Архив</small>
        </button>
        <p v-if="!templates.length" class="empty-roles">Дополнительных ролей пока нет.</p>
      </nav>
      <BaseCard class="permission-matrix">
        <div class="permission-heading">
          <div>
            <h2>{{ selectedName }}</h2>
            <p>{{ selectedTemplate
              ? 'Основа: ' + labels[selectedTemplate.base_role] + ' · Назначено: ' + selectedTemplate.assigned_count
              : 'Системный профиль — права определяет сервер' }}</p>
          </div>
          <div class="permission-actions">
            <BaseStatusPill v-if="selectedTemplate" :tone="selectedTemplate.status === 'active' ? 'success' : 'neutral'">
              {{ selectedTemplate.status === 'active' ? 'Активна' : 'Архив' }}
            </BaseStatusPill>
            <BaseButton v-if="selectedTemplate && enabled" variant="secondary" @click="beginEdit(selectedTemplate)">
              <Pencil :size="16" /> Изменить
            </BaseButton>
          </div>
        </div>
        <div v-for="group in groups" :key="group.title" class="permission-group">
          <h3>{{ group.title }}</h3>
          <div v-for="code in group.codes" :key="code" class="permission-line">
            <span>{{ capabilityLabels[code] ?? code }}</span>
            <BaseStatusPill :tone="selectedPermissions[code] ? 'success' : 'neutral'">
              {{ selectedPermissions[code] ? 'Разрешено' : 'Нет доступа' }}
            </BaseStatusPill>
          </div>
        </div>
        <BaseNotice v-if="selectedTemplate" tone="info">
          Право не может превышать базовый профиль. Для руководителей область доступа ограничивается назначенными подразделениями.
        </BaseNotice>
        <BaseNotice v-else tone="info">
          Системные роли защищены от редактирования. Создайте дополнительную роль, чтобы настроить набор прав.
        </BaseNotice>
      </BaseCard>
    </div>

    <BaseDrawer :open="drawerOpen"
      :title="editingId ? 'Изменить роль и разрешения' : 'Новая роль'"
      description="Применяются реальные серверные ограничения доступа"
      @close="drawerOpen = false">
      <form id="company-role-form" class="role-form" @submit.prevent="save">
        <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
        <BaseFormField v-model="draftName" label="Название роли" placeholder="Например, Кадровый наблюдатель" required />
        <BaseFormField v-model="draftCode" label="Системный код" :disabled="!!editingId"
          placeholder="hr_observer" required />
        <BaseFormField v-model="draftDescription" label="Описание" placeholder="Какие задачи выполняет эта роль" />
        <BaseSelectField :model-value="draftBase" :disabled="!!editingId" label="Базовый профиль"
          :options="baseOptions" @update:model-value="changeBase" />
        <BaseNotice tone="info">
          Права системного администратора нельзя передать через пользовательскую роль. Недоступные права нельзя включить.
        </BaseNotice>
        <BaseSelectField v-if="editingId" v-model="draftStatus" label="Состояние роли"
          :options="[{ id: 'active', name: 'Активна' }, { id: 'archived', name: 'В архиве' }]" />
        <div v-for="group in groups" :key="group.title" class="form-group">
          <h3>{{ group.title }}</h3>
          <label v-for="code in group.codes" :key="code" class="permission-switch"
            :class="{ 'permission-switch--locked': !editable.has(code) || !baseCapabilities[code] }">
            <span>{{ capabilityLabels[code] ?? code }}</span>
            <input type="checkbox" :checked="editable.has(code) ? !!draftCapabilities[code] : !!baseCapabilities[code]"
              :disabled="saving || !editable.has(code) || !baseCapabilities[code]"
              @change="setPermission(code, ($event.target as HTMLInputElement).checked)" />
          </label>
        </div>
      </form>
      <template #footer>
        <BaseButton v-if="editingId && currentTemplate && currentTemplate.assigned_count === 0"
          variant="secondary" :disabled="saving" @click="remove"><Trash2 :size="16" /> Удалить</BaseButton>
        <BaseButton variant="secondary" @click="drawerOpen = false">Отмена</BaseButton>
        <BaseButton type="submit" :disabled="saving || draftInvalid" @click="save">
          {{ saving ? 'Сохранение…' : 'Сохранить роль' }}
        </BaseButton>
      </template>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.company-role-editor{display:grid;gap:14px;min-width:0}
.matrix-top{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.matrix-top h1{font-size:20px;line-height:27px;font-weight:600;margin:0}
.matrix-top p,.permission-heading p{margin:5px 0 0;color:var(--color-muted);font-size:12px}
.matrix-workspace{display:grid;grid-template-columns:minmax(230px,280px) minmax(0,1fr);gap:14px;align-items:start}
.role-catalog{display:grid;align-content:start;gap:5px;padding:14px;border:1px solid var(--color-stroke);border-radius:9px;background:var(--color-surface)}
.role-catalog h2{margin:12px 4px 7px;font-size:12px;font-weight:600;color:var(--color-text)}
.role-catalog h2:first-child{margin-top:1px}
.role-catalog h2 span{color:var(--color-muted);font-weight:400}
.catalog-entry{display:flex;align-items:center;gap:9px;width:100%;min-height:41px;padding:9px;border:1px solid transparent;border-radius:7px;background:transparent;text-align:start;color:var(--color-text);font:inherit;font-size:12px;cursor:pointer}
.catalog-entry:hover{background:var(--color-soft)}
.catalog-entry--active{background:var(--color-accent-soft);border-color:var(--color-stroke);color:var(--color-primary);font-weight:600}
.catalog-entry>span{min-width:0;flex:1}
.catalog-entry small{font-size:10px;color:var(--color-muted)}
.empty-roles{padding:10px;color:var(--color-muted);font-size:11px}
.permission-matrix{min-width:0}
.permission-heading{display:flex;align-items:start;justify-content:space-between;gap:10px;flex-wrap:wrap}
.permission-heading h2{font-size:17px;margin:0;font-weight:600}
.permission-actions{display:flex;align-items:center;gap:8px}
.permission-group{margin-top:16px;border:1px solid var(--color-stroke);border-radius:8px;overflow:hidden}
.permission-group h3{margin:0;padding:10px 14px;background:var(--color-soft);font-size:12px;font-weight:600}
.permission-line{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:39px;padding:8px 14px;border-top:1px solid var(--color-stroke);font-size:12px}
.permission-line>span:first-child{min-width:0}
.role-form{display:grid;gap:15px;min-width:0}
.form-group{display:grid;gap:0;border:1px solid var(--color-stroke);border-radius:8px;overflow:hidden}
.form-group h3{margin:0;padding:11px 12px;font-size:12px;background:var(--color-soft)}
.permission-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:43px;padding:9px 12px;border-top:1px solid var(--color-stroke);font-size:12px}
.permission-switch input{width:17px;height:17px;flex:none;accent-color:var(--color-primary);cursor:pointer}
.permission-switch--locked{color:var(--color-muted)}
.permission-switch--locked input{opacity:.45;cursor:not-allowed}
@media(max-width:930px){.matrix-workspace{grid-template-columns:1fr}.role-catalog{grid-template-columns:repeat(2,minmax(0,1fr))}.role-catalog h2,.role-catalog .empty-roles{grid-column:1/-1}}
@media(max-width:540px){.role-catalog{grid-template-columns:1fr}.permission-heading{display:grid;gap:12px}.matrix-top :deep(.base-button){width:100%}}
</style>
