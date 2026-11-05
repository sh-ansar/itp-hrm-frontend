<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, Menu, X } from 'lucide-vue-next'
import { publicAsset } from '../../utils/publicAsset'
import { useSaasText } from '../../i18n/saas'
const route = useRoute()
const { tr, ui } = useSaasText()
const menuOpen = ref(false)
const hidden = ref(false)
const scrolled = ref(false)
let lastY = 0
const languages = [
  { value: 'ru', label: 'RU' }, { value: 'en', label: 'EN' }, { value: 'ka', label: 'GE' },
] as const
function onScroll() {
  const y = Math.max(0, window.scrollY || 0)
  scrolled.value = y > 10
  const delta = y - lastY
  if (y < 100 || menuOpen.value) hidden.value = false
  else if (Math.abs(delta) > 4) hidden.value = delta > 0
  lastY = y
}
function setLanguage(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'ru' || value === 'en' || value === 'ka') ui.setLocale(value)
}
onMounted(() => {
  lastY = window.scrollY || 0
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
watch(() => route.fullPath, () => { menuOpen.value = false; hidden.value = false })
watch(menuOpen, value => { if (value) hidden.value = false })
</script>

<template>
  <div class="saas-site" :lang="ui.locale === 'ka' ? 'ka' : ui.locale === 'en' ? 'en' : 'ru'">
    <header class="saas-header" :class="{ 'is-hidden': hidden, 'is-scrolled': scrolled }">
      <RouterLink class="saas-brand" :to="{ name: 'public.home' }" :aria-label="tr('brand')">
        <img :src="publicAsset('brand/itp-mark.svg')" width="48" height="38" alt="ITP" />
        <span><strong>ITP</strong><small>{{ ui.locale === 'ru' ? 'КАДРЫ' : 'HRM' }}</small></span>
      </RouterLink>
      <nav class="saas-primary" :aria-label="tr('menu')">
        <RouterLink :to="{ name: 'public.home', hash: '#features' }">{{ tr('product') }}</RouterLink>
        <RouterLink :to="{ name: 'public.home', hash: '#modules' }">{{ tr('modules') }}</RouterLink>
        <RouterLink :to="{ name: 'public.home', hash: '#how' }">{{ tr('resources') }}</RouterLink>
        <RouterLink :to="{ name: 'public.pricing' }">{{ tr('pricing') }}</RouterLink>
      </nav>
      <div class="saas-header-actions">
        <div class="saas-locale">
          <label class="sr-only" for="saas-language">Language</label>
          <select id="saas-language" :value="ui.locale === 'kk' ? 'ru' : ui.locale" @change="setLanguage">
            <option v-for="item in languages" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <ChevronDown :size="15" aria-hidden="true" />
        </div>
        <RouterLink class="saas-link-button saas-link-button--light" to="/login">{{ tr('login') }}</RouterLink>
        <RouterLink class="saas-link-button saas-link-button--main" :to="{ name: 'public.register' }">{{ tr('getStarted') }}</RouterLink>
        <button class="saas-mobile-toggle" type="button" :aria-label="tr('menu')" :aria-expanded="menuOpen"
          aria-controls="saas-mobile-menu" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" :size="22" /><Menu v-else :size="22" />
        </button>
      </div>
      <nav v-if="menuOpen" id="saas-mobile-menu" class="saas-mobile-menu" :aria-label="tr('menu')">
        <RouterLink :to="{ name: 'public.home', hash: '#features' }">{{ tr('product') }}</RouterLink>
        <RouterLink :to="{ name: 'public.home', hash: '#modules' }">{{ tr('modules') }}</RouterLink>
        <RouterLink :to="{ name: 'public.pricing' }">{{ tr('pricing') }}</RouterLink>
        <RouterLink to="/login">{{ tr('login') }}</RouterLink>
        <RouterLink :to="{ name: 'public.register' }">{{ tr('getStarted') }}</RouterLink>
      </nav>
    </header>
    <main class="saas-main"><RouterView /></main>
    <footer class="saas-footer">
      <div class="saas-footer-grid">
        <div class="saas-footer-brand">
          <RouterLink class="saas-brand" :to="{ name: 'public.home' }">
            <img :src="publicAsset('brand/itp-mark.svg')" width="48" height="38" alt="ITP" />
            <span><strong>ITP</strong><small>{{ ui.locale === 'ru' ? 'КАДРЫ' : 'HRM' }}</small></span>
          </RouterLink>
          <p>{{ tr('heroText') }}</p>
        </div>
        <nav :aria-label="tr('product')"><strong>{{ tr('product') }}</strong>
          <RouterLink :to="{ name: 'public.home', hash: '#features' }">{{ tr('modules') }}</RouterLink>
          <RouterLink :to="{ name: 'public.pricing' }">{{ tr('pricing') }}</RouterLink>
          <RouterLink to="/app">{{ tr('returnToApp') }}</RouterLink>
        </nav>
        <nav :aria-label="tr('resources')"><strong>{{ tr('resources') }}</strong>
          <RouterLink :to="{ name: 'public.legal', params: { type: 'privacy' } }">{{ tr('privacy') }}</RouterLink>
          <RouterLink :to="{ name: 'public.legal', params: { type: 'offer' } }">{{ tr('offer') }}</RouterLink>
          <RouterLink :to="{ name: 'public.legal', params: { type: 'tariff-policy' } }">{{ tr('tariffPolicy') }}</RouterLink>
          <RouterLink :to="{ name: 'public.legal', params: { type: 'acceptable-use' } }">{{ tr('acceptableUse') }}</RouterLink>
          <RouterLink :to="{ name: 'public.legal', params: { type: 'personal-data-consent' } }">{{ tr('personalConsent') }}</RouterLink>
        </nav>
        <nav :aria-label="tr('login')"><strong>{{ tr('login') }}</strong>
          <RouterLink to="/login">{{ tr('login') }}</RouterLink>
          <RouterLink :to="{ name: 'public.register' }">{{ tr('getStarted') }}</RouterLink>
        </nav>
      </div>
      <div class="saas-footer-end"><span>© 2026 ITP Mining · {{ tr('brand') }}</span><span>RU · EN · GE</span></div>
    </footer>
  </div>
</template>

<style scoped>
.saas-site{--saas-accent:#009cde;--saas-ink:#153542;--saas-muted:#66838f;--saas-stroke:#e0ebef;
  --color-page:#f5f9fb;--color-text:var(--saas-ink);--color-primary:var(--saas-accent);
  min-height:100vh;background:#f5f9fb;color:var(--saas-ink);font:inherit;display:flex;flex-direction:column}
.saas-header{height:78px;padding:12px max(20px,calc((100% - 1240px)/2));background:#fff;
  border-bottom:1px solid var(--saas-stroke);position:sticky;top:0;z-index:70;display:grid;
  grid-template-columns:minmax(145px,1fr) auto minmax(315px,1fr);gap:16px;align-items:center;
  transition:transform .22s ease,box-shadow .22s ease;box-sizing:border-box;color:var(--saas-ink)}
.saas-header.is-scrolled{box-shadow:0 9px 24px #09334214}
.saas-header.is-hidden:not(:focus-within){transform:translateY(calc(-100% - 2px));pointer-events:none}
.saas-brand{display:flex;gap:10px;align-items:center;text-decoration:none!important;color:inherit!important;width:max-content}
.saas-brand img{display:block;object-fit:contain;max-height:40px}.saas-brand span{display:grid;line-height:1.05}
.saas-brand strong{font-size:21px;font-weight:750;letter-spacing:-.045em}
.saas-brand small{font-size:11px;color:var(--saas-accent);letter-spacing:.11em;font-weight:700}
.saas-primary,.saas-header-actions{display:flex;align-items:center;gap:20px}
.saas-primary{justify-content:center}.saas-primary a{white-space:nowrap;text-decoration:none!important;color:inherit!important;font-size:14px}
.saas-primary a:hover{color:var(--saas-accent)!important}.saas-header-actions{justify-content:flex-end;gap:9px}
.saas-locale{position:relative;width:80px;display:flex;align-items:center;color:var(--saas-ink)}
.saas-locale select{appearance:none;width:100%;height:38px;border-radius:7px;background:#fff;border:1px solid var(--saas-stroke);
  color:inherit;padding:0 24px 0 12px;font:inherit;font-size:13px;cursor:pointer}
.saas-locale svg{position:absolute;right:8px;pointer-events:none}
.saas-link-button{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 15px;
  border:1px solid var(--saas-accent);border-radius:7px;text-decoration:none!important;white-space:nowrap;font-size:13px;font-weight:550}
.saas-link-button--light{color:var(--saas-accent)!important;background:#fff}
.saas-link-button--main{color:#fff!important;background:var(--saas-accent)}
.saas-mobile-toggle{border:0;background:transparent;color:var(--saas-ink);display:none;min-width:40px;height:40px;place-items:center;cursor:pointer}
.saas-mobile-menu{position:absolute;right:12px;top:calc(100% + 4px);display:grid;gap:3px;background:white;
  padding:12px;border:1px solid var(--saas-stroke);border-radius:10px;min-width:220px;
  box-shadow:0 16px 40px #122d3c20;max-width:calc(100vw - 24px)}
.saas-mobile-menu a{padding:11px;color:inherit;text-decoration:none;border-radius:6px}
.saas-mobile-menu a:hover{background:#eff7fa}
.saas-main{flex:1;min-width:0}
.saas-footer{background:#eaf2f6;border-top:1px solid var(--saas-stroke)}
.saas-footer-grid{max-width:1240px;margin:auto;display:grid;grid-template-columns:2fr 1fr 1.25fr 1fr;gap:42px;padding:56px 20px}
.saas-footer-brand p{max-width:315px;line-height:1.65;font-size:13px;color:var(--saas-muted)}
.saas-footer nav{display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.saas-footer nav strong{font-size:14px;font-weight:600;margin-bottom:4px}
.saas-footer nav a{font-size:13px;line-height:1.4;color:var(--saas-ink);text-decoration:none!important}
.saas-footer nav a:hover{color:var(--saas-accent)}
.saas-footer-end{background:#e3edf1;padding:18px max(20px,calc((100% - 1240px)/2));
 display:flex;justify-content:space-between;gap:14px;font-size:12px;color:var(--saas-muted)}
.sr-only{position:absolute;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden}
@media(max-width:1050px){.saas-header{grid-template-columns:140px 1fr auto}.saas-primary{gap:12px}.saas-header-actions{gap:5px}}
@media(max-width:850px){.saas-header{height:68px;display:flex;padding-inline:15px}.saas-primary{display:none}
  .saas-header-actions{margin-left:auto}.saas-mobile-toggle{display:grid}.saas-link-button--main{display:none}
  .saas-footer-grid{grid-template-columns:repeat(2,1fr);gap:32px}}
@media(max-width:480px){.saas-header{height:62px}.saas-brand strong{font-size:19px}.saas-link-button--light{display:none}
  .saas-footer-grid{grid-template-columns:1fr;gap:25px;padding:40px 20px}
  .saas-footer-end{flex-direction:column}}
@media(prefers-reduced-motion:reduce){.saas-header{transition:none}}
</style>
