<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'
import { useUiFormatters } from '../../composables/useUiFormatters'
const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()

export interface BulkActionOption {
  id: string
  label: string
}
const props = withDefaults(defineProps<{
  count: number
  options: BulkActionOption[]
  subject?: string
}>(), { subject: 'строк' })
const emit = defineEmits<{
  execute: [action: string]
  clear: []
}>()
const action = ref('')
const canExecute = computed(() => props.count > 0 && props.options.some(option => option.id === action.value))
function execute() {
  if (!canExecute.value) return
  emit('execute', action.value)
  action.value = ''
}
watch(() => props.count, count => { if (!count) action.value = '' })
watch(() => props.options.map(option => option.id).join(','), () => {
  if (!props.options.some(option => option.id === action.value)) action.value = ''
})
</script>

<template>
  <form v-if="count > 0" class="table-bulk-actions"
    :aria-label="tr('Действия с выбранными строками')" @submit.prevent="execute">
    <span class="selected-count" role="status">{{ tr('Выбрано') }} {{ tr(subject) }}: <strong>{{ fmt.number(count, 0) }}</strong></span>
    <label class="action-picker">
      <span class="sr-only">{{ tr('Действие с выбранными') }}</span>
      <select v-model="action" :aria-label="tr('Действие с выбранными')">
        <option value="" disabled>{{ tr('Выберите действие') }}</option>
        <option v-for="option in options" :key="option.id" :value="option.id">{{ tr(option.label) }}</option>
      </select>
    </label>
    <button class="apply-action" type="submit" :disabled="!canExecute">{{ tr('Выполнить') }}</button>
    <button class="clear-action" type="button" @click="emit('clear')">{{ tr('Снять выделение') }}</button>
    <span class="scope-caption">{{ tr('Только выбранные строки текущей страницы') }}</span>
  </form>
</template>

<style scoped>
.table-bulk-actions{
  display:flex;align-items:center;gap:9px;flex-wrap:wrap;
  margin:0 0 10px;padding:9px 12px;border:1px solid var(--color-primary-stroke);
  background:var(--color-accent-soft);border-radius:var(--radius-md);
  color:var(--color-text);font-size:12px;line-height:18px;
}
.selected-count{font-size:12px;white-space:nowrap}
.selected-count strong{color:var(--color-primary);font-size:13px;font-weight:700}
.action-picker{flex:0 1 238px;min-width:145px}
.action-picker select{
  width:100%;min-height:35px;padding:6px 9px;
  color:var(--color-text);background:var(--color-surface);
  border:1px solid var(--color-stroke-strong);border-radius:var(--radius-sm);
  font-size:12px;
}
.apply-action,.clear-action{
  min-height:35px;padding:6px 11px;border-radius:var(--radius-sm);
  font-size:12px;font-weight:600;cursor:pointer;
}
.apply-action{
  color:var(--color-on-primary);background:var(--color-primary);
  border:1px solid var(--color-primary);
}
.apply-action:disabled{opacity:.5;cursor:not-allowed}
.clear-action{
  color:var(--color-text);background:var(--color-surface);
  border:1px solid var(--color-stroke-strong);
}
.scope-caption{margin-left:auto;color:var(--color-muted);font-size:11px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){
  .table-bulk-actions{gap:8px}
  .selected-count,.action-picker{flex-basis:100%}
  .scope-caption{margin:0;flex-basis:100%}
}
</style>
