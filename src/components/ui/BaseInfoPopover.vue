<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { Info, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  label?: string
  title?: string
}>(), {
  label: 'Показать информацию',
  title: '',
})

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

async function show() {
  open.value = true
  await nextTick()
}
function close() {
  open.value = false
  trigger.value?.focus()
}
function toggle() {
  if (open.value) close()
  else show()
}
function onPointer(event: PointerEvent) {
  if (!open.value || root.value?.contains(event.target as Node)) return
  open.value = false
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) close()
}

document.addEventListener('pointerdown', onPointer, true)
document.addEventListener('keydown', onKey, true)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer, true)
  document.removeEventListener('keydown', onKey, true)
})
</script>

<template>
  <span ref="root" class="info-popover">
    <button ref="trigger" type="button" class="info-popover__trigger"
      :aria-label="label" :aria-expanded="open" @click="toggle">
      <Info :size="16" aria-hidden="true" />
    </button>
    <span v-if="open" class="info-popover__panel" role="dialog" :aria-label="title || label">
      <span class="info-popover__head">
        <strong v-if="title">{{ title }}</strong>
        <button type="button" class="info-popover__close" aria-label="Закрыть информацию" @click="close">
          <X :size="16" aria-hidden="true" />
        </button>
      </span>
      <span class="info-popover__body"><slot /></span>
    </span>
  </span>
</template>

<style scoped>
.info-popover{position:relative;display:inline-flex;align-items:center}
.info-popover__trigger,.info-popover__close{
  display:grid;place-items:center;padding:0;border:0;background:transparent;color:var(--color-muted);cursor:pointer
}
.info-popover__trigger{width:28px;height:28px;border-radius:50%}
.info-popover__trigger:hover,.info-popover__trigger[aria-expanded="true"]{background:var(--color-hover);color:var(--color-primary)}
.info-popover__trigger:focus-visible,.info-popover__close:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.info-popover__panel{
  position:absolute;z-index:180;top:calc(100% + 6px);right:0;width:min(320px,calc(100vw - 24px));
  display:grid;gap:var(--space-2);padding:var(--space-3);
  border:1px solid var(--color-stroke);border-radius:var(--radius-sm);
  background:var(--color-surface);box-shadow:var(--shadow-float);color:var(--color-text)
}
.info-popover__head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2)}
.info-popover__head strong{font-size:12px;line-height:17px;font-weight:600}
.info-popover__close{width:24px;height:24px;flex:none;border-radius:var(--radius-sm)}
.info-popover__body{display:block;color:var(--color-muted);font-size:12px;line-height:17px}
@media(max-width:600px){.info-popover__panel{position:fixed;top:auto;right:12px;bottom:12px;left:12px;width:auto}}
</style>
