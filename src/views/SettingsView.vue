<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Building2, MonitorCog, RefreshCw, ShieldCheck, UserRound } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { useSessionStore } from '../stores/session'
import { useUiPreferencesStore, type UiTheme } from '../stores/uiPreferences'

type SettingsTab = 'profile' | 'interface' | 'access'

const session = useSessionStore()
const ui = useUiPreferencesStore()
const activeTab = ref<SettingsTab>('profile')
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')
const roleManagementEnabled = ref(false)
const browserLoginEnabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const tabs = [
  { id: 'profile', label: 'Профиль' },
  { id: 'interface', label: 'Интерфейс' },
  { id: 'access', label: 'Доступ' },
]
const themeOptions = [
  { id: 'light', name: 'Светлая тема' },
  { id: 'dark', name: 'Тёмная тема' },
]
const sidebarOptions = [
  { id: 'expanded', name: 'Развёрнутое меню' },
  { id: 'collapsed', name: 'Компактное меню' },
]

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value) ?? null)
const accountInitials = computed(() => {
  const words = session.user?.name?.trim().split(/\s+/) ?? []
  return words.slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('') || 'HR'
})
const accountTitle = computed(() => session.user?.name || 'HR-пользователь')
const accountSubtitle = computed(() => demoMode ? 'Рабочий профиль ITP HRM Demo' : 'Профиль текущего пользователя')
const authStatus = computed(() => browserLoginEnabled && session.user ? 'Сессия активна' : 'Доступ активен')
const themeModel = computed({
  get: () => ui.theme,
  set: value => ui.setTheme(value as UiTheme),
})
function roleLabel(role: CompanyRecord['role_code']): string {
  if (role === 'company_admin') return 'Администратор компании'
  if (role === 'hr_specialist') return 'HR-специалист'
  if (role === 'department_manager') return 'Руководитель подразделения'
  return 'Роль не определена'
}

function accessScopeLabel(item: CompanyRecord): string {
  if (item.role_code !== 'department_manager') return 'Вся доступная область компании'
  const scopes = item.department_scopes ?? []
  return scopes.length ? scopes.map(scope => scope.name).join(', ') : 'Разрешённые подразделения не назначены'
}

const sidebarModel = computed({
  get: () => ui.sidebarCollapsed ? 'collapsed' : 'expanded',
  set: value => ui.setSidebarCollapsed(value === 'collapsed'),
})

function setTab(value: string) {
  if (['profile', 'interface', 'access'].includes(value)) activeTab.value = value as SettingsTab
}

async function reload() {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    const tasks: Promise<unknown>[] = [listCompanies()]
    if (browserLoginEnabled) tasks.push(session.refresh())
    const [companyResult] = await Promise.all(tasks)
    const result = companyResult as Awaited<ReturnType<typeof listCompanies>>
    companies.value = result.data
    roleManagementEnabled.value = Boolean(result.meta.role_management_enabled)
    if (!companies.value.some(item => item.id === company.value)) company.value = result.data[0]?.id ?? ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось обновить настройки'
  } finally {
    busy.value = false
  }
}

function resetInterface() {
  ui.resetInterface()
  success.value = 'Настройки интерфейса возвращены к значениям по умолчанию.'
}

onMounted(reload)
</script>

<template>
  <section class="settings-page">
    <div class="settings-breadcrumb">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span><strong>Настройки</strong>
    </div>

    <div class="settings-heading">
      <div>
        <h1>Настройки</h1>
        <p>Профиль, внешний вид и права доступа.</p>
      </div>
      <BaseButton variant="secondary" :disabled="busy" @click="reload">
        <RefreshCw :size="16" aria-hidden="true" /> {{ busy ? 'Обновление…' : 'Обновить' }}
      </BaseButton>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <BaseLoadingState v-if="busy && !companies.length" label="Загрузка настроек" />

    <template v-else>
      <BaseViewTabs :model-value="activeTab" :options="tabs" label="Разделы настроек"
        @update:model-value="setTab" />

      <div v-if="activeTab === 'profile'" class="settings-grid settings-grid--profile">
        <BaseCard class="profile-card">
          <div class="profile-avatar" aria-hidden="true">{{ accountInitials }}</div>
          <div class="profile-copy">
            <span>Пользователь</span>
            <strong>{{ accountTitle }}</strong>
            <small>{{ accountSubtitle }}</small>
          </div>
          <dl>
            <div>
              <dt>Статус доступа</dt>
              <dd>{{ authStatus }}</dd>
            </div>
            <div>
              <dt>ID пользователя</dt>
              <dd>{{ session.user?.id ?? '—' }}</dd>
            </div>
            <div>
              <dt>Доступных компаний</dt>
              <dd>{{ companies.length }}</dd>
            </div>
          </dl>
        </BaseCard>

        <BaseCard class="company-card">
          <div class="card-heading">
            <Building2 :size="19" aria-hidden="true" />
            <div><h2>Рабочая компания</h2><p>Компания, выбранная для текущей работы.</p></div>
          </div>
          <BaseSelectField v-if="companies.length" v-model="company" label="Компания" :options="companies" />
          <BaseNotice v-else tone="info">Для текущей сессии нет доступных компаний.</BaseNotice>
          <div v-if="selectedCompany" class="company-summary">
            <span>Текущий контур</span>
            <strong>{{ selectedCompany.name }}</strong>
            <small>{{ roleLabel(selectedCompany.role_code) }} · {{ accessScopeLabel(selectedCompany) }}</small>
          </div>
        </BaseCard>
      </div>

      <div v-else-if="activeTab === 'interface'" class="settings-grid">
        <BaseCard class="preference-card">
          <div class="card-heading">
            <MonitorCog :size="19" aria-hidden="true" />
            <div><h2>Внешний вид</h2><p>Настройки применяются сразу и сохраняются в этом браузере.</p></div>
          </div>
          <div class="preference-fields">
            <BaseSelectField v-model="themeModel" label="Тема" :options="themeOptions" />
            <BaseSelectField v-model="sidebarModel" label="Боковое меню" :options="sidebarOptions" />
          </div>
          <div class="preference-preview" :class="{ 'preference-preview--collapsed': ui.sidebarCollapsed }">
            <div class="preview-sidebar">
              <span class="preview-logo">ITP</span>
              <span v-if="!ui.sidebarCollapsed">HRM</span>
            </div>
            <div class="preview-main">
              <span class="preview-line preview-line--short" />
              <span class="preview-line" />
              <div class="preview-cards"><span /><span /><span /></div>
            </div>
          </div>
          <div class="card-actions">
            <BaseButton variant="secondary" @click="resetInterface">Сбросить интерфейс</BaseButton>
          </div>
        </BaseCard>

        <BaseCard class="preference-card">
          <div class="card-heading">
            <ShieldCheck :size="19" aria-hidden="true" />
            <div><h2>Настройки интерфейса</h2><p>Персональные параметры внешнего вида.</p></div>
          </div>
          <ul class="plain-list">
            <li>Тема и вид бокового меню сохраняются для этого браузера.</li>
            <li>Настройки внешнего вида не меняют кадровые данные и рабочие процессы.</li>
            <li>В любой момент можно вернуть стандартный вид интерфейса.</li>
          </ul>
        </BaseCard>
      </div>

      <div v-else class="settings-grid">
        <BaseCard class="access-card">
          <div class="card-heading">
            <UserRound :size="19" aria-hidden="true" />
            <div><h2>Доступные компании</h2><p>Компании, доступные текущему пользователю.</p></div>
          </div>
          <div v-if="companies.length" class="company-list">
            <article v-for="item in companies" :key="item.id" :class="{ 'company-list-item--active': item.id === company }">
              <div>
                <strong>{{ item.name }}</strong>
                <span>{{ roleLabel(item.role_code) }} · {{ item.id === company ? 'выбранный контур' : 'доступен' }}</span>
              </div>
              <BaseButton v-if="item.id !== company" variant="secondary" @click="company = item.id">Выбрать</BaseButton>
            </article>
          </div>
          <BaseNotice v-else tone="info">Нет компаний, доступных текущей сессии.</BaseNotice>
        </BaseCard>

        <BaseCard class="access-card">
          <div class="card-heading">
            <ShieldCheck :size="19" aria-hidden="true" />
            <div><h2>Роли и права</h2><p>Права определяют доступ к разделам и данным компании.</p></div>
          </div>
          <div v-if="selectedCompany" class="access-projection">
            <div>
              <span>Текущая роль</span>
              <strong>{{ roleLabel(selectedCompany.role_code) }}</strong>
            </div>
            <div>
              <span>Область доступа</span>
              <strong>{{ accessScopeLabel(selectedCompany) }}</strong>
            </div>
            <div v-if="selectedCompany.role_code === 'department_manager'" class="access-scope-list">
              <span>Разрешённые подразделения</span>
              <ul v-if="selectedCompany.department_scopes?.length">
                <li v-for="scope in selectedCompany.department_scopes" :key="scope.id">{{ scope.name }}</li>
              </ul>
              <strong v-else>Не назначены</strong>
            </div>
          </div>
          <BaseNotice tone="info">
            {{ roleManagementEnabled
              ? 'Управление ролями доступно только администраторам системы.'
              : 'Изменение ролей недоступно для текущего профиля.' }}
          </BaseNotice>
          <ul class="plain-list">
            <li>Роль и область доступа определяют доступные кадровые разделы.</li>
            <li>Права задаются отдельно для каждой компании.</li>
            <li>В профиле отображаются только доступные рабочие области.</li>
          </ul>
        </BaseCard>
      </div>
    </template>
  </section>
</template>

<style scoped>
.settings-page{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;max-width:100%;overflow-x:clip}
.settings-breadcrumb{display:flex;align-items:center;gap:10px;min-height:24px;color:var(--color-muted);font-size:12px}
.settings-breadcrumb img{width:15px;height:15px}
.settings-breadcrumb strong{color:var(--color-text);font-weight:500}
.settings-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.settings-heading h1{margin:0;color:var(--color-text);font-size:21px;line-height:1.25;font-weight:700;letter-spacing:-.025em}
.settings-heading p{margin:6px 0 0;color:var(--color-muted);font-size:12px}
.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start}
.settings-grid--profile{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}
.profile-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center}
.profile-avatar{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:var(--color-accent-soft);color:var(--color-primary);font-size:17px;font-weight:800}
.profile-copy{display:grid;gap:3px;min-width:0}
.profile-copy>span{color:var(--color-muted);font-size:10px}
.profile-copy strong{color:var(--color-text);font-size:16px;line-height:1.35;overflow-wrap:anywhere}
.profile-copy small{color:var(--color-muted);font-size:11px;line-height:1.4}
.profile-card dl{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:4px 0 0}
.profile-card dl div{display:grid;gap:4px;padding:10px;border-radius:var(--radius-sm);background:var(--color-soft)}
.profile-card dt{color:var(--color-muted);font-size:9px}
.profile-card dd{margin:0;color:var(--color-text);font-size:12px;font-weight:600}
.card-heading{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}
.card-heading>svg{flex:none;margin-top:2px;color:var(--color-primary)}
.card-heading h2{margin:0;color:var(--color-text);font-size:15px;line-height:1.35}
.card-heading p{margin:4px 0 0;color:var(--color-muted);font-size:11px;line-height:1.4}
.company-summary{display:grid;gap:3px;margin-top:12px;padding:12px;border-radius:var(--radius-sm);background:var(--color-soft)}
.company-summary span{color:var(--color-muted);font-size:9px}
.company-summary strong{color:var(--color-text);font-size:13px}
.company-summary small{color:var(--color-muted);font-size:10px;line-height:1.4}
.preference-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.preference-preview{display:grid;grid-template-columns:72px minmax(0,1fr);min-height:155px;margin-top:14px;overflow:hidden;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-bg)}
.preference-preview--collapsed{grid-template-columns:38px minmax(0,1fr)}
.preview-sidebar{display:flex;align-items:flex-start;gap:5px;padding:12px 8px;background:var(--color-surface);border-right:1px solid var(--color-stroke);color:var(--color-text);font-size:9px;font-weight:700}
.preview-logo{font-weight:800}
.preview-main{display:grid;align-content:start;gap:8px;padding:14px}
.preview-line{display:block;height:7px;width:74%;border-radius:999px;background:var(--color-stroke)}
.preview-line--short{width:34%;background:var(--color-primary)}
.preview-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
.preview-cards span{height:58px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface)}
.card-actions{display:flex;justify-content:flex-end;margin-top:12px}
.plain-list{display:grid;gap:9px;margin:0;padding-left:18px;color:var(--color-muted);font-size:11px;line-height:1.5}
.company-list{display:grid;gap:8px}
.company-list article{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface-raised)}
.company-list article>div{display:grid;gap:3px;min-width:0}
.company-list strong{color:var(--color-text);font-size:12px;overflow-wrap:anywhere}
.company-list span{color:var(--color-muted);font-size:9px}
.company-list-item--active{border-color:var(--color-primary)!important;background:var(--color-accent-soft)!important}
.access-projection{display:grid;gap:8px;margin-bottom:12px}
.access-projection>div{display:grid;gap:4px;padding:10px 12px;border-radius:var(--radius-sm);background:var(--color-soft)}
.access-projection span{color:var(--color-muted);font-size:9px}
.access-projection strong{color:var(--color-text);font-size:11px;line-height:1.45;font-weight:600}
.access-scope-list ul{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 0;padding:0;list-style:none}
.access-scope-list li{padding:5px 8px;border:1px solid var(--color-stroke);border-radius:999px;background:var(--color-surface);color:var(--color-text);font-size:10px}
.company-list :deep(.base-button){height:32px;min-height:32px;font-size:10px}
@media(max-width:900px){.settings-grid,.settings-grid--profile{grid-template-columns:1fr}}
@media(max-width:600px){
  .settings-heading :deep(.base-button){width:100%}
  .profile-card dl{grid-template-columns:1fr}
  .preference-fields{grid-template-columns:1fr}
  .preference-preview{min-height:130px}
  .company-list article{align-items:stretch;flex-direction:column}
  .company-list :deep(.base-button){width:100%}
}
</style>
