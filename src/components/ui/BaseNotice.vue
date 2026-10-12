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
.base-notice{padding:12px 14px;border:1px solid;border-radius:12px;font-size:14px;line-height:1.5;overflow-wrap:anywhere}
.info{color:#16415c;background:#edf6fb;border-color:#bbdbea}
.success{color:var(--color-success);background:var(--color-success-surface);border-color:#b7ddc5}
.warning{color:var(--color-warning);background:var(--color-warning-surface);border-color:#e8d7a5}
.error{color:var(--color-danger);background:var(--color-danger-surface);border-color:#efc0c0}
</style>
