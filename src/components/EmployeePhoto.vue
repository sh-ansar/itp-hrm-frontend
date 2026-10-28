<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { Pencil } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseDialog from './ui/BaseDialog.vue'
import { readEmployeePhoto, removeEmployeePhoto, uploadEmployeePhoto, validateEmployeePhoto } from '../api/employeePhoto'

const props = defineProps<{ companyId: string; employeeId: string; revision: number; hasPhoto: boolean; canEdit: boolean; name: string; initials: string; compactEdit?: boolean }>()
const emit = defineEmits<{ saved: []; dirty: [value: boolean] }>()
const inputId = useId()
const imageUrl = ref('')
const imageLoading = ref(false)
const saving = ref(false)
const dragging = ref(false)
const photoViewerOpen = ref(false)
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
const pendingPhoto = ref<File | null>(null)
const pendingPreview = ref('')
function resetPending() {
  const hadPending = !!pendingPhoto.value
  if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value)
  pendingPreview.value = ''
  pendingPhoto.value = null
  if (hadPending) emit('dirty', false)
}
let request: AbortController | null = null
let generation = 0
let displayedFor = ''
function clearImage() { if (imageUrl.value) URL.revokeObjectURL(imageUrl.value); imageUrl.value = '' }
watch(() => [props.companyId, props.employeeId, props.hasPhoto, props.revision], async () => {
  const current = ++generation
  request?.abort()
  resetPending()
  const identity = props.companyId + ':' + props.employeeId
  // Keep the previous authorized photo visible while refreshing its revision.
  // Otherwise a replacement briefly shows an empty avatar and upload validation
  // may race with the new image request on slower browser/CI connections.
  // A different employee or a removed photo must never inherit that image.
  if (!props.hasPhoto || displayedFor !== identity) clearImage()
  displayedFor = identity
  error.value = ''
  imageLoading.value = props.hasPhoto
  if (!props.hasPhoto) return
  const controller = new AbortController()
  request = controller
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const blob = await readEmployeePhoto(props.companyId, props.employeeId, controller.signal)
    if (current === generation) {
      const nextUrl = URL.createObjectURL(blob)
      clearImage()
      imageUrl.value = nextUrl
    }
  } catch (cause) {
    if (current === generation) {
      // Fail closed when the refreshed request is denied or otherwise fails.
      clearImage()
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить фото'
    }
  } finally { clearTimeout(timeout); if (current === generation) imageLoading.value = false }
}, { immediate: true })
onBeforeUnmount(() => { generation++; request?.abort(); clearImage(); resetPending() })
async function select(file?: File) {
  if (!file || saving.value || !props.canEdit) return
  error.value = ''
  try {
    validateEmployeePhoto(file)
    if (props.compactEdit) {
      resetPending()
      pendingPhoto.value = file
      pendingPreview.value = URL.createObjectURL(file)
      emit('dirty', true)
      return
    }
    saving.value = true
    await uploadEmployeePhoto(props.companyId, props.employeeId, props.revision, file)
    emit('saved')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить фото' }
  finally { saving.value = false; if (input.value) input.value.value = '' }
}
function choose(event: Event) { void select((event.target as HTMLInputElement).files?.[0]) }
async function savePending() {
  if (!pendingPhoto.value || saving.value || !props.canEdit) return
  saving.value = true
  error.value = ''
  try {
    validateEmployeePhoto(pendingPhoto.value)
    await uploadEmployeePhoto(props.companyId, props.employeeId, props.revision, pendingPhoto.value)
    resetPending()
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить фотографию'
  } finally { saving.value = false }
}
function drop(event: DragEvent) { dragging.value = false; void select(event.dataTransfer?.files[0]) }
async function remove() {
  if (saving.value || !props.canEdit) return
  saving.value = true
  error.value = ''
  try { await removeEmployeePhoto(props.companyId, props.employeeId, props.revision); emit('saved') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось удалить фото' }
  finally { saving.value = false }
}
</script>

<template>
  <div class="employee-photo" :class="{ 'employee-photo--drag': dragging }"
    @dragover.prevent="dragging = canEdit && !saving" @dragleave="dragging = false" @drop.prevent="drop">
    <p v-if="!compactEdit" class="photo-caption">Фото сотрудника</p>
    <div class="photo-row">
      <button type="button" class="avatar photo-preview-trigger"
        :disabled="!(pendingPreview || imageUrl) || imageLoading" :aria-busy="imageLoading || saving"
        :title="pendingPreview || imageUrl ? 'Посмотреть фотографию' : undefined"
        :aria-label="pendingPreview || imageUrl ? 'Посмотреть фотографию сотрудника' : 'Фото сотрудника не загружено'"
        @click="photoViewerOpen = true">
        <img v-if="pendingPreview || imageUrl" :src="pendingPreview || imageUrl" :alt="'Фото: ' + name" />
        <span v-else :aria-label="imageLoading ? 'Загрузка фото' : 'Фото сотрудника не загружено'">{{ imageLoading ? '…' : initials }}</span>
      </button>
      <div v-if="compactEdit && canEdit" class="photo-compact-actions">
        <input :id="inputId" ref="input" class="photo-input" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          aria-label="Выбрать фотографию" :disabled="saving" @change="choose" />
        <BaseButton variant="secondary" icon-only type="button" class="photo-pencil" :disabled="saving"
          aria-label="Изменить фотографию" title="Изменить фотографию" @click="input?.click()"><Pencil :size="15" aria-hidden="true" /></BaseButton>
        <div v-if="pendingPhoto" class="photo-compact-save">
          <BaseButton size="sm" :disabled="saving" @click="savePending">{{ saving ? 'Сохранение…' : 'Сохранить' }}</BaseButton>
          <BaseButton size="sm" variant="secondary" :disabled="saving" @click="resetPending">Отмена</BaseButton>
        </div>
      </div>
      <div v-else-if="!compactEdit" class="photo-actions">
        <template v-if="canEdit">
          <input :id="inputId" ref="input" class="photo-input" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            aria-label="Выбрать фото сотрудника" :disabled="saving" @change="choose" />
          <BaseButton variant="secondary" :disabled="saving" @click="input?.click()">{{ saving ? 'Сохранение…' : hasPhoto ? 'Заменить фото' : 'Загрузить фото' }}</BaseButton>
          <p>Выберите файл или перетащите сюда.<br />JPG или PNG, до 5 МБ.</p>
          <button v-if="hasPhoto" class="remove-photo" type="button" :disabled="saving" @click="remove">Удалить фото</button>
        </template>
        <p v-else-if="!hasPhoto">Фото не загружено</p>
      </div>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseDialog :open="photoViewerOpen && !!(imageUrl || pendingPreview)" :title="'Фото сотрудника: ' + name"
      @close="photoViewerOpen = false">
      <img v-if="pendingPreview || imageUrl" :src="pendingPreview || imageUrl" :alt="'Фото сотрудника: ' + name" class="photo-viewer" />
      <div v-if="compactEdit && canEdit && hasPhoto && !pendingPhoto" class="photo-viewer-actions">
        <BaseButton variant="secondary" :disabled="saving"
          @click="window.confirm('Удалить фотографию сотрудника?') && remove()">
          Удалить фотографию
        </BaseButton>
      </div>
    </BaseDialog>
  </div>
</template>

<style scoped>
.employee-photo{min-width:0;border-radius:var(--radius-md)}
.employee-photo--drag{outline:2px dashed var(--color-primary);outline-offset:6px}
.photo-caption{
  margin:0 0 10px;
  color:var(--color-text);
  font-size:13px;
  line-height:18px;
  font-weight:600;
}
.photo-row{display:flex;align-items:center;gap:13px;min-width:0}
.avatar{
  display:grid;place-items:center;
  flex:0 0 92px;width:92px;height:92px;
  overflow:hidden;border:1px solid var(--color-stroke);
  border-radius:50%;background:var(--color-accent-soft);
  color:var(--color-primary);font-size:21px;font-weight:600;
}
.avatar img{width:100%;height:100%;object-fit:cover;object-position:center}
.photo-preview-trigger{padding:0;cursor:zoom-in;appearance:none;font:inherit}
.photo-preview-trigger:disabled{cursor:default}
.photo-preview-trigger:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px}
.photo-viewer-actions{display:flex;justify-content:center;margin-top:12px}
.photo-viewer{display:block;max-width:100%;max-height:min(78dvh,690px);width:auto;height:auto;object-fit:contain;margin:0 auto;border-radius:10px}
.photo-actions{display:grid;gap:7px;min-width:0;flex:1;justify-items:start}
.photo-compact-actions{position:absolute;right:0;bottom:0;display:grid;justify-items:end;gap:5px;z-index:1}
.photo-compact-actions .photo-pencil{min-width:30px;min-height:30px;padding:0;border-radius:50%;background:var(--color-surface);box-shadow:var(--shadow-sm);font-size:20px;line-height:1}
.photo-compact-save{display:flex;align-items:center;gap:5px;flex-wrap:wrap;background:var(--color-surface);padding:5px;border-radius:var(--radius-sm);box-shadow:var(--shadow-sm)}
.employee-photo{position:relative}
.employee-photo:has(.photo-compact-actions) .photo-row{display:block}
.employee-photo:has(.photo-compact-actions) .avatar{width:150px;height:160px;aspect-ratio:auto;border-radius:10px;overflow:hidden}
.employee-photo:has(.photo-compact-actions) .avatar img{object-fit:contain;object-position:center}
.employee-photo:has(.photo-compact-actions) .photo-compact-actions{right:-6px;bottom:-6px}
@media(max-width:600px){.employee-photo:has(.photo-compact-actions) .avatar{width:135px;height:145px}}
.photo-actions p{margin:0;color:var(--color-muted);font-size:11px;line-height:16px}
.photo-actions :deep(button){min-height:33px;padding:6px 10px;font-size:12px}
.photo-input{
  position:absolute;width:1px;height:1px;padding:0;overflow:hidden;
  clip-path:inset(50%);white-space:nowrap;
}
.remove-photo{
  border:0;padding:0;background:transparent;color:var(--color-muted);
  font:inherit;font-size:11px;cursor:pointer;
  text-decoration:underline;text-underline-offset:3px;
}
.remove-photo:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px}
.remove-photo:disabled{opacity:.6;cursor:default}
.employee-photo :deep(.notice){margin-top:10px}
@media(max-width:600px){
  .avatar{flex-basis:76px;width:76px;height:76px}
  .photo-row{gap:12px}
}
</style>
