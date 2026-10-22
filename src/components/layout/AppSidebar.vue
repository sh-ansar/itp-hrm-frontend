<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { hrmNavigation, isHrmNavigationActive } from '../../config/hrmNavigation'
import { routeCapability } from '../../config/routeAccess'
import { useCompanyAccessStore } from '../../stores/companyAccess'
import { useUiPreferencesStore } from '../../stores/uiPreferences'
import { useAppI18n } from '../../i18n'
import { publicAsset } from '../../utils/publicAsset'

const props = defineProps<{ mobileOpen: boolean }>()
const emit = defineEmits<{ 'update:mobileOpen': [value: boolean] }>()
const route = useRoute()
const ui = useUiPreferencesStore()
const { t } = useAppI18n()
const access = useCompanyAccessStore()
const connected = import.meta.env.VITE_ENABLE_BROWSER_LOGIN === 'true' && import.meta.env.VITE_DEMO_MODE !== 'true'
const visible = (path: string) => !connected || (routeCapability(path) ? access.can(routeCapability(path)!) : true)
const primary = computed(() => hrmNavigation.filter(link => link.section === 'primary' && visible(link.to)))
const services = computed(() => hrmNavigation.filter(link => link.section === 'service' && visible(link.to)))
function active(to: string) { return isHrmNavigationActive(to, route.path) }
function linkLabel(link: { label: string; labelKey?: string }) { return t(link.labelKey ?? '', link.label) }
function closeMobile() { if (props.mobileOpen) emit('update:mobileOpen', false) }
</script>

<template>
  <aside class="sidebar hrm-sidebar"
    :class="{ 'sidebar--open': mobileOpen, 'hrm-sidebar--collapsed': ui.sidebarCollapsed }"
    :aria-label="t('shell.mainNavigation')">
    <div class="sidebar-head">
      <RouterLink :to="connected && !access.can('overview.view') ? '/settings' : '/'" class="brand-link" title="ITP HRM" @click="closeMobile">
        <img class="brand-mark" :src="publicAsset('brand/itp-mark.svg')" alt="ITP" width="49" height="37" />
        <span class="brand-copy">
          <strong>HRM</strong>
          <small>{{ t('shell.hrSystem') }}</small>
        </span>
      </RouterLink>
      <button class="sidebar-collapse icon-control" type="button"
        :aria-label="ui.sidebarCollapsed ? t('shell.expandMenu') : t('shell.collapseMenu')"
        :aria-expanded="!ui.sidebarCollapsed"
        @click="ui.toggleSidebar()">
        <img :src="publicAsset(ui.sidebarCollapsed ? 'prototype-icons/Open-Side.svg' : 'prototype-icons/Collapsed-screen.svg')"
          alt="" aria-hidden="true" />
      </button>
      <button class="mobile-nav-close icon-control" type="button"
        :aria-label="t('shell.closeMenu')" @click="closeMobile">
        <img :src="publicAsset('prototype-icons/Close.svg')" alt="" aria-hidden="true" />
      </button>
    </div>

    <nav class="sidebar-nav" :aria-label="t('shell.mainNavigation')">
      <RouterLink v-for="link in primary" :key="link.to" class="nav-item"
        :class="{ 'is-active': active(link.to), 'router-link-active': active(link.to) }"
        :to="link.to" :aria-label="linkLabel(link)"
        :aria-current="active(link.to) ? 'page' : undefined"
        :title="ui.sidebarCollapsed && !mobileOpen ? linkLabel(link) : undefined"
        @click="closeMobile">
        <img :src="link.icon" class="nav-svg-icon" alt="" aria-hidden="true" />
        <span class="nav-label">{{ linkLabel(link) }}</span>
      </RouterLink>
      <RouterLink v-if="connected && access.can('self_service.view')" to="/my" class="nav-item"
        :class="{ 'is-active': route.path === '/my' }" :aria-current="route.path === '/my' ? 'page' : undefined"
        :title="ui.sidebarCollapsed ? { ru: 'Мой кабинет', kk: 'Менің кабинетім', en: 'My workspace', ka: 'ჩემი კაბინეტი' }[ui.locale] : undefined"
        @click="closeMobile">
        <img :src="publicAsset('prototype-icons/People-groupf.svg')" class="nav-svg-icon" alt="" aria-hidden="true" />
        <span class="nav-label">{{ { ru: 'Мой кабинет', kk: 'Менің кабинетім', en: 'My workspace', ka: 'ჩემი კაბინეტი' }[ui.locale] }}</span>
      </RouterLink>
      <div class="nav-divider" role="separator" :aria-label="t('shell.serviceSections')"></div>
      <RouterLink v-for="link in services" :key="link.to" class="nav-item"
        :class="{ 'is-active': active(link.to), 'router-link-active': active(link.to) }"
        :to="link.to" :aria-label="linkLabel(link)"
        :aria-current="active(link.to) ? 'page' : undefined"
        :title="ui.sidebarCollapsed && !mobileOpen ? linkLabel(link) : undefined"
        @click="closeMobile">
        <img :src="link.icon" class="nav-svg-icon" alt="" aria-hidden="true" />
        <span class="nav-label">{{ linkLabel(link) }}</span>
      </RouterLink>
    </nav>
    <footer class="sidebar-foot">
      <img class="sidebar-foot-mark" :src="publicAsset('brand/itp-mark.svg')" alt="" aria-hidden="true" width="33" height="25" />
      <span class="sidebar-foot-copy">
        <strong>ITP HRM</strong><small>{{ t('shell.unifiedHrSystem') }}</small>
      </span>
    </footer>
  </aside>
</template>

<style scoped>
.hrm-sidebar{min-width:0;height:100vh;height:100dvh}
.sidebar-head{
  min-height:64px;flex:0 0 64px;display:flex;align-items:center;
  justify-content:space-between;gap:10px;padding:0 14px 0 17px;
  border-bottom:1px solid var(--color-stroke);
}
.brand-link{display:flex;align-items:center;gap:11px;min-width:0}
.brand-mark{
  display:block;flex:0 0 49px;
  width:49px;height:37px;object-fit:contain;
}
.brand-copy{display:grid;align-content:center;gap:2px;min-width:0;line-height:1.2}
.brand-copy strong{
  white-space:nowrap;color:var(--color-text);
  font-size:19px;font-weight:800;letter-spacing:-.035em;
}
.brand-copy em{color:var(--color-primary);font-style:normal}
.brand-copy small{white-space:nowrap;color:var(--color-muted);font-size:10px;line-height:13px}
.icon-control{
  display:grid;place-items:center;flex:0 0 31px;width:31px;height:31px;
  border:0;border-radius:6px;background:transparent;
  color:var(--color-muted);
}
.icon-control:hover{background:var(--color-hover)}
.icon-control img{width:20px;height:20px;object-fit:contain}
.sidebar-collapse{margin-left:auto}
.mobile-nav-close{display:none}
.sidebar-nav{
  min-height:0;flex:1;display:flex;flex-direction:column;
  overflow-y:auto;overflow-x:hidden;padding:15px 11px 14px;
  scrollbar-width:thin;scrollbar-color:var(--color-stroke-strong) transparent;
}
.nav-item{
  display:flex;align-items:center;gap:12px;min-height:43px;
  flex:0 0 auto;min-width:0;padding:9px 11px;border-radius:7px;
  color:var(--color-text);font-size:13px;font-weight:600;
  line-height:19px;transition:background .15s,color .15s;
}
.nav-item + .nav-item{margin-top:1px}
.nav-item:hover{background:var(--color-hover);color:var(--color-primary-hover)}
.nav-item.is-active{background:var(--color-accent-soft);color:var(--color-primary)}
.nav-svg-icon{display:block;width:20px;height:20px;flex:0 0 20px;object-fit:contain}
.nav-item.is-active .nav-svg-icon{
  filter:brightness(0) saturate(100%) invert(50%) sepia(82%) saturate(1799%) hue-rotate(159deg) brightness(96%) contrast(99%);
}
.nav-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-divider{
  flex:0 0 auto;min-height:1px;margin:13px 9px 9px;background:var(--color-stroke);
}
.sidebar-foot{
  display:flex;align-items:center;gap:10px;min-height:64px;flex:0 0 64px;
  padding:10px 17px;border-top:1px solid var(--color-stroke);
}
.sidebar-foot-mark{
  display:block;flex:0 0 33px;width:33px;height:25px;object-fit:contain;
}
.sidebar-foot-copy{display:grid;gap:2px;min-width:0;line-height:1.15}
.sidebar-foot-copy strong{font-size:12px;font-weight:700}
.sidebar-foot-copy small{font-size:10px;color:var(--color-muted);white-space:nowrap}
.hrm-sidebar--collapsed .sidebar-head{padding:0 7px;justify-content:center}
.hrm-sidebar--collapsed .brand-link{display:none}
.hrm-sidebar--collapsed .sidebar-collapse{margin-left:0}
.hrm-sidebar--collapsed .sidebar-nav{padding:13px 7px}
.hrm-sidebar--collapsed .nav-item{justify-content:center;padding:10px 6px;gap:0}
.hrm-sidebar--collapsed .nav-label{display:none}
.hrm-sidebar--collapsed .nav-divider{margin:12px 5px 8px}
.hrm-sidebar--collapsed .sidebar-foot{justify-content:center;padding:9px 4px}
.hrm-sidebar--collapsed .sidebar-foot-copy{display:none}
@media(max-width:860px){
  .hrm-sidebar{
    position:fixed;inset:0 auto 0 0;z-index:40;
    width:min(286px,88vw);max-width:88vw;min-height:0;
    transform:translateX(-105%);transition:transform .2s ease;
    box-shadow:var(--shadow-float);
  }
  .hrm-sidebar.sidebar--open{transform:translateX(0)}
  .mobile-nav-close{display:grid}
  .sidebar-collapse{display:none}
  .hrm-sidebar--collapsed .sidebar-head{justify-content:space-between;padding:0 14px 0 17px}
  .hrm-sidebar--collapsed .brand-link{display:flex}
  .hrm-sidebar--collapsed .sidebar-nav{padding:15px 11px 14px}
  .hrm-sidebar--collapsed .nav-item{justify-content:flex-start;padding:9px 11px;gap:12px}
  .hrm-sidebar--collapsed .nav-label{display:block}
  .hrm-sidebar--collapsed .nav-divider{margin:13px 9px 9px}
  .hrm-sidebar--collapsed .sidebar-foot{justify-content:flex-start;padding:10px 17px}
  .hrm-sidebar--collapsed .sidebar-foot-copy{display:grid}
}
:global(:root[data-theme="dark"] .nav-svg-icon),
:global(:root[data-theme="dark"] .icon-control img){
  filter:brightness(0) saturate(100%) invert(77%) sepia(21%) saturate(592%) hue-rotate(157deg) brightness(93%) contrast(92%);
}
:global(:root[data-theme="dark"] .nav-item.is-active .nav-svg-icon){
  filter:brightness(0) saturate(100%) invert(67%) sepia(86%) saturate(1928%) hue-rotate(157deg) brightness(108%) contrast(95%);
}
@media(prefers-reduced-motion:reduce){.nav-item,.hrm-sidebar{transition:none}}
</style>
