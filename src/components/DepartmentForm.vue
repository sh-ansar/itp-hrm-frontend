<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  createDepartment,
  updateDepartment,
  type DepartmentRecord,
} from '../api/organization'

const props = defineProps<{
  companyId: string
  departments: DepartmentRecord[]
  edit?: DepartmentRecord | null
}>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()

const name = ref(props.edit?.name ?? '')
const parentId = ref(props.edit?.parent_id ?? '')
const saving = ref(false)
const error = ref('')

const rootOption = { id: '__root__', name: 'Верхний уровень' }
const parentOptions = [
  rootOption,
  ...props.departments
    .filter(item => item.id !== props.edit?.id)
    .map(item => ({ id: item.id, name: item.name })),
]

async function submit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Введите название подразделения'
    return
  }

  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      parent_id: parentId.value && parentId.value !== '__root__' ? parentId.value : null,
    }
    if (props.edit) {
      await updateDepartment(props.companyId, props.edit.id, props.edit.revision, payload)
    } else {
      await createDepartment(props.companyId, payload)
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить подразделение'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="department-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseFormField v-model="name" label="Название подразделения" placeholder="Например: Финансовый департамент" :disabled="saving" required />
    <BaseSelectField v-model="parentId" label="Родительское подразделение" :options="parentOptions" :disabled="saving" />
    <p class="hint">Система не позволит создать цикл и не даст выбрать подразделение из другой компании.</p>
    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : edit ? 'Сохранить изменения' : 'Добавить подразделение' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.department-form{display:grid;gap:var(--space-4)}
.hint{margin:0;color:var(--color-muted);font-size:12px;line-height:1.5}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
@media(max-width:600px){.actions :deep(button){flex:1}}
</style>
