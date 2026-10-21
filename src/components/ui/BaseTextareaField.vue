<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  label: string
  disabled?: boolean
  required?: boolean
  maxLength?: number
  rows?: number
  showCount?: boolean
  placeholder?: string
}>(), { maxLength: 2000, rows: 4, showCount: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const length = computed(() => props.modelValue?.length ?? 0)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="base-textarea-field">
    <label :for="id">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <textarea :id="id" :value="modelValue" :rows="rows" :maxlength="maxLength"
      :required="required" :disabled="disabled" :placeholder="placeholder"
      @input="onInput"/>
    <span v-if="showCount" class="base-textarea-counter" aria-live="polite">
      {{ length }} / {{ maxLength }}
    </span>
  </div>
</template>

<style scoped>
.base-textarea-field{display:grid;gap:6px;min-width:0;position:relative}
.base-textarea-field label{color:var(--color-text);font-size:12px;line-height:17px;font-weight:500}
.base-textarea-field label span{color:var(--color-danger)}
.base-textarea-field textarea{
  display:block;min-width:0;width:100%;min-height:90px;resize:vertical;
  padding:10px 11px 22px;border:1px solid var(--color-stroke);
  border-radius:var(--radius-sm);background:var(--color-surface);
  color:var(--color-text);font:inherit;font-size:13px;line-height:19px;
  box-shadow:var(--shadow-control);
}
.base-textarea-field textarea:focus-visible{outline:2px solid var(--color-focus);outline-offset:1px}
.base-textarea-field textarea:disabled{opacity:.65;cursor:not-allowed}
.base-textarea-counter{justify-self:end;margin-top:-27px;margin-right:10px;z-index:1;pointer-events:none;
  color:var(--color-muted);font-size:11px;line-height:14px}
</style>
