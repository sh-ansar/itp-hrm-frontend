<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useActiveCompanySelection } from '../composables/useActiveCompanySelection'
import { computed, onMounted, ref } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseField from '../components/ui/BaseField.vue'
import { changePasswordSession } from '../api/session'
import { getUserPreferences, updateUserPreferences } from '../api/preferences'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import EmployeeProfileSection from '../components/EmployeeProfileSection.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { localeOptions, useAppI18n } from '../i18n'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { routeCapability } from '../config/routeAccess'
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
const access = useCompanyAccessStore()
const connected = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true' && import.meta.env.VITE_DEMO_MODE !== 'true'
const hasWorkspaceNavigation = computed(() => !connected || access.can('overview.view'))
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
const currentPassword = ref('')
const nextPassword = ref('')
const confirmedPassword = ref('')
const passwordBusy = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')
const preferencesRevision = ref(0)
const preferencesBusy = ref(false)

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
  get: () => startScreenOptions.value.some(option => option.id === ui.startScreen)
    ? ui.startScreen : (startScreenOptions.value[0]?.id ?? '/'),
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
const startScreenOptions = computed(() => {
  const options = [
    { id: '/', name: t('nav.home') },
    { id: '/employees', name: t('nav.employees') },
    { id: '/organization', name: t('nav.organization') },
    { id: '/staffing', name: t('nav.organization') + ' — ' + (ui.locale === 'en' ? 'Staffing' : ui.locale === 'kk' ? 'Штат кестесі' : ui.locale === 'ka' ? 'საშტატო განრიგი' : 'Штатное расписание') },
  ]
  if (!connected) return options
  const permitted = options.filter(option => {
    const capability = routeCapability(option.id)
    return capability && access.can(capability)
  })
  return permitted.length ? permitted : [{ id: '/', name: t('nav.settings') }]
})
const timeZoneOptions = computed(() => {
  const options = [
  { id: 'Asia/Almaty', name: 'Asia/Almaty (UTC+5)' },
  { id: 'Asia/Aqtobe', name: 'Asia/Aqtobe (UTC+5)' },
  { id: 'Asia/Atyrau', name: 'Asia/Atyrau (UTC+5)' },
  { id: 'Asia/Oral', name: 'Asia/Oral (UTC+5)' },
  { id: 'Asia/Tbilisi', name: 'Asia/Tbilisi (UTC+4)' },
  { id: 'Europe/Moscow', name: 'Europe/Moscow (UTC+3)' },
  { id: 'UTC', name: 'UTC' },
]
  if (!options.some(option => option.id === ui.timeZone)) {
    options.unshift({ id: ui.timeZone, name: ui.timeZone })
  }
  return options
})
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
const passwordMeetsRequirements = computed(() =>
  nextPassword.value.length >= 8 &&
  /\d/.test(nextPassword.value) &&
  /[^A-Za-z0-9]/.test(nextPassword.value)
)

const passwordCopy = computed(() => ({
  ru: { heading: 'Смена пароля', current: 'Текущий пароль', next: 'Новый пароль', confirm: 'Повторите новый пароль', submit: 'Сменить пароль', busy: 'Сохранение…', saved: 'Пароль обновлён. Другие сеансы завершены.', requirements: 'От 8 символов, минимум одна цифра и один специальный символ.', mismatch: 'Пароли не совпадают.', failed: 'Не удалось сменить пароль. Проверьте текущий пароль и требования.' },
  kk: { heading: 'Құпиясөзді өзгерту', current: 'Ағымдағы құпиясөз', next: 'Жаңа құпиясөз', confirm: 'Жаңа құпиясөзді қайталаңыз', submit: 'Құпиясөзді өзгерту', busy: 'Сақталуда…', saved: 'Құпиясөз өзгертілді. Басқа сессиялар аяқталды.', requirements: 'Кемінде 8 таңба, кемінде бір сан және бір арнайы белгі.', mismatch: 'Құпиясөздер сәйкес емес.', failed: 'Құпиясөзді өзгерту мүмкін болмады. Ағымдағы құпиясөз бен талаптарды тексеріңіз.' },
  en: { heading: 'Change password', current: 'Current password', next: 'New password', confirm: 'Confirm new password', submit: 'Change password', busy: 'Saving…', saved: 'Password updated. Other sessions have been signed out.', requirements: 'At least 8 characters, at least one number and one symbol.', mismatch: 'Passwords do not match.', failed: 'Password change failed. Check the current password and requirements.' },
  ka: { heading: 'პაროლის შეცვლა', current: 'მიმდინარე პაროლი', next: 'ახალი პაროლი', confirm: 'გაიმეორეთ ახალი პაროლი', submit: 'პაროლის შეცვლა', busy: 'ინახება…', saved: 'პაროლი შეიცვალა. სხვა სესიები დასრულდა.', requirements: 'მინიმუმ 8 სიმბოლო, მინიმუმ ერთი ციფრი და ერთი სპეციალური ნიშანი.', mismatch: 'პაროლები არ ემთხვევა.', failed: 'პაროლის შეცვლა ვერ მოხერხდა. შეამოწმეთ მიმდინარე პაროლი და მოთხოვნები.' },
})[ui.locale])

async function updateOwnPassword() {
  if (demoMode || !session.user || passwordBusy.value) return
  passwordError.value = ''
  passwordSuccess.value = ''
  if (nextPassword.value !== confirmedPassword.value) {
    passwordError.value = passwordCopy.value.mismatch
    return
  }
  passwordBusy.value = true
  try {
    await changePasswordSession(currentPassword.value, nextPassword.value, confirmedPassword.value)
    passwordSuccess.value = passwordCopy.value.saved
  } catch {
    passwordError.value = passwordCopy.value.failed
  } finally {
    currentPassword.value = ''
    nextPassword.value = ''
    confirmedPassword.value = ''
    passwordBusy.value = false
  }
}

const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
const selectedRole = computed(() => selectedCompany.value?.role_code ?? access.active?.role_code)

const role = computed(() => {
  const code = selectedRole.value ?? ''
  const labels: Record<UiLocale, Record<string, string>> = {
    ru: { employee: 'Сотрудник', company_admin: 'Администратор компании', hr_specialist: 'HR-специалист', department_manager: 'Руководитель подразделения' },
    kk: { employee: 'Қызметкер', company_admin: 'Компания әкімшісі', hr_specialist: 'HR-маман', department_manager: 'Бөлімше басшысы' },
    en: { employee: 'Employee', company_admin: 'Company administrator', hr_specialist: 'HR specialist', department_manager: 'Department manager' },
    ka: { employee: 'თანამშრომელი', company_admin: 'კომპანიის ადმინისტრატორი', hr_specialist: 'HR სპეციალისტი', department_manager: 'განყოფილების ხელმძღვანელი' },
  }
  return labels[ui.locale][code] ?? '—'
})
const scope = computed(() => {
  if (selectedRole.value === 'employee') {
    return { ru: 'Личные настройки', kk: 'Жеке параметрлер', en: 'Personal settings', ka: 'პირადი პარამეტრები' }[ui.locale]
  }
  if (selectedCompany.value?.role_code === 'department_manager') {
    return selectedCompany.value.department_scopes?.map(item => item.name).join(', ') || '—'
  }
  return ui.locale === 'en'
    ? 'Company departments'
    : ui.locale === 'kk' ? 'Компания бөлімшелері' : ui.locale === 'ka' ? 'კომპანიის განყოფილებები' : 'Подразделения компании'
})

async function loadPreferences() {
  if (demoMode || !session.user) return
  preferencesBusy.value = true
  try {
    const response = await getUserPreferences()
    preferencesRevision.value = response.data.revision
    notificationChannels.value.forEach(item => {
      item.enabled = response.data.notification_channels[item.id as 'email' | 'in_app']
    })
    notificationRules.value.forEach(item => {
      item.enabled = response.data.notification_rules[item.id as 'employee_changes' | 'schedule_changes' | 'learning_reserve' | 'document_deadlines']
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить настройки уведомлений'
  } finally {
    preferencesBusy.value = false
  }
}

async function saveNotificationPreferences() {
  if (demoMode || preferencesBusy.value) return
  preferencesBusy.value = true
  error.value = ''
  success.value = ''
  try {
    const response = await updateUserPreferences({
      locale: ui.locale,
      notification_channels: Object.fromEntries(notificationChannels.value.map(item => [item.id, item.enabled])) as { email: boolean; in_app: boolean },
      notification_rules: Object.fromEntries(notificationRules.value.map(item => [item.id, item.enabled])) as {
        employee_changes: boolean
        schedule_changes: boolean
        learning_reserve: boolean
        document_deadlines: boolean
      },
      revision: preferencesRevision.value,
    })
    preferencesRevision.value = response.data.revision
    success.value = t('settings.saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить настройки уведомлений'
    await loadPreferences()
  } finally {
    preferencesBusy.value = false
  }
}

async function reload() {
  busy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    if (!companies.value.some(item => item.id === company.value)) company.value = preferCompany(companies.value)
    if (import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true' && !session.checked) await session.refresh()
    await loadPreferences()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить настройки'
  } finally {
    busy.value = false
  }
}
function saveSettings() {
  success.value = t('settings.saved')
}
function resetSettings() {
  ui.resetInterface()
  success.value = t('settings.saved')
}

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
          <BaseSelectField v-if="hasWorkspaceNavigation" v-model="sidebarModel" :label="t('settings.sidebar')" :options="sidebarOptions" />
          <BaseSelectField v-if="companies.length" v-model="company" :label="t('settings.company')" :options="companies" :disabled="busy" />
          <div class="read-setting">
            <span>{{ t('settings.startScreen') }}</span>
            <RouterLink :to="startScreenModel">{{ startScreenOptions.find(item => item.id === startScreenModel)?.name }}</RouterLink>
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
          <input v-model="option.enabled" type="checkbox" :disabled="preferencesBusy" />
        </label>
      </EmployeeProfileSection>

      <EmployeeProfileSection :title="t('settings.notificationsRules')">
        <label v-for="option in notificationRules" :key="option.id" class="toggle-setting">
          <span>{{ t(option.labelKey) }}</span>
          <input v-model="option.enabled" type="checkbox" :disabled="preferencesBusy" />
        </label>
        <p class="settings-help">
          {{ demoMode
            ? (ui.locale === 'en' ? 'Demo notification settings are temporary.' : ui.locale === 'kk' ? 'Демо хабарландыру баптаулары уақытша.' : ui.locale === 'ka' ? 'დემო შეტყობინებების პარამეტრები დროებითია.' : 'В демо настройки уведомлений временные.')
            : (ui.locale === 'en' ? 'Notification preferences are saved to your HRM account and follow you across browsers.' : ui.locale === 'kk' ? 'Хабарландыру баптаулары HRM тіркелгіңізде сақталады және браузерлер арасында қолданылады.' : ui.locale === 'ka' ? 'შეტყობინებების პარამეტრები ინახება თქვენს HRM ანგარიშში და მოქმედებს სხვადასხვა ბრაუზერში.' : 'Настройки уведомлений сохраняются в вашей учётной записи HRM и работают в разных браузерах.') }}
        </p>
        <div v-if="!demoMode" class="settings-actions">
          <BaseButton :disabled="preferencesBusy" @click="saveNotificationPreferences">
            {{ preferencesBusy ? 'Сохранение…' : t('settings.save') }}
          </BaseButton>
        </div>
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
          <BaseNotice tone="info">
            {{ ui.locale === 'en' ? 'MFA, IP restrictions and organization-wide security policies are enforced only when configured on the server. No decorative security switches are stored in this browser.' : ui.locale === 'kk' ? 'MFA, IP шектеулері және ұйымдық қауіпсіздік саясаты тек серверде бапталған кезде ғана қолданылады. Браузерде жалған қауіпсіздік ауыстырғыштары сақталмайды.' : ui.locale === 'ka' ? 'MFA, IP-შეზღუდვები და ორგანიზაციის უსაფრთხოების პოლიტიკა მოქმედებს მხოლოდ სერვერზე კონფიგურაციის შემთხვევაში. ბრაუზერში დეკორატიული უსაფრთხოების ჩამრთველები არ ინახება.' : 'MFA, ограничения IP и корпоративные политики безопасности применяются только при серверной настройке. Декоративные переключатели безопасности в браузере больше не сохраняются.' }}
          </BaseNotice>
        </div>
      </EmployeeProfileSection>

      <EmployeeProfileSection v-if="!demoMode && session.user" :title="passwordCopy.heading">
        <p class="settings-help">{{ passwordCopy.requirements }}</p>
        <form class="settings-password-form" @submit.prevent="updateOwnPassword">
          <BaseField id="settings-current-password" v-model="currentPassword"
            type="password" :label="passwordCopy.current" autocomplete="current-password"
            required :disabled="passwordBusy" />
          <BaseField id="settings-new-password" v-model="nextPassword"
            type="password" :label="passwordCopy.next" autocomplete="new-password"
            required :disabled="passwordBusy" />
          <BaseField id="settings-confirm-password" v-model="confirmedPassword"
            type="password" :label="passwordCopy.confirm" autocomplete="new-password"
            required :disabled="passwordBusy" />
          <BaseNotice v-if="passwordError" tone="error">{{ passwordError }}</BaseNotice>
          <BaseNotice v-if="passwordSuccess" tone="success">{{ passwordSuccess }}</BaseNotice>
          <div class="settings-actions">
            <BaseButton type="submit" :disabled="passwordBusy || !currentPassword || !passwordMeetsRequirements || nextPassword !== confirmedPassword">
              {{ passwordBusy ? passwordCopy.busy : passwordCopy.submit }}
            </BaseButton>
          </div>
        </form>
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
        <div v-if="demoMode" class="settings-actions"><BaseButton @click="saveSettings">{{ t('settings.save') }}</BaseButton></div>
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
.settings-password-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px;margin-top:16px}
.settings-password-form :deep(.base-notice),.settings-password-form .settings-actions{grid-column:1/-1}
.toggle-setting,.security-row{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-bottom:1px solid var(--color-stroke);font-size:13px}
.toggle-setting input{accent-color:var(--color-primary);width:20px;height:20px;flex:0 0 20px}
.security-row small{color:var(--color-muted);font-size:12px}.security-row strong{font-weight:500}.settings-help{margin:16px 0 0}
@media(max-width:700px){
  .settings-fields,.settings-password-form{grid-template-columns:minmax(0,1fr)}
  .settings-page :deep(.section-heading){padding:14px 16px}
  .settings-page :deep(.section-heading h2){font-size:16px}
  .settings-page :deep(.section-content){padding:16px}
  .settings-page :deep(.view-tabs){justify-self:stretch}
  .security-row{align-items:start;flex-direction:column;gap:6px;padding:12px 0}
  .settings-actions :deep(.base-button){flex:1}
}
</style>
