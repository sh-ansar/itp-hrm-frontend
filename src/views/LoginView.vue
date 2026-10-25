<script setup lang="ts">
import { useAuthCopy } from '../i18n/auth'
const { authText } = useAuthCopy()
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCompanyAccessStore } from '../stores/companyAccess'
import { routeCapability } from '../config/routeAccess'
import { useSessionStore } from '../stores/session'
import { useUiPreferencesStore } from '../stores/uiPreferences'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseField from '../components/ui/BaseField.vue'
import AuthAccessControls from '../components/ui/AuthAccessControls.vue'
import { publicAsset } from '../utils/publicAsset'
import { getApiHealth } from '../api/client'
import { requestPasswordReset } from '../api/session'

const enabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const readiness = ref<'checking' | 'ready' | 'unavailable'>(enabled && !demoMode ? 'checking' : enabled ? 'ready' : 'unavailable')
const loginReady = computed(() => enabled && readiness.value === 'ready')
const recoveryReady = ref(false)
const recoveryOpen = ref(false)
const recoveryEmail = ref('')
const recoveryBusy = ref(false)
const recoveryMessage = ref('')
const recoveryError = ref('')

onMounted(async () => {
  if (demoMode) return
  try {
    const response = await getApiHealth()
    const healthy = response.status === 'ok' && response.service === 'itp-hrm-api'
    readiness.value = enabled && healthy && response.capabilities?.browser_login === true
      ? 'ready' : 'unavailable'
    recoveryReady.value = healthy && response.capabilities?.password_reset === true
  } catch {
    // Never offer credential actions if the backend is offline, unavailable,
    // misrouted to platform HTML, or has not explicitly enabled that capability.
    readiness.value = 'unavailable'
    recoveryReady.value = false
  }
})
const email = ref('')
const password = ref('')
const message = ref('')
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const ui = useUiPreferencesStore()

async function requestRecovery() {
  if (!recoveryReady.value || recoveryBusy.value || !recoveryEmail.value.trim()) return
  recoveryBusy.value = true
  recoveryMessage.value = ''
  recoveryError.value = ''
  try {
    await requestPasswordReset(recoveryEmail.value.trim())
    recoveryMessage.value = 'Если активная учётная запись с таким адресом существует, письмо со ссылкой отправлено.'
  } catch {
    recoveryError.value = 'Не удалось отправить запрос. Проверьте подключение и повторите позднее.'
  } finally {
    recoveryBusy.value = false
  }
}

async function submit() {
  if (!loginReady.value || session.loading) return

  message.value = ''
  try {
    await session.login(email.value.trim(), password.value)
    password.value = ''

    const requested = route.query.redirect
    let destination = typeof requested === 'string'
      && requested.startsWith('/')
      && !requested.startsWith('//')
      ? requested : ui.startScreen

    const access = useCompanyAccessStore()
    await access.refresh()
    if (typeof requested !== 'string') {
      const capability = routeCapability(router.resolve(destination).path)
      if (capability && !access.can(capability)) destination = access.can('overview.view') ? '/' : access.can('self_service.view') ? '/my' : '/settings'
    }
    await router.replace(destination)
  } catch (cause) {
    password.value = ''
    message.value = cause instanceof Error ? cause.message : 'Не удалось выполнить вход'
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-wrap">
      <AuthAccessControls />
      <div class="login-brand">
        <div class="login-brand__row">
          <img :src="publicAsset('brand/itp-mark.svg')" alt="ITP" width="62" height="47" />
          <strong>HRM</strong>
        </div>
        <span>{{ authText('Кадровая информационная система') }}</span>
      </div>

      <BaseCard>
        <h1>{{ authText('Вход в систему') }}</h1>
        <p class="muted">{{ authText('Используйте корпоративную учётную запись.') }}</p>

        <BaseNotice v-if="!enabled" tone="warning">
          {{ authText('Авторизация пока не включена. Подключение доступно после согласования безопасности и адресов размещения.') }}
        </BaseNotice>

        <BaseNotice v-else-if="readiness === 'checking'" tone="info">
          {{ authText('Проверяем защищённое подключение к серверу HRM…') }}
        </BaseNotice>
        <BaseNotice v-else-if="!loginReady" tone="warning">
          {{ authText('Вход временно недоступен: сервер HRM ещё не разрешил авторизацию. Повторите попытку позднее.') }}
        </BaseNotice>

        <form v-if="enabled" class="login-form" @submit.prevent="submit">
          <BaseField id="login-email" v-model="email" label="Электронная почта" type="email"
            autocomplete="username" required :disabled="session.loading || !loginReady" :invalid="!!message" />
          <BaseField id="login-password" v-model="password" label="Пароль" type="password" revealable
            autocomplete="current-password" required :disabled="session.loading || !loginReady" :invalid="!!message" />
          <BaseNotice v-if="message || session.error" tone="error">{{ authText(message || session.error || '') }}</BaseNotice>
          <BaseButton type="submit" :disabled="session.loading || !loginReady || !email || !password">
            {{ session.loading ? authText('Проверка данных…') : authText('Войти') }}
          </BaseButton>
        </form>

        <div class="recovery-panel">
          <BaseButton variant="secondary" type="button"
            @click="recoveryOpen = true; recoveryEmail = email; recoveryMessage = ''; recoveryError = ''">
            {{ authText('Забыли пароль?') }}
          </BaseButton>
        </div>

        <BaseDialog :open="recoveryOpen" :title="authText('Сброс пароля')" :close-label="authText('Закрыть')" @close="recoveryOpen = false">
          <div class="recovery-body">
            <p class="muted">{{ authText('Укажите корпоративную почту. Мы отправим ссылку для установки нового пароля.') }}</p>
            <BaseNotice v-if="!recoveryReady" tone="info">
              {{ authText('Восстановление пароля временно недоступно. Попробуйте позднее.') }}
            </BaseNotice>
            <form v-else-if="recoveryOpen" class="login-form recovery-form" @submit.prevent="requestRecovery">
              <BaseField id="recovery-email" v-model="recoveryEmail" label="Электронная почта" type="email"
                autocomplete="email" required :disabled="recoveryBusy" />
              <BaseNotice v-if="recoveryMessage" tone="success">{{ authText(recoveryMessage) }}</BaseNotice>
              <BaseNotice v-if="recoveryError" tone="error">{{ authText(recoveryError) }}</BaseNotice>
              <BaseButton type="submit" :disabled="recoveryBusy || !recoveryEmail">
                {{ recoveryBusy ? authText('Отправка…') : authText('Получить ссылку') }}
              </BaseButton>
            </form>
            <BaseButton variant="secondary" type="button" @click="recoveryOpen = false">{{ authText('Закрыть') }}</BaseButton>
          </div>
        </BaseDialog>
      </BaseCard>

      <p class="login-footnote">{{ authText('Доступ к кадровым данным предоставляется в пределах разрешённых подразделений.') }}</p>
    </div>
  </main>
</template>

<style scoped>
.login-page{
  min-height:100vh;min-height:100dvh;
  display:flex;align-items:center;justify-content:center;
  padding:24px;
  overflow:auto;
  background:
    linear-gradient(180deg,var(--color-page) 0%,var(--color-surface) 100%);
  color:var(--color-text);
}
.login-wrap{
  width:min(100%,440px);
  display:flex;flex-direction:column;gap:18px;
  opacity:1;visibility:visible;
}
.login-brand{display:flex;flex-direction:column;gap:4px;color:var(--color-text)}
.login-brand__row{display:flex;align-items:center;gap:12px;min-height:49px}
.login-brand__row img{display:block;flex:none;width:62px;height:47px;object-fit:contain}
.login-brand strong{font-size:29px;line-height:36px;letter-spacing:-.035em}
.login-brand span{font-size:13px;line-height:18px;color:var(--color-muted)}
.login-wrap :deep(.base-card){
  width:100%;
  background:var(--color-surface);
  border:1px solid var(--color-stroke);
  box-shadow:var(--shadow-card);
}
.login-wrap h1{font-size:25px;line-height:32px;margin:0 0 8px;color:var(--color-text)}
.login-wrap p{line-height:1.5;margin:0 0 20px}
.login-form{display:flex;flex-direction:column;gap:18px}
.login-form :deep(.base-button){width:100%;min-height:44px;margin-top:4px}
.recovery-panel{margin-top:18px;padding-top:18px;border-top:1px solid var(--color-stroke)}
.recovery-panel :deep(.base-button){width:100%}
.recovery-body{display:grid;gap:16px}
.recovery-form{margin-top:0}
.recovery-form .muted{margin:0}
.login-footnote{font-size:12px;line-height:18px;color:var(--color-muted);text-align:center;margin:0}
@media(max-width:520px){
  .login-page{align-items:flex-start;padding:20px 14px}
  .login-wrap{width:100%;gap:14px}
  .login-brand strong{font-size:22px;line-height:28px}
  .login-wrap h1{font-size:21px;line-height:28px}
  .login-form{gap:14px}
}
</style>