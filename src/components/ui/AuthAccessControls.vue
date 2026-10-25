<script setup lang="ts">
import { computed } from 'vue'
import BaseSelectField from './BaseSelectField.vue'
import BaseThemeToggle from './BaseThemeToggle.vue'
import { localeOptions, useAppI18n } from '../../i18n'
import { useUiPreferencesStore, type UiLocale } from '../../stores/uiPreferences'
const ui = useUiPreferencesStore()
const { t } = useAppI18n()
const locale = computed({ get: () => ui.locale, set: value => ui.setLocale(value as UiLocale) })
</script>
<template>
  <div class="auth-access-controls">
    <BaseSelectField v-model="locale" class="auth-access-controls__language"
      :label="t('settings.language')" :options="localeOptions" hide-label />
    <BaseThemeToggle />
  </div>
</template>
<style scoped>
.auth-access-controls{display:flex;justify-content:flex-end;align-items:center;gap:10px;min-width:0}
.auth-access-controls__language{width:160px;max-width:calc(100% - var(--control-height) - 10px)}
</style>
