<script setup lang="ts">
import { useId } from 'vue'
import { Search } from 'lucide-vue-next'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'
const { tr } = useWorkspaceI18n()

defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  disabled?: boolean
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
</script>

<template>
  <div class="registry-search">
    <Search :size="17" aria-hidden="true" />
    <label class="sr-only" :for="id">{{ tr(label) }}</label>
    <input :id="id" type="search" :value="modelValue" :disabled="disabled" :aria-label="tr(label)"
      :placeholder="tr(placeholder || label)"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </div>
</template>

<style scoped>
.registry-search{
  display:flex;align-items:center;gap:9px;flex:1 1 240px;
  width:100%;min-width:0;max-width:420px;height:var(--control-height);
  padding:0 12px;border:1px solid var(--color-stroke);
  border-radius:var(--space-2);background:var(--color-surface-raised);
  color:var(--color-muted);
}
.registry-search:focus-within{outline:2px solid var(--color-primary);outline-offset:1px}
.registry-search :deep(svg){flex:none}
.registry-search input{
  display:block;width:100%;min-width:0;border:0;outline:0;background:transparent;
  color:var(--color-text);font:inherit;font-size:var(--font-caption-size);
}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:650px){.registry-search{max-width:none}}
.registry-search:has(input:disabled){opacity:.55;cursor:not-allowed}
.registry-search input:disabled{cursor:not-allowed}
</style>
