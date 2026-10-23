<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Scan } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'

const ui = useUiPreferencesStore()
const copy = computed(() => ({
  ru: { region:'Схема подразделений компании', out:'Уменьшить схему', in:'Увеличить схему', reset:'Сбросить масштаб', fit:'Вместить схему', expand:'Развернуть схему', collapse:'Свернуть схему', hint:'Перетаскивайте схему. Колесо — масштаб, стрелки — перемещение, Escape — выход.' },
  kk: { region:'Компания бөлімдерінің сызбасы', out:'Сызбаны кішірейту', in:'Сызбаны үлкейту', reset:'Масштабты қалпына келтіру', fit:'Сызбаны сыйғызу', expand:'Сызбаны толық ашу', collapse:'Сызбаны кішірейту', hint:'Сызбаны сүйреңіз. Дөңгелек — масштаб, көрсеткілер — жылжыту, Escape — шығу.' },
  en: { region:'Company department chart', out:'Zoom out', in:'Zoom in', reset:'Reset zoom', fit:'Fit chart', expand:'Expand chart', collapse:'Collapse chart', hint:'Drag to pan. Wheel to zoom, arrow keys to move, Escape to exit.' },
  ka: { region:'კომპანიის განყოფილებების სქემა', out:'სქემის შემცირება', in:'სქემის გადიდება', reset:'მასშტაბის აღდგენა', fit:'სქემის მორგება', expand:'სქემის გაშლა', collapse:'სქემის შეკეცვა', hint:'გადაათრიეთ სქემა. ბორბალი — მასშტაბი, ისრები — გადაადგილება, Escape — გამოსვლა.' },
}[ui.locale]))
const viewport = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const expandButton = ref<InstanceType<typeof BaseButton> | null>(null)
const scale = ref(1)
const x = ref(24)
const y = ref(24)
const expanded = ref(false)
const dragging = ref(false)
const percent = computed(() => Math.round(scale.value * 100))
const transform = computed(() => ({ transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})` }))
let interacted = false
let observer: ResizeObserver | undefined
let previousOverflow = ''
let suppressClick = false
const points = new Map<number, { x:number; y:number }>()
const interactive = (target:EventTarget | null) => target instanceof Element && Boolean(target.closest('a,button,input,select,textarea,[role="button"]'))

function zoom(next:number, anchorX?:number, anchorY?:number) {
  const box = viewport.value
  if (!box) return
  const ax = anchorX ?? box.clientWidth / 2
  const ay = anchorY ?? box.clientHeight / 2
  const clamped = Math.min(2, Math.max(.25, next))
  const ratio = clamped / scale.value
  x.value = ax - (ax - x.value) * ratio
  y.value = ay - (ay - y.value) * ratio
  scale.value = clamped
  interacted = true
}
function reset() { interacted = true; scale.value = 1; x.value = 24; y.value = 24 }
function fit() {
  if (!viewport.value || !content.value) return
  // Expanded branches can overflow to the left of their layout box. Measure
  // the complete visible tree rather than scrollWidth, which omits that area.
  const origin = content.value.getBoundingClientRect()
  const boxes = [origin, ...Array.from(content.value.querySelectorAll('*'), el => el.getBoundingClientRect())]
    .filter(rect => rect.width > 0 && rect.height > 0)
  const left = (Math.min(...boxes.map(rect => rect.left)) - origin.left) / scale.value
  const top = (Math.min(...boxes.map(rect => rect.top)) - origin.top) / scale.value
  const w = (Math.max(...boxes.map(rect => rect.right)) - origin.left) / scale.value - left
  const h = (Math.max(...boxes.map(rect => rect.bottom)) - origin.top) / scale.value - top
  if (!w || !h) return
  scale.value = Math.min(1, Math.max(.25, Math.min((viewport.value.clientWidth - 48) / w, (viewport.value.clientHeight - 48) / h)))
  x.value = (viewport.value.clientWidth - w * scale.value) / 2 - left * scale.value
  y.value = (viewport.value.clientHeight - h * scale.value) / 2 - top * scale.value
}
function fitRequested() { interacted = true; fit() }
function wheel(event:WheelEvent) {
  if (interactive(event.target)) return
  event.preventDefault()
  const bounds = viewport.value!.getBoundingClientRect()
  zoom(scale.value * Math.exp(-event.deltaY * .0015), event.clientX - bounds.left, event.clientY - bounds.top)
}
function down(event:PointerEvent) {
  suppressClick = false
  if (interactive(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return
  interacted = true
  points.set(event.pointerId, { x:event.clientX, y:event.clientY })
  viewport.value?.setPointerCapture(event.pointerId)
}
function move(event:PointerEvent) {
  const old = points.get(event.pointerId)
  if (!old) return
  const other = [...points.entries()].find(([id]) => id !== event.pointerId)?.[1]
  if (other && viewport.value) {
    const before = Math.hypot(old.x - other.x, old.y - other.y)
    const after = Math.hypot(event.clientX - other.x, event.clientY - other.y)
    const bounds = viewport.value.getBoundingClientRect()
    const oldCx = (old.x + other.x) / 2
    const oldCy = (old.y + other.y) / 2
    if (before > 0) zoom(scale.value * after / before, oldCx - bounds.left, oldCy - bounds.top)
    x.value += (event.clientX - old.x) / 2
    y.value += (event.clientY - old.y) / 2
  } else {
    x.value += event.clientX - old.x
    y.value += event.clientY - old.y
  }
  if (Math.hypot(event.clientX - old.x, event.clientY - old.y) > 1) {
    dragging.value = true
    suppressClick = true
  }
  points.set(event.pointerId, { x:event.clientX, y:event.clientY })
}
function up(event:PointerEvent) {
  points.delete(event.pointerId)
  if (viewport.value?.hasPointerCapture(event.pointerId)) viewport.value.releasePointerCapture(event.pointerId)
  if (!points.size) dragging.value = false
}
function click(event:MouseEvent) {
  if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false }
}
function key(event:KeyboardEvent) {
  if (interactive(event.target)) return
  const delta:Record<string, [number,number]> = { ArrowLeft:[40,0], ArrowRight:[-40,0], ArrowUp:[0,40], ArrowDown:[0,-40] }
  const moveBy = delta[event.key]
  if (moveBy) { event.preventDefault(); interacted = true; x.value += moveBy[0]; y.value += moveBy[1] }
  else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(scale.value + .1) }
  else if (event.key === '-') { event.preventDefault(); zoom(scale.value - .1) }
  else if (event.key === '0') { event.preventDefault(); reset() }
}
async function toggleExpanded() {
  expanded.value = !expanded.value
  interacted = true
  if (expanded.value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
  else document.body.style.overflow = previousOverflow
  await nextTick()
  if (expanded.value) viewport.value?.focus()
  else (expandButton.value?.$el as HTMLButtonElement | undefined)?.focus()
}
function escape(event:KeyboardEvent) {
  if (event.key === 'Escape' && expanded.value) { event.preventDefault(); void toggleExpanded() }
}
onMounted(() => {
  observer = new ResizeObserver(() => { if (!interacted) fit() })
  if (content.value) observer.observe(content.value)
  if (viewport.value) observer.observe(viewport.value)
  document.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', escape)
  if (expanded.value) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body" :disabled="!expanded">
    <div class="org-chart-workspace" :class="{ 'org-chart-workspace--expanded':expanded }" :aria-label="copy.region">
      <div class="org-chart-toolbar">
        <BaseButton icon-only variant="secondary" :aria-label="copy.out" :title="copy.out" :disabled="scale <= .25" @click="zoom(scale - .1)"><Minus /></BaseButton>
        <output class="org-chart-percent" aria-live="polite">{{ percent }}%</output>
        <BaseButton icon-only variant="secondary" :aria-label="copy.in" :title="copy.in" :disabled="scale >= 2" @click="zoom(scale + .1)"><Plus /></BaseButton>
        <BaseButton icon-only variant="secondary" :aria-label="copy.reset" :title="copy.reset" @click="reset"><RotateCcw /></BaseButton>
        <BaseButton icon-only variant="secondary" :aria-label="copy.fit" :title="copy.fit" @click="fitRequested"><Scan /></BaseButton>
        <BaseButton ref="expandButton" icon-only variant="secondary" :aria-label="expanded ? copy.collapse : copy.expand"
          :title="expanded ? copy.collapse : copy.expand" :aria-expanded="expanded" @click="toggleExpanded">
          <Minimize2 v-if="expanded" /><Maximize2 v-else />
        </BaseButton>
      </div>
      <div ref="viewport" class="org-chart-viewport structure-diagram" :class="{ 'is-dragging':dragging }"
        role="region" tabindex="0" :aria-label="copy.region"
        @wheel="wheel" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up"
        @lostpointercapture="up" @click.capture="click" @keydown="key">
        <div ref="content" class="org-chart-content" :style="transform"><slot /></div>
      </div>
      <p class="org-chart-hint">{{ copy.hint }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.org-chart-workspace{display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px;min-width:0}
.org-chart-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}
.org-chart-percent{min-width:44px;text-align:center;font-size:12px;color:var(--color-text)}
.org-chart-viewport{position:relative;width:100%;height:520px;min-height:320px;overflow:hidden;touch-action:none;user-select:none;cursor:grab;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-page);overscroll-behavior:contain}
.org-chart-viewport.is-dragging{cursor:grabbing}
.org-chart-viewport:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.org-chart-content{position:absolute;inset:0 auto auto 0;width:max-content;min-width:0;transform-origin:0 0}
.org-chart-content :deep(.organization-chart){width:1320px;min-width:1320px}
.org-chart-content :deep(a),.org-chart-content :deep(button){cursor:pointer}
.org-chart-hint{margin:0;color:var(--color-muted);font-size:11px;line-height:1.5}
.org-chart-workspace--expanded{position:fixed;inset:0;z-index:900;padding:16px;background:var(--color-page)}
.org-chart-workspace--expanded .org-chart-viewport{height:100%;min-height:0}
@media(max-width:650px){.org-chart-viewport{height:440px}.org-chart-workspace--expanded{padding:10px}}
</style>
