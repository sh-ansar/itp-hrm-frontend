<script setup lang="ts">
import { CalendarDays, UsersRound, Network, ArrowRight, BadgeCheck } from 'lucide-vue-next'
import { usePublicSiteText } from '../../i18n/publicSite'
const {tr}=usePublicSiteText()
</script>
<template>
<section id="product" class="portal-hero" aria-labelledby="hrm-hero-title">
 <div class="portal-hero__inner">
  <div class="portal-hero__visual" role="img" :aria-label="tr('heroLabel')">
   <span class="orb orb--left" aria-hidden="true"></span>
   <span class="orb orb--right" aria-hidden="true"></span>
   <span class="hero-diamond hero-diamond--left" aria-hidden="true"></span>
   <span class="hero-diamond hero-diamond--right" aria-hidden="true"></span>
   <div class="hero-ui">
    <div class="hero-ui__header">
     <span class="ui-brand"><span class="ui-brand-mark">itp</span> {{tr('siteName')}}</span>
     <span class="ui-avatar">IH</span>
    </div>
    <div class="hero-ui__content">
     <aside class="hero-ui__sidebar">
      <div class="hero-ui__side active"><UsersRound :size="15"/>{{tr('employees')}}</div>
      <div class="hero-ui__side"><Network :size="15"/>{{tr('staffing')}}</div>
      <div class="hero-ui__side"><CalendarDays :size="15"/>{{tr('vacations')}}</div>
     </aside>
     <div class="hero-ui__workspace">
      <div class="ui-topline"><strong>{{tr('heroLabel')}}</strong><span class="ui-soft-pill">{{tr('heroActive')}}</span></div>
      <div class="hero-ui__metrics">
       <div><UsersRound :size="16"/><b>106</b><span>{{tr('heroMetricA')}}</span></div>
       <div><Network :size="16"/><b>7</b><span>{{tr('heroMetricB')}}</span></div>
       <div><CalendarDays :size="16"/><b>24</b><span>{{tr('heroMetricC')}}</span></div>
      </div>
      <div class="hero-ui__list">
       <div v-for="(item,i) in [{name:'A. Ivanov',role:'IT',status:'heroActive'},{name:'M. Dolidze',role:'HR',status:'heroApproved'},{name:'D. Tulubaev',role:'Management',status:'heroActive'}]" :key="i">
        <span class="hero-small-avatar">{{item.name[0]}}</span>
        <strong>{{item.name}}</strong><span>{{item.role}}</span>
        <small><BadgeCheck :size="13"/>{{tr(item.status)}}</small>
       </div>
      </div>
     </div>
    </div>
   </div>
   <span class="hero-floating hero-floating--one"><CalendarDays :size="15"/>{{tr('vacations')}}</span>
   <span class="hero-floating hero-floating--two"><UsersRound :size="15"/>{{tr('employees')}}</span>
  </div>
  <div class="portal-hero__copy">
   <span class="hero-kicker">{{tr('heroKicker')}}</span>
   <h1 id="hrm-hero-title">{{tr('heroHeadline')}}</h1>
   <p>{{tr('heroDescription')}}</p>
   <div class="portal-hero__actions">
    <RouterLink class="site-btn site-btn--primary" to="/register">{{tr('heroFirst')}} <ArrowRight :size="17"/></RouterLink>
    <a class="site-btn site-btn--secondary" href="#interactive-demo">{{tr('heroSecond')}}</a>
   </div>
  </div>
 </div>
</section>
</template>
<style scoped>
.portal-hero{position:relative;overflow:clip;background:#f5f9fa;color:#102b36;scroll-margin-top:82px}
.portal-hero__inner{max-width:1552px;padding:24px 20px 70px;margin:auto;box-sizing:border-box}
.portal-hero__visual{position:relative;isolation:isolate;width:100%;aspect-ratio:3/1;min-height:320px;border-radius:20px;overflow:hidden;
 background:linear-gradient(115deg,#ed5396 1%,#ffbba0 31%,#f7e5d6 53%,#b4d8ea 82%,#a6c5f9 100%);box-shadow:0 22px 56px #19506b18}
.orb{position:absolute;display:block;border-radius:50%;filter:blur(5px);opacity:.57}
.orb--left{width:42%;aspect-ratio:1;left:-16%;top:-61%;background:radial-gradient(circle,#f63e9f,transparent 70%)}
.orb--right{width:40%;aspect-ratio:1;right:-14%;bottom:-72%;background:radial-gradient(circle,#6881fd,transparent 74%)}
.hero-ui{position:absolute;z-index:1;width:min(73%,910px);height:78%;top:12%;left:13.5%;border-radius:13px;background:#fff;border:1px solid #dce9f0;
 box-shadow:0 23px 54px #2c4e7040;transform:rotate(-1deg);overflow:hidden}
.hero-ui__header{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #e7eff3}
.ui-brand{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#1d3a4a}
.ui-brand-mark{display:grid;place-items:center;background:#019cdd;color:#fff;border-radius:5px;font-size:12px;font-weight:800;padding:3px}
.ui-avatar{width:27px;height:27px;background:#e3f4fb;border-radius:50%;display:grid;place-items:center;font-size:10px;color:#168ac1}
.hero-ui__content{height:calc(100% - 46px);display:flex;min-width:0}
.hero-ui__sidebar{width:27%;background:#f5f9fb;border-right:1px solid #e7eff3;padding:20px 10px}
.hero-ui__side{display:flex;align-items:center;gap:9px;margin-bottom:6px;padding:12px 10px;border-radius:6px;font-size:11px;color:#5d7c8c;white-space:nowrap;overflow:hidden}
.hero-ui__side.active{background:#e4f5fb;color:#008fd2;font-weight:650}
.hero-ui__workspace{flex:1;min-width:0;padding:19px 20px}
.ui-topline{display:flex;align-items:center;justify-content:space-between;gap:6px}
.ui-topline strong{font-size:16px}
.ui-soft-pill{font-size:10px;color:#178c5d;background:#e5f8eb;border-radius:12px;padding:5px 10px}
.hero-ui__metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:15px 0}
.hero-ui__metrics>div{display:grid;grid-template-columns:auto 1fr;gap:3px 6px;padding:10px;background:#f5f9fb;border:1px solid #e7eff3;border-radius:7px}
.hero-ui__metrics svg{color:#009cde;grid-row:span 2}
.hero-ui__metrics b{font-size:20px}.hero-ui__metrics span{font-size:10px;color:#75919e}
.hero-ui__list{border:1px solid #e6eff2;border-radius:8px;overflow:hidden}
.hero-ui__list>div{display:flex;align-items:center;gap:11px;padding:9px;border-top:1px solid #edf3f6;font-size:11px}
.hero-ui__list>div:first-child{border-top:0}
.hero-ui__list>div strong{font-weight:650;min-width:100px}
.hero-ui__list>div>span:nth-of-type(2){color:#738f9e;flex:1}
.hero-ui__list small{display:flex;align-items:center;gap:4px;color:#258f6a;font-size:9px}
.hero-small-avatar{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;color:#168cc8;background:#e5f5fd;font-weight:650}
.hero-diamond{position:absolute;z-index:2;width:19%;aspect-ratio:1;border:26px solid #ffffffc4;transform:rotate(45deg);border-radius:23px;
 box-shadow:0 16px 40px #36577b22;pointer-events:none}
.hero-diamond--left{left:14%;top:36%;animation:hrm-float-left 7.5s ease-in-out infinite alternate}
.hero-diamond--right{right:3%;top:6%;border-color:#fcfaffb0;animation:hrm-float-right 8.2s ease-in-out infinite alternate}
@keyframes hrm-float-left{from{translate:0 -14px}to{translate:0 16px}}
@keyframes hrm-float-right{from{translate:0 12px}to{translate:0 -17px}}
.hero-floating{position:absolute;z-index:3;display:flex;align-items:center;gap:8px;background:#ffffffed;border:1px solid #e7ecf1;
 border-radius:9px;padding:12px 15px;box-shadow:0 10px 28px #39567c20;font-size:12px;color:#28546d;font-weight:600}
.hero-floating svg{color:#009cde}
.hero-floating--one{bottom:11%;left:8%}.hero-floating--two{right:5%;bottom:18%}
.portal-hero__copy{position:relative;z-index:4;text-align:center;max-width:980px;margin:55px auto 0}
.hero-kicker{display:inline-flex;background:#e4f5fd;color:#0784b8;border-radius:24px;padding:8px 14px;margin-bottom:18px;font-weight:650;font-size:12px}
.portal-hero__copy h1{font-size:clamp(43px,6.4vw,88px);font-weight:720;line-height:1.04;letter-spacing:-.05em;margin:0;color:#102d3c;text-wrap:balance}
.portal-hero__copy p{margin:23px auto 28px;max-width:780px;color:#5d7c8b;font-size:clamp(16px,1.35vw,18px);line-height:1.6;text-wrap:pretty}
.portal-hero__actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px}
.site-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:49px;min-width:200px;padding:0 21px;border-radius:9px;
 text-decoration:none;font-size:14px;font-weight:650}
.site-btn--primary{background:#009cde;color:white}.site-btn--secondary{background:#fff;color:#167ba5;border:1px solid #d2e1e9}
.site-btn:hover{transform:translateY(-2px);box-shadow:0 7px 18px #113b5719}
@media(max-width:900px){.portal-hero__inner{padding:16px 16px 50px}.portal-hero__visual{min-height:250px}.portal-hero__copy{margin-top:40px}.portal-hero__copy h1{font-size:clamp(42px,7.2vw,70px)}}
@media(max-width:600px){.portal-hero__inner{padding:12px 12px 36px}
 .portal-hero__visual{aspect-ratio:3/1;min-height:155px;border-radius:10px}.hero-ui{left:10%;width:80%;top:8%;height:90%}
 .hero-ui__header{height:22px;padding:0 8px}.ui-brand{font-size:8px}.ui-brand-mark{font-size:7px}.ui-avatar{display:none}
 .hero-ui__content{height:calc(100% - 22px)}.hero-ui__sidebar{width:26%;padding:4px}.hero-ui__side{font-size:6px;padding:4px 3px;gap:3px;margin:0}
 .hero-ui__side svg{width:9px;height:9px}.hero-ui__workspace{padding:6px}
 .ui-topline strong{font-size:8px}.ui-soft-pill{font-size:5px;padding:3px}.hero-ui__metrics{gap:3px;margin:5px 0}
 .hero-ui__metrics>div{padding:3px;gap:2px}.hero-ui__metrics b{font-size:9px}.hero-ui__metrics svg{width:10px;height:10px}
 .hero-ui__metrics span{font-size:5px}.hero-ui__list>div{padding:3px;gap:3px;font-size:6px}
 .hero-ui__list>div strong{min-width:40px}.hero-ui__list small{font-size:5px}.hero-ui__list small svg{display:none}
 .hero-small-avatar{width:12px;height:12px;font-size:5px}
 .hero-diamond{border-width:9px;border-radius:10px}.hero-floating{padding:4px 6px;font-size:6px;gap:3px}
 .hero-floating svg{width:9px;height:9px}.portal-hero__copy{margin-top:29px}
 .portal-hero__copy h1{font-size:clamp(38px,10vw,54px)}.portal-hero__copy p{font-size:15px;margin:18px auto 24px}
 .portal-hero__actions{flex-direction:column;max-width:330px;margin:auto}.site-btn{width:100%;box-sizing:border-box}
}
@media(prefers-reduced-motion:reduce){.hero-diamond{animation:none}.site-btn{transition:none}}
</style>
