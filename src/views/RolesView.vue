<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Maximize2, Minimize2, Plus, Search } from 'lucide-vue-next'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseRegistryMetricCard from '../components/ui/BaseRegistryMetricCard.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'

type RoleRecord = {
  id: string
  name: string
  code: string
  description: string
  builtIn: boolean
  canApprove: boolean
}
type UserRecord = {
  id: string
  code: string
  full_name: string
  email: string
  status: 'active' | 'inactive'
  role_ids: string[]
}
type PermissionScope = 'all' | 'company' | 'department'
type PermissionRow = {
  module: string
  view: boolean
  view_scope: PermissionScope
  create: boolean
  create_scope: PermissionScope
  edit: boolean
  edit_scope: PermissionScope
  approve: boolean
  approve_scope: PermissionScope
}
type LogRow = {
  id: string
  created_at: string
  actor: string
  action: string
  target: string
  result: string
}

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('assignments')
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const assignmentOpen = ref(false)
const roleEditorOpen = ref(false)
const roleToAssign = ref('hr-specialist')
const selectedUserIds = ref<string[]>([])
const roleNameDraft = ref('')
const roleCodeDraft = ref('')
const matrixSearch = ref('')
const expandedRoleIds = ref<string[]>(['company-admin'])
const roleEnabled = ref<Record<string, boolean>>({})
const permissionFullscreen = ref(false)

const tabs = [
  { id: 'assignments', label: 'Назначение ролей' },
  { id: 'permissions', label: 'Создание роли и её прав' },
  { id: 'logs', label: 'Лог' },
]

const roles = ref<RoleRecord[]>([
  { id: 'company-admin', name: 'Администратор компании', code: 'company_admin', description: 'Полный административный доступ компании', builtIn: true, canApprove: true },
  { id: 'hr-specialist', name: 'HR-специалист', code: 'hr_specialist', description: 'Кадровый реестр и кадровые процессы', builtIn: true, canApprove: true },
  { id: 'department-manager', name: 'Руководитель подразделения', code: 'department_manager', description: 'Доступ к назначенным подразделениям', builtIn: true, canApprove: true },
  { id: 'employee', name: 'Сотрудник', code: 'employee', description: 'Базовый пользовательский доступ', builtIn: true, canApprove: false },
  { id: 'staffing-editor', name: 'Штатное расписание', code: 'staffing_editor', description: 'Работа со штатным расписанием', builtIn: false, canApprove: false },
  { id: 'document-approver', name: 'Согласование документов', code: 'document_approver', description: 'Согласование кадровых документов', builtIn: false, canApprove: true },
  { id: 'learning-manager', name: 'Обучение и резерв', code: 'learning_manager', description: 'Обучение и кадровый резерв', builtIn: false, canApprove: false },
  { id: 'auditor', name: 'Аудитор', code: 'auditor', description: 'Чтение журналов и отчётности', builtIn: false, canApprove: false },
])

const users = ref<UserRecord[]>([
  { id: 'u-001', code: '500-001-001', full_name: 'Тулегенов Азамат Нурланович', email: 'a.tulegenov@demo.local', status: 'active', role_ids: ['company-admin'] },
  { id: 'u-002', code: '500-001-002', full_name: 'Ибраева Алия Сериковна', email: 'a.ibraeva@demo.local', status: 'active', role_ids: ['hr-specialist', 'document-approver'] },
  { id: 'u-003', code: '500-001-003', full_name: 'Нуртаев Асет Маратович', email: 'a.nurtaev@demo.local', status: 'active', role_ids: ['department-manager'] },
  { id: 'u-004', code: '500-001-004', full_name: 'Ким Даниил Алексеевич', email: 'd.kim@demo.local', status: 'active', role_ids: ['staffing-editor', 'employee'] },
  { id: 'u-005', code: '500-001-005', full_name: 'Ахметова Мадина Руслановна', email: 'm.akhmetova@demo.local', status: 'active', role_ids: ['learning-manager', 'employee'] },
  { id: 'u-006', code: '500-001-006', full_name: 'Смирнова Елена Викторовна', email: 'e.smirnova@demo.local', status: 'active', role_ids: ['employee'] },
  { id: 'u-007', code: '500-001-007', full_name: 'Омаров Тимур Кайратович', email: 't.omarov@demo.local', status: 'active', role_ids: ['auditor'] },
  { id: 'u-008', code: '500-001-008', full_name: 'Сейтова Аружан Нурлановна', email: 'a.seitova@demo.local', status: 'inactive', role_ids: [] },
  { id: 'u-009', code: '500-001-009', full_name: 'Жумабаева Динара Аскаровна', email: 'd.zhumabaeva@demo.local', status: 'active', role_ids: ['employee'] },
  { id: 'u-010', code: '500-001-010', full_name: 'Касымов Ринат Булатович', email: 'r.kasymov@demo.local', status: 'active', role_ids: [] },
  { id: 'u-011', code: '500-001-011', full_name: 'Волкова Анна Игоревна', email: 'a.volkova@demo.local', status: 'active', role_ids: ['employee'] },
  { id: 'u-012', code: '500-001-012', full_name: 'Тлеубаев Адиль Ермекович', email: 'a.tleubaev@demo.local', status: 'active', role_ids: [] },
])

const moduleNames = [
  'Сотрудники',
  'Оргструктура и штатка',
  'Кадровые процессы',
  'Графики и табель',
  'Отпуска',
  'Документы и приказы',
  'Отчёты и аналитика',
  'Справочники',
]
const defaultPermissions: Record<string, PermissionRow[]> = Object.fromEntries(
  roles.value.map(role => [
    role.id,
    moduleNames.map((module, index) => ({
      module,
      view: true,
      view_scope: 'all' as PermissionScope,
      create: role.id === 'company-admin' || role.id === 'hr-specialist' || (role.id === 'staffing-editor' && index === 1),
      create_scope: role.id === 'department-manager' ? 'department' as PermissionScope : 'all' as PermissionScope,
      edit: role.id === 'company-admin' || role.id === 'hr-specialist' || (role.id === 'staffing-editor' && index === 1),
      edit_scope: role.id === 'department-manager' ? 'department' as PermissionScope : 'all' as PermissionScope,
      approve: role.canApprove && [2, 5].includes(index),
      approve_scope: role.id === 'department-manager' ? 'department' as PermissionScope : 'all' as PermissionScope,
    })),
  ]),
)
const permissions = ref<Record<string, PermissionRow[]>>(defaultPermissions)

const logs = ref<LogRow[]>([
  { id: 'l-001', created_at: '14.10.2026 17:42', actor: 'ITP HRM Admin', action: 'Назначена роль', target: 'Ибраева Алия — Согласование документов', result: 'Успешно' },
  { id: 'l-002', created_at: '14.10.2026 16:15', actor: 'ITP HRM Admin', action: 'Изменены права роли', target: 'HR-специалист', result: 'Успешно' },
  { id: 'l-003', created_at: '13.10.2026 11:20', actor: 'ITP HRM Admin', action: 'Отозвана роль', target: 'Сейтова Аружан — Сотрудник', result: 'Успешно' },
  { id: 'l-004', created_at: '12.10.2026 09:05', actor: 'ITP HRM Admin', action: 'Создана роль', target: 'Аудитор', result: 'Успешно' },
])

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
const roleOptions = computed(() => [
  { id: 'all', name: 'Все роли' },
  ...roles.value.map(role => ({ id: role.id, name: role.name })),
])
const assignableRoleOptions = computed(() => roles.value.map(role => ({ id: role.id, name: role.name })))
const statusOptions = [
  { id: 'all', name: 'Все статусы' },
  { id: 'active', name: 'Активный' },
  { id: 'inactive', name: 'Неактивный' },
]
const permissionScopeOptions: Array<{ id: PermissionScope; name: string }> = [
  { id: 'all', name: 'Все' },
  { id: 'company', name: 'Компания' },
  { id: 'department', name: 'Подразделение' },
]
const filteredPermissionRoles = computed(() => {
  const q = matrixSearch.value.trim().toLowerCase()
  return !q ? roles.value : roles.value.filter(role =>
    [role.name, role.code, role.description].join(' ').toLowerCase().includes(q))
})

const assignmentRows = computed(() => users.value.filter(user => {
  const q = search.value.trim().toLowerCase()
  const matchesSearch = !q || [user.code, user.full_name, user.email].some(value => value.toLowerCase().includes(q))
  const matchesStatus = statusFilter.value === 'all' || user.status === statusFilter.value
  const matchesRole = roleFilter.value === 'all' || user.role_ids.includes(roleFilter.value)
  return matchesSearch && matchesStatus && matchesRole
}).map(user => ({
  ...user,
  roles_label: user.role_ids.map(id => roles.value.find(role => role.id === id)?.name).filter(Boolean).join(', ') || 'Роль не назначена',
})))

const unassignedCount = computed(() => users.value.filter(user => user.role_ids.length === 0).length)
const multiRoleCount = computed(() => users.value.filter(user => user.role_ids.length > 1).length)
const approvalRoleCount = computed(() => roles.value.filter(role => role.canApprove).length)
const activeFilterChips = computed(() => [
  ...(search.value ? [{ id: 'search', label: 'Поиск: ' + search.value }] : []),
  ...(roleFilter.value !== 'all' ? [{ id: 'role', label: 'Роль: ' + (roles.value.find(role => role.id === roleFilter.value)?.name ?? roleFilter.value) }] : []),
  ...(statusFilter.value !== 'all' ? [{ id: 'status', label: 'Статус: ' + (statusFilter.value === 'active' ? 'Активный' : 'Неактивный') }] : []),
])

const assignmentColumns = [
  { key: 'code', label: 'Код' },
  { key: 'full_name', label: 'Пользователь' },
  { key: 'status', label: 'Статус' },
  { key: 'email', label: 'Email' },
  { key: 'roles_label', label: 'Роль' },
  { key: 'actions', label: 'Действия' },
]
const matrixColumns = [
  { key: 'module', label: 'Объект' },
  { key: 'view', label: 'Просмотр · Право' },
  { key: 'view_scope', label: 'Просмотр · Область' },
  { key: 'create', label: 'Создание · Право' },
  { key: 'create_scope', label: 'Создание · Область' },
  { key: 'edit', label: 'Редактирование · Право' },
  { key: 'edit_scope', label: 'Редактирование · Область' },
  { key: 'approve', label: 'Согласование · Право' },
  { key: 'approve_scope', label: 'Согласование · Область' },
]
const logColumns = [
  { key: 'created_at', label: 'Дата и время' },
  { key: 'actor', label: 'Пользователь' },
  { key: 'action', label: 'Действие' },
  { key: 'target', label: 'Объект изменения' },
  { key: 'result', label: 'Результат' },
]

function clearFilter(id: string) {
  if (id === 'search') search.value = ''
  if (id === 'role') roleFilter.value = 'all'
  if (id === 'status') statusFilter.value = 'all'
}
function clearFilters() {
  search.value = ''
  roleFilter.value = 'all'
  statusFilter.value = 'all'
}
function openAssignment(userId?: string) {
  selectedUserIds.value = userId ? [userId] : []
  roleToAssign.value = 'hr-specialist'
  assignmentOpen.value = true
  success.value = ''
}
function toggleDrawerUser(id: string, checked: boolean) {
  selectedUserIds.value = checked
    ? [...new Set([...selectedUserIds.value, id])]
    : selectedUserIds.value.filter(item => item !== id)
}
function saveAssignment() {
  if (!demoMode || !selectedUserIds.value.length) return
  for (const user of users.value) {
    if (!selectedUserIds.value.includes(user.id)) continue
    if (!user.role_ids.includes(roleToAssign.value)) user.role_ids.push(roleToAssign.value)
  }
  const role = roles.value.find(item => item.id === roleToAssign.value)
  logs.value.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toLocaleString('ru-RU'),
    actor: 'ITP HRM Admin',
    action: 'Назначена роль',
    target: (role?.name ?? roleToAssign.value) + ' · ' + selectedUserIds.value.length + ' польз.',
    result: 'Успешно',
  })
  assignmentOpen.value = false
  success.value = 'Назначение ролей сохранено.'
}
function revokeRole(userId: string, roleId: string) {
  if (!demoMode) return
  const user = users.value.find(item => item.id === userId)
  if (!user) return
  user.role_ids = user.role_ids.filter(id => id !== roleId)
  success.value = 'Роль отозвана.'
}
function rowAction(id: string, row: UserRecord & { roles_label: string }) {
  if (id === 'assign') openAssignment(row.id)
  if (id.startsWith('revoke:')) revokeRole(row.id, id.slice('revoke:'.length))
}
function userActions(row: UserRecord) {
  return [
    { id: 'assign', label: 'Назначить роль' },
    ...row.role_ids
      .filter(roleId => roleId !== 'company-admin')
      .map(roleId => ({ id: 'revoke:' + roleId, label: 'Отозвать: ' + (roles.value.find(role => role.id === roleId)?.name ?? roleId) })),
  ]
}
function toggleRoleMatrix(id: string) {
  expandedRoleIds.value = expandedRoleIds.value.includes(id)
    ? expandedRoleIds.value.filter(item => item !== id)
    : [...expandedRoleIds.value, id]
}
function isRoleExpanded(id: string) {
  return expandedRoleIds.value.includes(id)
}
function setRoleEnabled(id: string, enabled: boolean) {
  if (!demoMode) return
  roleEnabled.value = { ...roleEnabled.value, [id]: enabled }
}
function setPermissionScope(row: PermissionRow, key: 'view_scope' | 'create_scope' | 'edit_scope' | 'approve_scope', value: string) {
  if (!demoMode || !['all','company','department'].includes(value)) return
  row[key] = value as PermissionScope
}

function setPermission(row: PermissionRow, key: 'view' | 'create' | 'edit' | 'approve', checked: boolean) {
  if (!demoMode) return
  row[key] = checked
}
function openRoleEditor() {
  roleNameDraft.value = ''
  roleCodeDraft.value = ''
  roleEditorOpen.value = true
}
function saveRole() {
  if (!demoMode) return
  const name = roleNameDraft.value.trim()
  const code = roleCodeDraft.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  if (!name || !code) {
    error.value = 'Укажите название и код роли.'
    return
  }
  if (roles.value.some(role => role.code === code)) {
    error.value = 'Роль с таким кодом уже существует.'
    return
  }
  const id = 'custom-' + code
  roles.value.push({ id, name, code, description: 'Настраиваемая роль', builtIn: false, canApprove: false })
  permissions.value[id] = moduleNames.map(module => ({
    module,
    view: true, view_scope: 'all',
    create: false, create_scope: 'all',
    edit: false, edit_scope: 'all',
    approve: false, approve_scope: 'all',
  }))
  roleEnabled.value = { ...roleEnabled.value, [id]: true }
  expandedRoleIds.value = [id]
  roleEditorOpen.value = false
  error.value = ''
  success.value = 'Роль создана. Настройте права в матрице.'
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    roleEnabled.value = Object.fromEntries(roles.value.map(role => [role.id, roleEnabled.value[role.id] ?? true]))
    if (!companies.value.some(item => item.id === company.value)) company.value = response.data[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить компании'
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="roles-page">
    <div class="roles-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Роли и доступы</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseNotice v-if="!demoMode" tone="info">
      Управление ролями пока защищено серверным feature flag и будет включено после утверждения матрицы доступа.
    </BaseNotice>

    <BaseViewTabs v-model="activeTab" :options="tabs" label="Разделы ролей и доступов" />

    <BaseKpiGrid label="Сводка по ролям">
      <BaseRegistryMetricCard title="Пользователи без ролей" :value="unassignedCount"
        description="требуют назначения доступа" :icon="publicAsset('prototype-icons/Info.svg')" tone="danger" />
      <BaseRegistryMetricCard title="Несколько ролей" :value="multiRoleCount"
        description="пользователей с несколькими ролями" :icon="publicAsset('prototype-icons/Info.svg')" />
      <BaseRegistryMetricCard title="Количество ролей" :value="roles.length"
        description="ролей в текущей матрице" :icon="publicAsset('prototype-icons/Info.svg')" />
      <BaseRegistryMetricCard title="С правом согласования" :value="approvalRoleCount"
        description="ролей могут согласовывать" :icon="publicAsset('prototype-icons/Info.svg')" />
    </BaseKpiGrid>

    <BaseCard v-if="activeTab === 'assignments'" class="roles-card">
      <div class="roles-heading">
        <div>
          <h1>Назначение ролей</h1>
          <p>{{ selectedCompany?.name }}</p>
        </div>
        <div class="roles-heading-actions">
          <BaseSelectField v-if="companies.length > 1" v-model="company" label="Компания" :options="companies" />
          <BaseButton :disabled="!demoMode" @click="openAssignment()"><Plus :size="16" /> Назначить роль</BaseButton>
        </div>
      </div>

      <div class="roles-toolbar">
        <label class="roles-search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="search" type="search" placeholder="ФИО, код или email" aria-label="Поиск пользователей" />
        </label>
        <BaseSelectField v-model="roleFilter" label="Роль" :options="roleOptions" />
        <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
      </div>
      <BaseFilterSummary :items="activeFilterChips" label="Активные фильтры"
        @remove="clearFilter" @clear="clearFilters" />

      <BaseLoadingState v-if="loading" label="Загрузка ролей" />
      <BaseDataTable v-else :rows="assignmentRows" :columns="assignmentColumns" row-key="id"
        caption="Назначенные роли пользователей"
        empty-title="Пользователи не найдены"
        empty-description="Измените поиск или фильтры.">
        <template #cell-full_name="{ row }">
          <div class="user-cell"><span class="user-dot">{{ row.full_name.slice(0,1) }}</span><strong>{{ row.full_name }}</strong></div>
        </template>
        <template #cell-status="{ row }">
          <BaseStatusPill :tone="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? 'Активный' : 'Неактивный' }}
          </BaseStatusPill>
        </template>
        <template #cell-roles_label="{ row }">
          <span :class="{ 'no-role': !row.role_ids.length }">{{ row.roles_label }}</span>
        </template>
        <template #cell-actions="{ row }">
          <BaseActionDropdown variant="icon" :label="'Действия: '+row.full_name"
            :options="userActions(row)" @select="rowAction($event,row)" />
        </template>
      </BaseDataTable>
    </BaseCard>

    <section v-else-if="activeTab === 'permissions'" class="roles-permissions-workspace"
      :class="{ 'is-fullscreen': permissionFullscreen }">
      <div class="roles-heading">
        <div>
          <h1>Создание роли и её права</h1>
          <p>Права и область доступа по каждому разделу системы</p>
        </div>
        <div class="roles-heading-actions">
          <label class="matrix-search">
            <Search :size="16" aria-hidden="true" />
            <input v-model="matrixSearch" type="search" aria-label="Фильтр ролей" placeholder="Фильтр / Поиск" />
          </label>
          <BaseButton :disabled="!demoMode" @click="openRoleEditor"><Plus :size="16" /> Добавить роль</BaseButton>
          <BaseButton icon-only variant="secondary"
            :aria-label="permissionFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
            @click="permissionFullscreen = !permissionFullscreen">
            <Minimize2 v-if="permissionFullscreen" :size="17" />
            <Maximize2 v-else :size="17" />
          </BaseButton>
        </div>
      </div>

      <BaseNotice v-if="!filteredPermissionRoles.length" tone="info">Роли по запросу не найдены.</BaseNotice>

      <BaseCard v-for="role in filteredPermissionRoles" :key="role.id" class="permission-role">
        <div class="permission-role-header">
          <BaseButton variant="secondary" class="role-accordion-trigger"
            :aria-expanded="isRoleExpanded(role.id)" @click="toggleRoleMatrix(role.id)">
            <ChevronDown :size="16" :class="{ closed: !isRoleExpanded(role.id) }" />
            <span><strong>{{ role.name }}</strong><small>{{ role.description }}</small></span>
          </BaseButton>
          <label class="role-enabled-toggle">
            <span>{{ roleEnabled[role.id] === false ? 'Отключена' : 'Активна' }}</span>
            <input type="checkbox" :checked="roleEnabled[role.id] !== false" :disabled="!demoMode"
              :aria-label="'Активность роли '+role.name"
              @change="setRoleEnabled(role.id,($event.target as HTMLInputElement).checked)" />
          </label>
        </div>

        <div v-if="isRoleExpanded(role.id)" class="permission-matrix-scroll">
          <BaseDataTable :rows="permissions[role.id] ?? []" :columns="matrixColumns" row-key="module"
            :caption="'Матрица прав роли '+role.name" empty-title="Права роли не настроены">
            <template #cell-view="{ row }">
              <input type="checkbox" :checked="row.view" :disabled="!demoMode" aria-label="Просмотр"
                @change="setPermission(row,'view',($event.target as HTMLInputElement).checked)" />
            </template>
            <template #cell-view_scope="{ row }">
              <select :value="row.view_scope" :disabled="!demoMode || !row.view" aria-label="Область просмотра"
                @change="setPermissionScope(row,'view_scope',($event.target as HTMLSelectElement).value)">
                <option v-for="option in permissionScopeOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
              </select>
            </template>
            <template #cell-create="{ row }">
              <input type="checkbox" :checked="row.create" :disabled="!demoMode" aria-label="Создание"
                @change="setPermission(row,'create',($event.target as HTMLInputElement).checked)" />
            </template>
            <template #cell-create_scope="{ row }">
              <select :value="row.create_scope" :disabled="!demoMode || !row.create" aria-label="Область создания"
                @change="setPermissionScope(row,'create_scope',($event.target as HTMLSelectElement).value)">
                <option v-for="option in permissionScopeOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
              </select>
            </template>
            <template #cell-edit="{ row }">
              <input type="checkbox" :checked="row.edit" :disabled="!demoMode" aria-label="Редактирование"
                @change="setPermission(row,'edit',($event.target as HTMLInputElement).checked)" />
            </template>
            <template #cell-edit_scope="{ row }">
              <select :value="row.edit_scope" :disabled="!demoMode || !row.edit" aria-label="Область редактирования"
                @change="setPermissionScope(row,'edit_scope',($event.target as HTMLSelectElement).value)">
                <option v-for="option in permissionScopeOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
              </select>
            </template>
            <template #cell-approve="{ row }">
              <input type="checkbox" :checked="row.approve" :disabled="!demoMode" aria-label="Согласование"
                @change="setPermission(row,'approve',($event.target as HTMLInputElement).checked)" />
            </template>
            <template #cell-approve_scope="{ row }">
              <select :value="row.approve_scope" :disabled="!demoMode || !row.approve" aria-label="Область согласования"
                @change="setPermissionScope(row,'approve_scope',($event.target as HTMLSelectElement).value)">
                <option v-for="option in permissionScopeOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
              </select>
            </template>
          </BaseDataTable>
        </div>
      </BaseCard>

      <div class="roles-save-row">
        <BaseButton :disabled="!demoMode" @click="success='Матрица прав сохранена в demo-профиле.'">Сохранить изменения</BaseButton>
      </div>
    </section>

    <BaseCard v-else class="roles-card">
      <div class="roles-heading"><div><h1>Лог</h1><p>Изменения ролей и прав доступа</p></div></div>
      <BaseDataTable :rows="logs" :columns="logColumns" row-key="id"
        caption="Журнал управления ролями"
        empty-title="Событий нет" />
    </BaseCard>

    <BaseDrawer :open="assignmentOpen" title="Роль и пользователи"
      description="Выберите роль и пользователей, которым она будет назначена."
      @close="assignmentOpen=false">
      <div class="drawer-form">
        <BaseSelectField v-model="roleToAssign" label="Выберите роль" :options="assignableRoleOptions" />
        <fieldset class="user-picker">
          <legend>Выберите пользователей</legend>
          <label v-for="user in users" :key="user.id">
            <input type="checkbox" :checked="selectedUserIds.includes(user.id)"
              @change="toggleDrawerUser(user.id,($event.target as HTMLInputElement).checked)" />
            <span class="user-dot">{{ user.full_name.slice(0,1) }}</span>
            <span><strong>{{ user.full_name }}</strong><small>{{ user.email }}</small></span>
          </label>
        </fieldset>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="assignmentOpen=false">Закрыть без сохранения</BaseButton>
        <BaseButton :disabled="!demoMode || !selectedUserIds.length" @click="saveAssignment">Сохранить</BaseButton>
      </template>
    </BaseDrawer>

    <BaseDrawer :open="roleEditorOpen" title="Добавить роль"
      description="Создайте роль и затем настройте её права по разделам."
      @close="roleEditorOpen=false">
      <div class="drawer-form">
        <label class="text-field"><span>Название роли</span><input v-model="roleNameDraft" type="text" placeholder="Например, Бухгалтер" /></label>
        <label class="text-field"><span>Код роли</span><input v-model="roleCodeDraft" type="text" placeholder="accountant" /></label>
        <BaseNotice tone="info">Права новой роли настраиваются в матрице после создания.</BaseNotice>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="roleEditorOpen=false">Закрыть без сохранения</BaseButton>
        <BaseButton :disabled="!demoMode || !roleNameDraft.trim() || !roleCodeDraft.trim()" @click="saveRole">Сохранить</BaseButton>
      </template>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.roles-page{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;max-width:100%}
.roles-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;color:var(--color-muted);font-size:12px}
.roles-breadcrumb img{width:15px;height:15px}.roles-breadcrumb strong{color:var(--color-text);font-weight:500}
.roles-card{min-width:0}
.roles-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.roles-heading h1{margin:0;font-size:20px;line-height:27px;font-weight:700}
.roles-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.roles-heading-actions{display:flex;align-items:end;justify-content:flex-end;gap:9px;flex-wrap:wrap}
.roles-heading-actions :deep(.base-select-field){width:230px}
.roles-toolbar{
  display:grid;grid-template-columns:minmax(220px,1fr) minmax(170px,230px) minmax(150px,190px);
  gap:10px;align-items:end;margin-bottom:10px
}
.roles-search{
  display:flex;align-items:center;gap:8px;height:var(--control-height);padding:0 11px;
  border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);
  box-shadow:var(--shadow-control);color:var(--color-muted)
}
.roles-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.user-cell{display:flex;align-items:center;gap:8px;min-width:210px}.user-cell strong{font-size:12px}
.user-dot{
  display:grid;place-items:center;flex:0 0 27px;width:27px;height:27px;border-radius:50%;
  background:var(--color-accent-soft);color:var(--color-primary);font-size:11px;font-weight:800
}
.no-role{color:var(--color-danger);font-weight:600}
.roles-permissions-workspace{display:grid;gap:10px;min-width:0}
.roles-permissions-workspace.is-fullscreen{position:fixed;z-index:230;inset:0;overflow:auto;padding:20px;background:var(--color-page)}
.permission-role{min-width:0;padding:0;overflow:hidden}
.permission-role-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 10px;background:var(--color-soft)}
.role-accordion-trigger{flex:1;justify-content:flex-start!important;border:0!important;box-shadow:none!important;background:transparent!important;text-align:left}
.role-accordion-trigger>span{display:grid;gap:2px;min-width:0}
.role-accordion-trigger strong{font-size:13px}.role-accordion-trigger small{font-size:10px;color:var(--color-muted);font-weight:400}
.role-accordion-trigger .closed{transform:rotate(-90deg)}
.role-enabled-toggle{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--color-muted);white-space:nowrap}
.role-enabled-toggle input{width:32px;height:18px;accent-color:var(--color-primary)}
.matrix-search{display:flex;align-items:center;gap:7px;min-height:36px;padding:0 10px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface)}
.matrix-search input{width:170px;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:11px}
.permission-matrix-scroll{min-width:0;overflow-x:auto;overflow-y:hidden;padding:0 10px 10px}
.permission-matrix-scroll :deep(table){min-width:1320px}
.permission-matrix-scroll :deep(tbody input[type="checkbox"]){width:16px;height:16px;accent-color:var(--color-primary)}
.permission-matrix-scroll :deep(tbody select){min-width:135px;height:32px;padding:0 26px 0 8px;border:1px solid var(--color-stroke);border-radius:6px;background:var(--color-surface-raised);color:var(--color-text);font:inherit;font-size:10px}
.roles-save-row{display:flex;justify-content:flex-end;margin-top:4px}
.drawer-form{display:grid;gap:20px}
.user-picker{display:grid;gap:0;border:0;padding:0;margin:0}.user-picker legend{padding:0 0 9px;font-size:12px;font-weight:600}
.user-picker label{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:9px;align-items:center;min-height:52px;border-bottom:1px solid var(--color-stroke);font-size:12px}
.user-picker input{width:16px;height:16px;accent-color:var(--color-primary)}
.user-picker label>span:last-child{display:grid;gap:2px;min-width:0}.user-picker strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.user-picker small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-muted);font-size:10px}
.text-field{display:grid;gap:7px}.text-field span{font-size:12px;font-weight:600}.text-field input{height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);color:var(--color-text);font:inherit;font-size:12px;box-shadow:var(--shadow-control)}
@media(max-width:800px){.roles-toolbar{grid-template-columns:1fr 1fr}.roles-search{grid-column:1/-1}}
@media(max-width:620px){
  .roles-toolbar{grid-template-columns:1fr}
  .roles-search{grid-column:auto}
  .roles-heading-actions{width:100%}
  .roles-heading-actions :deep(.base-select-field){width:100%}
  .roles-heading-actions :deep(.base-button){width:100%}
  .roles-save-row :deep(.base-button){width:100%}
  .permission-role-header{align-items:flex-start;flex-direction:column}
  .role-enabled-toggle{align-self:flex-end}
  .matrix-search{width:100%}.matrix-search input{width:100%}
  .roles-permissions-workspace.is-fullscreen{padding:12px}
}
</style>
