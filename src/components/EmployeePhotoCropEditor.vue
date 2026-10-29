<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'

const props = defineProps<{ file: File; saving: boolean; error?: string }>()
const emit = defineEmits<{ save: [file: File]; cancel: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const localError = ref('')
const converting = ref(false)
const SIZE = { width: 600, height: 750 }
let image: HTMLImageElement | null = null
let fileUrl = ''
let pointer: { id: number; x: number; y: number } | null = null

const busy = computed(() => props.saving || converting.value)
function limits() {
  if (!image) return { x: 0, y: 0, scale: 1 }
  const scale = Math.max(SIZE.width / image.naturalWidth, SIZE.height / image.naturalHeight) * zoom.value
  return {
    x: Math.max(0, (image.naturalWidth * scale - SIZE.width) / 2),
    y: Math.max(0, (image.naturalHeight * scale - SIZE.height) / 2),
    scale,
  }
}
function render() {
  const node = canvas.value
  const ctx = node?.getContext('2d')
  if (!node || !ctx || !image || !ready.value) return
  const bound = limits()
  offset.value.x = Math.max(-bound.x, Math.min(bound.x, offset.value.x))
  offset.value.y = Math.max(-bound.y, Math.min(bound.y, offset.value.y))
  const width = image.naturalWidth * bound.scale
  const height = image.naturalHeight * bound.scale
  ctx.fillStyle = '#f2f4f7'
  ctx.fillRect(0, 0, SIZE.width, SIZE.height)
  ctx.drawImage(image, (SIZE.width - width) / 2 + offset.value.x,
    (SIZE.height - height) / 2 + offset.value.y, width, height)
}
function reset() { zoom.value = 1; offset.value = { x: 0, y: 0 }; render() }
function changeZoom(value: number) {
  zoom.value = Math.max(1, Math.min(3, Math.round(value * 100) / 100))
  render()
}
function start(event: PointerEvent) {
  if (!ready.value || busy.value) return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function drag(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId || !canvas.value || busy.value) return
  const factor = SIZE.width / canvas.value.getBoundingClientRect().width
  offset.value = {
    x: offset.value.x + (event.clientX - pointer.x) * factor,
    y: offset.value.y + (event.clientY - pointer.y) * factor,
  }
  pointer.x = event.clientX
  pointer.y = event.clientY
  render()
}
function finish(event: PointerEvent) {
  if (pointer?.id === event.pointerId) pointer = null
}
function wheel(event: WheelEvent) {
  if (busy.value) return
  changeZoom(zoom.value + (event.deltaY < 0 ? 0.1 : -0.1))
}
function close() {
  if (busy.value) return
  emit('cancel')
}
function backdrop(event: MouseEvent) { if (event.target === dialog.value) close() }
async function save() {
  if (!canvas.value || !ready.value || busy.value) return
  converting.value = true
  localError.value = ''
  try {
    // Pixel crop is exactly what is shown in the editor. Do not upload the
    // uncropped original or any thumbnail that differs from this preview.
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.value!.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob || blob.size < 1 || blob.size > 5 * 1024 * 1024)
      throw new Error('Не удалось подготовить фотографию JPG до 5 МБ')
    emit('save', new File([blob], 'employee-photo.jpg', { type: 'image/jpeg' }))
  } catch (cause) {
    localError.value = cause instanceof Error ? cause.message : 'Ошибка кадрирования'
  } finally { converting.value = false }
}
onMounted(async () => {
  await nextTick()
  dialog.value?.showModal()
  try {
    fileUrl = URL.createObjectURL(props.file)
    const next = new Image()
    next.src = fileUrl
    await next.decode()
    if (!next.naturalWidth || !next.naturalHeight) throw new Error('Изображение повреждено')
    image = next
    ready.value = true
    render()
  } catch (cause) {
    localError.value = cause instanceof Error ? cause.message : 'Не удалось открыть фото'
  }
})
watch(zoom, render)
onUnmounted(() => {
  if (dialog.value?.open) dialog.value.close()
  if (fileUrl) URL.revokeObjectURL(fileUrl)
})
</script>

<template>
  <dialog ref="dialog" class="photo-crop-dialog" aria-label="Выбрать область фотографии"
    @cancel.prevent="close" @click="backdrop">
    <div class="photo-crop-sheet">
      <div class="photo-crop-heading">
        <div>
          <h2>Как будет выглядеть фото</h2>
          <p>Перетащите изображение и выберите масштаб. Сохраним именно этот кадр.</p>
        </div>
        <button type="button" class="photo-crop-close" :disabled="busy"
          aria-label="Отменить изменение фотографии" @click="close">×</button>
      </div>
      <div class="photo-crop-content">
        <div class="photo-crop-preview">
          <canvas ref="canvas" :width="SIZE.width" :height="SIZE.height" tabindex="0"
            role="img" aria-label="Область кадрирования фотографии, пропорции четыре к пяти"
            :class="{ 'photo-crop-preview--busy': busy }"
            @pointerdown="start" @pointermove="drag" @pointerup="finish"
            @pointercancel="finish" @wheel.prevent="wheel"
            @keydown.left.prevent="offset.x -= 15; render()"
            @keydown.right.prevent="offset.x += 15; render()"
            @keydown.up.prevent="offset.y -= 15; render()"
            @keydown.down.prevent="offset.y += 15; render()" />
          <span v-if="!ready" class="photo-crop-loading">Загрузка фотографии…</span>
        </div>
        <div class="photo-crop-controls">
          <label for="photo-crop-scale">Масштаб <strong>{{ Math.round(zoom * 100) }}%</strong></label>
          <div class="photo-crop-zoom">
            <button type="button" :disabled="busy || zoom <= 1" aria-label="Уменьшить масштаб"
              @click="changeZoom(zoom - 0.1)"><ZoomOut :size="18" /></button>
            <input id="photo-crop-scale" v-model.number="zoom" type="range" min="1" max="3"
              step="0.05" :disabled="busy || !ready" aria-label="Масштаб фотографии" />
            <button type="button" :disabled="busy || zoom >= 3" aria-label="Увеличить масштаб"
              @click="changeZoom(zoom + 0.1)"><ZoomIn :size="18" /></button>
            <button type="button" :disabled="busy" aria-label="Сбросить кадрирование"
              title="Сбросить кадрирование" @click="reset"><RotateCcw :size="18" /></button>
          </div>
          <p>Кадр 4:5. Можно двигать мышью, пальцем или стрелками клавиатуры.</p>
        </div>
      </div>
      <BaseNotice v-if="localError || error" tone="error">{{ localError || error }}</BaseNotice>
      <div class="photo-crop-actions">
        <BaseButton variant="secondary" :disabled="busy" @click="close">Отмена</BaseButton>
        <BaseButton :disabled="!ready || busy" @click="save">
          {{ busy ? 'Сохранение…' : 'Сохранить фотографию' }}
        </BaseButton>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.photo-crop-dialog{
  position:fixed;inset:0;margin:auto;width:min(560px,calc(100vw - 24px));
  max-width:calc(100vw - 24px);max-height:min(94dvh,900px);padding:0;
  border:1px solid var(--color-stroke);border-radius:14px;
  background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-float);
}
.photo-crop-dialog::backdrop{background:var(--color-overlay)}
.photo-crop-sheet{display:grid;gap:15px;padding:19px;overflow:auto;max-height:min(94dvh,900px)}
.photo-crop-heading{display:flex;justify-content:space-between;gap:12px}
.photo-crop-heading h2{font-size:17px;margin:0 0 6px;font-weight:650}
.photo-crop-heading p,.photo-crop-controls p{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.photo-crop-close{border:0;background:transparent;font-size:26px;line-height:1;color:var(--color-muted);cursor:pointer}
.photo-crop-content{display:grid;justify-items:center;gap:14px}
.photo-crop-preview{position:relative;width:min(100%,280px);aspect-ratio:4/5;
  overflow:hidden;border:1px solid var(--color-stroke);border-radius:9px;background:var(--color-soft)}
.photo-crop-preview canvas{display:block;width:100%;height:100%;touch-action:none;
  cursor:grab;outline-offset:3px;outline-color:var(--color-primary)}
.photo-crop-preview canvas:active{cursor:grabbing}
.photo-crop-preview--busy{opacity:.72;cursor:wait}
.photo-crop-loading{position:absolute;inset:0;display:grid;place-items:center;color:var(--color-muted);font-size:12px}
.photo-crop-controls{display:grid;gap:9px;width:min(100%,400px)}
.photo-crop-controls label{display:flex;justify-content:space-between;font-size:12px;color:var(--color-text)}
.photo-crop-zoom{display:flex;gap:8px;align-items:center}
.photo-crop-zoom button{width:34px;height:34px;flex:none;border:1px solid var(--color-stroke);border-radius:7px;
  background:var(--color-surface);color:var(--color-text);display:grid;place-items:center;cursor:pointer}
.photo-crop-zoom input{width:100%;min-width:0;accent-color:var(--color-primary)}
.photo-crop-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;border-top:1px solid var(--color-stroke);padding-top:14px}
@media(max-width:480px){.photo-crop-sheet{padding:12px;gap:10px}.photo-crop-preview{width:min(100%,235px)}}
@media(prefers-reduced-motion:reduce){.photo-crop-dialog::backdrop{animation:none}}
</style>
