<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  BellOff, Building2, Check, ChevronDown, ChevronRight,
  ExternalLink, LayoutDashboard, LogOut, Package, ShieldCheck,
  UsersRound, Wrench, X,
} from 'lucide-vue-next'
import { useCompanyAccessStore } from '../../stores/companyAccess'
import { useSessionStore } from '../../stores/session'
import { browserLoginEnabled } from '../../router'
import { getUserPreferences, updateUserPreferences, type UserPreferences } from '../../api/preferences'
import { requestJson } from '../../api/client'
import { useAccountMenuI18n } from '../../i18n/accountMenu'

const props = defineProps<{ open: boolean; platformAdmin: boolean; busy: boolean }>()
const emit = defineEmits<{ toggle: []; close: []; logout: [] }>()
const router = useRouter()
const session = useSessionStore()
const access = useCompanyAccessStore()
const { tr } = useAccountMenuI18n()

const status = ref<'online' | 'offline'>('online') // UI-only until presence service is integrated.
const statusExpanded = ref(false)
const companyExpanded = ref(false)
const systemsExpanded = ref(false)
const notificationBusy = ref(false)
const preferences = ref<UserPreferences | null>(null)
const message = ref('')
const signedIn = computed(() => browserLoginEnabled && !!session.user)
const accountName = computed(() => session.user?.name || 'ITP HRM')
const accountDetail = computed(() => access.active?.company_name || 'ITP Кадры')
const initials = computed(() =>
  accountName.value.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || 'HR')
const companyAdmin = computed(() => access.active?.role_code === 'company_admin')
const notificationsDisabled = computed(() => preferences.value?.notification_channels.in_app === false)

const systems = [
  { id: 'portal', href: '/', icon: LayoutDashboard },
  { id: 'hrm', href: '/hrm/', icon: UsersRound },
  { id: 'inventory', href: '/inventory/', icon: Package },
  { id: 'mro', href: '/mro/', icon: Wrench },
] as const

watch(() => props.open, async (opened) => {
  if (!opened) return
  message.value = ''
  statusExpanded.value = false
  companyExpanded.value = false
  systemsExpanded.value = false
  if (!signedIn.value) return
  // Recheck the membership list rather than showing unrelated organizations.
  await access.refresh(true)
  if (!props.open) return
  try {
    const result = await getUserPreferences()
    if (props.open) preferences.value = result.data
  } catch {
    preferences.value = null
  }
})

async function changeNotifications() {
  if (!preferences.value || notificationBusy.value) return
  notificationBusy.value = true
  message.value = ''
  try {
    await requestJson<void>((import.meta.env.VITE_BACKEND_PREFIX || '') + '/sanctum/csrf-cookie')
    // Preserve every other preference and use the revision to prevent lost updates.
    const result = await updateUserPreferences({
      ...preferences.value,
      notification_channels: {
        ...preferences.value.notification_channels,
        in_app: !preferences.value.notification_channels.in_app,
      },
    })
    preferences.value = result.data
  } catch {
    message.value = tr('notificationsError')
    try {
      const result = await getUserPreferences()
      preferences.value = result.data
    } catch { preferences.value = null }
  } finally {
    notificationBusy.value = false
  }
}

function selectCompany(id: string) {
  if (!access.chooseCompany(id)) {
    message.value = tr('switchCompanyError')
    return
  }
  emit('close')
  // A full navigation refreshes company-scoped data on every registry view.
  // The selection is revalidated by the server and retained in sessionStorage.
  window.location.assign(import.meta.env.BASE_URL + 'app')
}

async function navigate(to: string | { name: string; query?: Record<string, string> }) {
  emit('close')
  await router.push(to)
}
</script>

<template>
  <div class="account-menu-anchor">
    <button
      type="button" class="account-trigger" :class="{ 'is-open': open }"
      :aria-label="tr('account')" aria-haspopup="dialog"
      aria-controls="hrm-account-popover" :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="avatar" aria-hidden="true">{{ initials }}</span>
      <span class="trigger-copy">
        <strong>{{ accountName }}</strong>
        <small>{{ accountDetail }}</small>
      </span>
      <ChevronDown class="trigger-chevron" :size="15" aria-hidden="true" />
    </button>

    <section v-if="open" id="hrm-account-popover" class="account-popover" role="dialog" :aria-label="tr('account')">
      <header class="popover-heading">
        <span class="avatar avatar--large" aria-hidden="true">{{ initials }}</span>
        <span class="popover-identity">
          <strong>{{ accountName }}</strong>
          <small>{{ accountDetail }}</small>
        </span>
        <button type="button" class="close-button" :aria-label="tr('logout') === 'Sign out' ? 'Close' : 'Закрыть'"
          @click="emit('close')"><X :size="18" aria-hidden="true" /></button>
      </header>

      <div class="popover-controls">
        <div class="popover-group">
          <button class="chooser" type="button" :aria-expanded="statusExpanded"
            :aria-label="tr('statusLabel')" @click="statusExpanded = !statusExpanded; companyExpanded = false; systemsExpanded = false">
            <span class="status-dot" :class="{ 'status-dot--offline': status === 'offline' }" aria-hidden="true" />
            <span>{{ tr(status) }}</span>
            <ChevronDown :size="16" class="chevron" :class="{ rotated: statusExpanded }" aria-hidden="true" />
          </button>
          <div v-if="statusExpanded" class="chooser-options" role="group" :aria-label="tr('statusLabel')">
            <button v-for="option in (['online','offline'] as const)" :key="option" type="button"
              class="chooser-option" :aria-pressed="status === option"
              @click="status = option; statusExpanded = false">
              <span class="status-dot" :class="{ 'status-dot--offline': option === 'offline' }" />
              {{ tr(option) }} <Check v-if="status === option" :size="16" class="selected" aria-hidden="true" />
            </button>
            <p class="muted-note">{{ tr('localStatus') }}</p>
          </div>
        </div>

        <div class="popover-group">
          <button class="chooser" type="button" :aria-expanded="companyExpanded"
            :aria-label="tr('chooseCompany')" @click="companyExpanded = !companyExpanded; statusExpanded = false; systemsExpanded = false">
            <Building2 :size="18" class="chooser-icon" aria-hidden="true" />
            <span class="chooser-value">{{ access.active?.company_name || tr('company') }}</span>
            <ChevronDown :size="16" class="chevron" :class="{ rotated: companyExpanded }" aria-hidden="true" />
          </button>
          <div v-if="companyExpanded" class="chooser-options" role="group" :aria-label="tr('chooseCompany')">
            <p v-if="!access.companies.length" class="muted-note">{{ tr('noCompanies') }}</p>
            <button v-for="company in access.companies" :key="company.company_id" type="button"
              class="chooser-option" :aria-pressed="access.activeCompanyId === company.company_id"
              @click="selectCompany(company.company_id)">
              <Building2 :size="17" aria-hidden="true" />
              <span class="option-text">{{ company.company_name }}</span>
              <Check v-if="access.activeCompanyId === company.company_id" :size="16" class="selected" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="popover-group">
          <button class="chooser" type="button" :aria-expanded="systemsExpanded"
            :aria-label="tr('chooseSystem')" @click="systemsExpanded = !systemsExpanded; companyExpanded = false; statusExpanded = false">
            <UsersRound :size="18" class="chooser-icon" aria-hidden="true" />
            <span>{{ tr('hrm') }}</span>
            <ChevronDown :size="16" class="chevron" :class="{ rotated: systemsExpanded }" aria-hidden="true" />
          </button>
          <div v-if="systemsExpanded" class="chooser-options" role="group" :aria-label="tr('chooseSystem')">
            <a v-for="system in systems" :key="system.id" class="chooser-option system-option"
              :href="system.href" :aria-current="system.id === 'hrm' ? 'page' : undefined">
              <component :is="system.icon" :size="17" aria-hidden="true" />
              <span class="option-text">{{ tr(system.id) }}</span>
              <Check v-if="system.id === 'hrm'" :size="16" class="selected" aria-hidden="true" />
              <ExternalLink v-else :size="14" class="external" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div class="popover-actions">
        <button v-if="signedIn" class="action-row" type="button" role="switch"
          :aria-checked="notificationsDisabled" :disabled="notificationBusy || !preferences"
          @click="changeNotifications">
          <BellOff :size="19" aria-hidden="true" />
          <span>{{ tr('disableNotifications') }}</span>
          <span class="switch-track" :class="{ 'is-on': notificationsDisabled }" aria-hidden="true"><span /></span>
        </button>

        <button v-if="companyAdmin" type="button" class="action-row"
          @click="navigate({ name: 'settings', query: { tab: 'company' } })">
          <Building2 :size="19" aria-hidden="true" /><span>{{ tr('companySettings') }}</span>
          <ChevronRight :size="15" class="action-end" aria-hidden="true" />
        </button>
        <button v-if="platformAdmin" type="button" class="action-row"
          @click="navigate({ name: 'platform-admin', query: { } })">
          <ShieldCheck :size="19" aria-hidden="true" /><span>{{ tr('platformAdmin') }}</span>
          <ChevronRight :size="15" class="action-end" aria-hidden="true" />
        </button>
        <p v-if="message" role="alert" class="error-note">{{ message }}</p>
      </div>

      <footer v-if="signedIn" class="popover-footer">
        <button class="signout" type="button" :disabled="busy" @click="emit('logout')">
          <LogOut :size="17" aria-hidden="true" />{{ tr('logout') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.account-menu-anchor{position:relative;flex:0 0 auto;min-width:0}
.account-trigger{height:40px;display:flex;align-items:center;gap:9px;min-width:0;max-width:223px;
  padding:4px 8px;border:1px solid transparent;border-radius:9px;color:var(--color-text);
  background:transparent;cursor:pointer;text-align:left}
.account-trigger:hover,.account-trigger.is-open{background:var(--color-hover);border-color:var(--color-stroke)}
.account-trigger:focus-visible,.chooser:focus-visible,.chooser-option:focus-visible,
.action-row:focus-visible,.signout:focus-visible,.close-button:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}
.avatar{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:50%;
  border:1px solid var(--color-primary-stroke);background:var(--color-accent-soft);
  color:var(--color-primary);font-size:11px;font-weight:700}
.avatar--large{flex-basis:37px;width:37px;height:37px}
.trigger-copy,.popover-identity{display:grid;gap:2px;min-width:0}
.trigger-copy strong,.popover-identity strong{font-size:12px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trigger-copy small,.popover-identity small{font-size:11px;color:var(--color-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trigger-chevron{color:var(--color-muted);flex:none}
.account-popover{position:absolute;z-index:120;top:calc(100% + 12px);right:0;
  width:min(350px,calc(100vw - 24px));max-height:calc(100dvh - 84px);overflow:auto;
  border:1px solid var(--color-stroke);border-radius:12px;
  background:rgba(255,255,255,.88);
  background:color-mix(in srgb,var(--color-surface-raised) 85%, transparent);
  -webkit-backdrop-filter:blur(16px) saturate(1.18);
  backdrop-filter:blur(16px) saturate(1.18);color:var(--color-text);
  box-shadow:0 14px 36px rgba(13,40,56,.16);padding:12px}
.popover-heading{display:flex;align-items:center;gap:10px;padding:4px 4px 14px;
  border-bottom:1px solid var(--color-stroke)}
.popover-identity{flex:1}
.close-button{border:0;background:transparent;color:var(--color-muted);border-radius:6px;
  display:grid;place-items:center;width:30px;height:30px;cursor:pointer}
.close-button:hover{background:var(--color-hover)}
.popover-controls{display:grid;gap:6px;padding:13px 0;border-bottom:1px solid var(--color-stroke)}
.popover-group{display:grid;gap:5px}
.chooser{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;
  padding:9px 11px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-control);
  color:var(--color-text);font:inherit;font-size:13px;cursor:pointer;text-align:left}
.chooser:hover{border-color:var(--color-primary-stroke)}
.chooser-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chooser-icon{color:var(--color-primary);flex:none}
.chevron{margin-left:auto;color:var(--color-muted);flex:none;transition:transform .15s}
.chevron.rotated{transform:rotate(180deg)}
.status-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#15a552}
.status-dot--offline{background:#a9b9c2}
.chooser-options{display:grid;gap:1px;padding:4px;background:var(--color-surface);
  border:1px solid var(--color-stroke);border-radius:8px}
.chooser-option{display:flex;align-items:center;gap:10px;width:100%;min-height:37px;
  border:0;border-radius:6px;padding:8px 10px;background:transparent;
  color:var(--color-text);font:inherit;font-size:12px;text-align:left;cursor:pointer;text-decoration:none}
.chooser-option:hover{background:var(--color-hover)}
.option-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.selected{margin-left:auto;color:var(--color-primary);flex:none}
.external{margin-left:auto;color:var(--color-muted);flex:none}
.muted-note{margin:5px 8px 8px;color:var(--color-muted);font-size:11px;line-height:1.4}
.popover-actions{display:grid;gap:1px;padding:11px 0}
.action-row{display:flex;align-items:center;gap:11px;width:100%;min-height:43px;padding:9px;
  border:0;border-radius:7px;background:transparent;color:var(--color-text);
  font:inherit;font-size:12px;font-weight:550;text-align:left;cursor:pointer}
.action-row>svg:first-child{color:var(--color-muted);flex:none}
.action-row:hover{background:var(--color-hover)}
.action-row>span:nth-child(2){flex:1}
.action-row:disabled{opacity:.55;cursor:not-allowed}
.action-end{color:var(--color-muted)}
.switch-track{display:flex;align-items:center;flex:0 0 31px;width:31px;height:18px;border-radius:16px;
  padding:2px;background:var(--color-stroke);transition:background .15s}
.switch-track span{display:block;width:14px;height:14px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(0,0,0,.16);transition:transform .15s}
.switch-track.is-on{background:var(--color-primary)}
.switch-track.is-on span{transform:translateX(13px)}
.error-note{font-size:12px;color:#be4040;margin:6px 10px}
.popover-footer{padding-top:11px;border-top:1px solid var(--color-stroke)}
.signout{display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;height:38px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);color:var(--color-text);font:inherit;font-size:12px;font-weight:650;cursor:pointer}
.signout:hover{border-color:var(--color-primary-stroke);color:var(--color-primary)}
@media(max-width:800px){.account-trigger{max-width:45px;padding:3px}.trigger-copy,.trigger-chevron{display:none}}
@media(prefers-reduced-motion:reduce){.chevron,.switch-track,.switch-track span{transition:none}}
</style>
