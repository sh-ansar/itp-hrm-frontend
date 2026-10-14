<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  closeLabel?: string
}>(), {
  description: '',
  closeLabel: 'Закрыть',
})

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

function close() { emit('close') }
function handleKeydown(event: KeyboardEvent) {
  if (!props.open || event.key !== 'Escape') return
  event.preventDefault()
  close()
}
function applyBodyState(open: boolean) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hrm-drawer-open', open)
}
watch(() => props.open, open => {
  applyBodyState(open)
  if (open) void nextTick(() => panel.value?.focus())
})
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  applyBodyState(props.open)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  applyBodyState(false)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-overlay" @mousedown.self="close">
      <aside ref="panel" class="base-drawer" role="dialog" aria-modal="true"
        :aria-label="title" tabindex="-1">
        <header class="drawer-header">
          <div>
            <h2>{{ title }}</h2>
            <p v-if="description">{{ description }}</p>
          </div>
          <button type="button" class="drawer-close" :aria-label="closeLabel" @click="close">
            <img src="/prototype-icons/Close.svg" alt="" aria-hidden="true" />
          </button>
        </header>
        <div class="drawer-content"><slot /></div>
        <footer v-if="$slots.footer" class="drawer-footer"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-overlay{
  position:fixed;inset:0;z-index:260;display:flex;justify-content:flex-end;
  background:var(--color-overlay);
}
.base-drawer{
  width:min(460px,100vw);height:100dvh;min-height:0;display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;outline:0;
  background:var(--color-surface);color:var(--color-text);
  border-left:1px solid var(--color-stroke);box-shadow:var(--shadow-float);
}
.drawer-header{
  min-height:72px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:18px 20px;border-bottom:1px solid var(--color-stroke);
}
.drawer-header>div{display:grid;gap:4px;min-width:0}
.drawer-header h2{margin:0;font-size:18px;line-height:24px;font-weight:700}
.drawer-header p{margin:0;color:var(--color-muted);font-size:12px;line-height:17px}
.drawer-close{
  display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;
  border:0;border-radius:7px;background:transparent;color:var(--color-muted);
}
.drawer-close:hover{background:var(--color-soft)}
.drawer-close img{width:17px;height:17px}
.drawer-content{min-height:0;overflow:auto;padding:20px}
.drawer-footer{
  display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;
  padding:14px 20px;border-top:1px solid var(--color-stroke);background:var(--color-surface);
}
:global(body.hrm-drawer-open){overflow:hidden}
@media(max-width:560px){
  .base-drawer{width:100vw}
  .drawer-header{padding:15px 16px}
  .drawer-content{padding:16px}
  .drawer-footer{padding:12px 16px}
  .drawer-footer :deep(.base-button){flex:1}
}
</style>
