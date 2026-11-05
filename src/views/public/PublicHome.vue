<script setup lang="ts">
import { computed, ref } from 'vue'
import { UsersRound, Network, CalendarDays, Clock3, FileCheck2, FolderArchive, ShieldCheck,
  BarChart3, ArrowRight, Check, Building2, UserRoundCheck, ChartNoAxesCombined } from 'lucide-vue-next'
import { useSaasText, type SaasKey } from '../../i18n/saas'
import PublicPlans from '../../components/public/PublicPlans.vue'
const { tr } = useSaasText()
const active = ref('employees')
const modules = [
  { id: 'employees', label: 'employees', preview: 'previewEmployees', icon: UsersRound, path: '/employees' },
  { id: 'staffing', label: 'staffing', preview: 'previewStaffing', icon: Network, path: '/staffing' },
  { id: 'vacations', label: 'vacations', preview: 'previewVacations', icon: CalendarDays, path: '/leaves' },
  { id: 'worktime', label: 'worktime', preview: 'previewWorktime', icon: Clock3, path: '/timesheets' },
  { id: 'personnel', label: 'personnel', preview: 'previewPersonnel', icon: FileCheck2, path: '/personnel-actions' },
  { id: 'documents', label: 'documents', preview: 'previewDocuments', icon: FolderArchive, path: '/documents' },
  { id: 'reporting', label: 'reporting', preview: 'previewDocuments', icon: BarChart3, path: '/reports' },
  { id: 'roles', label: 'roles', preview: 'previewEmployees', icon: ShieldCheck, path: '/roles' },
] as const
const selected = computed(() => modules.find(item => item.id === active.value) ?? modules[0])
const features = [
  { title: 'feature1Title', text: 'feature1Text', icon: Network },
  { title: 'feature2Title', text: 'feature2Text', icon: CalendarDays },
  { title: 'feature3Title', text: 'feature3Text', icon: FileCheck2 },
  { title: 'feature4Title', text: 'feature4Text', icon: ShieldCheck },
] as const
const steps = ['step1', 'step2', 'step3', 'step4'] as const
function label(key: SaasKey) { return tr(key) }
</script>

<template>
  <div class="saas-home">
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span></span>{{ tr('heroBadge') }}</div>
        <h1>{{ tr('heroTitle') }}</h1>
        <p>{{ tr('heroText') }}</p>
        <div class="hero-actions">
          <RouterLink class="saas-cta" :to="{ name: 'public.register' }">{{ tr('getStarted') }} <ArrowRight :size="19" /></RouterLink>
          <a class="saas-cta secondary" href="#features">{{ tr('explore') }}</a>
        </div>
        <div class="hero-points"><span><Check :size="16" /> RU · EN · GE</span><span><Check :size="16" /> HRM</span><span><Check :size="16" /> SaaS</span></div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-glow"></div>
        <div class="float-badge badge-one"><UsersRound :size="20" /><span>{{ tr('employees') }}</span></div>
        <div class="float-badge badge-two"><CalendarDays :size="20" /><span>{{ tr('vacations') }}</span></div>
        <div class="float-badge badge-three"><ShieldCheck :size="20" /><span>{{ tr('roles') }}</span></div>
        <div class="demo-window">
          <div class="demo-window-header">
            <span class="demo-mark">ITP <b>HRM</b></span>
            <span class="demo-window-actions"><i></i><i></i><i></i></span>
          </div>
          <div class="demo-window-body">
            <div class="demo-sidebar">
              <div class="demo-sidebar-line is-active"><UsersRound :size="15" /><span>{{ tr('employees') }}</span></div>
              <div class="demo-sidebar-line"><Network :size="15" /><span>{{ tr('staffing') }}</span></div>
              <div class="demo-sidebar-line"><CalendarDays :size="15" /><span>{{ tr('vacations') }}</span></div>
              <div class="demo-sidebar-line"><Clock3 :size="15" /><span>{{ tr('worktime') }}</span></div>
            </div>
            <div class="demo-content">
              <div class="demo-title"><strong>{{ tr('employees') }}</strong><span>•••</span></div>
              <div class="demo-kpis">
                <span><UsersRound :size="18" /><b>106</b><small>{{ tr('employees') }}</small></span>
                <span><Building2 :size="18" /><b>7</b><small>{{ tr('staffing') }}</small></span>
                <span><UserRoundCheck :size="18" /><b>24</b><small>{{ tr('vacations') }}</small></span>
              </div>
              <div class="demo-table">
                <div class="demo-row"><b>{{ tr('employees') }}</b><b>{{ tr('staffing') }}</b><b>{{ tr('status') }}</b></div>
                <div class="demo-row"><span><i class="avatar">A</i> A. Ivanov</span><span>IT</span><span class="ok">●</span></div>
                <div class="demo-row"><span><i class="avatar alt">M</i> M. Dolidze</span><span>HR</span><span class="ok">●</span></div>
                <div class="demo-row"><span><i class="avatar alt2">D</i> D. Tulubaev</span><span>Management</span><span class="ok">●</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="features" class="saas-container features">
      <div class="section-heading"><span class="eyebrow">{{ tr('product') }}</span><h2>{{ tr('interactiveTitle') }}</h2><p>{{ tr('interactiveText') }}</p></div>
      <div class="feature-cards">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <div class="feature-icon"><component :is="feature.icon" :size="26" /></div>
          <h3>{{ label(feature.title) }}</h3><p>{{ label(feature.text) }}</p>
        </article>
      </div>
    </section>
    <section id="modules" class="saas-container modules">
      <div class="section-heading"><span class="eyebrow">{{ tr('modules') }}</span><h2>{{ tr('interactiveTitle') }}</h2></div>
      <div class="modules-playground">
        <nav class="module-list" :aria-label="tr('modules')">
          <button v-for="item in modules" :key="item.id" type="button"
            :class="{ selected: active === item.id }" :aria-pressed="active === item.id"
            @click="active = item.id"><component :is="item.icon" :size="19" /><span>{{ label(item.label) }}</span><ArrowRight :size="16" /></button>
        </nav>
        <div class="module-preview">
          <div class="module-preview-header"><span class="preview-pill">ITP HRM</span><span>● ● ●</span></div>
          <div class="module-preview-body">
            <div class="preview-icon"><component :is="selected.icon" :size="36" /></div>
            <h3>{{ label(selected.label) }}</h3>
            <p>{{ label(selected.preview) }}</p>
            <div class="preview-row"><span class="preview-skeleton a"></span><span class="preview-skeleton b"></span><Check :size="18" /></div>
            <div class="preview-row"><span class="preview-skeleton c"></span><span class="preview-skeleton b"></span><Check :size="18" /></div>
            <div class="preview-row"><span class="preview-skeleton a"></span><span class="preview-skeleton d"></span><Check :size="18" /></div>
            <RouterLink class="preview-go" :to="selected.path">{{ tr('openWorkspace') }} <ArrowRight :size="17" /></RouterLink>
          </div>
        </div>
      </div>
    </section>
    <section id="how" class="how">
      <div class="saas-container">
        <div class="section-heading"><h2>{{ tr('howTitle') }}</h2></div>
        <div class="how-steps"><div v-for="(step,i) in steps" :key="step" class="how-step"><span>{{ String(i+1).padStart(2,'0') }}</span><h3>{{ tr(step) }}</h3></div></div>
      </div>
    </section>
    <section id="plans" class="saas-container home-pricing">
      <div class="section-heading"><h2>{{ tr('plansTitle') }}</h2><p>{{ tr('plansText') }}</p></div>
      <PublicPlans />
      <RouterLink class="all-plans" :to="{ name: 'public.pricing' }">{{ tr('pricing') }} <ArrowRight :size="16" /></RouterLink>
    </section>
    <section class="ending">
      <div class="saas-container ending-inner">
        <ChartNoAxesCombined :size="44" /><h2>{{ tr('startUsing') }}</h2><p>{{ tr('startUsingText') }}</p>
        <RouterLink class="saas-cta light" :to="{ name: 'public.register' }">{{ tr('getStarted') }} <ArrowRight :size="19" /></RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.saas-home{color:#153542}.saas-container{max-width:1240px;margin:auto;padding:0 20px}
.hero{max-width:1440px;min-height:650px;margin:auto;display:grid;grid-template-columns:1fr 1.12fr;align-items:center;gap:26px;padding:72px max(20px,calc((100% - 1240px)/2))}
.hero-copy h1{font-size:clamp(44px,4.7vw,72px);font-weight:650;letter-spacing:-.055em;line-height:1.06;max-width:600px;margin:20px 0}
.hero-copy p{color:#597b8a;font-size:17px;line-height:1.65;max-width:510px;margin:0}
.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.075em;color:#008ecb;font-weight:600;display:inline-flex;align-items:center;gap:9px}
.eyebrow span{width:8px;height:8px;background:#009cde;border-radius:50%}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin:34px 0 24px}
.saas-cta{display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:0 20px;border:1px solid #009cde;background:#009cde;color:white!important;text-decoration:none!important;border-radius:8px;font-size:14px;font-weight:550}
.saas-cta:hover{background:#0088c3}.saas-cta.secondary{background:white;color:#1571a3!important;border-color:#d7e7ef}.saas-cta.light{background:white;color:#087eb3!important;border-color:white}
.hero-points{display:flex;flex-wrap:wrap;gap:16px;color:#507384;font-size:12px}.hero-points span{display:inline-flex;align-items:center;gap:5px}.hero-points svg{color:#009cde}
.hero-art{height:510px;position:relative;display:flex;justify-content:center;align-items:center;isolation:isolate;min-width:0}
.hero-glow{position:absolute;inset:28px 3px;background:radial-gradient(ellipse at 45% 40%,#a9e5ff,#d6efff 42%,#e8e4ff 75%,#f5f9fb);border-radius:45px;transform:rotate(-5deg);z-index:-1}
.demo-window{background:white;width:88%;height:355px;border:1px solid #d8e5ed;border-radius:12px;overflow:hidden;box-shadow:0 32px 65px #134c7433;transform:perspective(900px) rotateY(-8deg) rotateX(3deg);margin-left:10px}
.demo-window-header{height:45px;border-bottom:1px solid #e6edf2;padding:0 16px;display:flex;justify-content:space-between;align-items:center;color:#28516a;font-size:13px}
.demo-mark{font-weight:800}.demo-mark b{font-weight:500;color:#009cde}.demo-window-actions{display:flex;gap:5px}.demo-window-actions i{height:7px;width:7px;background:#bed7e2;border-radius:50%}
.demo-window-body{height:calc(100% - 45px);display:grid;grid-template-columns:150px 1fr}
.demo-sidebar{border-right:1px solid #e4eef3;background:#edf5f9;padding:16px 9px}.demo-sidebar-line{display:flex;align-items:center;gap:9px;font-size:11px;color:#607c8b;padding:10px 7px;border-radius:6px}
.demo-sidebar-line.is-active{background:white;color:#008ece}.demo-content{padding:18px;min-width:0}.demo-title{display:flex;justify-content:space-between;font-size:16px;align-items:center}
.demo-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}.demo-kpis>span{background:#f3f8fb;border-radius:7px;padding:9px;display:grid;gap:3px;color:#008ece}.demo-kpis b{font-size:17px;color:#193a4c}.demo-kpis small{font-size:9px;color:#678b9c}
.demo-table{font-size:10px}.demo-row{display:grid;grid-template-columns:1.7fr 1fr .55fr;gap:8px;padding:9px 3px;border-top:1px solid #e8eef2;align-items:center;color:#526b78}.demo-row b{font-weight:600}
.demo-row>span:first-child{display:flex;align-items:center;gap:7px;white-space:nowrap}.avatar{display:inline-grid;place-items:center;background:#d8e7ff;color:#2f5eb3;border-radius:50%;height:22px;width:22px;font-style:normal;font-size:10px}.avatar.alt{background:#fbe2ea;color:#bb478b}.avatar.alt2{background:#dbf1df;color:#2c8b4d}.ok{color:#15a271}
.float-badge{position:absolute;z-index:4;display:flex;align-items:center;gap:9px;border:1px solid #d6eaf3;border-radius:11px;background:white;color:#285168;padding:11px 15px;font-size:12px;font-weight:550;box-shadow:0 8px 25px #235e8622;animation:float 5s ease-in-out infinite}
.float-badge svg{color:#009cde}.badge-one{left:-1%;top:55px}.badge-two{right:-2%;top:22%}.badge-three{right:0;bottom:29px}.badge-two{animation-delay:-2s}.badge-three{animation-delay:-3.5s}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
.section-heading{max-width:810px;margin:0 auto 36px;text-align:center}.section-heading h2{font-size:clamp(30px,3.3vw,46px);font-weight:640;letter-spacing:-.04em;line-height:1.17;margin:14px 0}.section-heading p{color:#60818d;font-size:16px;line-height:1.65;margin:0}
.features{padding-top:74px;padding-bottom:86px}.feature-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.feature-card{padding:26px;border:1px solid #e1eaf0;background:#fff;border-radius:14px;min-height:225px}
.feature-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:11px;background:#e8f7fd;color:#008fcd}.feature-card h3{font-size:19px;font-weight:600;line-height:1.3;margin:21px 0 12px}.feature-card p{font-size:13px;line-height:1.65;color:#647c89;margin:0}
.modules{padding-bottom:108px}.modules-playground{display:grid;grid-template-columns:300px 1fr;gap:20px;padding:24px;border:1px solid #dfeaf1;border-radius:18px;background:#edf5f9}
.module-list{display:grid;align-content:start;gap:6px}.module-list button{display:flex;align-items:center;gap:12px;text-align:left;background:transparent;border:0;padding:14px;border-radius:8px;color:#37596c;cursor:pointer;font:inherit;font-size:14px}
.module-list button.selected{background:white;color:#008fcb;box-shadow:0 5px 14px #285b7812}.module-list button span{flex:1}
.module-preview{border:1px solid #e3eaf0;background:white;border-radius:12px;overflow:hidden}.module-preview-header{padding:14px 22px;border-bottom:1px solid #e9f0f3;display:flex;justify-content:space-between;font-size:12px;color:#91a8b5}.preview-pill{background:#dff4fc;color:#008aca;border-radius:5px;padding:5px 9px}
.module-preview-body{padding:30px 32px;min-height:310px}.preview-icon{height:64px;width:64px;display:grid;place-items:center;background:#e6f7fe;color:#009cde;border-radius:15px}.module-preview h3{margin:18px 0 6px;font-size:25px;font-weight:630}.module-preview p{color:#6d8791;margin:0 0 22px;font-size:14px}
.preview-row{display:flex;gap:15px;align-items:center;border-bottom:1px solid #edf2f5;padding:10px 0;max-width:550px}.preview-row svg{color:#32ab83;margin-left:auto}.preview-skeleton{height:9px;border-radius:6px;background:#e5edf1}.preview-skeleton.a{width:130px}.preview-skeleton.b{width:75px}.preview-skeleton.c{width:95px}.preview-skeleton.d{width:110px}
.preview-go{display:inline-flex;align-items:center;gap:10px;color:#0088c8;text-decoration:none;font-size:14px;margin-top:22px}
.how{background:#e9f3f8;padding:78px 0}.how-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.how-step{padding:25px 22px;background:#fff;border-radius:12px;min-height:150px}.how-step span{font-size:30px;color:#00a1e0;font-weight:600}.how-step h3{font-size:17px;font-weight:600;margin:18px 0 0}
.home-pricing{padding-top:85px;padding-bottom:100px}.all-plans{display:flex;align-items:center;justify-content:center;gap:10px;margin:25px auto 0;color:#0084c2;font-size:14px;text-decoration:none}
.ending{background:#009cde;color:#fff;text-align:center;padding:70px 0}.ending-inner{display:flex;flex-direction:column;align-items:center}.ending h2{font-size:clamp(29px,3.2vw,42px);font-weight:650;letter-spacing:-.04em;margin:18px 0 6px}.ending p{font-size:15px;max-width:500px;line-height:1.65;margin:4px 0 26px}
@media(max-width:1100px){.hero{padding-inline:28px}.feature-cards{grid-template-columns:repeat(2,1fr)}.float-badge{font-size:11px}}
@media(max-width:850px){.hero{grid-template-columns:1fr;padding:68px 20px 28px;min-height:0}.hero-copy{text-align:center}.hero-copy h1,.hero-copy p{margin-left:auto;margin-right:auto}.hero-actions,.hero-points{justify-content:center}.hero-art{height:440px}.modules-playground{grid-template-columns:1fr}.module-list{grid-template-columns:repeat(4,1fr)}.module-list button{flex-direction:column;font-size:12px;gap:6px;text-align:center}.module-list button svg:last-child{display:none}}
@media(max-width:600px){.hero h1{font-size:43px}.hero-art{height:310px}.hero-glow{inset:15px 0}.demo-window{height:245px;width:95%;transform:none}.demo-window-body{grid-template-columns:85px 1fr}.demo-sidebar-line{font-size:9px;padding:8px 3px}.demo-sidebar-line svg{width:12px}.demo-content{padding:10px}.demo-kpis{gap:3px;margin:9px 0}.demo-kpis>span{padding:6px}.demo-kpis b{font-size:13px}.demo-kpis svg{width:14px}.demo-row{font-size:8px}.float-badge{padding:7px 8px;font-size:9px}.float-badge svg{width:13px}.badge-one{top:0;left:0}.badge-two{right:0;top:10px}.badge-three{bottom:0}.features{padding:40px 16px 60px}.feature-cards{grid-template-columns:1fr}.feature-card{min-height:0}.modules{padding-bottom:64px}.modules-playground{padding:12px}.module-list{grid-template-columns:repeat(2,1fr)}.module-list button{flex-direction:row;text-align:left}.module-preview-body{padding:20px}.how-steps{grid-template-columns:repeat(2,1fr);gap:12px}.how-step{padding:18px;min-height:120px}.how-step span{font-size:24px}.how-step h3{font-size:14px}}
@media(prefers-reduced-motion:reduce){.float-badge{animation:none}}
</style>
