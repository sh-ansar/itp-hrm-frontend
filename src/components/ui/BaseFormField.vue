<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'date' | 'number'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  autocomplete?: string
}>(), { type: 'text', required: false, disabled: false, error: '' })

defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const errorId = computed(() => props.error ? `${id}-error` : undefined)
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <input :id="id" :type="type" :value="modelValue" :placeholder="placeholder"
      :required="required" :disabled="disabled" :autocomplete="autocomplete" :step="type === 'number' ? 'any' : undefined"
      :aria-invalid="!!error" :aria-describedby="errorId"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <p v-if="error" :id="errorId" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field{display:grid;gap:var(--space-2);min-width:0}
label{font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:500;color:var(--color-text)}
input{
  width:100%;height:var(--control-height);min-height:var(--control-height);
  padding:0 var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-surface-raised);color:var(--color-text);font:inherit;
  font-size:var(--font-caption-size);line-height:var(--line-caption);box-shadow:var(--shadow-control);
}
input::placeholder{color:var(--color-muted);opacity:1}
input:focus-visible{outline:2px solid var(--color-primary);outline-offset:1px;border-color:var(--color-stroke-strong)}
input[aria-invalid="true"]{border-color:var(--color-danger-border)}
input:disabled{opacity:.6;cursor:not-allowed}
.error{font-size:var(--font-caption-size);line-height:var(--line-caption);color:var(--color-danger);margin:0}
</style>
