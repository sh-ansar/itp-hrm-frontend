<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import EmployeeProfileSection from '../components/EmployeeProfileSection.vue'
import { listCompanies, type CompanyRecord } from '../api/organization'
import { useSessionStore } from '../stores/session'
import { useUiPreferencesStore, type UiTheme } from '../stores/uiPreferences'
const session = useSessionStore()
const ui = useUiPreferencesStore()
const activeTab = ref('interface')
const companies = ref<CompanyRecord[]>([])
const company = ref('')
const error = ref('')
const success = ref('')
const busy = ref(false)
const tabs = [{ id: 'interface', label: 'Интерфейс и система' }, { id: 'notifications', label: 'Уведомления' }, { id: 'security', label: 'Безопасность' }]
const themeModel = computed({ get: () => ui.theme, set: value => ui.setTheme(value as UiTheme) })
const sidebarModel = computed({ get: () => ui.sidebarCollapsed ? 'collapsed' : 'expanded', set: value => ui.setSidebarCollapsed(value === 'collapsed') })
const selectedCompany = computed(() => companies.value.find(item => item.id === company.value))
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const notificationOptions = ref([
  { label: 'Получать уведомления', enabled: true },
  { label: 'Изменения в кадровых данных', enabled: true },
  { label: 'Изменения в графике и табеле', enabled: true },
  { label: 'Обучение и кадровый резерв', enabled: false },
])
const roleLabels: Record<string, string> = { company_admin: 'Администратор компании', hr_specialist: 'HR-специалист', department_manager: 'Руководитель подразделения' }
const role = computed(() => roleLabels[selectedCompany.value?.role_code ?? ''] ?? 'Роль не определена')
const scope = computed(() => selectedCompany.value?.role_code === 'department_manager' ? selectedCompany.value.department_scopes?.map(item => item.name).join(', ') || 'Не назначены' : 'Доступные подразделения компании')
async function reload() {
  busy.value = true
  error.value = ''
  try {
    const response = await listCompanies()
    companies.value = response.data
    company.value = company.value || response.data[0]?.id || ''
    if (import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true') await session.refresh()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить настройки' }
  finally { busy.value = false }
}
function saveInterface() { success.value = 'Настройки интерфейса сохранены.' }
onMounted(reload)
</script>
<template>
  <section class="settings-page">
    <div class="settings-breadcrumb"><img src="/prototype-icons/Home.svg" alt="" /><span>/</span><h1>Настройки</h1><span>/</span><span>{{ tabs.find(tab => tab.id === activeTab)?.label }}</span></div>
    <BaseViewTabs v-model="activeTab" :options="tabs" label="Разделы настроек" />
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
    <template v-if="activeTab === 'interface'">
      <EmployeeProfileSection title="Язык, регион, формат времени и чисел">
        <div class="settings-fields">
          <div class="read-setting"><span>Часовой пояс</span><strong>{{ Intl.DateTimeFormat().resolvedOptions().timeZone }}</strong><small>Часовой пояс устройства</small></div>
          <div class="read-setting"><span>Язык</span><strong>Русский</strong></div>
          <div class="read-setting"><span>Формат даты и времени</span><strong>ДД.ММ.ГГГГ / 24-часовой формат (ЧЧ:ММ)</strong></div>
          <div class="read-setting"><span>Формат чисел</span><strong>Разделитель тысяч: пробел</strong></div>
        </div>
      </EmployeeProfileSection>
      <EmployeeProfileSection title="Общая информация">
        <div class="settings-fields">
          <BaseSelectField v-model="themeModel" label="Тема интерфейса" :options="[{id:'light',name:'Светлая тема'},{id:'dark',name:'Тёмная тема'}]" />
          <BaseSelectField v-model="sidebarModel" label="Боковое меню" :options="[{id:'expanded',name:'Развёрнутое меню'},{id:'collapsed',name:'Компактное меню'}]" />
          <BaseSelectField v-if="companies.length" v-model="company" label="Компания" :options="companies" :disabled="busy" />
          <div class="read-setting"><span>Стартовый экран</span><RouterLink to="/">Главная</RouterLink></div>
        </div>
        <div class="settings-actions"><BaseButton @click="saveInterface">Обновить данные</BaseButton><BaseButton variant="secondary" @click="ui.resetInterface(); saveInterface()">Сбросить интерфейс</BaseButton></div>
      </EmployeeProfileSection>
    </template>
    <template v-else-if="activeTab === 'notifications'">
      <EmployeeProfileSection title="Каналы уведомлений">
        <label v-for="(option,index) in notificationOptions" :key="option.label" class="toggle-setting">
          <span>{{ option.label }}</span><input v-model="notificationOptions[index]!.enabled" type="checkbox" :disabled="!demoMode" />
        </label>
        <p class="settings-help">{{ demoMode ? 'Настройки каналов показаны для выбранного профиля.' : 'Каналы уведомлений подключает администратор компании.' }}</p>
      </EmployeeProfileSection>
      <EmployeeProfileSection title="Выбор каналов уведомлений о событиях">
        <div class="settings-fields"><div class="read-setting"><span>Email</span><strong>{{ session.user?.name ? 'Корпоративный профиль' : 'Не подключён' }}</strong></div><div class="read-setting"><span>Уведомления в системе</span><strong>В профиле пользователя</strong></div></div>
      </EmployeeProfileSection>
    </template>
    <template v-else>
      <EmployeeProfileSection title="Способ аутентификации">
        <div class="settings-fields"><div class="read-setting"><span>Пользователь</span><strong>{{ session.user?.name || 'HR-пользователь' }}</strong></div><div class="read-setting"><span>Вход</span><strong>{{ session.user ? 'Корпоративная учётная запись' : 'Демонстрационный профиль' }}</strong></div></div>
        <div class="security-row"><span>Пароль и двухфакторная аутентификация</span><small>Управляются администратором</small></div>
      </EmployeeProfileSection>
      <EmployeeProfileSection title="Управление сессиями">
        <div class="security-row"><span>Текущая сессия</span><strong>{{ session.user ? 'Активна' : 'Демонстрационный просмотр' }}</strong></div>
        <p class="settings-help">Для завершения текущей сессии используйте «Выход» в верхней панели.</p>
      </EmployeeProfileSection>
      <EmployeeProfileSection title="Права доступа">
        <div class="settings-fields"><div class="read-setting"><span>Компания</span><strong>{{ selectedCompany?.name || '—' }}</strong></div><div class="read-setting"><span>Текущая роль</span><strong>{{ role }}</strong></div><div class="read-setting"><span>Область доступа</span><strong>{{ scope }}</strong></div></div>
      </EmployeeProfileSection>
    </template>
  </section>
</template>
<style scoped>
.settings-page{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;min-width:0}
.settings-breadcrumb{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--color-text);margin-bottom:2px}
.settings-breadcrumb img{width:16px;height:16px}.settings-breadcrumb h1{font:inherit;margin:0;font-weight:500}
.settings-page :deep(.view-tabs){align-self:start;justify-self:start;margin-bottom:6px}
.settings-page :deep(.section-heading){min-height:72px;padding:20px 24px}
.settings-page :deep(.section-heading h2){font-size:20px;font-weight:500}
.settings-page :deep(.section-content){padding:22px 24px}
.settings-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.read-setting{display:grid;align-content:start;gap:10px;min-width:0;font-size:14px}
.read-setting>span{font-weight:600}
.read-setting strong,.read-setting a{display:block;min-width:0;padding:11px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);font-weight:400;background:var(--color-surface);overflow-wrap:anywhere}
.read-setting small,.settings-help{color:var(--color-muted);font-size:12px;line-height:1.5}
.settings-actions{display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid var(--color-stroke);padding-top:24px;margin-top:24px}
.toggle-setting,.security-row{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:54px;border-bottom:1px solid var(--color-stroke);font-size:14px}
.toggle-setting input{accent-color:var(--color-primary);width:20px;height:20px;flex:0 0 20px}
.security-row small{color:var(--color-muted);font-size:12px}.security-row strong{font-weight:500}.settings-help{margin:16px 0 0}
@media(max-width:700px){.settings-fields{grid-template-columns:minmax(0,1fr)}.settings-page :deep(.section-heading){padding:16px}.settings-page :deep(.section-heading h2){font-size:17px}.settings-page :deep(.section-content){padding:16px}.settings-page :deep(.view-tabs){justify-self:stretch}.security-row{align-items:start;flex-direction:column;gap:6px;padding:12px 0}}
</style>
