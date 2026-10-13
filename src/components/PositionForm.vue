<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { createPosition, updatePosition, type PositionRecord } from '../api/organization'

const props = defineProps<{
  companyId: string
  edit?: PositionRecord | null
}>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()

const name = ref(props.edit?.name ?? '')
const saving = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Введите название должности'
    return
  }

  saving.value = true
  try {
    if (props.edit) {
      await updatePosition(props.companyId, props.edit.id, props.edit.revision, name.value.trim())
    } else {
      await createPosition(props.companyId, name.value.trim())
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить должность'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="position-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseFormField v-model="name" label="Название должности" placeholder="Например: Ведущий инженер" :disabled="saving" required />
    <p class="hint">Должность — справочник. Количество ставок и вакансии задаются отдельно в штатном расписании.</p>
    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : edit ? 'Сохранить изменения' : 'Добавить должность' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.position-form{display:grid;gap:var(--space-4)}
.hint{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.actions :deep(button){flex:1}}
</style>
