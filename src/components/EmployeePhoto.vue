<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { readEmployeePhoto, removeEmployeePhoto, uploadEmployeePhoto, validateEmployeePhoto } from '../api/employeePhoto'

const props = defineProps<{ companyId: string; employeeId: string; revision: number; hasPhoto: boolean; canEdit: boolean; name: string; initials: string }>()
const emit = defineEmits<{ saved: [] }>()
const inputId = useId()
const imageUrl = ref('')
const imageLoading = ref(false)
const saving = ref(false)
const dragging = ref(false)
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
let request: AbortController | null = null
let generation = 0
function clearImage() { if (imageUrl.value) URL.revokeObjectURL(imageUrl.value); imageUrl.value = '' }
watch(() => [props.companyId, props.employeeId, props.hasPhoto, props.revision], async () => {
  const current = ++generation
  request?.abort()
  clearImage()
  error.value = ''
  imageLoading.value = props.hasPhoto
  if (!props.hasPhoto) return
  const controller = new AbortController()
  request = controller
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const blob = await readEmployeePhoto(props.companyId, props.employeeId, controller.signal)
    if (current === generation) imageUrl.value = URL.createObjectURL(blob)
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить фото'
  } finally { clearTimeout(timeout); if (current === generation) imageLoading.value = false }
}, { immediate: true })
onBeforeUnmount(() => { generation++; request?.abort(); clearImage() })
async function select(file?: File) {
  if (!file || saving.value || !props.canEdit) return
  error.value = ''
  try {
    validateEmployeePhoto(file)
    saving.value = true
    await uploadEmployeePhoto(props.companyId, props.employeeId, props.revision, file)
    emit('saved')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить фото' }
  finally { saving.value = false; if (input.value) input.value.value = '' }
}
function choose(event: Event) { void select((event.target as HTMLInputElement).files?.[0]) }
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
    <p class="photo-caption">Фото сотрудника</p>
    <div class="photo-row">
      <div class="avatar" :aria-busy="imageLoading || saving">
        <img v-if="imageUrl" :src="imageUrl" :alt="'Фото: ' + name" />
        <span v-else :aria-label="imageLoading ? 'Загрузка фото' : 'Фото сотрудника не загружено'">{{ imageLoading ? '…' : initials }}</span>
      </div>
      <div class="photo-actions">
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
  </div>
</template>

<style scoped>
.employee-photo{min-width:0;border-radius:var(--radius-md)}
.employee-photo--drag{outline:2px dashed var(--color-primary);outline-offset:6px}
.photo-caption{margin:0 0 12px;color:var(--color-text);font-size:var(--font-label-size);font-weight:500}
.photo-row{display:flex;align-items:center;gap:16px}
.avatar{display:grid;place-items:center;flex:0 0 92px;width:92px;height:92px;overflow:hidden;border:1px solid var(--color-stroke);border-radius:50%;background:var(--color-accent-soft);color:var(--color-primary);font-size:22px;font-weight:600}
.avatar img{width:100%;height:100%;object-fit:cover;object-position:center}
.photo-actions{display:grid;gap:8px;min-width:0;flex:1;justify-items:start}
.photo-actions p{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.photo-actions :deep(button){min-height:34px;padding:6px 10px;font-size:12px}
.photo-input{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.remove-photo{border:0;padding:0;background:transparent;color:var(--color-muted);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.remove-photo:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px}
.remove-photo:disabled{opacity:.6;cursor:default}
.employee-photo :deep(.notice){margin-top:12px}
@media(max-width:600px){.avatar{flex-basis:76px;width:76px;height:76px}.photo-row{gap:14px}}
</style>
