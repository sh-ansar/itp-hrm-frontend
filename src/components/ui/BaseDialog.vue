<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(() => props.open, async (open) => {
  await nextTick()
  const node = dialog.value
  if (!node) return
  if (open && !node.open) node.showModal()
  if (!open && node.open) node.close()
}, { immediate: true })
</script>

<template>
  <dialog ref="dialog" :aria-labelledby="titleId" @close="emit('close')" @cancel="emit('close')">
    <div class="dialog-body">
      <header><h2 :id="titleId">{{ title }}</h2><button type="button" aria-label="Закрыть диалог" @click="emit('close')">×</button></header>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
dialog{width:min(94vw,520px);max-height:90vh;overflow:auto;border:1px solid var(--color-stroke);border-radius:16px;padding:0;background:var(--color-surface);color:var(--color-text);box-shadow:0 20px 70px #13354b38}
dialog::backdrop{background:#0b253a99}
.dialog-body{padding:22px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
h2{font-size:21px;line-height:1.3;margin:0}
button{border:1px solid var(--color-stroke);border-radius:9px;min-width:40px;min-height:40px;background:transparent;color:inherit;font-size:25px;cursor:pointer}
button:focus-visible{outline:3px solid #82b8f5;outline-offset:2px}
</style>
