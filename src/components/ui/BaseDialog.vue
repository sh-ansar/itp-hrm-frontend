<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLDialogElement | null>(null)
const titleId = useId()
let returnFocus: HTMLElement | null = null

watch(() => props.open, async open => {
  await nextTick()
  const node = panel.value
  if (!node) return
  if (open && !node.open) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    node.showModal()
  } else if (!open && node.open) {
    node.close()
    returnFocus?.focus()
    returnFocus = null
  }
}, { immediate: true })

function close() { emit('close') }
function onBackdrop(event: MouseEvent) {
  if (event.target === panel.value) close()
}
onUnmounted(() => { if (panel.value?.open) panel.value.close() })
</script>

<template>
  <dialog ref="panel" class="base-drawer" :aria-labelledby="titleId"
    @cancel="close" @close="close" @click="onBackdrop">
    <div class="drawer-sheet">
      <header class="drawer-header">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" class="drawer-close" aria-label="Закрыть диалог" @click="close">
          <X :size="20" />
        </button>
      </header>
      <div class="drawer-content"><slot /></div>
    </div>
  </dialog>
</template>

<style scoped>
.base-drawer{
  position:fixed;inset:0 0 0 auto;margin:0 0 0 auto;
  width:min(620px,100vw);max-width:100vw;
  height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;
  overflow-y:auto;overflow-x:hidden;padding:0;
  border:0;border-left:1px solid var(--color-stroke);
  border-radius:18px 0 0 18px;background:transparent;color:var(--color-text);
  box-shadow:-18px 0 60px rgba(9,48,68,.15);
}
.base-drawer[open]{animation:drawer-enter .23s ease-out both}
.base-drawer::backdrop{background:rgba(7,30,45,.45);animation:backdrop-enter .2s ease-out}
.drawer-sheet{min-height:100%;width:100%;display:flex;flex-direction:column;background:var(--color-surface)}
.drawer-header{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:74px;padding:17px 28px;background:var(--color-surface);border-bottom:1px solid var(--color-stroke)}
.drawer-header h2{font-size:20px;letter-spacing:-.02em;margin:0;line-height:1.3}
.drawer-close{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border:1px solid var(--color-stroke);border-radius:10px;background:var(--color-soft);color:var(--color-muted)}
.drawer-close:hover{color:var(--color-text);background:var(--color-accent-soft)}
.drawer-content{flex:1;min-height:0;min-width:0;padding:24px 28px 34px}
@keyframes drawer-enter{from{opacity:.9;transform:translateX(38px)}to{opacity:1;transform:translateX(0)}}
@keyframes backdrop-enter{from{opacity:0}to{opacity:1}}
@media(max-width:600px){.base-drawer{width:100vw;border-radius:0}.drawer-header{padding:14px 18px;min-height:64px}.drawer-content{padding:20px 18px 28px}}
@media(prefers-reduced-motion:reduce){.base-drawer[open],.base-drawer::backdrop{animation:none}}
</style>
