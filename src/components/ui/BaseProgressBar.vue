<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  tone?: 'info' | 'success' | 'warning' | 'danger'
  label?: string
}>(), { tone: 'info', label: '' })

const normalized = computed(() => Math.min(100, Math.max(0, Number.isFinite(props.value) ? props.value : 0)))
</script>

<template>
  <div class="base-progress" :class="'base-progress--' + tone"
    role="progressbar" :aria-label="label || undefined"
    aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(normalized)">
    <span class="base-progress__line" :style="{ width: normalized + '%' }"></span>
  </div>
</template>

<style scoped>
.base-progress{
  position:relative;width:100%;height:2px;display:block;border-radius:999px;
  background:var(--color-stroke);box-shadow:inset 0 1px 2px rgba(8,31,43,.05);overflow:hidden
}
.base-progress__line{position:absolute;inset:0 auto 0 0;border-radius:inherit;background:var(--color-primary);transition:width .2s ease}
.base-progress--success .base-progress__line{background:var(--color-success)}
.base-progress--warning .base-progress__line{background:var(--color-warning)}
.base-progress--danger .base-progress__line{background:var(--color-danger)}
@media(prefers-reduced-motion:reduce){.base-progress__line{transition:none}}
</style>
