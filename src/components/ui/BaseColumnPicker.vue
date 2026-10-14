<script setup lang="ts">
import { ref } from 'vue'
import { Columns3 } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'
import BaseDialog from './BaseDialog.vue'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'
const { tr } = useWorkspaceI18n()
const props = withDefaults(defineProps<{ modelValue: Record<string, boolean>; columns: { key: string; label: string }[]; title?: string }>(), { title: 'Колонки' })
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, boolean>] }>()
const open = ref(false)
const draft = ref<Record<string, boolean>>({})
function begin() { draft.value = Object.fromEntries(props.columns.map(column => [column.key, props.modelValue[column.key] !== false])); open.value = true }
function apply() { emit('update:modelValue', { ...props.modelValue, ...draft.value }); open.value = false }
</script>
<template>
  <div class="column-settings">
    <BaseButton variant="secondary" :aria-expanded="open" @click="begin"><Columns3 :size="16" aria-hidden="true" /> {{ tr(title) }}</BaseButton>
    <BaseDialog :open="open" :title="tr('Настройка колонок')" @close="open = false">
      <form class="column-picker-form" @submit.prevent="apply">
        <p>{{ tr('Выберите данные, которые будут отображаться в таблице.') }}</p>
        <div class="column-options" role="group" aria-label="Настройка отображаемых колонок">
          <label v-for="column in columns" :key="column.key">
            <span>{{ tr(column.label) }}</span>
            <input v-model="draft[column.key]" type="checkbox" />
          </label>
        </div>
        <div class="column-actions">
          <BaseButton type="submit">{{ tr('Применить') }}</BaseButton>
          <BaseButton variant="secondary" @click="open = false">{{ tr('Отмена') }}</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </div>
</template>
<style scoped>
.column-settings{min-width:0}
.column-picker-form{display:flex;flex-direction:column;gap:20px;min-height:calc(100dvh - 150px)}
.column-picker-form p{margin:0;color:var(--color-muted);font-size:var(--font-body-size);line-height:1.5}
.column-options{display:grid;gap:0}
.column-options label{display:flex;justify-content:space-between;align-items:center;gap:20px;min-height:48px;border-bottom:1px solid var(--color-stroke);font-size:var(--font-body-size);cursor:pointer}
.column-options input{appearance:none;position:relative;width:36px;height:20px;border:1px solid var(--color-stroke);border-radius:20px;background:var(--color-soft);flex:0 0 36px;cursor:pointer}
.column-options input::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--color-muted);transition:transform .15s}
.column-options input:checked{background:var(--color-primary);border-color:var(--color-primary)}
.column-options input:checked::after{background:var(--color-surface);transform:translateX(16px)}
.column-options input:focus-visible{outline:2px solid var(--color-focus);outline-offset:3px}
.column-actions{position:sticky;bottom:-24px;display:flex;gap:10px;flex-wrap:wrap;margin-top:auto;padding:16px 0;background:var(--color-surface);border-top:1px solid var(--color-stroke)}
@media(prefers-reduced-motion:reduce){.column-options input::after{transition:none}}
</style>
