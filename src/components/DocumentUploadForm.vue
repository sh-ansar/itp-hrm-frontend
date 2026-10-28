<script setup lang="ts">
import { ref, useId } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { uploadDocumentPdf, type DocumentRow } from '../api/documents'
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const props = defineProps<{ companyId: string; document: Pick<DocumentRow, 'id' | 'title' | 'document_number' | 'revision'> }>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()
const inputId = useId()
const selected = ref<File | null>(null)
const uploading = ref(false)
const error = ref('')

function selectFile(event: Event) {
  const element = event.target as HTMLInputElement
  selected.value = element.files?.[0] ?? null
  error.value = ''
}

async function upload() {
  if (!selected.value) { error.value = 'Выберите PDF-файл'; return }
  error.value = ''
  uploading.value = true
  try {
    await uploadDocumentPdf(props.companyId, props.document.id, props.document.revision, selected.value)
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось прикрепить PDF'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <form class="upload-form" @submit.prevent="upload">
    <BaseNotice v-if="demoMode" tone="info">Демоверсия: PDF можно открыть только в этой вкладке до обновления страницы. На сервер файл не загружается.</BaseNotice>
    <div class="document-summary">
      <strong>{{ document.title }}</strong>
      <span>{{ document.document_number || 'Без номера' }}</span>
    </div>
    <div class="file-field">
      <label :for="inputId">PDF-документ (до 5 МБ)</label>
      <input :id="inputId" type="file" accept="application/pdf,.pdf" :disabled="uploading"
        aria-label="PDF-документ" @change="selectFile" />
      <small>Можно прикрепить один PDF к черновику. Замена файла в текущей версии недоступна.</small>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div class="buttons">
      <BaseButton variant="secondary" :disabled="uploading" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="uploading || !selected">
        {{ uploading ? 'Загрузка PDF…' : 'Прикрепить PDF' }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.upload-form{display:grid;gap:var(--space-4);min-width:0}
.document-summary{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.document-summary span{font-size:12px;color:var(--color-muted)}
.file-field{display:grid;gap:var(--space-2);min-width:0}
.file-field label{font-size:var(--font-label-size);font-weight:600}
.file-field input{display:block;width:100%;max-width:100%;font:inherit;font-size:13px;padding:12px;border:1px dashed var(--color-stroke);border-radius:var(--radius-md);background:var(--color-soft)}
.file-field input:focus-visible{outline:3px solid var(--color-focus)}
.file-field small{font-size:12px;line-height:1.5;color:var(--color-muted)}
.buttons{display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
@media(max-width:540px){.buttons :deep(button){flex:1}}
</style>
