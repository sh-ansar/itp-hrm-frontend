<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, Search, ShieldCheck } from 'lucide-vue-next'
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
type PermissionRow = {
  module: string
  view: boolean
  create: boolean
  edit: boolean
  approve: boolean
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
const selectedRoleForMatrix = ref('hr-specialist')
const roleNameDraft = ref('')
const roleCodeDraft = ref('')

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
      create: role.id === 'company-admin' || role.id === 'hr-specialist' || (role.id === 'staffing-editor' && index === 1),
      edit: role.id === 'company-admin' || role.id === 'hr-specialist' || (role.id === 'staffing-editor' && index === 1),
      approve: role.canApprove && [2, 5].includes(index),
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
const matrixRoleOptions = computed(() => roles.value.map(role => ({ id: role.id, name: role.name })))
const matrixRows = computed(() => permissions.value[selectedRoleForMatrix.value] ?? [])

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
  { key: 'view', label: 'Просмотр' },
  { key: 'create', label: 'Создание' },
  { key: 'edit', label: 'Редактирование' },
  { key: 'approve', label: 'Согласование' },
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
  permissions.value[id] = moduleNames.map(module => ({ module, view: true, create: false, edit: false, approve: false }))
  selectedRoleForMatrix.value = id
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
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
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
        description="требуют назначения доступа" icon="/prototype-icons/Info.svg" tone="danger" />
      <BaseRegistryMetricCard title="Несколько ролей" :value="multiRoleCount"
        description="пользователей с несколькими ролями" icon="/prototype-icons/Info.svg" />
      <BaseRegistryMetricCard title="Количество ролей" :value="roles.length"
        description="ролей в текущей матрице" icon="/prototype-icons/Info.svg" />
      <BaseRegistryMetricCard title="С правом согласования" :value="approvalRoleCount"
        description="ролей могут согласовывать" icon="/prototype-icons/Info.svg" />
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

    <BaseCard v-else-if="activeTab === 'permissions'" class="roles-card">
      <div class="roles-heading">
        <div>
          <h1>Создание роли и её прав</h1>
          <p>Матрица доступа по разделам системы</p>
        </div>
        <div class="roles-heading-actions">
          <BaseSelectField v-model="selectedRoleForMatrix" label="Роль" :options="matrixRoleOptions" />
          <BaseButton :disabled="!demoMode" @click="openRoleEditor"><Plus :size="16" /> Добавить роль</BaseButton>
        </div>
      </div>

      <div class="role-summary">
        <ShieldCheck :size="22" aria-hidden="true" />
        <div>
          <strong>{{ roles.find(role => role.id === selectedRoleForMatrix)?.name }}</strong>
          <span>{{ roles.find(role => role.id === selectedRoleForMatrix)?.description }}</span>
        </div>
      </div>

      <BaseDataTable :rows="matrixRows" :columns="matrixColumns" row-key="module"
        caption="Матрица прав роли"
        empty-title="Права роли не настроены">
        <template #cell-view="{ row }">
          <input type="checkbox" :checked="row.view" :disabled="!demoMode" aria-label="Просмотр"
            @change="setPermission(row,'view',($event.target as HTMLInputElement).checked)" />
        </template>
        <template #cell-create="{ row }">
          <input type="checkbox" :checked="row.create" :disabled="!demoMode" aria-label="Создание"
            @change="setPermission(row,'create',($event.target as HTMLInputElement).checked)" />
        </template>
        <template #cell-edit="{ row }">
          <input type="checkbox" :checked="row.edit" :disabled="!demoMode" aria-label="Редактирование"
            @change="setPermission(row,'edit',($event.target as HTMLInputElement).checked)" />
        </template>
        <template #cell-approve="{ row }">
          <input type="checkbox" :checked="row.approve" :disabled="!demoMode" aria-label="Согласование"
            @change="setPermission(row,'approve',($event.target as HTMLInputElement).checked)" />
        </template>
      </BaseDataTable>
      <div class="roles-save-row"><BaseButton :disabled="!demoMode" @click="success='Матрица прав сохранена.'">Сохранить изменения</BaseButton></div>
    </BaseCard>

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
.role-summary{display:flex;align-items:center;gap:11px;margin-bottom:14px;padding:12px 14px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-soft)}
.role-summary>div{display:grid;gap:2px}.role-summary strong{font-size:13px}.role-summary span{color:var(--color-muted);font-size:11px}
.roles-card :deep(tbody input[type="checkbox"]){width:16px;height:16px;accent-color:var(--color-primary)}
.roles-save-row{display:flex;justify-content:flex-end;margin-top:14px}
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
}
</style>
