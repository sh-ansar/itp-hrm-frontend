<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  createDepartment,
  updateDepartment,
  type DepartmentRecord,
} from '../api/organization'
import type { EmployeeRecord } from '../api/personnel'

const props = defineProps<{
  companyId: string
  departments: DepartmentRecord[]
  employees?: EmployeeRecord[]
  managerAssignmentSupported?: boolean
  edit?: DepartmentRecord | null
}>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()

const name = ref(props.edit?.name ?? '')
const parentId = ref(props.edit?.parent_id ?? '__root__')
const managerId = ref(props.edit?.manager_employee_id ?? '__none__')
const managerOptions = computed(() => {
  const items = (props.employees ?? []).map(employee => ({
    id: employee.id,
    name: [employee.last_name, employee.first_name, employee.middle_name]
      .filter(Boolean).join(' ') + (employee.current_position_name ? ' — ' + employee.current_position_name : ''),
  })).sort((a,b) => a.name.localeCompare(b.name, 'ru'))
  if (props.edit?.manager_employee_id && !items.some(item => item.id === props.edit?.manager_employee_id)) {
    items.push({
      id: props.edit.manager_employee_id,
      name: (props.edit.manager_employee_name ?? 'Назначенный руководитель') + ' (нет в текущем списке)',
    })
  }
  return [{ id: '__none__', name: 'Не назначен' }, ...items]
})
const saving = ref(false)
const error = ref('')

const rootOption = { id: '__root__', name: 'Верхний уровень' }
// Do not offer descendants as parents when editing: that would create a cycle.
const excludedParentIds = computed(() => {
  const ids = new Set<string>()
  if (!props.edit) return ids
  const queue = [props.edit.id]
  while (queue.length) {
    const id = queue.shift()!
    if (ids.has(id)) continue
    ids.add(id)
    for (const item of props.departments) if (item.parent_id === id) queue.push(item.id)
  }
  return ids
})
const parentOptions = computed(() => [
  rootOption,
  ...props.departments
    .filter(item => !excludedParentIds.value.has(item.id))
    .map(item => ({ id: item.id, name: item.name })),
])

async function submit() {
  error.value = ''
  if (parentId.value !== '__root__' && !parentOptions.value.some(item => item.id === parentId.value)) {
    error.value = 'Выберите доступное родительское подразделение'
    return
  }
  if (!name.value.trim()) {
    error.value = 'Введите название подразделения'
    return
  }

  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      parent_id: parentId.value && parentId.value !== '__root__' ? parentId.value : null,
      ...(props.managerAssignmentSupported ? {
        manager_employee_id: managerId.value === '__none__' ? null : managerId.value,
      } : {}),
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
    <BaseSelectField v-if="managerAssignmentSupported" v-model="managerId"
      label="Руководитель подразделения" :options="managerOptions" :disabled="saving" />
    <p v-if="managerAssignmentSupported" class="hint">Для согласования отпусков выбранному руководителю нужна личная учётная запись с ролью руководителя и доступом к этому подразделению. Выбор сотрудника сам по себе не выдаёт права.</p>
    <p class="hint">Выберите уровень структуры. Подразделение нельзя подчинить самому себе или своему дочернему подразделению.</p>
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
