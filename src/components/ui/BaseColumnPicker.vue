<script setup lang="ts">
import { Columns3 } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: Record<string, boolean>
  columns: { key: string; label: string }[]
  title?: string
}>(), { title: 'Колонки' })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, boolean>] }>()
function toggleColumn(key: string, checked: boolean) {
  emit('update:modelValue', { ...props.modelValue, [key]: checked })
}
</script>

<template>
  <details class="column-settings">
    <summary><Columns3 :size="16" aria-hidden="true" /> {{ title }}</summary>
    <div class="column-options" role="group" aria-label="Настройка отображаемых колонок">
      <strong>Показывать колонки</strong>
      <label v-for="column in columns" :key="column.key">
        <input type="checkbox" :checked="modelValue[column.key] !== false"
          @change="toggleColumn(column.key, ($event.target as HTMLInputElement).checked)" />
        {{ column.label }}
      </label>
    </div>
  </details>
</template>

<style scoped>
.column-settings{position:relative;min-width:0}
.column-settings summary{list-style:none;display:inline-flex;align-items:center;gap:8px;min-height:var(--control-height);padding:9px 14px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.column-settings summary::-webkit-details-marker{display:none}
.column-settings[open] summary{border-color:var(--color-primary)}
.column-settings summary:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.column-options{position:absolute;top:calc(100% + 6px);right:0;z-index:12;display:grid;gap:12px;width:min(245px,85vw);padding:16px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);box-shadow:var(--shadow-card);background:var(--color-surface)}
.column-options strong{font-size:13px}
.column-options label{display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer}
.column-options input{accent-color:var(--color-primary)}
</style>
