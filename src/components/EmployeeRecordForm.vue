<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { createEmployee, updateEmployee, type EmployeeRecord } from '../api/personnel'

import { uploadEmployeePhoto, validateEmployeePhoto } from '../api/employeePhoto'

const props = defineProps<{
  companyId: string
  edit?: EmployeeRecord | null
}>()

const emit = defineEmits<{ saved: [employee: EmployeeRecord]; cancelled: [] }>()

const personnelNumber = ref(props.edit?.personnel_number ?? '')
const lastName = ref(props.edit?.last_name ?? '')
const firstName = ref(props.edit?.first_name ?? '')
const middleName = ref(props.edit?.middle_name ?? '')
const birthDate = ref(props.edit?.birth_date ?? '')
const gender = ref<'male' | 'female' | ''>(props.edit?.gender ?? '')
const email = ref(props.edit?.email ?? '')
const phone = ref(props.edit?.phone ?? '')
const address = ref(props.edit?.address ?? '')
const work_site = ref(props.edit?.work_site ?? '')
const work_zone = ref(props.edit?.work_zone ?? '')
const work_team = ref(props.edit?.work_team ?? '')
const supervisor_name = ref(props.edit?.supervisor_name ?? '')
const genderOptions = [
  { id: '', name: 'Не указан' },
  { id: 'male', name: 'Мужчина' },
  { id: 'female', name: 'Женщина' },
]
const saving = ref(false)
const error = ref('')
const selectedPhoto = ref<File | null>(null)
const selectedPhotoUrl = ref('')
const photoInput = ref<HTMLInputElement | null>(null)
const storedRecord = ref<EmployeeRecord | null>(null)
const identityLocked = computed(() => saving.value || !!storedRecord.value)
function clearPhoto() { if (selectedPhotoUrl.value) URL.revokeObjectURL(selectedPhotoUrl.value); selectedPhotoUrl.value = ''; selectedPhoto.value = null }
onBeforeUnmount(clearPhoto)
function choosePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try { validateEmployeePhoto(file); clearPhoto(); selectedPhoto.value = file; selectedPhotoUrl.value = URL.createObjectURL(file); error.value = '' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось выбрать фото' }
}


async function submit() {
  if (saving.value) return
  error.value = ''
  if (!personnelNumber.value.trim() || !lastName.value.trim() || !firstName.value.trim()) {
    error.value = 'Заполните табельный номер, фамилию и имя'
    return
  }

  saving.value = true
  try {
    const payload = {
      personnel_number: personnelNumber.value.trim(),
      last_name: lastName.value.trim(),
      first_name: firstName.value.trim(),
      middle_name: middleName.value.trim() || null,
      birth_date: birthDate.value || null,
      gender: gender.value || null,
      email: email.value.trim() || null,
      phone: phone.value.trim() || null,
      address: address.value.trim() || null,
      work_site: work_site.value.trim() || null,
      work_zone: work_zone.value.trim() || null,
      work_team: work_team.value.trim() || null,
      supervisor_name: supervisor_name.value.trim() || null,
    }
    if (!storedRecord.value) {
      const response = props.edit
        ? await updateEmployee(props.companyId, props.edit.id, props.edit.revision, payload)
        : await createEmployee(props.companyId, payload)
      storedRecord.value = response.data
    }
    if (selectedPhoto.value) {
      await uploadEmployeePhoto(props.companyId, storedRecord.value.id, storedRecord.value.revision, selectedPhoto.value)
      storedRecord.value = { ...storedRecord.value, revision: storedRecord.value.revision + 1, has_photo: true }
    }
    emit('saved', storedRecord.value)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Не удалось сохранить карточку сотрудника'
    error.value = storedRecord.value ? 'Данные карточки сохранены. Фото не загрузилось: ' + message : message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="employee-record-form" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div v-if="!edit" class="photo-choice">
      <div class="photo-choice-image"><img v-if="selectedPhotoUrl" :src="selectedPhotoUrl" alt="Предпросмотр фото сотрудника" /><span v-else aria-hidden="true">+</span></div>
      <div><strong>Фото сотрудника</strong><input ref="photoInput" class="photo-choice-input" type="file" accept="image/jpeg,image/png,.jpg,.png" aria-label="Фото для карточки сотрудника" :disabled="saving" @change="choosePhoto" /><BaseButton variant="secondary" :disabled="saving" @click="photoInput?.click()">Выбрать файл</BaseButton><p>{{ selectedPhoto?.name || 'JPG или PNG, до 5 МБ' }}</p><button v-if="selectedPhoto" type="button" :disabled="saving" class="photo-choice-clear" @click="clearPhoto">Убрать выбранное фото</button></div>
    </div>
    <fieldset class="form-grid">
      <legend>Личные данные</legend>
      <BaseFormField v-model="personnelNumber" label="Табельный номер" placeholder="Например: 001245" :disabled="identityLocked" required />
      <BaseFormField v-model="lastName" label="Фамилия" :disabled="identityLocked" required />
      <BaseFormField v-model="firstName" label="Имя" :disabled="identityLocked" required />
      <BaseFormField v-model="middleName" label="Отчество" :disabled="identityLocked" />

      <BaseFormField v-model="birthDate" label="Дата рождения" type="date" :disabled="identityLocked" />
      <BaseSelectField v-model="gender" label="Пол" :options="genderOptions" :disabled="identityLocked" />
    </fieldset>
    <fieldset class="form-grid">
      <legend>Контактные данные</legend>
      <BaseFormField v-model="email" label="Email" type="email" :disabled="identityLocked" autocomplete="email" />
      <BaseFormField v-model="phone" label="Телефон" :disabled="identityLocked" />
      <BaseFormField v-model="address" label="Адрес" :disabled="identityLocked" />
    </fieldset>
    <fieldset class="form-grid">
      <legend>Рабочие данные</legend>
      <BaseFormField v-model="work_site" label="Объект" :disabled="identityLocked" />
      <BaseFormField v-model="work_zone" label="Рабочая зона" :disabled="identityLocked" />
      <BaseFormField v-model="work_team" label="Бригада" :disabled="identityLocked" />
      <BaseFormField v-model="supervisor_name" label="Непосредственный руководитель" :disabled="identityLocked" />

    </fieldset>
    <div class="actions">
      <BaseButton v-if="storedRecord" variant="secondary" :disabled="saving" @click="emit('saved', storedRecord)">Открыть карточку</BaseButton>
      <BaseButton v-else type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : storedRecord ? 'Повторить загрузку фото' : edit ? 'Сохранить карточку' : 'Добавить сотрудника' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.employee-record-form{display:flex;flex-direction:column;gap:var(--space-4);min-height:calc(100dvh - 158px)}
.photo-choice{display:flex;align-items:center;gap:18px;min-width:0;margin-bottom:8px}.photo-choice-image{display:grid;place-items:center;flex:0 0 128px;width:128px;height:128px;border:1px solid var(--color-stroke);border-radius:50%;overflow:hidden;background:var(--color-soft);color:var(--color-muted);font-size:40px;font-weight:400}.photo-choice-image img{width:100%;height:100%;object-fit:cover}.photo-choice>div:last-child{display:grid;gap:10px;min-width:0}.photo-choice strong{font-size:14px;font-weight:500}.photo-choice p{font-size:12px;line-height:1.5;color:var(--color-muted);margin:0;overflow-wrap:anywhere}.photo-choice-input{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}.photo-choice-clear{border:0;background:transparent;padding:0;text-align:left;font:inherit;font-size:12px;color:var(--color-muted)}
.form-grid{display:grid;grid-template-columns:1fr;gap:18px;border:0;padding:0;margin:0;min-width:0}
legend{padding:0 0 16px;font-size:var(--font-section-heading);font-weight:600}
.actions{position:sticky;bottom:-34px;z-index:2;display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;margin-top:auto;padding:16px 0;background:var(--color-surface);border-top:1px solid var(--color-stroke)}
@media(max-width:600px){.employee-record-form{min-height:calc(100dvh - 128px)}.actions{bottom:-28px}.actions :deep(button){flex:1}}
</style>
