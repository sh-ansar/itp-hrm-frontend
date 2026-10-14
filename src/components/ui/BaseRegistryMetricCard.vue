<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useUiFormatters } from '../../composables/useUiFormatters'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'

const props = withDefaults(defineProps<{
  title: string
  value: number | string | null
  description: string
  to?: string
  icon?: string
  kind?: 'number' | 'ring'
  percentage?: number | null
  tone?: 'primary' | 'danger' | 'warning'
}>(), { kind: 'number', percentage: null, tone: 'primary' })
const fmt = useUiFormatters()
const { tr } = useWorkspaceI18n()
const formattedValue = computed(() => typeof props.value === 'number' ? fmt.number(props.value, 0) : (props.value ?? '—'))
const percentage = computed(() =>
  props.percentage === null || !Number.isFinite(props.percentage)
    ? null : Math.max(0, Math.min(100, Math.round(props.percentage))))
const ringStyle = computed(() => ({
  '--registry-ring-fill': String(percentage.value ?? 0) + '%',
}))
</script>

<template>
  <component :is="to ? RouterLink : 'div'" class="registry-summary-card"
    :class="['registry-summary-card--'+kind, 'registry-summary-card--'+tone, { 'registry-summary-card--linked': !!to }]"
    :to="to || undefined">
    <div class="registry-summary-heading">
      <span>{{ title }}</span>
      <img v-if="icon" :src="icon" alt="" aria-hidden="true" />
    </div>
    <div v-if="kind==='ring'" class="registry-summary-ring-layout">
      <span class="registry-summary-ring" :style="ringStyle"
        :aria-label="percentage===null ? tr('Доля не рассчитана') : tr('Доля')+' '+percentage+'%'">
        <b>{{ formattedValue }}</b>
      </span>
      <div class="registry-summary-ring-copy">
        <strong>{{ percentage===null ? tr('Доля не рассчитана') : percentage+'% '+tr('позиций открыты') }}</strong>
        <small>{{ description }}</small>
      </div>
    </div>
    <template v-else>
      <strong class="registry-summary-value">{{ formattedValue }}</strong>
      <small class="registry-summary-description">{{ description }}</small>
    </template>
  </component>
</template>

<style scoped>
.registry-summary-card{
  display:grid;align-content:start;gap:7px;min-width:0;min-height:124px;
  padding:15px;border:1px solid var(--color-stroke);border-radius:8px;
  background:var(--color-surface);box-shadow:var(--shadow-card);
  text-decoration:none;color:var(--color-text);
  --registry-metric-color:var(--color-primary);
}
.registry-summary-card--danger{--registry-metric-color:var(--color-danger)}
.registry-summary-card--warning{--registry-metric-color:var(--color-warning)}
.registry-summary-card--linked:hover{border-color:var(--color-primary-stroke);box-shadow:0 5px 14px rgba(35,115,160,.08)}
.registry-summary-card--linked:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.registry-summary-heading{display:flex;align-items:start;justify-content:space-between;gap:9px;min-width:0}
.registry-summary-heading span{
  min-width:0;color:var(--color-text);font-size:12px;line-height:17px;font-weight:600;text-transform:uppercase
}
.registry-summary-heading img{width:16px;height:16px;object-fit:contain;flex:none}
.registry-summary-value{color:var(--registry-metric-color);font-size:23px;line-height:28px;font-weight:700;font-variant-numeric:tabular-nums}
.registry-summary-description{font-size:12px;line-height:18px;color:var(--color-muted)}
.registry-summary-ring-layout{display:flex;align-items:center;gap:11px;min-width:0;margin-top:5px}
.registry-summary-ring{
  position:relative;display:grid;place-items:center;flex:0 0 51px;
  width:51px;height:51px;border-radius:50%;
  background:conic-gradient(var(--registry-metric-color) var(--registry-ring-fill),var(--color-stroke-strong) 0)
}
.registry-summary-ring::before{content:'';position:absolute;inset:3px;background:var(--color-surface);border-radius:50%}
.registry-summary-ring b{position:relative;z-index:1;color:var(--registry-metric-color);font-size:12px;font-weight:600}
.registry-summary-ring-copy{display:grid;gap:4px;min-width:0}
.registry-summary-ring-copy strong{font-size:12px;line-height:18px;color:var(--color-text);font-weight:600}
.registry-summary-ring-copy small{font-size:12px;line-height:18px;color:var(--color-muted);overflow-wrap:anywhere}
@media(max-width:600px){.registry-summary-card{min-height:115px;padding:12px}}
</style>