<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  createEmployeeContract,
  updateEmployeeContract,
  type EmployeeContract,
  type EmployeeContractPayload,
  type EmployeeContractType,
  type EmployeeEmploymentType,
} from '../api/personnel'

const props = defineProps<{
  open: boolean
  companyId: string
  employeeId: string
  contract: EmployeeContract | null
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const busy = ref(false)
const error = ref('')
const contractNumber = ref('')
const contractType = ref<EmployeeContractType>('indefinite')
const employmentType = ref<EmployeeEmploymentType | ''>('full_time')
const signedOn = ref('')
const validFrom = ref('')
const validTo = ref('')
const probationUntil = ref('')
const basisReference = ref('')

const title = computed(() => props.contract ? 'Редактировать трудовой договор' : 'Новый трудовой договор')
const requiresEndDate = computed(() => ['fixed_term', 'temporary', 'seasonal'].includes(contractType.value))

const contractTypeOptions = [
  { id: 'indefinite', name: 'Бессрочный' },
  { id: 'fixed_term', name: 'Срочный' },
  { id: 'temporary', name: 'Временный' },
  { id: 'seasonal', name: 'Сезонный' },
  { id: 'other', name: 'Другой' },
]
const employmentTypeOptions = [
  { id: 'full_time', name: 'Основное место, полная занятость' },
  { id: 'part_time', name: 'Неполная занятость' },
  { id: 'secondary', name: 'Совместительство' },
  { id: 'remote', name: 'Дистанционная работа' },
  { id: 'other', name: 'Другой вид занятости' },
]

function reset() {
  const row = props.contract
  contractNumber.value = row?.contract_number ?? ''
  contractType.value = row?.contract_type ?? 'indefinite'
  employmentType.value = row?.employment_type ?? 'full_time'
  signedOn.value = row?.signed_on ?? ''
  validFrom.value = row?.valid_from ?? ''
  validTo.value = row?.valid_to ?? ''
  probationUntil.value = row?.probation_until ?? ''
  basisReference.value = row?.basis_reference ?? ''
  error.value = ''
}

function payload(): EmployeeContractPayload {
  const end = contractType.value === 'indefinite' ? null : (validTo.value || null)
  if (!contractNumber.value.trim()) throw new Error('Укажите номер договора')
  if (!validFrom.value) throw new Error('Укажите дату начала действия')
  if (requiresEndDate.value && !end) throw new Error('Для этого типа договора укажите дату окончания')
  if (end && end < validFrom.value) throw new Error('Дата окончания не может быть раньше даты начала')
  if (probationUntil.value && probationUntil.value < validFrom.value)
    throw new Error('Испытательный срок не может закончиться раньше даты начала договора')
  if (probationUntil.value && end && probationUntil.value > end)
    throw new Error('Испытательный срок не может закончиться после договора')

  return {
    contract_number: contractNumber.value.trim(),
    contract_type: contractType.value,
    employment_type: employmentType.value || null,
    signed_on: signedOn.value || null,
    valid_from: validFrom.value,
    valid_to: end,
    probation_until: probationUntil.value || null,
    basis_reference: basisReference.value.trim() || null,
  }
}

async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const data = payload()
    if (props.contract) {
      await updateEmployeeContract(
        props.companyId,
        props.employeeId,
        props.contract.id,
        props.contract.revision,
        data,
      )
    } else {
      await createEmployeeContract(props.companyId, props.employeeId, data)
    }
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить трудовой договор'
  } finally {
    busy.value = false
  }
}

watch(() => [props.open, props.contract?.id, props.contract?.revision], () => {
  if (props.open) reset()
}, { immediate: true })

watch(contractType, value => {
  if (value === 'indefinite') validTo.value = ''
})
</script>

<template>
  <BaseDialog :open="open" :title="title" size="wide" @close="$emit('close')">
    <div class="contract-form">
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>

      <div class="contract-grid">
        <BaseFormField v-model="contractNumber" label="Номер договора" :disabled="busy" required />
        <BaseSelectField v-model="contractType" label="Тип договора"
          :options="contractTypeOptions" :disabled="busy" required />
        <BaseSelectField v-model="employmentType" label="Вид занятости"
          :options="employmentTypeOptions" :disabled="busy" />
        <BaseFormField v-model="signedOn" label="Дата подписания" type="date" :disabled="busy" />
        <BaseFormField v-model="validFrom" label="Действует с" type="date" :disabled="busy" required />
        <BaseFormField v-model="validTo" label="Действует до" type="date"
          :disabled="busy || contractType === 'indefinite'" :required="requiresEndDate" />
        <BaseFormField v-model="probationUntil" label="Испытательный срок до" type="date" :disabled="busy" />
        <BaseFormField v-model="basisReference" label="Основание / приказ" :disabled="busy" />
      </div>

      <BaseNotice v-if="contractType === 'indefinite'" tone="info">
        Бессрочный договор сохраняется без даты окончания.
      </BaseNotice>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="busy" @click="$emit('close')">Отмена</BaseButton>
      <BaseButton :disabled="busy" @click="save">
        {{ busy ? 'Сохранение…' : (contract ? 'Сохранить изменения' : 'Создать договор') }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<style scoped>
.contract-form{display:grid;gap:16px}
.contract-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(max-width:680px){.contract-grid{grid-template-columns:1fr}}
</style>
