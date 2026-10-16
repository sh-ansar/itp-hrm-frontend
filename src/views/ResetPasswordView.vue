<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseField from '../components/ui/BaseField.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import { completePasswordReset } from '../api/session'
import { publicAsset } from '../utils/publicAsset'

const route = useRoute()
const router = useRouter()

const email = computed(() => typeof route.query.email === 'string' ? route.query.email.trim() : '')
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const validLink = computed(() => Boolean(email.value && token.value))
const nextPassword = ref('')
const confirmation = ref('')
const busy = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  if (!validLink.value || busy.value || nextPassword.value.length < 14 || nextPassword.value !== confirmation.value) return
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    await completePasswordReset(email.value, token.value, nextPassword.value, confirmation.value)
    nextPassword.value = ''
    confirmation.value = ''
    success.value = 'Пароль установлен. Теперь можно вернуться на страницу входа.'
    await router.replace({ name: 'reset-password' })
  } catch {
    error.value = 'Ссылка недействительна или истекла. Запросите новое письмо на странице входа.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="reset-page">
    <div class="reset-wrap">
      <div class="reset-brand">
        <div class="reset-brand__row">
          <img :src="publicAsset('brand/itp-mark.svg')" alt="ITP" width="62" height="47" />
          <strong>HRM</strong>
        </div>
        <span>Кадровая информационная система</span>
      </div>

      <BaseCard>
        <h1>Установка пароля</h1>
        <p class="muted">Новый пароль должен содержать не менее 14 символов, буквы разных регистров, цифру и специальный знак.</p>

        <BaseNotice v-if="success" tone="success">{{ success }}</BaseNotice>
        <BaseNotice v-else-if="!validLink" tone="warning">
          Ссылка для установки пароля отсутствует или уже использована. Запросите новую ссылку на странице входа.
        </BaseNotice>

        <form v-else class="reset-form" @submit.prevent="submit">
          <div class="reset-email"><span>Учётная запись</span><strong>{{ email }}</strong></div>
          <BaseField id="reset-new-password" v-model="nextPassword" label="Новый пароль" type="password"
            autocomplete="new-password" required :disabled="busy" />
          <BaseField id="reset-confirm-password" v-model="confirmation" label="Повторите пароль" type="password"
            autocomplete="new-password" required :disabled="busy" />
          <BaseNotice v-if="confirmation && nextPassword !== confirmation" tone="error">Пароли не совпадают.</BaseNotice>
          <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
          <BaseButton type="submit"
            :disabled="busy || nextPassword.length < 14 || nextPassword !== confirmation">
            {{ busy ? 'Сохранение…' : 'Установить пароль' }}
          </BaseButton>
        </form>

        <RouterLink class="reset-back" to="/login">Вернуться ко входу</RouterLink>
      </BaseCard>
    </div>
  </main>
</template>

<style scoped>
.reset-page{
  min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;
  padding:24px;overflow:auto;background:linear-gradient(180deg,var(--color-page) 0%,var(--color-surface) 100%);
  color:var(--color-text);
}
.reset-wrap{width:min(100%,440px);display:flex;flex-direction:column;gap:18px}
.reset-brand{display:flex;flex-direction:column;gap:4px;color:var(--color-text)}
.reset-brand__row{display:flex;align-items:center;gap:12px;min-height:49px}
.reset-brand__row img{display:block;flex:none;width:62px;height:47px;object-fit:contain}
.reset-brand strong{font-size:29px;line-height:36px;letter-spacing:-.035em}
.reset-brand span{font-size:13px;line-height:18px;color:var(--color-muted)}
.reset-wrap :deep(.base-card){width:100%;background:var(--color-surface);border:1px solid var(--color-stroke);box-shadow:var(--shadow-card)}
.reset-wrap h1{font-size:25px;line-height:32px;margin:0 0 8px;color:var(--color-text)}
.reset-wrap p{line-height:1.5;margin:0 0 20px}
.reset-form{display:flex;flex-direction:column;gap:18px}
.reset-form :deep(.base-button){width:100%;min-height:44px;margin-top:4px}
.reset-email{display:flex;flex-direction:column;gap:5px;font-size:13px}
.reset-email span{color:var(--color-muted)}
.reset-email strong{font-weight:500;overflow-wrap:anywhere}
.reset-back{display:inline-block;margin-top:20px;color:var(--color-primary);font-size:14px;text-decoration:underline}
@media(max-width:520px){
  .reset-page{align-items:flex-start;padding:20px 14px}
  .reset-wrap{width:100%;gap:14px}
  .reset-brand strong{font-size:22px;line-height:28px}
  .reset-wrap h1{font-size:21px;line-height:28px}
  .reset-form{gap:14px}
}
</style>
