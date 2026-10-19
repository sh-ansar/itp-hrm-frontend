<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, ShieldCheck } from 'lucide-vue-next'
import { publicAsset } from '../utils/publicAsset'
import BaseActionDropdown from '../components/ui/BaseActionDropdown.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseDrawer from '../components/ui/BaseDrawer.vue'
import EmployeeAccountLink from '../components/EmployeeAccountLink.vue'
import BaseFilterSummary from '../components/ui/BaseFilterSummary.vue'
import BaseKpiGrid from '../components/ui/BaseKpiGrid.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseRegistryMetricCard from '../components/ui/BaseRegistryMetricCard.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseStatusPill from '../components/ui/BaseStatusPill.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, listDepartments, type CompanyRecord, type DepartmentRecord } from '../api/organization'
import {
  listMemberships,
  revokeMembership,
  saveMembership,
  type MembershipRecord,
  type RoleAuditRecord,
  type RoleCatalogRecord,
  type SystemRoleCode,
} from '../api/roles'

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const roleLabels: Record<SystemRoleCode, string> = {
  company_admin: 'Администратор компании',
  hr_specialist: 'HR-специалист',
  department_manager: 'Руководитель подразделения',
  employee: 'Сотрудник',
}
const roleDescriptions: Record<SystemRoleCode, string> = {
  company_admin: 'Полный административный доступ компании',
  hr_specialist: 'Кадровый реестр, штатка и кадровые процессы',
  department_manager: 'Доступ в пределах назначенных подразделений',
  employee: 'Базовый пользовательский доступ',
}
const capabilityLabels: Record<string, string> = {
  'overview.view': 'Главная',
  'employees.view': 'Сотрудники',
  'employees.extended_view': 'Расширенные данные сотрудников',
  'organization.view': 'Оргструктура',
  'staffing.view': 'Штатное расписание',
  'personnel_actions.view': 'Кадровые процессы',
  'worktime.view': 'Графики и табель',
  'leaves.view': 'Отпуска',
  'documents.view': 'Документы',
  'directories.view': 'Справочники',
  'development.view': 'Развитие',
  'reports.view': 'Отчёты',
  'settings.view': 'Настройки',
  'roles.interface': 'Роли и права',
  'employees.write': 'Изменение сотрудников',
  'staffing.write': 'Изменение штатки',
  'documents.write': 'Изменение документов',
  'worktime.calendar.edit': 'Редактирование календаря',
  'leave.requests.manage': 'Управление отпусками',
  'leave.requests.approve': 'Согласование отпусков',
  'leave.types.manage': 'Типы отпусков',
  'roles.assign': 'Назначение ролей',
}

const tabs = [
  { id: 'assignments', label: 'Назначение ролей' },
  { id: 'permissions', label: 'Права ролей' },
  { id: 'logs', label: 'Лог' },
]

const companies = ref<CompanyRecord[]>([])
const company = ref('')
const memberships = ref<MembershipRecord[]>([])
const roleCatalog = ref<RoleCatalogRecord[]>([])
const audit = ref<RoleAuditRecord[]>([])
const departments = ref<DepartmentRecord[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('assignments')
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const selectedRoleForMatrix = ref<SystemRoleCode>('company_admin')
const editorOpen = ref(false)
const linkUser = ref<MembershipRecord | null>(null)
const editingUser = ref<MembershipRecord | null>(null)
const roleDraft = ref<Exclude<SystemRoleCode, 'company_admin'>>('employee')
const departmentDraft = ref<string[]>([])

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
const roleOptions = computed(() => [
  { id: 'all', name: 'Все роли' },
  ...roleCatalog.value.map(role => ({ id: role.code, name: roleLabels[role.code] })),
])
const statusOptions = [
  { id: 'all', name: 'Все статусы' },
  { id: 'active', name: 'Активные' },
  { id: 'inactive', name: 'Неактивные' },
]
const assignableRoles = computed(() => roleCatalog.value
  .filter(role => role.assignable)
  .map(role => ({ id: role.code, name: roleLabels[role.code] })))
const matrixRoleOptions = computed(() => roleCatalog.value
  .map(role => ({ id: role.code, name: roleLabels[role.code] })))

const filteredMemberships = computed(() => memberships.value.filter(row => {
  const q = search.value.trim().toLowerCase()
  const matchesSearch = !q || [row.name, row.email].some(value => value?.toLowerCase().includes(q))
  const matchesRole = roleFilter.value === 'all' || row.role_code === roleFilter.value
  const normalizedStatus = row.status === 'active' ? 'active' : 'inactive'
  const matchesStatus = statusFilter.value === 'all' || normalizedStatus === statusFilter.value
  return matchesSearch && matchesRole && matchesStatus
}).map(row => ({
  ...row,
  role_label: roleLabels[row.role_code],
  scope_label: row.department_scopes.map(scope => scope.name).join(', ') || '—',
})))

const activeFilterChips = computed(() => [
  ...(search.value ? [{ id: 'search', label: 'Поиск: ' + search.value }] : []),
  ...(roleFilter.value !== 'all' ? [{ id: 'role', label: 'Роль: ' + (roleLabels[roleFilter.value as SystemRoleCode] ?? roleFilter.value) }] : []),
  ...(statusFilter.value !== 'all' ? [{ id: 'status', label: 'Статус: ' + (statusFilter.value === 'active' ? 'Активный' : 'Неактивный') }] : []),
])

const assignmentColumns = [
  { key: 'name', label: 'Пользователь' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Статус' },
  { key: 'role_label', label: 'Роль' },
  { key: 'scope_label', label: 'Область доступа' },
  { key: 'actions', label: 'Действия' },
]

const selectedCatalogRole = computed(() => roleCatalog.value.find(role => role.code === selectedRoleForMatrix.value))
const capabilityRows = computed(() => Object.entries(selectedCatalogRole.value?.capabilities ?? {})
  .map(([code, enabled]) => ({
    code,
    module: capabilityLabels[code] ?? code,
    enabled,
  })))
const matrixColumns = [
  { key: 'module', label: 'Право' },
  { key: 'enabled', label: 'Доступ' },
]

const logRows = computed(() => audit.value.map(row => ({
  ...row,
  created_label: new Date(row.created_at).toLocaleString('ru-RU'),
  action_label: row.action === 'company.role_granted' ? 'Роль назначена'
    : row.action === 'company.role_changed' ? 'Роль изменена'
      : 'Роль отозвана',
  actor_label: row.actor || 'Система',
  subject_label: row.subject || 'Пользователь',
})))
const logColumns = [
  { key: 'created_label', label: 'Дата и время' },
  { key: 'actor_label', label: 'Кто изменил' },
  { key: 'action_label', label: 'Действие' },
  { key: 'subject_label', label: 'Пользователь' },
]

const roleCounts = computed(() => Object.fromEntries(
  roleCatalog.value.map(role => [role.code, memberships.value.filter(row => row.role_code === role.code).length]),
))

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

async function loadCompanies() {
  const response = await listCompanies()
  companies.value = response.data
  if (!companies.value.some(item => item.id === company.value)) {
    company.value = companies.value[0]?.id ?? ''
  }
}

async function loadMemberships() {
  if (!company.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await listMemberships(company.value, { per_page: 100 })
    memberships.value = response.data
    roleCatalog.value = response.roles
    audit.value = response.audit
    if (!roleCatalog.value.some(role => role.code === selectedRoleForMatrix.value)) {
      selectedRoleForMatrix.value = roleCatalog.value[0]?.code ?? 'company_admin'
    }
  } catch (cause) {
    memberships.value = []
    roleCatalog.value = []
    audit.value = []
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить роли и доступы'
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  if (!company.value) return
  const response = await listDepartments(company.value)
  departments.value = response.data
}

async function openEditor(row: MembershipRecord) {
  if (row.role_code === 'company_admin') return
  editingUser.value = row
  roleDraft.value = row.role_code as Exclude<SystemRoleCode, 'company_admin'>
  departmentDraft.value = row.department_scopes.map(scope => scope.id)
  success.value = ''
  error.value = ''
  if (!departments.value.length) {
    try { await loadDepartments() } catch { departments.value = [] }
  }
  editorOpen.value = true
}

function toggleDepartment(id: string, checked: boolean) {
  departmentDraft.value = checked
    ? [...new Set([...departmentDraft.value, id])]
    : departmentDraft.value.filter(item => item !== id)
}

async function saveRole() {
  if (!editingUser.value || !company.value || saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await saveMembership(company.value, editingUser.value.user_id, {
      role_code: roleDraft.value,
      department_ids: roleDraft.value === 'department_manager' ? departmentDraft.value : [],
    })
    editorOpen.value = false
    success.value = 'Роль пользователя сохранена.'
    await loadMemberships()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить роль'
  } finally {
    saving.value = false
  }
}

async function revoke(row: MembershipRecord) {
  if (!company.value || row.role_code === 'company_admin' || saving.value) return
  if (!window.confirm(`Отозвать роль у «${row.name}»?`)) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await revokeMembership(company.value, row.user_id)
    success.value = 'Роль отозвана.'
    await loadMemberships()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось отозвать роль'
  } finally {
    saving.value = false
  }
}

function actions(row: MembershipRecord) {
  if (row.role_code === 'company_admin') return [{ id: 'link', label: 'Кабинет сотрудника' }, { id: 'locked', label: 'Роль администратора защищена', disabled: true }]
  return [
    { id: 'link', label: 'Кабинет сотрудника' },
    { id: 'edit', label: 'Изменить роль' },
    { id: 'revoke', label: 'Отозвать роль' },
  ]
}

function onAction(id: string, row: MembershipRecord) {
  if (id === 'link') linkUser.value = row
  if (id === 'edit') void openEditor(row)
  if (id === 'revoke') void revoke(row)
}

watch(company, () => {
  linkUser.value = null
  departments.value = []
  void loadMemberships()
})

onMounted(async () => {
  loading.value = true
  try {
    await loadCompanies()
    if (company.value) await loadMemberships()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить роли и доступы'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="roles-page">
    <div class="roles-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span><strong>Роли и доступы</strong>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="demoMode" tone="info">Демонстрационные учётные записи и роли. Изменения сохраняются только до перезагрузки страницы.</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <BaseViewTabs v-model="activeTab" :options="tabs" label="Разделы ролей и доступов" />

    <BaseKpiGrid label="Сводка по ролям">
      <BaseRegistryMetricCard title="Пользователи" :value="memberships.length"
        description="учётных записей с доступом" :icon="publicAsset('prototype-icons/People-groupf.svg')" />
      <BaseRegistryMetricCard title="Администраторы" :value="roleCounts.company_admin ?? 0"
        description="защищённые назначения" :icon="publicAsset('prototype-icons/Info.svg')" />
      <BaseRegistryMetricCard title="HR-специалисты" :value="roleCounts.hr_specialist ?? 0"
        description="кадровый доступ" :icon="publicAsset('prototype-icons/Info.svg')" />
      <BaseRegistryMetricCard title="Руководители" :value="roleCounts.department_manager ?? 0"
        description="доступ по подразделениям" :icon="publicAsset('prototype-icons/Info.svg')" />
    </BaseKpiGrid>

    <BaseCard v-if="activeTab === 'assignments'" class="roles-card">
      <div class="roles-heading">
        <div>
          <h1>Назначение ролей</h1>
          <p>{{ selectedCompany?.name }} · {{ demoMode ? 'Демо-данные' : 'данные из HRM API' }}</p>
        </div>
        <BaseSelectField v-if="companies.length > 1" v-model="company" label="Компания" :options="companies" />
      </div>

      <div class="roles-toolbar">
        <label class="roles-search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="search" type="search" placeholder="ФИО или email" aria-label="Поиск пользователей" />
        </label>
        <BaseSelectField v-model="roleFilter" label="Роль" :options="roleOptions" />
        <BaseSelectField v-model="statusFilter" label="Статус" :options="statusOptions" />
      </div>
      <BaseFilterSummary :items="activeFilterChips" label="Активные фильтры"
        @remove="clearFilter" @clear="clearFilters" />

      <BaseLoadingState v-if="loading" label="Загрузка ролей" />
      <BaseDataTable v-else :rows="filteredMemberships" :columns="assignmentColumns" row-key="user_id"
        caption="Реальные роли пользователей"
        empty-title="Назначений ролей нет"
        empty-description="В этой компании пока нет других пользовательских memberships.">
        <template #cell-name="{ row }">
          <div class="user-cell">
            <span class="user-dot">{{ row.name?.slice(0,1) || '?' }}</span>
            <strong>{{ row.name }}</strong>
          </div>
        </template>
        <template #cell-status="{ row }">
          <BaseStatusPill :tone="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? 'Активный' : 'Неактивный' }}
          </BaseStatusPill>
        </template>
        <template #cell-actions="{ row }">
          <BaseActionDropdown variant="icon" :label="'Действия: '+row.name"
            :options="actions(row)" @select="onAction($event,row)" />
        </template>
      </BaseDataTable>
    </BaseCard>

    <BaseCard v-else-if="activeTab === 'permissions'" class="roles-card">
      <div class="roles-heading">
        <div>
          <h1>Права системных ролей</h1>
          <p>{{ demoMode ? 'Демонстрационная матрица прав' : 'Read-only проекция текущей серверной политики доступа' }}</p>
        </div>
        <BaseSelectField v-model="selectedRoleForMatrix" label="Роль" :options="matrixRoleOptions" />
      </div>

      <div class="role-summary">
        <ShieldCheck :size="22" aria-hidden="true" />
        <div>
          <strong>{{ roleLabels[selectedRoleForMatrix] }}</strong>
          <span>{{ roleDescriptions[selectedRoleForMatrix] }}</span>
        </div>
      </div>

      <BaseDataTable :rows="capabilityRows" :columns="matrixColumns" row-key="code"
        caption="Эффективные права роли"
        empty-title="Права роли не получены">
        <template #cell-enabled="{ row }">
          <BaseStatusPill :tone="row.enabled ? 'success' : 'danger'">
            {{ row.enabled ? 'Разрешено' : 'Нет доступа' }}
          </BaseStatusPill>
        </template>
      </BaseDataTable>
      <BaseNotice tone="info">
        Матрица отражает backend-policy. Произвольные роли не создаются в браузере, пока для них нет отдельной серверной модели.
      </BaseNotice>
    </BaseCard>

    <BaseCard v-else class="roles-card">
      <div class="roles-heading">
        <div><h1>Журнал изменений</h1><p>Последние серверные события назначения и отзыва ролей</p></div>
      </div>
      <BaseDataTable :rows="logRows" :columns="logColumns" row-key="id"
        caption="Журнал управления ролями"
        empty-title="Изменений ролей пока нет" />
    </BaseCard>

    <BaseDrawer :open="editorOpen" title="Изменить роль"
      :description="editingUser ? editingUser.name + ' · ' + editingUser.email : ''"
      @close="editorOpen=false">
      <div class="drawer-form">
        <BaseSelectField v-model="roleDraft" label="Роль" :options="assignableRoles" />
        <fieldset v-if="roleDraft === 'department_manager'" class="department-picker">
          <legend>Доступные подразделения</legend>
          <BaseNotice v-if="!departments.length" tone="info">Подразделения в компании пока не созданы.</BaseNotice>
          <label v-for="department in departments" :key="department.id">
            <input type="checkbox"
              :checked="departmentDraft.includes(department.id)"
              @change="toggleDepartment(department.id,($event.target as HTMLInputElement).checked)" />
            <span>{{ department.name }}</span>
          </label>
        </fieldset>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="editorOpen=false">Отмена</BaseButton>
        <BaseButton :disabled="saving || !editingUser || (roleDraft === 'department_manager' && !departmentDraft.length)"
          @click="saveRole">
          {{ saving ? 'Сохранение…' : 'Сохранить роль' }}
        </BaseButton>
      </template>
    </BaseDrawer>
    <BaseDrawer :open="!!linkUser" title="Кабинет сотрудника" :description="linkUser ? linkUser.name + ' · ' + linkUser.email : ''" @close="linkUser = null">
      <EmployeeAccountLink v-if="linkUser" :key="company + ':' + linkUser.user_id" :company="company" :user="linkUser.user_id" />
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
.roles-heading :deep(.base-select-field){width:250px}
.roles-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) minmax(170px,230px) minmax(150px,190px);gap:10px;align-items:end;margin-bottom:10px}
.roles-search{display:flex;align-items:center;gap:8px;height:var(--control-height);padding:0 11px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-surface-raised);box-shadow:var(--shadow-control);color:var(--color-muted)}
.roles-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--color-text);font:inherit;font-size:12px}
.user-cell{display:flex;align-items:center;gap:8px;min-width:190px}.user-cell strong{font-size:12px}
.user-dot{display:grid;place-items:center;flex:0 0 27px;width:27px;height:27px;border-radius:50%;background:var(--color-accent-soft);color:var(--color-primary);font-size:11px;font-weight:800}
.role-summary{display:flex;align-items:center;gap:11px;margin-bottom:14px;padding:12px 14px;border:1px solid var(--color-stroke);border-radius:8px;background:var(--color-soft)}
.role-summary>div{display:grid;gap:2px}.role-summary strong{font-size:13px}.role-summary span{color:var(--color-muted);font-size:11px}
.drawer-form{display:grid;gap:20px}
.department-picker{display:grid;gap:0;border:0;padding:0;margin:0}
.department-picker legend{padding:0 0 9px;font-size:12px;font-weight:600}
.department-picker label{display:flex;align-items:center;gap:9px;min-height:42px;border-bottom:1px solid var(--color-stroke);font-size:12px}
.department-picker input{width:16px;height:16px;accent-color:var(--color-primary)}
@media(max-width:800px){.roles-toolbar{grid-template-columns:1fr 1fr}.roles-search{grid-column:1/-1}}
@media(max-width:620px){.roles-toolbar{grid-template-columns:1fr}.roles-search{grid-column:auto}.roles-heading :deep(.base-select-field){width:100%}}
</style>