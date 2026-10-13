<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import EmployeeLookupField from './EmployeeLookupField.vue'
import { createDocumentDraft, documentTypes, type DocumentType } from '../api/documents'
import { listPersonnelActions, type PersonnelActionRow } from '../api/personnelActions'

const props = defineProps<{ companyId: string }>()
const emit = defineEmits<{ saved: [documentId: string]; cancelled: [] }>()

const employeeId = ref('')
const type = ref<DocumentType>('order')
const personnelActionId = ref('')
const personnelActions = ref<PersonnelActionRow[]>([])
const actionsBusy = ref(false)
const documentNumber = ref('')
const title = ref('')
const issuedOn = ref('')
const saving = ref(false)
const error = ref('')
const actionOptions = computed(() => [
  { id: '', name: 'Без привязки к кадровому действию' },
  ...personnelActions.value.map(item => ({
    id: item.id,
    name: `${item.action_type === 'hire' ? 'Приём' : item.action_type === 'transfer' ? 'Перевод' : 'Увольнение'} · ${item.effective_on} · ${item.basis_reference}`,
  })),
])

async function loadPersonnelActions(employee: string) {
  personnelActionId.value = ''
  personnelActions.value = []
  if (!employee) return
  actionsBusy.value = true
  try {
    const result = await listPersonnelActions(props.companyId, 1, '', employee)
    personnelActions.value = result.data
  } catch {
    personnelActions.value = []
  } finally {
    actionsBusy.value = false
  }
}

async function save() {
  error.value = ''
  if (!employeeId.value) {
    error.value = 'Выберите сотрудника для документа'
    return
  }
  if (!title.value.trim()) {
    error.value = 'Введите название документа'
    return
  }
  saving.value = true
  try {
    const result = await createDocumentDraft(props.companyId, {
      employee_id: employeeId.value,
      personnel_action_id: personnelActionId.value || null,
      document_type: type.value,
      title: title.value.trim(),
      document_number: documentNumber.value.trim() || null,
      issued_on: issuedOn.value || null,
    })
    emit('saved', result.data.id)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось создать черновик'
  } finally {
    saving.value = false
  }
}
watch(employeeId, loadPersonnelActions)

</script>

<template>
  <form class="document-form" @submit.prevent="save">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice tone="info">Создаётся черновик записи. Приказ не считается изданным, а документ — подписанным. PDF можно прикрепить после сохранения.</BaseNotice>

    <EmployeeLookupField v-model="employeeId" :company-id="companyId" :disabled="saving" required />
    <BaseSelectField v-model="type" label="Вид документа" :options="documentTypes" :disabled="saving" required />
    <BaseSelectField v-if="employeeId" v-model="personnelActionId" label="Кадровое действие"
      :options="actionOptions" :disabled="saving || actionsBusy" />
    <BaseFormField v-model="title" label="Название документа" placeholder="Например: Приказ о переводе" :disabled="saving" required />
    <div class="two-columns">
      <BaseFormField v-model="documentNumber" label="Номер документа" placeholder="Необязательно" :disabled="saving" />
      <BaseFormField v-model="issuedOn" label="Дата документа" type="date" :disabled="saving" />
    </div>

    <div class="buttons">
      <BaseButton variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : 'Создать черновик' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.document-form{display:grid;gap:var(--space-4);min-width:0}
.two-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3)}
.buttons{display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
@media(max-width:540px){.two-columns{grid-template-columns:1fr}.buttons :deep(button){flex:1}}
</style>
