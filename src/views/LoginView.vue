<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseField from '../components/ui/BaseField.vue'

const enabled = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true'
const email = ref('')
const password = ref('')
const message = ref('')
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

async function submit() {
  if (!enabled || session.loading) return

  message.value = ''
  try {
    await session.login(email.value.trim(), password.value)
    password.value = ''

    const requested = route.query.redirect
    const destination = typeof requested === 'string'
      && requested.startsWith('/')
      && !requested.startsWith('//')
      ? requested : '/'

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
      <div class="login-brand">
        <strong>ITP HRM</strong>
        <span>Кадровая информационная система</span>
      </div>

      <BaseCard>
        <h1>Вход в систему</h1>
        <p class="muted">Используйте корпоративную учётную запись.</p>

        <BaseNotice v-if="!enabled" tone="warning">
          Авторизация пока не включена. Подключение доступно после согласования безопасности и адресов размещения.
        </BaseNotice>

        <form v-else class="login-form" @submit.prevent="submit">
          <BaseField id="login-email" v-model="email" label="Электронная почта" type="email"
            autocomplete="username" required :disabled="session.loading" :invalid="!!message" />
          <BaseField id="login-password" v-model="password" label="Пароль" type="password"
            autocomplete="current-password" required :disabled="session.loading" :invalid="!!message" />
          <BaseNotice v-if="message || session.error" tone="error">{{ message || session.error }}</BaseNotice>
          <BaseButton type="submit" :disabled="session.loading || !email || !password">
            {{ session.loading ? 'Проверка данных…' : 'Войти' }}
          </BaseButton>
        </form>
        <RouterLink class="login-back" to="/">Вернуться к обзору</RouterLink>
      </BaseCard>

      <p class="login-footnote">Доступ к кадровым данным предоставляется в пределах разрешённых подразделений.</p>
    </div>
  </main>
</template>

<style scoped>
.login-page{min-height:100vh;background:linear-gradient(145deg,#e5f0f5 0%,#f8fafb 60%,#e3eef4 100%);display:grid;place-items:center;padding:24px}
.login-wrap{width:min(100%,440px);display:grid;gap:18px}
.login-brand{display:grid;gap:4px;color:#093044}
.login-brand strong{font-size:26px;letter-spacing:-.02em}
.login-brand span{font-size:13px;color:var(--color-muted)}
.login-wrap h1{font-size:25px;margin:0 0 8px}
.login-wrap p{line-height:1.5;margin:0 0 20px}
.login-form{display:grid;gap:18px}
.login-form :deep(.base-button){min-height:44px;margin-top:4px}

.login-back{display:inline-block;margin-top:20px;color:var(--color-primary);font-size:14px;text-decoration:underline}
.login-footnote{font-size:12px;color:#688696;text-align:center;margin:0}
</style>
