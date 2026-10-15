<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import EmployeeProfileSection from '../components/EmployeeProfileSection.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { localeOptions, useAppI18n } from '../i18n'
import { useSessionStore } from '../stores/session'
import {
  useUiPreferencesStore,
  type UiDateFormat,
  type UiLocale,
  type UiNumberFormat,
  type UiStartScreen,
  type UiTheme,
  type UiTimeFormat,
} from '../stores/uiPreferences'

const session = useSessionStore()
const ui = useUiPreferencesStore()
const { t } = useAppI18n()

const activeTab = ref('interface')
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const { preferCompany } = useActiveCompanySelection(company)
const error = ref('')
const success = ref('')
const busy = ref(false)
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const tabs = computed(() => [
  { id: 'interface', label: t('settings.interface') },
  { id: 'notifications', label: t('settings.notifications') },
  { id: 'security', label: t('settings.security') },
])

const themeModel = computed({
  get: () => ui.theme,
  set: value => ui.setTheme(value as UiTheme),
})
const sidebarModel = computed({
  get: () => ui.sidebarCollapsed ? 'collapsed' : 'expanded',
  set: value => ui.setSidebarCollapsed(value === 'collapsed'),
})
const localeModel = computed({
  get: () => ui.locale,
  set: value => ui.setLocale(value as UiLocale),
})
const timeZoneModel = computed({
  get: () => ui.timeZone,
  set: value => ui.setTimeZone(value),
})
const dateFormatModel = computed({
  get: () => ui.dateFormat,
  set: value => ui.setDateFormat(value as UiDateFormat),
})
const timeFormatModel = computed({
  get: () => ui.timeFormat,
  set: value => ui.setTimeFormat(value as UiTimeFormat),
})
const numberFormatModel = computed({
  get: () => ui.numberFormat,
  set: value => ui.setNumberFormat(value as UiNumberFormat),
})
const startScreenModel = computed({
  get: () => ui.startScreen,
  set: value => ui.setStartScreen(value as UiStartScreen),
})

const themeOptions = computed(() => [
  { id: 'light', name: t('settings.lightTheme') },
  { id: 'dark', name: t('settings.darkTheme') },
])
const sidebarOptions = computed(() => [
  { id: 'expanded', name: t('settings.expandedSidebar') },
  { id: 'collapsed', name: t('settings.collapsedSidebar') },
])
const startScreenOptions = computed(() => [
  { id: '/', name: t('nav.home') },
  { id: '/employees', name: t('nav.employees') },
  { id: '/organization', name: t('nav.organization') },
  { id: '/staffing', name: t('nav.organization') + ' — ' + (ui.locale === 'en' ? 'Staffing' : ui.locale === 'kk' ? 'Штат кестесі' : ui.locale === 'ka' ? 'საშტატო განრიგი' : 'Штатное расписание') },
])
const timeZoneOptions = [
  { id: 'Asia/Almaty', name: 'Asia/Almaty (UTC+5)' },
  { id: 'Asia/Aqtobe', name: 'Asia/Aqtobe (UTC+5)' },
  { id: 'Asia/Atyrau', name: 'Asia/Atyrau (UTC+5)' },
  { id: 'Asia/Oral', name: 'Asia/Oral (UTC+5)' },
  { id: 'Asia/Tbilisi', name: 'Asia/Tbilisi (UTC+4)' },
  { id: 'Europe/Moscow', name: 'Europe/Moscow (UTC+3)' },
  { id: 'UTC', name: 'UTC' },
]
const dateFormatOptions = [
  { id: 'dd.mm.yyyy', name: 'DD.MM.YYYY' },
  { id: 'yyyy-mm-dd', name: 'YYYY-MM-DD' },
  { id: 'dd/mm/yyyy', name: 'DD/MM/YYYY' },
]
const timeFormatOptions = [
  { id: '24h', name: '24h — 18:45' },
  { id: '12h', name: '12h — 6:45 PM' },
]
const numberFormatOptions = [
  { id: 'space', name: '1 234 567,89' },
  { id: 'comma', name: '1,234,567.89' },
]

const notificationChannels = ref([
  { id: 'email', labelKey: 'settings.email', enabled: true },
  { id: 'in_app', labelKey: 'settings.inApp', enabled: true },
])
const notificationRules = ref([
  { id: 'employee_changes', labelKey: 'settings.employeeChanges', enabled: true },
  { id: 'schedule_changes', labelKey: 'settings.scheduleChanges', enabled: true },
  { id: 'learning_reserve', labelKey: 'settings.learningReserve', enabled: false },
  { id: 'document_deadlines', labelKey: 'settings.documentDeadlines', enabled: true },
])
const mfaEnabled = ref(false)
const ipRestriction = ref(false)
const passwordPolicy = ref('strong')
const inactivityTimeout = ref('30')
const passwordPolicyOptions = [
  { id: 'standard', name: '8+ символов / characters' },
  { id: 'strong', name: '12+ · A-Z · a-z · 0-9 · symbol' },
  { id: 'enterprise', name: '14+ · MFA · rotation policy' },
]
const inactivityOptions = [
  { id: '15', name: '15 min' },
  { id: '30', name: '30 min' },
  { id: '60', name: '60 min' },
  { id: '120', name: '120 min' },
]

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))

const role = computed(() => {
  const code = selectedCompany.value?.role_code ?? ''
  const labels: Record<UiLocale, Record<string, string>> = {
    ru: { company_admin: 'Администратор компании', hr_specialist: 'HR-специалист', department_manager: 'Руководитель подразделения' },
    kk: { company_admin: 'Компания әкімшісі', hr_specialist: 'HR-маман', department_manager: 'Бөлімше басшысы' },
    en: { company_admin: 'Company administrator', hr_specialist: 'HR specialist', department_manager: 'Department manager' },
    ka: { company_admin: 'კომპანიის ადმინისტრატორი', hr_specialist: 'HR სპეციალისტი', department_manager: 'განყოფილების ხელმძღვანელი' },
  }
  return labels[ui.locale][code] ?? '—'
})
const scope = computed(() => {
  if (selectedCompany.value?.role_code === 'department_manager') {
    return selectedCompany.value.department_scopes?.map(item => item.name).join(', ') || '—'
  }
  return ui.locale === 'en'
    ? 'Company departments'
    : ui.locale === 'kk' ? 'Компания бөлімшелері' : ui.locale === 'ka' ? 'კომპანიის განყოფილებები' : 'Подразделения компании'
})

const localSettingsKey = 'hrm-settings-profile-v2'
function restoreLocalSettings() {
  if (typeof window === 'undefined') return
  try {
    const saved = JSON.parse(window.localStorage.getItem(localSettingsKey) || '{}') as Record<string, unknown>
    const channels = saved.notificationChannels as Record<string, unknown> | undefined
    const rules = saved.notificationRules as Record<string, unknown> | undefined
    if (channels) notificationChannels.value.forEach(item => {
      if (typeof channels[item.id] === 'boolean') item.enabled = Boolean(channels[item.id])
    })
    if (rules) notificationRules.value.forEach(item => {
      if (typeof rules[item.id] === 'boolean') item.enabled = Boolean(rules[item.id])
    })
    if (typeof saved.mfaEnabled === 'boolean') mfaEnabled.value = saved.mfaEnabled
    if (typeof saved.ipRestriction === 'boolean') ipRestriction.value = saved.ipRestriction
    if (typeof saved.passwordPolicy === 'string' && ['standard', 'strong', 'enterprise'].includes(saved.passwordPolicy))
      passwordPolicy.value = saved.passwordPolicy
    if (typeof saved.inactivityTimeout === 'string' && ['15', '30', '60', '120'].includes(saved.inactivityTimeout))
      inactivityTimeout.value = saved.inactivityTimeout
  } catch { /* Invalid local profile falls back to defaults. */ }
}
function persistLocalSettings() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(localSettingsKey, JSON.stringify({
      notificationChannels: Object.fromEntries(notificationChannels.value.map(item => [item.id, item.enabled])),
      notificationRules: Object.fromEntries(notificationRules.value.map(item => [item.id, item.enabled])),
      mfaEnabled: mfaEnabled.value,
      ipRestriction: ipRestriction.value,
      passwordPolicy: passwordPolicy.value,
      inactivityTimeout: inactivityTimeout.value,
    }))
  } catch { /* Storage can be unavailable. */ }
}

async function reload() {
  busy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!companies.value.some(item => item.id === company.value)) company.value = preferCompany(companies.value)
    if (import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true') await session.refresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить настройки'
  } finally {
    busy.value = false
  }
}
function saveSettings() {
  persistLocalSettings()
  success.value = t('settings.saved')
}
function resetSettings() {
  ui.resetInterface()
  notificationChannels.value.forEach(item => { item.enabled = true })
  notificationRules.value.forEach((item, index) => { item.enabled = index !== 2 })
  mfaEnabled.value = false
  ipRestriction.value = false
  passwordPolicy.value = 'strong'
  inactivityTimeout.value = '30'
  persistLocalSettings()
  success.value = t('settings.saved')
}

restoreLocalSettings()
onMounted(reload)
</script>

<template>
  <section class="settings-page">
    <div class="settings-breadcrumb">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" />
      <span>/</span><h1>{{ t('settings.title') }}</h1><span>/</span>
      <span>{{ tabs.find(tab => tab.id === activeTab)?.label }}</span>
    </div>

    <BaseViewTabs v-model="activeTab" :options="tabs" :label="t('settings.title')" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>

    <template v-if="activeTab === 'interface'">
      <EmployeeProfileSection :title="t('settings.languageRegion')">
        <div class="settings-fields">
          <BaseSelectField v-model="localeModel" :label="t('settings.language')" :options="localeOptions" />
          <BaseSelectField v-model="timeZoneModel" :label="t('settings.timeZone')" :options="timeZoneOptions" />
          <BaseSelectField v-model="dateFormatModel" :label="t('settings.dateFormat')" :options="dateFormatOptions" />
          <BaseSelectField v-model="timeFormatModel" :label="t('settings.timeFormat')" :options="timeFormatOptions" />
          <BaseSelectField v-model="numberFormatModel" :label="t('settings.numberFormat')" :options="numberFormatOptions" />
          <BaseSelectField v-model="startScreenModel" :label="t('settings.startScreen')" :options="startScreenOptions" />
        </div>
      </EmployeeProfileSection>

      <EmployeeProfileSection :title="t('settings.general')">
        <div class="settings-fields">
          <BaseSelectField v-model="themeModel" :label="t('settings.theme')" :options="themeOptions" />
          <BaseSelectField v-model="sidebarModel" :label="t('settings.sidebar')" :options="sidebarOptions" />
          <BaseSelectField v-if="companies.length" v-model="company" :label="t('settings.company')" :options="companies" :disabled="busy" />
          <div class="read-setting">
            <span>{{ t('settings.startScreen') }}</span>
            <RouterLink :to="ui.startScreen">{{ startScreenOptions.find(item => item.id === ui.startScreen)?.name }}</RouterLink>
          </div>
        </div>
        <div class="settings-actions">
          <BaseButton @click="saveSettings">{{ t('settings.save') }}</BaseButton>
          <BaseButton variant="secondary" @click="resetSettings">{{ t('settings.reset') }}</BaseButton>
        </div>
      </EmployeeProfileSection>
    </template>

    <template v-else-if="activeTab === 'notifications'">
      <EmployeeProfileSection :title="t('settings.notificationsChannels')">
        <label v-for="option in notificationChannels" :key="option.id" class="toggle-setting">
          <span>{{ t(option.labelKey) }}</span>
          <input v-model="option.enabled" type="checkbox" :disabled="!demoMode" />
        </label>
      </EmployeeProfileSection>

      <EmployeeProfileSection :title="t('settings.notificationsRules')">
        <label v-for="option in notificationRules" :key="option.id" class="toggle-setting">
          <span>{{ t(option.labelKey) }}</span>
          <input v-model="option.enabled" type="checkbox" :disabled="!demoMode" />
        </label>
        <p class="settings-help">
          {{ demoMode
            ? (ui.locale === 'en' ? 'Notification rules are stored in this browser profile.' : ui.locale === 'kk' ? 'Хабарландыру ережелері осы браузер профилінде сақталады.' : ui.locale === 'ka' ? 'შეტყობინებების წესები ინახება ამ ბრაუზერის პროფილში.' : 'Правила уведомлений сохраняются в профиле этого браузера.')
            : (ui.locale === 'en' ? 'Notification channels are managed by the company administrator.' : ui.locale === 'kk' ? 'Хабарландыру арналарын компания әкімшісі басқарады.' : ui.locale === 'ka' ? 'შეტყობინებების არხებს მართავს კომპანიის ადმინისტრატორი.' : 'Каналы уведомлений подключает администратор компании.') }}
        </p>
        <div class="settings-actions"><BaseButton @click="saveSettings">{{ t('settings.save') }}</BaseButton></div>
      </EmployeeProfileSection>
    </template>

    <template v-else>
      <EmployeeProfileSection :title="t('settings.authentication')">
        <div class="settings-fields">
          <div class="read-setting">
            <span>User</span><strong>{{ session.user?.name || 'HR user' }}</strong>
          </div>
          <div class="read-setting">
            <span>Login</span><strong>{{ session.user ? t('topbar.workAccount') : 'Demo profile' }}</strong>
          </div>
          <BaseSelectField
            :model-value="mfaEnabled ? 'on' : 'off'" :label="t('settings.mfa')"
            :options="[{id:'off',name:t('settings.disabled')},{id:'on',name:t('settings.enabled')}]"
            :disabled="!demoMode"
            @update:model-value="mfaEnabled = $event === 'on'" />
          <BaseSelectField
            :model-value="ipRestriction ? 'on' : 'off'" :label="t('settings.ipRestriction')"
            :options="[{id:'off',name:t('settings.disabled')},{id:'on',name:t('settings.enabled')}]"
            :disabled="!demoMode"
            @update:model-value="ipRestriction = $event === 'on'" />
          <BaseSelectField v-model="passwordPolicy" :label="t('settings.passwordPolicy')"
            :options="passwordPolicyOptions" :disabled="!demoMode" />
          <BaseSelectField v-model="inactivityTimeout" :label="t('settings.inactivityTimeout')"
            :options="inactivityOptions" :disabled="!demoMode" />
        </div>
      </EmployeeProfileSection>

      <EmployeeProfileSection :title="t('settings.sessions')">
        <div class="security-row">
          <span>{{ t('settings.currentSession') }}</span>
          <strong>{{ session.user ? t('settings.enabled') : 'Browser preview' }}</strong>
        </div>
      </EmployeeProfileSection>

      <EmployeeProfileSection :title="t('settings.accessRights')">
        <div class="settings-fields">
          <div class="read-setting"><span>{{ t('settings.company') }}</span><strong>{{ selectedCompany?.name || '—' }}</strong></div>
          <div class="read-setting"><span>Role</span><strong>{{ role }}</strong></div>
          <div class="read-setting"><span>Scope</span><strong>{{ scope }}</strong></div>
        </div>
        <div class="settings-actions"><BaseButton @click="saveSettings">{{ t('settings.save') }}</BaseButton></div>
      </EmployeeProfileSection>
    </template>
  </section>
</template>

<style scoped>
.settings-page{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-width:0}
.settings-breadcrumb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--color-text);margin-bottom:2px}
.settings-breadcrumb img{width:16px;height:16px}.settings-breadcrumb h1{font:inherit;margin:0;font-weight:500}
.settings-page :deep(.view-tabs){align-self:start;justify-self:start;margin-bottom:6px}
.settings-page :deep(.section-heading){min-height:64px;padding:16px 20px}
.settings-page :deep(.section-heading h2){font-size:17px;font-weight:600}
.settings-page :deep(.section-content){padding:20px}
.settings-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.read-setting{display:grid;align-content:start;gap:8px;min-width:0;font-size:13px}
.read-setting>span{font-weight:600}
.read-setting strong,.read-setting a{display:block;min-width:0;padding:10px 11px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);font-weight:400;background:var(--color-surface);overflow-wrap:anywhere}
.read-setting small,.settings-help{color:var(--color-muted);font-size:12px;line-height:1.5}
.settings-actions{display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid var(--color-stroke);padding-top:20px;margin-top:20px}
.toggle-setting,.security-row{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-bottom:1px solid var(--color-stroke);font-size:13px}
.toggle-setting input{accent-color:var(--color-primary);width:20px;height:20px;flex:0 0 20px}
.security-row small{color:var(--color-muted);font-size:12px}.security-row strong{font-weight:500}.settings-help{margin:16px 0 0}
@media(max-width:700px){
  .settings-fields{grid-template-columns:minmax(0,1fr)}
  .settings-page :deep(.section-heading){padding:14px 16px}
  .settings-page :deep(.section-heading h2){font-size:16px}
  .settings-page :deep(.section-content){padding:16px}
  .settings-page :deep(.view-tabs){justify-self:stretch}
  .security-row{align-items:start;flex-direction:column;gap:6px;padding:12px 0}
  .settings-actions :deep(.base-button){flex:1}
}
</style>
