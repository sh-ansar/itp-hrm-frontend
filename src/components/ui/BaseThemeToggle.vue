<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useAppI18n } from '../../i18n'
import { useUiPreferencesStore } from '../../stores/uiPreferences'
const ui = useUiPreferencesStore()
const { t } = useAppI18n()
</script>
<template>
  <button class="theme-toggle" type="button"
    :aria-label="ui.theme === 'dark' ? t('topbar.enableLightTheme') : t('topbar.enableDarkTheme')"
    :title="ui.theme === 'dark' ? t('topbar.lightTheme') : t('topbar.darkTheme')"
    :aria-pressed="ui.theme === 'dark'" @click="ui.toggleTheme()">
    <Sun v-if="ui.theme === 'dark'" :size="20" aria-hidden="true" />
    <Moon v-else :size="20" aria-hidden="true" />
  </button>
</template>
<style scoped>
.theme-toggle{display:grid;place-items:center;flex:none;width:var(--control-height);height:var(--control-height);padding:0;border:1px solid var(--color-stroke);border-radius:var(--space-2);background:var(--color-surface-raised);color:var(--color-muted);cursor:pointer}
.theme-toggle:hover{background:var(--color-hover);color:var(--color-primary)}
.theme-toggle:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
</style>
