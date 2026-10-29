<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { documentSections, updateDocumentMetadata, type DocumentRow, type DocumentSection } from '../api/documents'

const props = defineProps<{ companyId: string; document: DocumentRow }>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()
const title = ref(props.document.title)
const description = ref(props.document.description ?? '')
const tags = ref((props.document.tags ?? []).join(', '))
const section = ref<DocumentSection | ''>(props.document.section_key ?? '')
const busy = ref(false)
const error = ref('')
async function save() {
  if (busy.value) return
  const values = tags.value.split(',').map(item => item.trim()).filter(Boolean)
  if (values.length > 12) { error.value = 'Не больше 12 тегов'; return }
  if (values.some(item => item.length > 40)) { error.value = 'Тег не должен превышать 40 символов'; return }
  if (!title.value.trim()) { error.value = 'Введите название документа'; return }
  busy.value = true
  error.value = ''
  try {
    await updateDocumentMetadata(props.companyId, props.document.id, props.document.revision, {
      title: title.value.trim(), description: description.value.trim() || null,
      tags: values, section_key: section.value || null,
    })
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить описание и теги'
  } finally { busy.value = false }
}
</script>

<template>
  <form class="document-metadata-form" @submit.prevent="save">
    <BaseFormField v-model="title" label="Название документа" :disabled="busy" required />
    <label class="document-description-label">
      <span>Описание документа</span>
      <textarea v-model="description" rows="4" maxlength="2000" :disabled="busy"
        placeholder="Например: грамота за внедрение системы, выдана в 2026 году" />
    </label>
    <BaseFormField v-model="tags" label="Теги через запятую" :disabled="busy"
      placeholder="грамота, премия, сертификат" />
    <BaseSelectField v-model="section" label="Раздел карточки сотрудника" :options="[
      { id: '', name: 'Без раздела' }, ...documentSections,
    ]" :disabled="busy" />
    <p class="document-metadata-hint">Теги используются при поиске в доступных кадровых документах. Медицинские и личные файлы остаются закрытыми для посторонних.</p>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div class="document-metadata-actions">
      <BaseButton variant="secondary" :disabled="busy" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="busy">{{ busy ? 'Сохранение…' : 'Сохранить описание и теги' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.document-metadata-form{display:grid;gap:14px;min-width:0}
.document-description-label{display:grid;gap:7px;font-size:13px;color:var(--color-text)}
.document-description-label textarea{width:100%;min-width:0;min-height:90px;padding:10px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-text);font:inherit;resize:vertical}
.document-metadata-hint{font-size:12px;color:var(--color-muted);line-height:1.4;margin:0}
.document-metadata-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
</style>
