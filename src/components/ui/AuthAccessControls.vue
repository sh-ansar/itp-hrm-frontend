<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from './BaseButton.vue'
import { localeOptions } from '../../i18n'
import { useUiPreferencesStore, type UiLocale } from '../../stores/uiPreferences'

const ui = useUiPreferencesStore()
const locale = computed({
  get: () => ui.locale,
  set: value => ui.setLocale(value as UiLocale),
})
</script>

<template>
  <div class="auth-access-controls" aria-label="Настройки интерфейса">
    <label class="auth-access-controls__language">
      <span>Язык</span>
      <select v-model="locale" aria-label="Язык интерфейса">
        <option v-for="option in localeOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
      </select>
    </label>
    <BaseButton variant="secondary" type="button" @click="ui.toggleTheme()">
      {{ ui.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема' }}
    </BaseButton>
  </div>
</template>

<style scoped>
.auth-access-controls{display:flex;justify-content:flex-end;align-items:end;gap:10px;flex-wrap:wrap}
.auth-access-controls__language{display:grid;gap:5px;min-width:145px;color:var(--color-muted);font-size:12px}
.auth-access-controls__language select{min-height:38px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface-raised);color:var(--color-text);padding:7px 32px 7px 10px;font:inherit;font-size:13px}
.auth-access-controls :deep(.base-button){min-height:38px;padding:7px 12px}
@media(max-width:520px){.auth-access-controls{justify-content:stretch}.auth-access-controls__language,.auth-access-controls :deep(.base-button){width:100%}}
</style>
