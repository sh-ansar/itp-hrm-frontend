<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseField from '../ui/BaseField.vue'
import BaseNotice from '../ui/BaseNotice.vue'
import EmployeeProfileSection from '../EmployeeProfileSection.vue'
import { changeOwnPassword } from '../../api/session'
import { useUiPreferencesStore } from '../../stores/uiPreferences'

const ui = useUiPreferencesStore()
const current = ref('')
const next = ref('')
const confirmation = ref('')
const busy = ref(false)
const error = ref('')
const succeeded = ref(false)

const translations = {
  ru: {
    title: 'Смена пароля', old: 'Текущий пароль', next: 'Новый пароль', confirm: 'Повторите новый пароль',
    help: 'Не менее 12 символов: заглавные и строчные буквы, цифра и специальный символ.',
    mismatch: 'Новые пароли не совпадают.', same: 'Новый пароль должен отличаться от текущего.',
    weak: 'Новый пароль не соответствует требованиям безопасности.',
    failure: 'Не удалось изменить пароль. Проверьте текущий пароль и попробуйте снова.',
    done: 'Пароль изменён. Другие активные сессии завершены.',
    action: 'Сменить пароль', saving: 'Сохранение…',
  },
  kk: {
    title: 'Құпиясөзді өзгерту', old: 'Ағымдағы құпиясөз', next: 'Жаңа құпиясөз', confirm: 'Жаңа құпиясөзді қайталаңыз',
    help: 'Кемінде 12 таңба: бас және кіші әріптер, сан және арнайы таңба.',
    mismatch: 'Жаңа құпиясөздер сәйкес келмейді.', same: 'Жаңа құпиясөз ағымдағысынан өзгеше болуы керек.',
    weak: 'Құпиясөз қауіпсіздік талаптарына сай емес.',
    failure: 'Құпиясөз өзгертілмеді. Ағымдағы құпиясөзді тексеріңіз.',
    done: 'Құпиясөз өзгертілді. Басқа сессиялар аяқталды.',
    action: 'Құпиясөзді өзгерту', saving: 'Сақталуда…',
  },
  en: {
    title: 'Change password', old: 'Current password', next: 'New password', confirm: 'Confirm new password',
    help: 'At least 12 characters: uppercase, lowercase, number and symbol.',
    mismatch: 'New passwords do not match.', same: 'The new password must differ from the current one.',
    weak: 'Your new password does not meet security requirements.',
    failure: 'Password change failed. Check your current password and try again.',
    done: 'Password changed. Other active sessions were ended.',
    action: 'Change password', saving: 'Saving…',
  },
  ka: {
    title: 'პაროლის შეცვლა', old: 'მიმდინარე პაროლი', next: 'ახალი პაროლი', confirm: 'დაადასტურეთ ახალი პაროლი',
    help: 'მინიმუმ 12 სიმბოლო: დიდი და პატარა ასოები, ციფრი და სპეციალური სიმბოლო.',
    mismatch: 'ახალი პაროლები ერთმანეთს არ ემთხვევა.', same: 'ახალი პაროლი უნდა განსხვავდებოდეს მიმდინარესგან.',
    weak: 'პაროლი ვერ აკმაყოფილებს უსაფრთხოების მოთხოვნებს.',
    failure: 'პაროლის შეცვლა ვერ მოხერხდა. შეამოწმეთ მიმდინარე პაროლი.',
    done: 'პაროლი შეიცვალა. სხვა სესიები დასრულდა.',
    action: 'პაროლის შეცვლა', saving: 'ინახება…',
  },
}
const copy = computed(() => translations[ui.locale] ?? translations.ru)

async function submit(): Promise<void> {
  if (busy.value) return
  error.value = ''
  succeeded.value = false
  if (next.value !== confirmation.value) { error.value = copy.value.mismatch; return }
  if (next.value === current.value) { error.value = copy.value.same; return }
  if (next.value.length < 12 || !/[A-Z]/.test(next.value) || !/[a-z]/.test(next.value)
    || !/[0-9]/.test(next.value) || !/[\p{P}\p{S}]/u.test(next.value)) {
    error.value = copy.value.weak
    return
  }
  busy.value = true
  try {
    await changeOwnPassword(current.value, next.value)
    succeeded.value = true
  } catch {
    error.value = copy.value.failure
  } finally {
    current.value = ''
    next.value = ''
    confirmation.value = ''
    busy.value = false
  }
}
</script>

<template>
  <EmployeeProfileSection :title="copy.title">
    <form class="password-form" autocomplete="off" @submit.prevent="submit">
      <div class="password-fields">
        <BaseField id="hrm-current-password" v-model="current" type="password"
          :label="copy.old" autocomplete="current-password" required :disabled="busy" />
        <BaseField id="hrm-new-password" v-model="next" type="password"
          :label="copy.next" autocomplete="new-password" required :disabled="busy" />
        <BaseField id="hrm-confirm-password" v-model="confirmation" type="password"
          :label="copy.confirm" autocomplete="new-password" required :disabled="busy" />
      </div>
      <p class="password-help">{{ copy.help }}</p>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="succeeded" tone="success">{{ copy.done }}</BaseNotice>
      <div class="password-actions">
        <BaseButton type="submit" :disabled="busy || !current || !next || !confirmation">
          {{ busy ? copy.saving : copy.action }}
        </BaseButton>
      </div>
    </form>
  </EmployeeProfileSection>
</template>

<style scoped>
.password-form{display:grid;gap:16px}
.password-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.password-help{color:var(--color-muted);font-size:13px;line-height:1.5;margin:0}
.password-actions{display:flex;justify-content:flex-start;border-top:1px solid var(--color-stroke);padding-top:16px}
@media(max-width:700px){.password-fields{grid-template-columns:minmax(0,1fr)}.password-actions :deep(.base-button){width:100%}}
</style>
