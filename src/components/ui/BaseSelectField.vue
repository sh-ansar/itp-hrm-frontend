<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{
  modelValue: string
  label: string
  options: { id: string; name: string }[]
  disabled?: boolean
}>(), { disabled: false })
defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
</script>

<template>
  <div class="base-select-field">
    <label :for="id">{{ label }}</label>
    <select :id="id" :value="modelValue" :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option v-for="option in options" :key="option.id" :value="option.id">{{ option.name }}</option>
    </select>
  </div>
</template>

<style scoped>
.base-select-field{display:grid;gap:var(--space-2);width:100%;max-width:540px;min-width:0}
label{font-size:var(--font-label-size);font-weight:600;color:var(--color-text)}
select{min-height:var(--control-height);padding:10px 12px;width:100%;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit}
select:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
select:disabled{cursor:not-allowed;opacity:.6}
</style>
