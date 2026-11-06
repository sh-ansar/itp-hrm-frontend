<script setup lang="ts">
import { UnifiedSelect } from '@itpmining/vue-basic-components'
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

</script>
<template><UnifiedSelect class="base-select-field" :model-value="modelValue" :options="options.map(option=>({...option,name:optionLabel(option)}))" :label="tr(label)" :hide-label="hideLabel" :disabled="disabled" :required="required" :placeholder="tr(placeholder)" :searchable="false" :clearable="false" @update:model-value="$emit('update:modelValue',String($event??''))"/></template>
