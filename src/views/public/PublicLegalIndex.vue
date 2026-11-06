<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileText, ArrowRight, ShieldCheck } from 'lucide-vue-next'
import { apiRequest } from '../../api/client'
import { legalTypes } from '../../config/publicCatalog'
import { usePublicSiteText } from '../../i18n/publicSite'
const {tr,serverLocale}=usePublicSiteText()
const jurisdiction=ref<'KZ'|'GE'>('KZ')
const loaded=ref(false)
const published=ref<string[]>([])
const legalKey:Record<string,string>={
 offer:'offer',privacy:'privacy','tariff-policy':'tariffPolicy',
 'acceptable-use':'acceptableUse','personal-data-consent':'personalConsent',
}
let revision=0
watch([serverLocale,jurisdiction],async()=>{
 const current=++revision;loaded.value=false
 try{
  const result=await apiRequest<{data:{type:string}[];ready:boolean}>(
   '/public/legal/required?locale='+serverLocale.value+'&jurisdiction='+jurisdiction.value)
  if(current===revision){published.value=(result.data||[]).map(x=>x.type);loaded.value=true}
 }catch{if(current===revision){published.value=[];loaded.value=true}}
},{immediate:true})
</script>
<template>
<div class="legal-index">
 <nav class="breadcrumb"><RouterLink to="/">{{tr('home')}}</RouterLink><span>/</span>{{tr('legalIndex')}}</nav>
 <header><span class="eyebrow">{{tr('footerLegal')}}</span>
  <h1>{{tr('legalIndex')}}</h1><p>{{tr('legalOverview')}}</p>
  <label class="jurisdiction">{{tr('jurisdiction')}}
   <select v-model="jurisdiction"><option value="KZ">{{tr('countryKZ')}}</option><option value="GE">{{tr('countryGE')}}</option></select>
  </label>
 </header>
 <p class="legal-note"><ShieldCheck :size="18"/>{{tr('legalLanguageFallback')}}</p>
 <div class="legal-index-grid">
  <RouterLink v-for="type in legalTypes" :key="type" :to="{name:'public.legal',params:{type},query:{jurisdiction}}"
   class="legal-index-card">
   <span class="legal-index-icon"><FileText :size="23"/></span><strong>{{tr(legalKey[type])}}</strong>
   <small v-if="loaded&&!published.includes(type)">{{tr('legalNotPublished')}}</small>
   <ArrowRight :size="19" class="legal-index-arrow"/>
  </RouterLink>
 </div>
</div>
</template>
<style scoped>
.legal-index{min-height:66vh;max-width:1240px;margin:auto;padding:40px 24px 90px}
.breadcrumb{display:flex;gap:9px;font-size:12px;color:#77909f;margin-bottom:35px}
.breadcrumb a{color:inherit;text-decoration:none}.legal-index header{max-width:750px;margin-bottom:25px}
.eyebrow{font-size:12px;color:#0089c8;text-transform:uppercase;font-weight:700}
.legal-index h1{font-size:clamp(34px,4.5vw,58px);letter-spacing:-.045em;margin:12px 0}
.legal-index header p{color:#678592;font-size:15px;line-height:1.6}
.jurisdiction{display:flex;align-items:center;gap:13px;margin-top:20px;font-size:12px}
.jurisdiction select{padding:10px 12px;border:1px solid #dceaf0;border-radius:8px;background:#fff;color:#254555}
.legal-note{display:flex;gap:11px;align-items:flex-start;padding:16px 18px;border:1px solid #dcebf3;
 background:#edf7fb;color:#4c7484;border-radius:9px;font-size:13px;line-height:1.55;margin-bottom:26px}
.legal-note svg{flex:none;color:#009cde}
.legal-index-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.legal-index-card{display:flex;flex-wrap:wrap;align-items:center;gap:15px;min-height:110px;padding:23px;
 text-decoration:none;color:#214254;background:#fff;border:1px solid #dfebef;border-radius:10px}
.legal-index-card:hover{border-color:#009cde;box-shadow:0 7px 22px #18445c0e}
.legal-index-icon{width:41px;height:41px;display:grid;place-items:center;background:#e8f7fd;color:#009cde;border-radius:9px}
.legal-index-card strong{font-size:15px;flex:1}.legal-index-card small{color:#8b9fad;font-size:11px;flex:0 0 100%;order:4;margin-left:57px}
.legal-index-arrow{color:#86a1af}
@media(max-width:650px){.legal-index{padding:30px 16px 60px}.legal-index-grid{grid-template-columns:1fr}}
</style>
