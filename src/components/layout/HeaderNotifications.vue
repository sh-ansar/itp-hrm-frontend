<script setup lang="ts">
import { Bell, Settings2, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAccountMenuI18n } from '../../i18n/accountMenu'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ toggle: []; close: [] }>()
const router = useRouter()
const { tr } = useAccountMenuI18n()
async function openSettings() {
  emit('close')
  await router.push({ name: 'settings', query: { tab: 'notifications' } })
}
</script>

<template>
  <div class="notification-anchor">
    <button class="notification-button" type="button"
      :aria-label="tr('notifications')" :title="tr('notifications')"
      aria-haspopup="dialog" aria-controls="hrm-notification-popover"
      :aria-expanded="open" @click="emit('toggle')">
      <Bell :size="20" aria-hidden="true" />
    </button>
    <section v-if="open" id="hrm-notification-popover" class="notification-popover"
      role="dialog" :aria-label="tr('notifications')">
      <header class="notification-title">
        <strong>{{ tr('notifications') }}</strong>
        <button type="button" :aria-label="tr('settings')" @click="emit('close')">
          <X :size="18" aria-hidden="true" />
        </button>
      </header>
      <div class="notification-empty">
        <Bell :size="27" aria-hidden="true" />
        <strong>{{ tr('noNotifications') }}</strong>
        <p>{{ tr('notificationInfo') }}</p>
      </div>
      <button class="notification-settings" type="button" @click="openSettings">
        <Settings2 :size="16" aria-hidden="true" />{{ tr('notificationSettings') }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.notification-anchor{position:relative;flex:none}
.notification-button{position:relative;display:grid;place-items:center;width:38px;height:38px;
  border:1px solid transparent;border-radius:8px;background:transparent;color:var(--color-muted);cursor:pointer}
.notification-button:hover,.notification-button[aria-expanded="true"]{
  border-color:var(--color-stroke);background:var(--color-hover);color:var(--color-primary)}
.notification-button:focus-visible,.notification-title button:focus-visible,
.notification-settings:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}
.notification-popover{position:absolute;z-index:119;top:calc(100% + 13px);right:-77px;
  width:min(344px,calc(100vw - 24px));border:1px solid var(--color-stroke);
  border-radius:12px;background:rgba(255,255,255,.88);
  background:color-mix(in srgb,var(--color-surface-raised) 85%, transparent);
  -webkit-backdrop-filter:blur(16px) saturate(1.18);
  backdrop-filter:blur(16px) saturate(1.18);color:var(--color-text);
  box-shadow:0 14px 36px rgba(13,40,56,.16);padding:15px}
.notification-title{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:0 1px 11px;border-bottom:1px solid var(--color-stroke)}
.notification-title strong{font-size:14px;font-weight:650}
.notification-title button{width:28px;height:28px;display:grid;place-items:center;
  border:0;border-radius:7px;background:transparent;color:var(--color-muted);cursor:pointer}
.notification-title button:hover{background:var(--color-hover)}
.notification-empty{display:grid;place-items:center;text-align:center;gap:9px;padding:33px 15px;color:var(--color-muted)}
.notification-empty strong{font-size:13px;color:var(--color-text)}
.notification-empty p{font-size:12px;line-height:1.5;margin:0}
.notification-settings{display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;min-height:36px;border:1px solid var(--color-stroke);border-radius:7px;
  background:var(--color-surface);color:var(--color-text);font:inherit;font-size:12px;cursor:pointer}
.notification-settings:hover{border-color:var(--color-primary-stroke);color:var(--color-primary)}
@media(max-width:520px){.notification-popover{right:-86px}}
</style>
