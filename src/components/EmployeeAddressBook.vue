<script setup lang="ts">
import { computed, ref } from 'vue'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import {
  createEmployeePrivateRecord,
  updateEmployeePrivateRecord,
  archiveEmployeePrivateRecord,
  type EmployeePrivateAddress,
  type EmployeeAddressPayload,
} from '../api/personnel'

const props = withDefaults(defineProps<{
  companyId: string
  employeeId: string
  addresses: EmployeePrivateAddress[]
  writable: boolean
  truncated?: boolean
}>(), { truncated: false })
const emit = defineEmits<{ changed: [] }>()
const { tr } = useWorkspaceI18n()

const kinds = computed(() => [
  { id: 'residence', name: tr('Адрес проживания') },
  { id: 'registration', name: tr('Адрес регистрации') },
  { id: 'other', name: tr('Другой адрес') },
])
const editing = ref<EmployeePrivateAddress | null>(null)
const dialogOpen = ref(false)
const busy = ref(false)
const error = ref('')
const kind = ref<EmployeePrivateAddress['kind']>('residence')
const addressLine = ref('')
const entrance = ref('')
const floor = ref('')
const apartment = ref('')
const primary = ref(false)

function typeName(value: EmployeePrivateAddress['kind']): string {
  return kinds.value.find(option => option.id === value)?.name ?? tr('Другой адрес')
}
function openEditor(address?: EmployeePrivateAddress) {
  if (!props.writable || busy.value) return
  editing.value = address ?? null
  kind.value = address?.kind ?? 'residence'
  addressLine.value = address?.address_line ?? ''
  entrance.value = address?.entrance ?? ''
  floor.value = address?.floor ?? ''
  apartment.value = address?.apartment ?? ''
  primary.value = address?.is_primary ?? props.addresses.length === 0
  error.value = ''
  dialogOpen.value = true
}
function close() {
  if (busy.value) return
  dialogOpen.value = false
  editing.value = null
  error.value = ''
}
async function save() {
  if (!props.writable || busy.value || !dialogOpen.value) return
  const line = addressLine.value.trim()
  if (!line || line.length > 500) {
    error.value = tr('Укажите адрес')
    return
  }
  const payload: EmployeeAddressPayload = {
    kind: kind.value,
    address_line: line,
    entrance: entrance.value.trim() || null,
    floor: floor.value.trim() || null,
    apartment: apartment.value.trim() || null,
    is_primary: primary.value,
  }
  if ((payload.entrance?.length ?? 0) > 40 || (payload.floor?.length ?? 0) > 20 ||
      (payload.apartment?.length ?? 0) > 40) {
    error.value = tr('Слишком длинное значение')
    return
  }
  busy.value = true
  error.value = ''
  try {
    const row = editing.value
    if (row) {
      await updateEmployeePrivateRecord(props.companyId, props.employeeId, 'address',
        row.id, row.revision, payload)
    } else {
      await createEmployeePrivateRecord(props.companyId, props.employeeId, 'address', payload)
    }
    dialogOpen.value = false
    editing.value = null
    emit('changed') // reload only trusted, HR-scoped API values
  } catch {
    error.value = tr('Не удалось сохранить адрес. Возможно, запись была изменена. Обновите карточку.')
  } finally {
    busy.value = false
  }
}
async function archive(row: EmployeePrivateAddress) {
  if (!props.writable || busy.value ||
      !window.confirm(tr('Архивировать выбранный адрес?'))) return
  busy.value = true
  error.value = ''
  try {
    await archiveEmployeePrivateRecord(props.companyId, props.employeeId,
      'address', row.id, row.revision)
    emit('changed')
  } catch {
    error.value = tr('Не удалось архивировать адрес. Обновите карточку.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="employee-address-book" :aria-label="tr('Адреса сотрудника')">
    <div class="employee-address-toolbar">
      <span class="employee-address-title">{{ tr('Адреса сотрудника') }}</span>
      <BaseButton v-if="writable" variant="secondary" class="employee-address-add"
        :disabled="busy || truncated" @click="openEditor()">
        <Plus :size="16" aria-hidden="true" /> {{ tr('Добавить адрес') }}
      </BaseButton>
    </div>
    <BaseNotice v-if="truncated" tone="warning">{{ tr('Список адресов неполный. Обратитесь к HR для доступа ко всем записям.') }}</BaseNotice>
    <BaseNotice v-if="error && !dialogOpen" tone="error">{{ error }}</BaseNotice>
    <div v-if="addresses.length" class="employee-address-list" role="list">
      <div v-for="address in addresses" :key="address.id" class="employee-address-row" role="listitem">
        <MapPin class="employee-address-icon" :size="17" aria-hidden="true"/>
        <div class="employee-address-copy">
          <div class="employee-address-kind">
            <span>{{ typeName(address.kind) }}</span>
            <span v-if="address.is_primary" class="employee-address-primary">{{ tr('Основной') }}</span>
          </div>
          <div class="employee-address-line">{{ address.address_line }}</div>
          <div v-if="address.entrance || address.floor || address.apartment" class="employee-address-subline">
            <span v-if="address.entrance">{{ tr('Подъезд') }}: {{ address.entrance }}</span>
            <span v-if="address.floor">{{ tr('Этаж') }}: {{ address.floor }}</span>
            <span v-if="address.apartment">{{ tr('Квартира') }}: {{ address.apartment }}</span>
          </div>
        </div>
        <div v-if="writable" class="employee-address-actions">
          <BaseButton icon-only variant="secondary" :disabled="busy || truncated"
            :aria-label="tr('Изменить адрес')" :title="tr('Изменить адрес')" @click="openEditor(address)">
            <Pencil :size="15" aria-hidden="true"/>
          </BaseButton>
          <BaseButton icon-only variant="secondary" :disabled="busy || truncated"
            :aria-label="tr('Архивировать адрес')" :title="tr('Архивировать адрес')" @click="archive(address)">
            <Trash2 :size="15" aria-hidden="true"/>
          </BaseButton>
        </div>
      </div>
    </div>
    <p v-else class="employee-address-empty">{{ tr('Дополнительные адреса пока не внесены') }}</p>

    <BaseDialog :open="dialogOpen" :title="tr(editing ? 'Изменить адрес' : 'Добавить адрес')" @close="close">
      <form class="employee-address-form" @submit.prevent="save">
        <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
        <BaseSelectField v-model="kind" :label="tr('Тип адреса')" :options="kinds" :disabled="busy" />
        <BaseFormField v-model="addressLine" :label="tr('Адрес')" required :disabled="busy" />
        <div class="employee-address-form-grid">
          <BaseFormField v-model="entrance" :label="tr('Подъезд')" :disabled="busy" />
          <BaseFormField v-model="floor" :label="tr('Этаж')" :disabled="busy" />
          <BaseFormField v-model="apartment" :label="tr('Квартира')" :disabled="busy" />
        </div>
        <label class="employee-address-primary-field">
          <input v-model="primary" type="checkbox" :disabled="busy" />
          {{ tr('Основной адрес') }}
        </label>
        <div class="employee-address-form-actions">
          <BaseButton variant="secondary" :disabled="busy" @click="close">{{ tr('Отмена') }}</BaseButton>
          <BaseButton type="submit" :disabled="busy">{{ tr('Сохранить') }}</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </div>
</template>

<style scoped>
.employee-address-book{display:grid;gap:10px;min-width:0;margin-top:16px}
.employee-address-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.employee-address-title{font-size:12px;font-weight:600;color:var(--color-text)}
.employee-address-add{min-height:30px;height:30px;font-size:12px;font-weight:500}
.employee-address-add :deep(svg){width:15px;height:15px}
.employee-address-list{display:grid;min-width:0;border-top:1px solid var(--color-stroke)}
.employee-address-row{display:flex;align-items:flex-start;gap:10px;padding:11px 2px;border-bottom:1px solid var(--color-stroke);min-width:0}
.employee-address-icon{flex:none;margin-top:3px;color:var(--color-muted)}
.employee-address-copy{display:grid;gap:5px;flex:1;min-width:0}
.employee-address-kind{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--color-muted);font-size:11px}
.employee-address-primary{border-radius:4px;background:var(--color-success-surface);color:var(--color-success);padding:2px 6px;font-weight:500}
.employee-address-line{color:var(--color-text);font-size:12px;line-height:18px;overflow-wrap:anywhere;font-weight:500}
.employee-address-subline{display:flex;flex-wrap:wrap;gap:6px 15px;color:var(--color-muted);font-size:11px}
.employee-address-actions{display:flex;gap:5px;align-items:center;flex:none}
.employee-address-actions :deep(.base-button){width:30px;min-width:30px;height:30px;min-height:30px;padding:0;color:var(--color-muted)}
.employee-address-actions :deep(svg){width:15px;height:15px}
.employee-address-empty{margin:0;color:var(--color-muted);font-size:12px;line-height:18px}
.employee-address-form{display:grid;gap:14px;min-width:0}
.employee-address-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.employee-address-primary-field{display:flex;gap:9px;align-items:center;font-size:12px;color:var(--color-text)}
.employee-address-primary-field input{width:16px;height:16px;accent-color:var(--color-primary)}
.employee-address-form-actions{display:flex;gap:8px;justify-content:flex-end}
.employee-address-form-actions :deep(.base-button){font-weight:500}
@media(max-width:600px){.employee-address-form-grid{grid-template-columns:1fr}.employee-address-actions :deep(.base-button){width:28px;min-width:28px;height:28px;min-height:28px}}
</style>
