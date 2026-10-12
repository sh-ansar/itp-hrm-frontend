<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'date'
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
      :required="required" :disabled="disabled" :autocomplete="autocomplete"
      :aria-invalid="!!error" :aria-describedby="errorId"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <p v-if="error" :id="errorId" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field{display:grid;gap:7px;min-width:0}
label{font-size:14px;font-weight:600;color:var(--color-text)}
input{width:100%;min-height:var(--control-height);padding:10px 12px;border:1px solid var(--color-stroke);border-radius:10px;background:var(--color-surface);color:var(--color-text);font:inherit}
input:focus-visible{outline:3px solid var(--color-focus);outline-offset:1px}
input[aria-invalid="true"]{border-color:var(--color-danger-border)}
input:disabled{opacity:.6;cursor:not-allowed}
.error{font-size:13px;color:var(--color-danger);margin:0;line-height:1.4}
</style>
