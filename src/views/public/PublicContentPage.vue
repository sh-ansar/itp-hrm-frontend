<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, CheckCircle2, ShieldCheck, Building2, Network, UsersRound } from 'lucide-vue-next'
import { publicModules, publicSectors, modulePath, sectorPath } from '../../config/publicCatalog'
import { usePublicSiteText } from '../../i18n/publicSite'
import HrmFeaturePreview from '../../components/public/HrmFeaturePreview.vue'
const route=useRoute()
const {tr}=usePublicSiteText()
const module=computed(()=>route.name==='public.module'?publicModules.find(item=>item.id===route.params.module):null)
const sector=computed(()=>route.name==='public.sector'?publicSectors.find(item=>item.id===route.params.sector):null)
const pageTitle=computed(()=>module.value?tr(module.value.label):sector.value?tr(sector.value.title):tr('contentTitle'))
const pageLead=computed(()=>module.value?tr(module.value.preview):sector.value?tr(sector.value.text):tr('contentLead'))
const previewKind=computed<'staffing'|'leave'|'personnel'|'access'>(()=>({
 employees:'staffing',staffing:'staffing',leave:'leave',timesheets:'leave',
 personnel:'personnel',documents:'personnel',reports:'personnel',access:'access',
} as Record<string,'staffing'|'leave'|'personnel'|'access'>)[module.value?.id||'']||'staffing')
const related=computed(()=>module.value?publicModules.filter(x=>x.id!==module.value?.id).slice(0,4):publicModules.slice(0,4))
function title(){document.title=pageTitle.value+' — '+tr('siteName')}
onMounted(title)
watch([pageTitle,()=>route.fullPath],title)
</script>
<template>
<div class="hrm-content">
 <div class="content-shell">
  <nav class="content-breadcrumb" :aria-label="tr('navProduct')">
   <RouterLink to="/">{{tr('home')}}</RouterLink><span>/</span>
   <RouterLink v-if="module" to="/#modules">{{tr('navModules')}}</RouterLink>
   <RouterLink v-else to="/#sectors">{{tr('navSectors')}}</RouterLink><span>/</span><span>{{pageTitle}}</span>
  </nav>
  <section class="content-hero">
   <div class="content-intro">
    <span class="content-kicker">{{module?tr('featureCategory'):tr('contentAudience')}}</span>
    <h1>{{pageTitle}}</h1><p>{{pageLead}}</p>
    <div class="content-actions">
     <RouterLink class="content-primary" to="/register">{{tr('heroFirst')}} <ArrowRight :size="17"/></RouterLink>
     <RouterLink class="content-secondary" to="/#interactive-demo">{{tr('heroSecond')}}</RouterLink>
    </div>
   </div>
   <div class="content-illustration"><HrmFeaturePreview :kind="previewKind"/></div>
  </section>
  <section class="content-benefits">
   <span class="content-kicker">{{tr('contentBenefits')}}</span>
   <h2>{{tr('contentTitle')}}</h2>
   <div class="benefit-grid">
    <article v-for="(key,i) in ['featureStaffingTitle','featureLeaveTitle','featureDocumentTitle','featureAccessTitle']" :key="key">
     <span class="benefit-icon"><component :is="[Network,UsersRound,Building2,ShieldCheck][i]" :size="21"/></span>
     <h3>{{tr(key)}}</h3><p>{{tr(['featureStaffingText','featureLeaveText','featureDocumentText','featureAccessText'][i])}}</p>
    </article>
   </div>
  </section>
  <section class="content-steps">
   <div><span class="content-kicker">{{tr('contentWorkflow')}}</span><h2>{{tr('contentLead')}}</h2></div>
   <ol><li v-for="(key,index) in ['contentStep1','contentStep2','contentStep3']" :key="key">
    <span>0{{index+1}}</span><CheckCircle2 :size="22"/><p>{{tr(key)}}</p>
   </li></ol>
  </section>
  <section class="content-related">
   <h2>{{tr('modulesTitle')}}</h2>
   <div class="related-grid">
    <RouterLink v-for="item in related" :key="item.id" :to="modulePath(item.id)">
     <component :is="item.icon" :size="23"/><span>{{tr(item.label)}}</span><ArrowRight :size="17"/>
    </RouterLink>
   </div>
  </section>
  <div class="sector-links"><RouterLink v-for="item in publicSectors" :key="item.id" :to="sectorPath(item.id)">{{tr(item.title)}}</RouterLink></div>
  <section class="content-cta"><h2>{{tr('ctaTitle')}}</h2><p>{{tr('ctaText')}}</p>
   <RouterLink to="/register">{{tr('contentCta')}} <ArrowRight :size="16"/></RouterLink></section>
 </div>
</div>
</template>
<style scoped>
.hrm-content{background:#f5f9fa;color:#173643;min-height:70vh}
.content-shell{max-width:1240px;margin:auto;padding:34px 24px 0}
.content-breadcrumb{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px;color:#7a95a0;margin-bottom:28px}
.content-breadcrumb a{color:#5c8393;text-decoration:none}
.content-hero{display:grid;grid-template-columns:1fr 1fr;gap:45px;align-items:center;min-height:450px}
.content-kicker{font-size:12px;color:#008cc3;text-transform:uppercase;letter-spacing:.08em;font-weight:750}
.content-intro h1{font-size:clamp(39px,5.2vw,72px);line-height:1.04;letter-spacing:-.05em;margin:20px 0;color:#102d3c}
.content-intro p{font-size:17px;color:#5e7b88;line-height:1.65;max-width:530px}
.content-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
.content-actions a{display:flex;justify-content:center;align-items:center;gap:8px;min-height:46px;padding:0 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:650}
.content-primary{background:#009cde;color:#fff}.content-secondary{background:white;border:1px solid #d6e6ef;color:#167fab}
.content-illustration{padding:35px;border-radius:18px;background:linear-gradient(128deg,#ffd0dc,#e8e3ff 46%,#b8e3f8);
 box-shadow:0 16px 42px #133c6b12;min-width:0}
.content-benefits,.content-steps,.content-related{padding:75px 0}
.content-benefits h2,.content-steps h2,.content-related h2,.content-cta h2{font-size:clamp(28px,3vw,42px);line-height:1.13;letter-spacing:-.04em;margin:13px 0 27px}
.benefit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.benefit-grid article{background:#fff;border:1px solid #dfeaf0;border-radius:11px;padding:25px}
.benefit-icon{width:45px;height:45px;border-radius:10px;background:#e6f7fd;color:#009cde;display:grid;place-items:center}
.benefit-grid h3{font-size:17px;margin:20px 0 10px}.benefit-grid p{font-size:13px;color:#6c8793;line-height:1.65}
.content-steps{display:grid;grid-template-columns:1fr 1.4fr;gap:50px;align-items:center}
.content-steps ol{display:grid;gap:13px;margin:0;padding:0;list-style:none}
.content-steps li{display:flex;align-items:center;gap:13px;background:#fff;border:1px solid #e1ebef;padding:17px 22px;border-radius:9px}
.content-steps li span{color:#009cde;font-size:13px;font-weight:700}.content-steps li svg{color:#15a279;flex-shrink:0}
.content-steps li p{margin:0;font-size:14px}
.related-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
.related-grid a{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #dde9ee;border-radius:9px;
 text-decoration:none;color:#163947;padding:20px 14px;min-width:0;font-size:12px;font-weight:650}
.related-grid a svg:first-child{color:#009cde;flex:none}.related-grid a svg:last-child{margin-left:auto;flex:none;color:#6c94a5}
.related-grid a:hover{border-color:#009cde}
.sector-links{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;padding-bottom:65px}
.sector-links a{font-size:12px;padding:9px 13px;border-radius:18px;background:#e3f4fc;color:#157dad;text-decoration:none}
.content-cta{text-align:center;background:#009cde;color:#fff;border-radius:16px;padding:65px 24px;margin-bottom:80px}
.content-cta h2{color:#fff;margin:0 auto 14px;max-width:660px}
.content-cta p{font-size:15px;line-height:1.6;margin-bottom:24px}
.content-cta a{display:inline-flex;align-items:center;gap:8px;padding:14px 23px;background:#fff;color:#008bc8;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700}
@media(max-width:930px){.content-hero,.content-steps{grid-template-columns:1fr}.content-illustration{max-width:560px}
 .benefit-grid,.related-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:570px){.content-shell{padding:25px 16px 0}.content-hero{gap:26px;min-height:0}.content-intro h1{font-size:42px}
 .content-illustration{padding:15px}.content-benefits,.content-steps,.content-related{padding:45px 0}
 .benefit-grid{grid-template-columns:1fr}.related-grid{grid-template-columns:1fr}
 .content-cta{padding:45px 16px;margin-bottom:40px}}
</style>
