<script setup lang="ts">
import {SiteLegalContent,UnifiedSelect} from "@itpmining/vue-basic-components"
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest } from '../../api/client'
import { usePublicSiteText } from '../../i18n/publicSite'
const route = useRoute(), router=useRouter()
function navigateLegal(_item:unknown,event:MouseEvent){if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();void router.push({name:"public.legal.index"})}
const { tr, locale, serverLocale } = usePublicSiteText()
type Legal = { id: number; title: string; body: string; locale: string; jurisdiction: string; sha256: string; version: number; effective_at: string | null }
const jurisdiction = ref<'KZ' | 'GE'>(route.query.jurisdiction === 'GE' ? 'GE' : 'KZ')
let sequence = 0
const legal = ref<Legal | null>(null)
const loading = ref(true)
const missing = ref(false)
const error = ref(false)
async function load() {
  const requestId = ++sequence
  loading.value = true; missing.value = false; error.value = false; legal.value = null
  try {
    const type = String(route.params.type || '')
    const result = await apiRequest<{ data: Legal | null }>('/public/legal/' + encodeURIComponent(type) + '?locale=' + serverLocale.value + '&jurisdiction=' + jurisdiction.value)
    if (requestId !== sequence) return
    legal.value = result.data
    missing.value = !legal.value
  } catch (cause: unknown) {
    const code = typeof cause === 'object' && cause !== null && 'status' in cause ? (cause as { status?: number }).status : 0
    if (requestId !== sequence) return
    if (code === 404) missing.value = true
    else error.value = true
  } finally { if (requestId === sequence) loading.value = false }
}
onMounted(load)
watch([() => route.params.type, serverLocale, jurisdiction], load)
</script>
<template>
  <div class="public-legal">
    <nav class="breadcrumb"><RouterLink :to="{ name: 'public.home' }">{{ tr('home') }}</RouterLink><span>/</span><span>{{ legal?.title || tr('resources') }}</span></nav>
    <div class="jurisdiction-picker"><UnifiedSelect :label="tr('jurisdiction')" :model-value="jurisdiction" :options="[{id:'KZ',label:tr('countryKZ')},{id:'GE',label:tr('countryGE')}]" @update:model-value="jurisdiction=$event === 'GE' ? 'GE' : 'KZ'" /></div>
    <p v-if="loading" role="status">{{ tr('loading') }}</p>
    <div v-else-if="missing" class="legal-empty">{{ tr('legalNotPublished') }}</div>
    <div v-else-if="error" class="legal-empty" role="alert">{{ tr('failedLoad') }} <button @click="load">{{ tr('retry') }}</button></div>
    <SiteLegalContent v-else-if="legal" :title="legal.title" :back-href="router.resolve({name:'public.legal.index'}).href" :back-label="tr('legalIndex')" @navigate="navigateLegal">
      <p v-if="legal.locale !== locale || locale!==serverLocale" class="legal-locale-note">{{ tr('legalLanguageFallback') }}</p>
      <p class="legal-meta">{{ legal.jurisdiction }} · v{{ legal.version }} · {{ legal.effective_at?.slice(0,10) || '' }}</p>
      <div class="legal-body">{{ legal.body }}</div>
    </SiteLegalContent>
  </div>
</template>
<style scoped>
.public-legal{max-width:1000px;margin:0 auto;min-height:65vh;padding:40px 20px 95px;box-sizing:border-box}
.breadcrumb{display:flex;gap:12px;margin-bottom:38px;color:#778f9e;font-size:13px}.breadcrumb a{color:inherit;text-decoration:none}
.legal-paper,.legal-empty{border:1px solid #e1ebef;background:#fff;border-radius:12px;padding:42px 50px;line-height:1.8}
.legal-paper h1{font-weight:650;letter-spacing:-.03em;font-size:clamp(28px,3.6vw,44px);line-height:1.15;margin:0 0 18px}
.legal-body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;color:#294755}
.legal-meta,.legal-locale-note{font-size:13px;color:#78909b}
.jurisdiction-picker{display:flex;gap:12px;align-items:center;justify-content:flex-end;margin:-15px 0 24px;font-size:13px}
.jurisdiction-picker select{appearance:auto;padding:9px 12px;background:#fff;border:1px solid #d9e6ed;border-radius:7px;color:inherit;font:inherit}
.legal-empty button{margin-left:12px;border:0;color:#009cde;background:transparent;font:inherit;cursor:pointer}
@media(max-width:650px){.public-legal{padding:28px 16px 55px}.legal-paper,.legal-empty{padding:24px 19px}}
</style>
