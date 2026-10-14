<script setup lang="ts">
import { computed } from 'vue'
const props=withDefaults(defineProps<{title:string;value:string|number|null;detail:string;to:string;percent?:number|null;footnote?:string;color?:'blue'|'amber'|'green'}>(),{percent:null,color:'blue'})
const progress=computed(()=>props.percent===null||!Number.isFinite(props.percent)?null:Math.max(0,Math.min(100,Math.round(props.percent))))
const ringStyle=computed(()=>({
  '--meter-progress':String(progress.value??0)+'%',
  '--meter-color':props.color==='amber'?'var(--color-warning)':props.color==='green'?'var(--color-success)':'var(--color-primary)',
}))
</script>
<template>
  <RouterLink class="metric-card" :to="to">
    <div class="metric-heading"><h3>{{ title }}</h3><img src="/prototype-icons/Arrow-more.svg" alt="" aria-hidden="true" /></div>
    <div class="metric-body">
      <span class="metric-ring" :class="{'metric-ring--unknown':progress===null}" :style="ringStyle" :aria-label="progress===null?'Доля не рассчитана':'Доля '+progress+'%'">
        <strong v-if="progress!==null">{{ progress }}%</strong><img v-else src="/prototype-icons/Chart-circle.svg" alt="" aria-hidden="true" />
      </span>
      <p><strong>{{ value??'—' }}</strong> {{ detail }}</p>
    </div>
    <span class="metric-footnote">{{ footnote??'Открыть раздел →' }}</span>
  </RouterLink>
</template>
<style scoped>
.metric-card{display:grid;grid-template-rows:auto 1fr auto;gap:12px;min-width:0;min-height:148px;padding:15px 16px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-card);transition:border-color .16s,box-shadow .16s}
.metric-card:hover{border-color:var(--color-primary-stroke);box-shadow:0 5px 16px rgba(35,115,160,.1)}
.metric-heading{display:flex;justify-content:space-between;align-items:start;gap:8px}
.metric-heading h3{margin:0;color:var(--color-text);font-size:12px;line-height:18px;font-weight:700;letter-spacing:.01em;text-transform:uppercase}
.metric-heading img{width:17px;height:17px;flex:none}
.metric-body{display:flex;align-items:center;gap:12px}
.metric-body p{min-width:0;margin:0;color:var(--color-muted);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.metric-body p strong{color:var(--color-text);font-weight:700}
.metric-ring{position:relative;display:grid;place-items:center;flex:0 0 54px;width:54px;height:54px;border-radius:50%;background:conic-gradient(var(--meter-color) var(--meter-progress),var(--color-stroke-strong) 0)}
.metric-ring:after{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--color-surface)}
.metric-ring strong,.metric-ring img{position:relative;z-index:1}
.metric-ring strong{font-size:12px;line-height:17px;color:var(--meter-color)}
.metric-ring img{width:19px;height:19px}
.metric-ring--unknown{background:var(--color-soft);border:1px solid var(--color-stroke)}
.metric-ring--unknown:after{display:none}
.metric-footnote{color:var(--color-muted);font-size:11px;line-height:16px}
@media(max-width:600px){.metric-card{min-height:135px;padding:12px;gap:9px}.metric-ring{width:46px;height:46px;flex-basis:46px}.metric-ring:after{inset:4px}}
@media(prefers-reduced-motion:reduce){.metric-card{transition:none}}
</style>
