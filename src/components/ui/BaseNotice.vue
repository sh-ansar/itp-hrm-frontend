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
.success{color:#245b46;background:#edf8f1;border-color:#b7ddc5}
.warning{color:#735218;background:#fff9e9;border-color:#e8d7a5}
.error{color:#912c2c;background:#fff1f1;border-color:#efc0c0}
</style>
