<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ id: string; label: string }>
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <nav class="view-tabs" :aria-label="label">
    <button v-for="tab in options" :key="tab.id" type="button"
      class="view-tab" :class="{ 'view-tab--active': modelValue === tab.id }"
      :aria-current="modelValue === tab.id ? 'page' : undefined"
      @click="emit('update:modelValue', tab.id)">
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.view-tabs{display:flex;align-items:stretch;gap:2px;min-width:0;max-width:100%;overflow-x:auto;border-bottom:1px solid var(--color-stroke);scrollbar-width:thin}
.view-tab{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:43px;padding:10px 16px;border:0;border-radius:9px 9px 0 0;background:transparent;color:var(--color-muted);font:inherit;font-size:13px;font-weight:600;white-space:nowrap}
.view-tab:hover{color:var(--color-primary);background:var(--color-soft)}
.view-tab--active{color:var(--color-primary);background:var(--color-surface)}
.view-tab--active::after{content:'';height:2px;position:absolute;bottom:0;left:0;right:0;background:var(--color-primary)}
@media(max-width:480px){.view-tab{padding:10px 12px;font-size:12px}}
</style>
