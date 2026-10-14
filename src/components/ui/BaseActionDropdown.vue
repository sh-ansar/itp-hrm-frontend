<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, MoreHorizontal } from 'lucide-vue-next'

interface ActionItem {
  id: string
  label: string
  disabled?: boolean
  description?: string
}
withDefaults(defineProps<{
  label: string
  options: ActionItem[]
  variant?: 'primary' | 'secondary' | 'icon'
  disabled?: boolean
}>(), { variant: 'secondary', disabled: false })
const emit = defineEmits<{ select: [id: string] }>()
const open = ref(false)
const host = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const menuPosition = ref({ left: '12px', top: '12px' })
const trigger = ref<HTMLButtonElement | null>(null)
const firstItem = ref<HTMLButtonElement | null>(null)
function position() {
  if (!trigger.value || !menu.value) return
  const anchor = trigger.value.getBoundingClientRect()
  const box = menu.value.getBoundingClientRect()
  const left = Math.max(12, Math.min(anchor.right - box.width, innerWidth - box.width - 12))
  const below = anchor.bottom + 5 + box.height <= innerHeight - 12
  const top = below ? anchor.bottom + 5 : Math.max(12, anchor.top - box.height - 5)
  menuPosition.value = { left: Math.round(left) + 'px', top: Math.round(top) + 'px' }
}
async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    position()
    firstItem.value?.focus()
  }
}
function choose(id: string) {
  open.value = false
  emit('select', id)
  trigger.value?.focus()
}
function pointer(event: PointerEvent) {
  if (!host.value?.contains(event.target as Node) && !menu.value?.contains(event.target as Node))
    open.value = false
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
    event.stopPropagation()
  }
}
function scroll(event: Event) {
  if (open.value && !menu.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', pointer)
  document.addEventListener('keydown', keydown)
  window.addEventListener('scroll', scroll, true)
  window.addEventListener('resize', position)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', pointer)
  document.removeEventListener('keydown', keydown)
  window.removeEventListener('scroll', scroll, true)
  window.removeEventListener('resize', position)
})
</script>

<template>
  <div ref="host" class="action-dropdown" :class="'action-dropdown--'+variant">
    <button ref="trigger" type="button" class="action-trigger"
      :disabled="disabled" :aria-label="label" :title="variant==='icon'?label:undefined"
      :aria-expanded="open" aria-haspopup="menu" @click="toggle">
      <MoreHorizontal v-if="variant==='icon'" :size="18" aria-hidden="true" />
      <template v-else>{{ label }}<ChevronDown :size="14" aria-hidden="true" /></template>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menu" class="action-menu" role="menu" :aria-label="label" :style="menuPosition">
        <button v-for="(option,index) in options" :key="option.id"
          :ref="el => { if(index===0) firstItem = el as HTMLButtonElement }"
          type="button" role="menuitem" class="action-menu-item"
          :disabled="option.disabled" @click="choose(option.id)">
          <span>{{ option.label }}</span>
          <small v-if="option.description">{{ option.description }}</small>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.action-dropdown{position:relative;flex:none;min-width:0}
.action-trigger{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:36px;padding:8px 11px;border:1px solid var(--color-stroke);
  border-radius:8px;background:var(--color-surface);color:var(--color-text);
  box-shadow:var(--shadow-control);font:inherit;font-size:12px;line-height:18px;font-weight:600;
  cursor:pointer;white-space:nowrap
}
.action-trigger:hover,.action-trigger[aria-expanded="true"]{border-color:var(--color-primary-stroke);background:var(--color-soft)}
.action-trigger:disabled{opacity:.55;cursor:not-allowed}
.action-dropdown--primary .action-trigger{background:var(--color-primary);border-color:var(--color-primary);color:var(--color-on-primary)}
.action-dropdown--primary .action-trigger:hover,.action-dropdown--primary .action-trigger[aria-expanded="true"]{background:var(--color-primary-hover);border-color:var(--color-primary-hover)}
.action-dropdown--icon .action-trigger{width:29px;min-height:29px;height:29px;padding:3px;border:0;box-shadow:none;color:var(--color-muted);background:transparent}
.action-menu{
  position:fixed;z-index:350;max-height:calc(100vh - 24px);overflow-y:auto;
  min-width:max(195px,100%);max-width:min(300px,calc(100vw - 24px));
  display:grid;gap:3px;padding:6px;border:1px solid var(--color-stroke-strong);
  border-radius:8px;background:var(--color-surface);box-shadow:var(--shadow-float);
}
.action-menu-item{
  display:grid;gap:2px;width:100%;min-height:34px;padding:7px 9px;border:0;border-radius:5px;
  background:transparent;color:var(--color-text);text-align:left;
  font:inherit;font-size:12px;line-height:18px;cursor:pointer
}
.action-menu-item:hover,.action-menu-item:focus-visible{background:var(--color-accent-soft)}
.action-menu-item:disabled{opacity:.48;cursor:not-allowed}
.action-menu-item small{font-size:10px;line-height:14px;color:var(--color-muted)}
@media(max-width:700px){.action-menu{max-width:calc(100vw - 38px)}}
</style>