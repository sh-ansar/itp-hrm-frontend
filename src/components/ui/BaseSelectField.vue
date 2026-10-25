<script setup lang="ts">
import { useId } from 'vue'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'
const { tr } = useWorkspaceI18n()
// Translate only well-known UI choice IDs; keep company, person and other API values verbatim.
const uiChoiceIds = new Set(['all', 'none', 'active', 'archived', 'planned', 'unassigned', 'unset', 'male', 'female', 'approved', 'draft', 'table', 'diagram', 'register', 'development', 'vacant', 'changes'])
const optionLabel = (option: { id: string; name: string }) => uiChoiceIds.has(option.id) ? tr(option.name) : option.name

withDefaults(defineProps<{
  modelValue: string
  label: string
  options: { id: string; name: string }[]
  hideLabel?: boolean
  disabled?: boolean
  placeholder?: string
  required?: boolean
}>(), { hideLabel: false, disabled: false, placeholder: '', required: false })

defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
</script>

<template>
  <div class="base-select-field">
    <label :for="id" :class="{ 'sr-only': hideLabel }">{{ tr(label) }}<span v-if="required" aria-hidden="true"> *</span></label>
    <div class="base-select-control">
      <select :id="id" :value="modelValue" :disabled="disabled" :required="required"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
        <option v-if="placeholder" value="" disabled>{{ tr(placeholder) }}</option>
        <option v-for="option in options" :key="option.id" :value="option.id">{{ optionLabel(option) }}</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.base-select-field{display:grid;gap:var(--space-2);width:100%;max-width:540px;min-width:0}
label{font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:500;color:var(--color-text)}
.base-select-control{position:relative;display:block;min-width:0;width:100%}
select{appearance:none;-webkit-appearance:none;-moz-appearance:none;
  width:100%;height:var(--control-height);min-height:var(--control-height);
  padding:0 34px 0 var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-surface-raised);color:var(--color-text);font:inherit;
  font-size:var(--font-caption-size);line-height:var(--line-caption);box-shadow:var(--shadow-control);
}
select:focus-visible{outline:2px solid var(--color-primary);outline-offset:1px;border-color:var(--color-stroke-strong)}
select:disabled{cursor:not-allowed;opacity:.6}
.base-select-control:has(select:disabled) .base-select-chevron{opacity:.5}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
</style>
