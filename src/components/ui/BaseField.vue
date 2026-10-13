<script setup lang="ts">
const model = defineModel<string>({ required: true })

withDefaults(defineProps<{
  id: string
  label: string
  type?: 'email' | 'password' | 'text'
  autocomplete?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
}>(), { type: 'text', disabled: false, required: false, invalid: false })
</script>

<template>
  <div class="base-field">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="invalid ? 'true' : undefined"
    />
  </div>
</template>

<style scoped>
.base-field{display:grid;gap:8px}
.base-field label{color:var(--color-text);font-weight:600;font-size:14px}
.base-field input{width:100%;min-height:44px;border:1px solid var(--color-stroke);background:var(--color-surface-raised);border-radius:var(--radius-md);padding:11px 13px;color:var(--color-text)}
.base-field input:focus-visible{outline:3px solid var(--color-focus);outline-offset:1px}
.base-field input[aria-invalid="true"]{border-color:var(--color-danger)}
.base-field input:disabled{background:var(--color-soft);opacity:.65}
</style>
