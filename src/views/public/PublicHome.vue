<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowRight, CalendarDays, Building2, FileCheck2, ShieldCheck } from 'lucide-vue-next'
import HrmHero from '../../components/public/HrmHero.vue'
import HrmModuleExplorer from '../../components/public/HrmModuleExplorer.vue'
import HrmFeaturePreview from '../../components/public/HrmFeaturePreview.vue'
import HrmInteractiveDemo from '../../components/public/HrmInteractiveDemo.vue'
import PublicPlans from '../../components/public/PublicPlans.vue'
import { publicModules, publicSectors, modulePath, sectorPath } from '../../config/publicCatalog'
import { usePublicSiteText } from '../../i18n/publicSite'
const {tr}=usePublicSiteText()
const accent=ref('#009cde')
const features=[
 {id:'staffing',title:'featureStaffingTitle',text:'featureStaffingText',kind:'staffing',module:'staffing',icon:Building2},
 {id:'leave',title:'featureLeaveTitle',text:'featureLeaveText',kind:'leave',module:'leave',icon:CalendarDays},
 {id:'personnel',title:'featureDocumentTitle',text:'featureDocumentText',kind:'personnel',module:'personnel',icon:FileCheck2},
 {id:'access',title:'featureAccessTitle',text:'featureAccessText',kind:'access',module:'access',icon:ShieldCheck},
] as const
const how=['1','2','3','4'] as const
const vReveal={
 mounted(el:HTMLElement){
  if(typeof IntersectionObserver==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  el.classList.add('landing-reveal')
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
  },{threshold:.08,rootMargin:'0px 0px -15px 0px'})
  ;(el as HTMLElement & {__reveal?:IntersectionObserver}).__reveal=observer
  observer.observe(el)
 },
 unmounted(el:HTMLElement){(el as HTMLElement & {__reveal?:IntersectionObserver}).__reveal?.disconnect()},
}
onMounted(()=>{document.title=tr('siteName')+' — '+tr('heroKicker')})
</script>
<template>
<div class="hrm-public-home">
 <HrmHero/>
 <div id="possibilities" class="landing-bento">
  <div class="bento-choose" v-reveal><HrmModuleExplorer/></div>
  <article v-for="(feature,index) in features" :id="feature.id" :key="feature.id" v-reveal
   class="bento-feature" :class="'bento-feature--'+feature.id">
   <div class="feature-copy">
    <span class="feature-kicker">{{tr('featureCategory')}}</span>
    <div class="feature-icon"><component :is="feature.icon" :size="20"/></div>
    <h2>{{tr(feature.title)}}</h2><p>{{tr(feature.text)}}</p>
    <RouterLink :to="modulePath(feature.module)">{{tr('featureAction')}} <ArrowRight :size="17"/></RouterLink>
   </div>
   <RouterLink class="feature-preview-link" :to="modulePath(feature.module)" :aria-label="tr(feature.title)">
    <HrmFeaturePreview :kind="feature.kind"/>
   </RouterLink>
  </article>
  <div class="small-feature-stack" v-reveal>
   <article class="small-feature">
    <div class="small-feature-icon"><ShieldCheck :size="20"/></div>
    <h2>{{tr('featureAccessTitle')}}</h2><p>{{tr('featureAccessText')}}</p>
    <RouterLink :to="modulePath('access')">{{tr('featureAction')}} <ArrowRight :size="15"/></RouterLink>
   </article>
   <article class="small-feature small-feature--color" :style="{'--preview-color':accent}">
    <label><span>{{tr('showcaseTag')}}</span><input v-model="accent" type="color" :aria-label="tr('showcaseTag')"/></label>
    <h2>{{tr('heroLabel')}}</h2><p>{{tr('showcaseDescription')}}</p>
    <a href="#interactive-demo">{{tr('heroSecond')}} <ArrowRight :size="15"/></a>
   </article>
  </div>
  <section id="modules" class="modules-section" v-reveal>
   <header><span class="feature-kicker">{{tr('navProduct')}}</span>
    <h2>{{tr('modulesTitle')}}</h2><p>{{tr('modulesDescription')}}</p></header>
   <div class="modules-grid">
    <RouterLink v-for="item in publicModules" :key="item.id" :to="modulePath(item.id)">
     <component :is="item.icon" :size="29"/><span>{{tr(item.label)}}</span><ArrowRight :size="14" class="module-arrow"/>
    </RouterLink>
   </div>
  </section>
 </div>
 <HrmInteractiveDemo/>
 <section id="sectors" class="sector-section">
  <div class="sector-head"><span class="feature-kicker">{{tr('navSectors')}}</span>
   <h2>{{tr('sectorTitle')}}</h2><p>{{tr('sectorText')}}</p></div>
  <div class="sector-grid">
   <RouterLink v-for="sector in publicSectors" :key="sector.id" :to="sectorPath(sector.id)" class="sector-card" v-reveal>
    <span class="sector-icon"><component :is="sector.icon" :size="24"/></span>
    <h3>{{tr(sector.title)}}</h3><p>{{tr(sector.text)}}</p>
    <span>{{tr('contentStart')}} <ArrowRight :size="15"/></span>
   </RouterLink>
  </div>
 </section>
 <section id="how-it-works" class="how-section">
  <header><span class="feature-kicker">{{tr('navResources')}}</span><h2>{{tr('howTitle')}}</h2></header>
  <ol><li v-for="step in how" :key="step" v-reveal>
   <span>0{{step}}</span><h3>{{tr('howStep'+step)}}</h3>
   <p>{{tr('howStep'+step+'Text')}}</p>
  </li></ol>
 </section>
 <section id="plans" class="plans-section">
  <header><span class="feature-kicker">{{tr('pricing')}}</span><h2>{{tr('pricingTitle')}}</h2>
   <p>{{tr('pricingText')}}</p></header>
  <PublicPlans/>
  <RouterLink to="/pricing" class="plans-all">{{tr('pricingDetails')}} <ArrowRight :size="16"/></RouterLink>
 </section>
 <section class="landing-cta">
  <h2>{{tr('ctaTitle')}}</h2><p>{{tr('ctaText')}}</p>
  <RouterLink to="/register">{{tr('heroFirst')}} <ArrowRight :size="18"/></RouterLink>
 </section>
</div>
</template>
<style scoped>
.hrm-public-home{background:#f5f9fa;color:#102b36;overflow-x:clip}
.hrm-public-home h1,.hrm-public-home h2,.hrm-public-home h3{color:inherit;font-weight:650;letter-spacing:-.04em}
.feature-kicker{font-size:12px;font-weight:700;color:#008cc4;letter-spacing:.08em;text-transform:uppercase}
.landing-bento{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:20px;padding:0 24px 48px}
.bento-choose{grid-column:1/8;grid-row:1;background:#fff;padding:28px;border:1px solid #dfebf0;border-radius:12px;min-width:0}
.bento-feature{display:flex;flex-direction:column;justify-content:space-between;gap:17px;min-width:0;background:#fff;border:1px solid #dce9ef;border-radius:12px;padding:25px;overflow:hidden}
.bento-feature--staffing{grid-column:8/13;grid-row:1}
.bento-feature--leave{grid-column:6/13;grid-row:2;background:#eaf3f7}
.bento-feature--personnel{grid-column:1/8;grid-row:3}
.bento-feature--access{grid-column:8/13;grid-row:3}
.feature-copy{min-width:0}.feature-copy h2{font-size:clamp(21px,2.4vw,30px);line-height:1.15;margin:12px 0}
.feature-copy p{font-size:14px;color:#6b8492;line-height:1.65;margin:0 0 14px}
.feature-copy a{display:inline-flex;align-items:center;gap:7px;font-weight:650;font-size:12px;color:#267c9e;text-decoration:none}
.feature-copy a:hover{color:#009cde}
.feature-icon{display:none}
.feature-preview-link{display:block;border-radius:9px;overflow:hidden;text-decoration:none;box-shadow:0 8px 19px #174f6a12}
.feature-preview-link:hover{box-shadow:0 13px 28px #174f6a20;transform:translateY(-2px)}
.small-feature-stack{grid-column:1/6;grid-row:2;display:grid;gap:16px;min-width:0}
.small-feature{background:#eaf3f7;border:1px solid #dce9ef;border-radius:10px;padding:22px}
.small-feature h2{font-size:21px;margin:14px 0 10px}
.small-feature p{font-size:13px;line-height:1.6;color:#63808e;margin:0 0 12px}
.small-feature a{display:inline-flex;align-items:center;gap:7px;color:#25789e;text-decoration:none;font-size:12px;font-weight:650}
.small-feature-icon{width:36px;height:36px;display:grid;place-items:center;background:#fff;color:#009cde;border-radius:8px}
.small-feature--color{border-bottom:4px solid var(--preview-color,#009cde)}
.small-feature--color label{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:8px;padding:8px 12px;font-size:12px;color:#496e7f}
.small-feature--color input{height:27px;width:38px;border:0;cursor:pointer}
.modules-section{grid-column:1/-1;text-align:center;padding:55px 0 12px}
.modules-section h2,.sector-head h2,.how-section h2,.plans-section h2{font-size:clamp(30px,3.7vw,43px);line-height:1.12;margin:14px 0}
.modules-section header>p,.sector-head>p,.plans-section header>p{font-size:15px;line-height:1.6;color:#6b8693;max-width:760px;margin:0 auto}
.modules-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:17px;margin-top:29px}
.modules-grid a{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;min-height:139px;
 background:#fff;border:1px solid #e0ebef;box-shadow:0 3px 6px #12334008;border-radius:9px;
 color:#173747;text-decoration:none;font-size:13px;font-weight:600;padding:16px;position:relative}
.modules-grid a>svg:first-child{color:#009cde}.modules-grid a:hover{border-color:#009cde;transform:translateY(-3px)}
.module-arrow{position:absolute;right:12px;top:12px;color:#a4bbc6;opacity:.65}
.sector-section,.how-section,.plans-section{max-width:1240px;margin:0 auto;padding:60px 24px}
.sector-head{text-align:center}.sector-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}
.sector-card{padding:28px 23px;background:#fff;border:1px solid #e1ecf0;border-radius:11px;min-height:235px;display:flex;flex-direction:column;text-decoration:none;color:#183745}
.sector-icon{width:48px;height:48px;display:grid;place-items:center;background:#e7f7fd;color:#009cde;border-radius:12px}
.sector-card h3{font-size:20px;margin:24px 0 9px}.sector-card p{font-size:13px;color:#6c8591;line-height:1.6;flex:1;margin:0}
.sector-card>span:last-child{display:flex;align-items:center;gap:6px;color:#008cc4;font-size:12px;font-weight:650;margin-top:20px}
.sector-card:hover{border-color:#81c9e4;box-shadow:0 8px 27px #134c6110}
.how-section h2{max-width:580px}
.how-section ol{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:0;margin:34px 0 0;list-style:none}
.how-section li{min-width:0}.how-section li>span{font-weight:700;font-size:25px;color:#009cde}
.how-section li h3{font-size:20px;font-weight:550;margin:17px 0 10px}
.how-section li p{font-size:13px;line-height:1.65;color:#6b8593;margin:0}
.plans-section header{margin-bottom:29px}.plans-section header>p{margin:0}
.plans-all{display:inline-flex;align-items:center;gap:9px;color:#008bc7;font-weight:650;font-size:13px;text-decoration:none;margin-top:26px}
.landing-cta{text-align:center;background:#009cde;color:#fff;padding:70px 24px}
.landing-cta h2{max-width:740px;margin:0 auto 16px;font-size:clamp(31px,4vw,48px);line-height:1.15;color:#fff;text-wrap:balance}
.landing-cta p{font-size:15px;line-height:1.7;max-width:650px;margin:0 auto 27px}
.landing-cta>a{display:inline-flex;align-items:center;gap:8px;min-height:48px;background:#fff;color:#007dbb;border-radius:8px;
 padding:0 26px;text-decoration:none;font-weight:700;font-size:13px}
.landing-reveal{opacity:0;transform:translateY(19px);transition:opacity .5s ease,transform .5s ease}
.landing-reveal.is-visible{opacity:1;transform:translateY(0)}
@media(max-width:1070px){.landing-bento{gap:15px;padding:0 20px 35px}.bento-choose,.bento-feature{padding:20px}
 .sector-grid{grid-template-columns:repeat(2,1fr)}.modules-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:780px){.landing-bento{display:flex;flex-direction:column;gap:15px;padding:0 16px 36px}
 .bento-feature{padding:21px}.small-feature-stack{display:grid;grid-template-columns:repeat(2,1fr)}
 .modules-section{padding:39px 0 8px}.how-section ol{grid-template-columns:repeat(2,1fr)}
 .sector-section,.how-section,.plans-section{padding:44px 16px}}
@media(max-width:580px){.small-feature-stack{grid-template-columns:1fr}.modules-grid,.sector-grid{grid-template-columns:repeat(2,1fr);gap:10px}
 .modules-grid a{min-height:115px;gap:9px;font-size:12px;padding:11px}
 .sector-card{padding:20px 14px;min-height:245px}.sector-card h3{font-size:17px}.sector-card p{font-size:12px}
 .how-section ol{grid-template-columns:1fr;gap:22px}
 .landing-cta{padding:49px 18px}.landing-cta h2{font-size:32px}}
@media(prefers-reduced-motion:reduce){.landing-reveal{opacity:1;transform:none;transition:none}
 .modules-grid a,.feature-preview-link{transition:none}}
</style>
