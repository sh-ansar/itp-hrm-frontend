<script setup lang="ts">
import { SiteFooter } from "@itpmining/vue-basic-components"
import {computed,onMounted,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {SiteHeader} from '@itpmining/vue-basic-components'
import {usePublicSiteText,siteLanguages,type PublicLanguage} from '../../i18n/publicSite'
import {publicAsset} from '../../utils/publicAsset'
import {publicModules,publicSectors,modulePath,sectorPath,legalTypes} from '../../config/publicCatalog'
const route=useRoute(),router=useRouter(),{tr,locale,setLocale}=usePublicSiteText()
const legalKey:Record<string,string>={offer:'offer',privacy:'privacy','tariff-policy':'tariffPolicy','acceptable-use':'acceptableUse','personal-data-consent':'personalConsent'}
const nav=computed(()=>[{href:'/#product',label:tr('navProduct')},{href:'/#modules',label:tr('navModules')},{href:'/#sectors',label:tr('navSectors')},{href:'/pricing',label:tr('pricing')}].map(x=>({...x,href:router.resolve(x.href).href})))
function language(value:string){if(siteLanguages.some(x=>x.value===value))setLocale(value as PublicLanguage)}
function navigate(item:{href:string},event:MouseEvent){if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();const base=router.options.history.base;router.push(base&&item.href.startsWith(base)?item.href.slice(base.length)||'/':item.href)}
function updateSeo(){
 document.documentElement.lang=locale.value
 const name=route.name
 const title=name==='public.pricing'?tr('pricingTitle'):
   name==='public.register'?tr('registration'):
   name==='public.legal'||name==='public.legal.index'?tr('legalIndex'):
   name==='public.module'?tr('modulesTitle'):
   name==='public.sector'?tr('sectorTitle'):tr('heroHeadline')
 document.title=title+' — '+tr('siteName')
 let description=document.querySelector<HTMLMetaElement>('meta[name="description"]')
 if(!description){description=document.createElement('meta');description.name='description';document.head.appendChild(description)}
 description.content=tr('heroDescription')
}

onMounted(updateSeo);watch(()=>route.fullPath,updateSeo);watch(locale,updateSeo)
</script>
<template>
<div class="public-site" :lang="locale" :data-public-language="locale">
 <SiteHeader :home-href="router.resolve('/').href" :home-label="tr('siteName')" :nav="nav" :login-href="router.resolve('/login').href" :signup-href="router.resolve('/register').href" :login-label="tr('login')" :signup-label="tr('getStarted')" :locale="locale" :locales="siteLanguages.map(x=>({...x}))" :language-label="tr('publicLanguages')" :mobile-label="tr('menu')" :nav-label="tr('navProduct')" :mobile-nav-label="tr('menu')" auto-hide @navigate="navigate" @update:locale="language"><template #brand><img :src="publicAsset('brand/itp-mark.svg')" alt="" width="36" height="36"/><strong>{{tr('siteName')}}</strong></template></SiteHeader>
 <main class="public-main"><RouterView/></main>
 <SiteFooter>
  <template #columns>
   <div class="footer-column footer-brand">
    <RouterLink class="public-brand" to="/">
     <img :src="publicAsset('brand/itp-mark.svg')" alt="" width="44" height="40"/>
     <span><strong>{{tr('siteName').replace(/^ITP\s*/,'')}}</strong><small>ITP HRM</small></span>
    </RouterLink>
    <p>{{tr('siteIntro')}}</p>
    <RouterLink class="footer-strong-link" to="/register">{{tr('heroFirst')}}</RouterLink>
   </div>
   <nav class="footer-column" :aria-label="tr('footerPlatform')">
    <h2>{{tr('footerPlatform')}}</h2>
    <RouterLink to="/">{{tr('home')}}</RouterLink>
    <RouterLink to="/#interactive-demo">{{tr('navResources')}}</RouterLink>
    <RouterLink to="/pricing">{{tr('pricing')}}</RouterLink>
    <RouterLink to="/login">{{tr('login')}}</RouterLink>
   </nav>
   <nav class="footer-column" :aria-label="tr('navModules')">
    <h2>{{tr('navModules')}}</h2>
    <RouterLink v-for="item in publicModules.slice(0,6)" :key="item.id" :to="modulePath(item.id)">
     {{tr(item.label)}}
    </RouterLink>
   </nav>
   <nav class="footer-column" :aria-label="tr('footerSolutions')">
    <h2>{{tr('footerSolutions')}}</h2>
    <RouterLink v-for="sector in publicSectors" :key="sector.id" :to="sectorPath(sector.id)">
     {{tr(sector.title)}}
    </RouterLink>
   </nav>
   <nav class="footer-column" :aria-label="tr('footerLegal')">
    <h2>{{tr('footerLegal')}}</h2>
    <RouterLink :to="{name:'public.legal.index'}">{{tr('legalIndex')}}</RouterLink>
    <RouterLink v-for="item in legalTypes" :key="item" :to="{name:'public.legal',params:{type:item}}">
     {{tr(legalKey[item])}}
    </RouterLink>
   </nav>
  </template>
<template #bottom>
   <span>{{tr('copyright')}}</span>
   <span class="footer-languages">{{siteLanguages.map(item=>item.label).join(' · ')}}</span>
  </template>
</SiteFooter>
</div>
</template>
<style scoped>
.public-site{display:flex;flex-direction:column;min-height:100vh;background:#f5f9fa;color:#102b36}.public-site *{box-sizing:border-box}.public-main{flex:1;min-width:0}
</style>
