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
.view-tabs{
  display:flex;align-items:stretch;gap:0;min-width:0;max-width:100%;
  overflow-x:auto;overflow-y:hidden;border-bottom:1px solid var(--color-stroke);
  scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-inline:contain
}
.view-tabs::-webkit-scrollbar{display:none;width:0;height:0}
.view-tab{
  position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:40px;
  padding:var(--space-2) var(--space-4);border:0;border-radius:0;background:transparent;
  color:var(--color-muted);font:inherit;font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:500;white-space:nowrap
}
.view-tab:hover{color:var(--color-text);background:var(--color-hover)}
.view-tab--active{color:var(--color-primary);background:transparent;font-weight:600}
.view-tab--active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--color-primary)}
.view-tab:focus-visible{outline:2px solid var(--color-primary);outline-offset:-2px}
@media(max-width:480px){.view-tab{padding:var(--space-2) var(--space-3);font-size:12px;line-height:16px}}
</style>
