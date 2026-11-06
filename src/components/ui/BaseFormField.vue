<script setup lang="ts">
import { computed, useId } from 'vue'
import { FormField, TextInput } from '@itpmining/vue-basic-components'

const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'date' | 'month' | 'number'
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
<FormField :label="label" :input-id="id" :required="required" :is-incorrect="!!error" :errors="error ? [{ $message:error }] : []" :error-id="errorId">
<TextInput :id="id" :type="type" :model-value="modelValue" :placeholder="placeholder" :required="required" :disabled="disabled" :autocomplete="autocomplete" :step="type === 'number' ? 'any' : undefined" :aria-invalid="!!error" :aria-describedby="errorId" @update:model-value="$emit('update:modelValue', String($event))" />
</FormField>
</template>
