<script setup lang="ts">
import { computed } from 'vue'
import { MonitorCog, PanelLeftClose, RotateCcw, ShieldCheck, UserRound } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseSelectField from '../components/ui/BaseSelectField.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { useSessionStore } from '../stores/session'
import { useUiPreferencesStore, type InterfaceTheme } from '../stores/uiPreferences'

const session = useSessionStore()
const uiPreferences = useUiPreferencesStore()
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const browserLoginEnabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'

const themeOptions = [
  { id: 'light', label: 'Светлая тема' },
  { id: 'dark', label: 'Тёмная тема' },
]
const sidebarOptions = [
  { id: 'expanded', name: 'Развёрнутое меню' },
  { id: 'collapsed', name: 'Компактное меню' },
]

const sidebarMode = computed({
  get: () => uiPreferences.sidebarCollapsed ? 'collapsed' : 'expanded',
  set: value => uiPreferences.setSidebarCollapsed(value === 'collapsed'),
})

const accountName = computed(() => session.user?.name ?? (demoMode ? 'ITP HRM Demo' : 'Не выполнен вход'))
const storageDescription = computed(() =>
  demoMode
    ? 'Настройки интерфейса сохраняются только в этом браузере. Demo-данные не записываются в production.'
    : 'Настройки интерфейса сохраняются только в этом браузере.',
)

function setTheme(value: string) {
  if (value === 'light' || value === 'dark') uiPreferences.setTheme(value as InterfaceTheme)
}
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
        <p>Персональные параметры интерфейса ITP HRM.</p>
      </div>
      <BaseButton variant="secondary" @click="uiPreferences.resetInterface()">
        <RotateCcw :size="16" /> Сбросить интерфейс
      </BaseButton>
    </div>

    <BaseNotice tone="info">
      Здесь доступны только реальные пользовательские настройки. Системное администрирование будет подключаться отдельно после появления backend-контрактов.
    </BaseNotice>

    <div class="settings-grid">
      <BaseCard class="settings-card settings-card--wide">
        <div class="card-heading">
          <span class="card-icon"><MonitorCog :size="19" /></span>
          <div>
            <h2>Интерфейс</h2>
            <p>Внешний вид и поведение рабочего пространства.</p>
          </div>
        </div>

        <div class="setting-block">
          <div class="setting-copy">
            <strong>Цветовая тема</strong>
            <span>Применяется сразу ко всем разделам системы.</span>
          </div>
          <BaseViewTabs :model-value="uiPreferences.theme" :options="themeOptions"
            label="Цветовая тема" @update:model-value="setTheme" />
        </div>

        <div class="setting-row">
          <div class="setting-copy">
            <strong>Боковое меню</strong>
            <span>Выберите обычное или компактное представление на desktop.</span>
          </div>
          <BaseSelectField v-model="sidebarMode" label="Режим меню" :options="sidebarOptions" />
        </div>
      </BaseCard>

      <BaseCard class="settings-card">
        <div class="card-heading">
          <span class="card-icon"><UserRound :size="19" /></span>
          <div>
            <h2>Текущий профиль</h2>
            <p>Состояние пользовательской сессии.</p>
          </div>
        </div>
        <dl class="info-list">
          <div><dt>Профиль</dt><dd>{{ accountName }}</dd></div>
          <div><dt>Авторизация</dt><dd>{{ browserLoginEnabled ? 'Включена' : 'Отключена для demo' }}</dd></div>
        </dl>
      </BaseCard>

      <BaseCard class="settings-card">
        <div class="card-heading">
          <span class="card-icon"><ShieldCheck :size="19" /></span>
          <div>
            <h2>Режим данных</h2>
            <p>Как приложение работает с данными сейчас.</p>
          </div>
        </div>
        <dl class="info-list">
          <div><dt>Режим</dt><dd>{{ demoMode ? 'Frontend Demo' : 'Production API' }}</dd></div>
          <div><dt>Хранение настроек</dt><dd>Этот браузер</dd></div>
        </dl>
        <p class="storage-note">{{ storageDescription }}</p>
      </BaseCard>
    </div>

    <BaseCard class="admin-card">
      <span class="card-icon"><PanelLeftClose :size="19" /></span>
      <div>
        <h2>Системное администрирование</h2>
        <p>Роли, интеграции, уведомления и системные параметры не отображаются как рабочие настройки, пока для них нет утверждённых API и прав доступа.</p>
      </div>
    </BaseCard>
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
.settings-card{display:grid;gap:18px;min-width:0}
.settings-card--wide{grid-column:1/-1}
.card-heading{display:flex;align-items:flex-start;gap:11px}
.card-icon{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:var(--radius-sm);background:var(--color-accent-soft);color:var(--color-primary)}
.card-heading>div{min-width:0}
.card-heading h2,.admin-card h2{margin:0;color:var(--color-text);font-size:15px;line-height:1.4;font-weight:600}
.card-heading p,.admin-card p{margin:4px 0 0;color:var(--color-muted);font-size:11px;line-height:1.5}
.setting-block{display:grid;gap:10px}
.setting-copy{display:grid;gap:4px;min-width:0}
.setting-copy strong{color:var(--color-text);font-size:12px}
.setting-copy span{color:var(--color-muted);font-size:11px;line-height:1.45}
.setting-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);align-items:end;gap:20px;padding-top:16px;border-top:1px solid var(--color-stroke)}
.info-list{display:grid;gap:0;margin:0}
.info-list>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--color-stroke)}
.info-list>div:first-child{border-top:0;padding-top:0}
.info-list dt{color:var(--color-muted);font-size:11px}
.info-list dd{margin:0;color:var(--color-text);font-size:12px;font-weight:600;text-align:right}
.storage-note{margin:0;padding:10px 12px;border-radius:var(--radius-sm);background:var(--color-soft);color:var(--color-muted);font-size:10px;line-height:1.5}
.admin-card{display:flex;align-items:flex-start;gap:11px}
.admin-card>div{min-width:0}
@media(max-width:760px){
  .settings-grid{grid-template-columns:1fr}
  .settings-card--wide{grid-column:auto}
}
@media(max-width:650px){
  .settings-heading :deep(.base-button){width:100%}
  .setting-row{grid-template-columns:1fr;gap:10px}
  .setting-row :deep(.base-select-field){width:100%;max-width:none}
}
</style>
