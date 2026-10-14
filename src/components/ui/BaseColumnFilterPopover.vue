<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type FilterOption = { value: string; label: string; count: number }
const props = defineProps<{
  label: string
  anchor: HTMLElement | null
  options: FilterOption[]
  query: string
  selected: string[]
  allChecked: boolean
  applied: boolean
}>()
const emit = defineEmits<{
  'update:query': [value: string]
  toggle: [value: string, checked: boolean]
  toggleAll: [checked: boolean]
  apply: []
  reset: []
  close: []
}>()
const panel = ref<HTMLElement | null>(null)
const queryField = ref<HTMLInputElement | null>(null)
const panelPosition = ref({ left: '12px', top: '12px', maxHeight: 'calc(100vh - 24px)' })
function position() {
  const trigger = props.anchor
  const target = panel.value
  if (!trigger || !target) return
  const triggerBox = trigger.getBoundingClientRect()
  const width = Math.min(360, window.innerWidth - 24)
  const left = Math.max(12, Math.min(triggerBox.left - 14, window.innerWidth - width - 12))
  const height = Math.min(target.scrollHeight, window.innerHeight - 24)
  const canOpenBelow = triggerBox.bottom + 5 + height <= window.innerHeight - 12
  const above = Math.max(12, triggerBox.top - height - 5)
  const top = canOpenBelow ? triggerBox.bottom + 5 : above
  panelPosition.value = {
    left: Math.round(left) + 'px',
    top: Math.round(top) + 'px',
    maxHeight: 'calc(100vh - 24px)',
  }
}
function keyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  emit('close')
  props.anchor?.focus()
}
function outside(event: PointerEvent) {
  const element = event.target as Node
  if (panel.value?.contains(element)) return
  if (props.anchor?.contains(element)) return
  if ((event.target as HTMLElement)?.closest('[data-column-filter-trigger]')) return
  emit('close')
}
function scrollOrResize(event: Event) {
  // Table scroll changes the header's coordinates. Close instead of displaying
  // a detached floating menu; scrolling inside the list must continue to work.
  if (event.type === 'scroll' && panel.value?.contains(event.target as Node)) return
  if (event.type === 'scroll') { emit('close'); return }
  position()
}
onMounted(async () => {
  await nextTick()
  position()
  queryField.value?.focus()
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('keydown', keyDown, true)
  window.addEventListener('resize', scrollOrResize)
  window.addEventListener('scroll', scrollOrResize, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('keydown', keyDown, true)
  window.removeEventListener('resize', scrollOrResize)
  window.removeEventListener('scroll', scrollOrResize, true)
})
watch(() => [props.options.length, props.query], async () => {
  await nextTick()
  position()
})
</script>

<template>
  <Teleport to="body">
    <section ref="panel" class="hrm-column-filter-popover" role="group"
      :aria-label="'Фильтр столбца: ' + label" :style="panelPosition">
      <label class="filter-search">
        <img src="/prototype-icons/Search.svg" alt="" aria-hidden="true" />
        <input ref="queryField" :value="query" type="search"
          :aria-label="'Значение фильтра: ' + label"
          placeholder="Поиск" autocomplete="off"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="emit('apply')" />
        <button type="button" :aria-label="query ? 'Очистить поиск' : 'Закрыть фильтр'"
          @click="query ? emit('update:query', '') : emit('close')">×</button>
      </label>
      <div class="filter-divider" aria-hidden="true"></div>
      <div class="filter-choice-list" role="group" :aria-label="'Значения столбца: ' + label">
        <label class="filter-choice filter-choice--all">
          <input type="checkbox" :checked="allChecked" :aria-label="'Выбрать все значения: ' + label"
            @change="emit('toggleAll', ($event.target as HTMLInputElement).checked)" />
          <span>Все</span>
        </label>
        <label v-for="option in options" :key="option.value" class="filter-choice">
          <input type="checkbox" :checked="selected.includes(option.value)"
            :aria-label="'Значение: ' + option.label"
            @change="emit('toggle', option.value, ($event.target as HTMLInputElement).checked)" />
          <span class="option-label">{{ option.label }}</span>
          <small>{{ option.count }}</small>
        </label>
        <p v-if="!options.length" class="filter-empty">Значений не найдено</p>
      </div>
      <div class="filter-footer">
        <button class="filter-apply" type="button" @click="emit('apply')">Применить</button>
        <button class="filter-reset" type="button" @click="emit('reset')">{{ applied ? 'Сбросить фильтр' : 'Очистить выбор' }}</button>
      </div>
      <p class="filter-scope">Значения загруженной страницы</p>
    </section>
  </Teleport>
</template>

<style scoped>
.hrm-column-filter-popover{
  position:fixed;z-index:350;display:flex;flex-direction:column;gap:8px;
  width:min(360px,calc(100vw - 24px));max-width:calc(100vw - 24px);
  overflow:hidden;padding:9px;border:1px solid var(--color-stroke-strong);
  border-radius:9px;background:var(--color-surface);
  box-shadow:0 14px 32px rgba(9,48,68,.16),0 2px 7px rgba(9,48,68,.05);
  color:var(--color-text);
}
.filter-search{display:flex;align-items:center;gap:9px;flex:0 0 40px;min-width:0;padding:0 10px;border:1px solid var(--color-stroke);border-radius:7px;background:var(--color-surface);box-shadow:var(--shadow-control)}
.filter-search img{width:17px;height:17px;flex:none}
.filter-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-text);font-size:12px;line-height:17px}
.filter-search input::placeholder{color:var(--color-muted)}
.filter-search button{display:grid;place-items:center;width:24px;height:24px;flex:none;padding:0;border:0;background:transparent;color:var(--color-muted);font-size:19px}
.filter-divider{height:1px;flex:none;background:var(--color-stroke)}
.filter-choice-list{display:grid;align-content:start;gap:1px;min-height:38px;max-height:min(435px,calc(100vh - 196px));overflow-x:hidden;overflow-y:auto;padding:2px 4px;scrollbar-width:thin;scrollbar-color:var(--color-muted) transparent}
.filter-choice{display:flex;align-items:start;gap:9px;padding:6px 5px;min-height:37px;font-size:12px;line-height:19px;color:var(--color-text);border-radius:5px;cursor:pointer}
.filter-choice:hover{background:var(--color-hover)}
.filter-choice input{width:18px;height:18px;margin:0;flex:0 0 18px;accent-color:var(--color-primary);cursor:pointer}
.filter-choice--all{font-weight:600}
.option-label{min-width:0;overflow-wrap:anywhere}
.filter-choice small{margin-left:auto;color:var(--color-muted);font-size:11px}
.filter-footer{display:flex;gap:7px;flex-wrap:wrap}
.filter-apply,.filter-reset{min-height:32px;padding:6px 10px;border-radius:7px;font-size:12px;font-weight:600}
.filter-apply{border:1px solid var(--color-primary);background:var(--color-primary);color:var(--color-on-primary)}
.filter-reset{border:1px solid var(--color-stroke-strong);background:var(--color-surface);color:var(--color-text)}
.filter-scope{margin:0;color:var(--color-muted);font-size:10px;line-height:15px}
.filter-empty{padding:10px;color:var(--color-muted);font-size:12px}
:global(:root[data-theme="dark"]) .filter-search img{filter:brightness(0) invert(.8)}
@media(max-width:600px){.hrm-column-filter-popover{gap:7px;padding:8px}.filter-choice-list{max-height:min(400px,calc(100vh - 183px))}}
</style>
