<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  value: string | number | null
  detail: string
  to: string
  percent?: number | null
  footnote?: string
  color?: 'blue' | 'amber' | 'green' | 'red'
}>(), { percent: null, color: 'blue' })

const progress = computed(() =>
  props.percent === null || !Number.isFinite(props.percent)
    ? null : Math.max(0, Math.min(100, Math.round(props.percent))))
const ringStyle = computed(() => ({
  '--metric-amount': String(progress.value ?? 0) + '%',
  '--metric-color': props.color === 'amber' ? 'var(--color-warning)'
    : props.color === 'green' ? 'var(--color-success)'
      : props.color === 'red' ? 'var(--color-danger)'
        : 'var(--color-primary)',
}))
</script>

<template>
  <RouterLink class="metric-card" :to="to" :title="'Открыть раздел: '+title">
    <div class="metric-heading">
      <h3>{{ title }}</h3>
      <img src="/prototype-icons/Arrow-more.svg" alt="" aria-hidden="true" />
    </div>
    <div class="metric-body">
      <span class="metric-ring" :class="{ 'metric-ring--unknown': progress===null }" :style="ringStyle"
        :aria-label="progress===null ? 'Процент не рассчитывается' : 'Доля '+progress+'%'">
        <strong>{{ progress===null ? '—' : progress+'%' }}</strong>
      </span>
      <div class="metric-copy">
        <strong class="metric-value">{{ value ?? '—' }}</strong>
        <span class="metric-description">{{ detail }}</span>
      </div>
    </div>
    <span class="metric-footnote">{{ footnote ?? 'Открыть раздел' }}</span>
  </RouterLink>
</template>

<style scoped>
.metric-card{
  display:grid;grid-template-rows:auto 1fr auto;gap:12px;
  min-width:0;min-height:142px;padding:12px;
  border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-card);
  text-align:left;transition:border-color .15s ease,box-shadow .15s ease;
}
.metric-card:hover{border-color:var(--color-primary-stroke);box-shadow:0 4px 14px rgba(35,115,160,.09)}
.metric-card:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.metric-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
.metric-heading h3{
  margin:0;color:var(--color-muted);font-size:12px;line-height:17px;
  font-weight:400;letter-spacing:0;text-transform:uppercase;
}
.metric-heading img{width:16px;height:16px;flex:none}
.metric-body{display:flex;align-items:center;gap:11px;min-width:0}
.metric-ring{
  display:grid;place-items:center;position:relative;flex:0 0 54px;
  width:54px;height:54px;border-radius:50%;
  background:conic-gradient(var(--metric-color) var(--metric-amount),var(--color-stroke-strong) 0);
}
.metric-ring:after{content:'';position:absolute;inset:2.5px;border-radius:50%;background:var(--color-surface)}
.metric-ring strong{
  position:relative;z-index:1;font-size:12px;line-height:16px;
  font-weight:600;color:var(--metric-color);font-variant-numeric:tabular-nums;
}
.metric-ring--unknown{background:var(--color-stroke-strong)}
.metric-ring--unknown strong{color:var(--color-muted)}
.metric-copy{display:grid;align-content:center;gap:2px;min-width:0}
.metric-value{
  display:block;color:var(--color-text);font-size:17px;line-height:23px;
  font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;
}
.metric-description{font-size:12px;line-height:17px;color:var(--color-muted);overflow-wrap:anywhere}
.metric-footnote{font-size:10px;line-height:14px;color:var(--color-muted)}
@media(max-width:620px){.metric-card{min-height:118px;padding:12px;gap:8px}.metric-ring{flex-basis:50px;width:50px;height:50px}}
@media(prefers-reduced-motion:reduce){.metric-card{transition:none}}
</style>
