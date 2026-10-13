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
.column-settings summary{
  list-style:none;display:inline-flex;align-items:center;gap:var(--space-1);height:40px;min-height:40px;
  padding:var(--space-2) var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  background:var(--color-surface-raised);color:var(--color-text);box-shadow:var(--shadow-control);
  font:inherit;font-size:var(--font-label-size);line-height:var(--line-caption);font-weight:600;cursor:pointer;white-space:nowrap
}
.column-settings summary::-webkit-details-marker{display:none}
.column-settings[open] summary{border-color:var(--color-stroke-strong)}
.column-settings summary:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.column-options{
  position:absolute;top:calc(100% + var(--space-1));right:0;z-index:40;display:grid;gap:var(--space-3);
  width:min(260px,85vw);padding:var(--space-4);border:1px solid var(--color-stroke);border-radius:var(--space-2);
  box-shadow:var(--shadow-float);background:var(--color-surface);color:var(--color-text)
}
.column-options strong{font-size:var(--font-caption-size);line-height:var(--line-caption);font-weight:600}
.column-options label{display:flex;align-items:center;gap:var(--space-2);font-size:var(--font-caption-size);line-height:var(--line-caption);cursor:pointer}
.column-options input{accent-color:var(--color-primary)}
</style>
