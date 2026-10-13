<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tone?: 'error' | 'warning' | 'info' | 'success'
}>(), { tone: 'info' })

const liveRole = computed(() => props.tone === 'error' ? 'alert' : 'status')
</script>

<template>
  <div :class="['base-notice', tone]" :role="liveRole">
    <slot />
  </div>
</template>

<style scoped>
.base-notice{
  padding:var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  font-size:var(--font-caption-size);line-height:var(--line-caption);overflow-wrap:anywhere;box-shadow:var(--shadow-card)
}
.info{color:var(--color-primary);background:var(--color-accent-soft);border-color:var(--color-stroke)}
.success{color:var(--color-success);background:var(--color-success-surface);border-color:var(--color-stroke)}
.warning{color:var(--color-warning);background:var(--color-warning-surface);border-color:var(--color-stroke)}
.error{color:var(--color-danger);background:var(--color-danger-surface);border-color:var(--color-stroke)}
</style>
