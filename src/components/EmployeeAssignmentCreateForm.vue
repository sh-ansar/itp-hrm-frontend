<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { listDepartments, listPositions, type DepartmentRecord, type PositionRecord } from '../api/organization'
import {
  createEmployeeAssignment,
  transitionEmployeeAssignment,
  updateEmployeeAssignment,
  type EmployeeAssignment,
} from '../api/personnel'

const props = defineProps<{
  companyId: string
  employeeId: string
  edit?: EmployeeAssignment | null
  transitionFrom?: EmployeeAssignment | null
}>()

const emit = defineEmits<{ saved: []; cancelled: [] }>()

const departments = ref<DepartmentRecord[]>([])
const positions = ref<PositionRecord[]>([])
const departmentId = ref(props.edit?.department_id ?? '')
const positionId = ref(props.edit?.position_id ?? '')
const validFrom = ref(props.edit?.valid_from ?? '')
const validTo = ref(props.edit?.valid_to ?? '')
const basisReference = ref(props.edit?.basis_reference ?? '')
const loadingDirectories = ref(false)
const saving = ref(false)
const error = ref('')
const savedMessage = ref('')
const isEditing = computed(() => !!props.edit)
const isTransition = computed(() => !!props.transitionFrom)
const isSecondaryFlow = computed(() => isEditing.value || isTransition.value)
const title = computed(() => isTransition.value ? 'Перевод сотрудника' : isEditing.value ? 'Редактирование назначения' : 'Новое назначение')
const titleId = computed(() => isTransition.value ? 'assignment-transition-title' : isEditing.value ? 'assignment-edit-title' : 'assignment-create-title')

async function loadDirectories() {
  loadingDirectories.value = true
  error.value = ''
  try {
    const [departmentResult, positionResult] = await Promise.all([
      listDepartments(props.companyId),
      listPositions(props.companyId),
    ])
    departments.value = departmentResult.data
    positions.value = positionResult.data
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить кадровые справочники'
  } finally {
    loadingDirectories.value = false
  }
}

async function submit() {
  error.value = ''
  savedMessage.value = ''

  if (!departmentId.value || !positionId.value || !validFrom.value) {
    error.value = 'Выберите подразделение, должность и дату начала'
    return
  }
  if (validTo.value && validTo.value < validFrom.value) {
    error.value = 'Дата окончания не может быть раньше даты начала'
    return
  }
  if (props.transitionFrom && validFrom.value <= props.transitionFrom.valid_from) {
    error.value = 'Дата нового назначения должна быть позже даты текущего назначения'
    return
  }

  saving.value = true
  const payload = {
    department_id: departmentId.value,
    position_id: positionId.value,
    valid_from: validFrom.value,
    valid_to: validTo.value || null,
    basis_reference: basisReference.value.trim() || null,
  }

  try {
    if (props.transitionFrom) {
      await transitionEmployeeAssignment(
        props.companyId,
        props.employeeId,
        props.transitionFrom.id,
        props.transitionFrom.revision,
        payload,
      )
      savedMessage.value = 'Перевод выполнен'
    } else if (props.edit) {
      await updateEmployeeAssignment(
        props.companyId,
        props.employeeId,
        props.edit.id,
        props.edit.revision,
        payload,
      )
      savedMessage.value = 'Назначение обновлено'
    } else {
      await createEmployeeAssignment(props.companyId, props.employeeId, payload)
      departmentId.value = ''
      positionId.value = ''
      validFrom.value = ''
      validTo.value = ''
      basisReference.value = ''
      savedMessage.value = 'Назначение сохранено'
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить назначение'
  } finally {
    saving.value = false
  }
}

onMounted(loadDirectories)
</script>

<template>
  <section class="assignment-form" :aria-labelledby="titleId">
    <div class="heading">
      <div>
        <h3 :id="titleId">{{ title }}</h3>
        <p v-if="isTransition">
          Текущее назначение будет закрыто днём перед новой датой, а новое создано в одной операции. При ошибке изменения не применятся.
        </p>
        <p v-else-if="isEditing">
          Скорректируйте период или закройте текущее назначение датой окончания. Конфликтующую версию система не перезапишет.
        </p>
        <p v-else>Добавьте кадровое назначение с периодом действия. Пересекающиеся периоды система не сохранит.</p>
      </div>
      <BaseButton variant="secondary" :disabled="loadingDirectories || saving" @click="loadDirectories">
        Обновить справочники
      </BaseButton>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="savedMessage" tone="success">{{ savedMessage }}</BaseNotice>

    <form class="form-grid" @submit.prevent="submit">
      <BaseSelectField v-model="departmentId" :label="isTransition ? 'Новое подразделение' : 'Подразделение'"
        placeholder="Выберите подразделение" :options="departments" :disabled="loadingDirectories || saving" required />
      <BaseSelectField v-model="positionId" :label="isTransition ? 'Новая должность' : 'Должность'"
        placeholder="Выберите должность" :options="positions" :disabled="loadingDirectories || saving" required />
      <BaseFormField v-model="validFrom" :label="isTransition ? 'Новое назначение с' : 'Действует с'"
        type="date" :disabled="saving" required />
      <BaseFormField v-model="validTo" :label="isTransition ? 'Новое назначение по' : 'Действует по'"
        type="date" :disabled="saving" />
      <div class="wide">
        <BaseFormField v-model="basisReference" label="Основание" placeholder="Например: приказ № 15-к" :disabled="saving" />
      </div>
      <div class="actions">
        <BaseButton v-if="isSecondaryFlow" type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
        <BaseButton type="submit" :disabled="saving || loadingDirectories">
          {{ saving ? 'Сохранение…' : isTransition ? 'Выполнить перевод' : isEditing ? 'Сохранить изменения' : 'Добавить назначение' }}
        </BaseButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.assignment-form{display:grid;gap:var(--space-4)}
.heading{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);flex-wrap:wrap}
.heading h3{margin:0;font-size:var(--font-section-heading)}
.heading p{margin:var(--space-2) 0 0;color:var(--color-muted);max-width:720px;line-height:1.5}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.wide,.actions{grid-column:1/-1}
.actions{display:flex;justify-content:flex-end;gap:var(--space-3);flex-wrap:wrap}
@media(max-width:700px){
  .form-grid{grid-template-columns:minmax(0,1fr)}
  .wide,.actions{grid-column:auto}
  .actions{justify-content:stretch}
  .actions :deep(button){width:100%}
}
</style>
