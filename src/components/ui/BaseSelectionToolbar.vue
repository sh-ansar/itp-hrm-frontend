<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
  count: number
  label: string
  clearLabel: string
}>()
defineEmits<{ clear: [] }>()
</script>

<template>
  <div v-if="count > 0" class="selection-toolbar" role="status" aria-live="polite">
    <span class="selection-toolbar__count">{{ label }} {{ count }}</span>
    <div class="selection-toolbar__actions">
      <slot />
      <BaseButton variant="secondary" @click="$emit('clear')">{{ clearLabel }}</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.selection-toolbar{
  display:flex;align-items:center;justify-content:space-between;gap:10px 16px;
  flex-wrap:wrap;min-width:0;margin:0 0 12px;padding:9px 12px;
  border:1px solid var(--color-stroke);border-radius:var(--radius-md);
  background:var(--color-surface);color:var(--color-muted);
  font-size:var(--font-caption-size);line-height:var(--line-caption);
}
.selection-toolbar__count{font-variant-numeric:tabular-nums}
.selection-toolbar__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.selection-toolbar__actions :deep(.base-button){height:32px;min-height:32px;font-weight:500}
@media(max-width:600px){
  .selection-toolbar{align-items:stretch;padding:10px}
  .selection-toolbar__actions{width:100%}
  .selection-toolbar__actions :deep(.base-button){max-width:100%}
}
</style>
