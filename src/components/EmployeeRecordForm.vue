<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import { createEmployee, updateEmployee, type EmployeeRecord } from '../api/personnel'

import { readEmployeePhoto, removeEmployeePhoto, uploadEmployeePhoto, validateEmployeePhoto } from '../api/employeePhoto'
import { Pencil } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  companyId: string
  edit?: EmployeeRecord | null
  showActions?: boolean
  managePhoto?: boolean
  formId?: string
}>(), {
  // The normal create flow retains its own Save/Cancel controls. Only the
  // inline employee-card editor deliberately hides them in favor of the header.
  showActions: true,
})

const emit = defineEmits<{ saved: [employee: EmployeeRecord]; cancelled: []; dirty: [value: boolean]; saving: [value: boolean] }>()

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
const persistedPhotoUrl = ref('')
const removeStoredPhoto = ref(false)
const loadingPhoto = ref(false)
let photoRequest: AbortController | null = null
const photoInput = ref<HTMLInputElement | null>(null)
const storedRecord = ref<EmployeeRecord | null>(null)
const identityLocked = computed(() => saving.value || !!storedRecord.value)
function clearPhoto() { if (selectedPhotoUrl.value) URL.revokeObjectURL(selectedPhotoUrl.value); selectedPhotoUrl.value = ''; selectedPhoto.value = null }
onBeforeUnmount(() => {
  clearPhoto()
  photoRequest?.abort()
  if (persistedPhotoUrl.value) URL.revokeObjectURL(persistedPhotoUrl.value)
})
onMounted(async () => {
  if (!props.edit?.has_photo || !props.managePhoto) return
  loadingPhoto.value = true
  const controller = new AbortController()
  photoRequest = controller
  try {
    const image = await readEmployeePhoto(props.companyId, props.edit.id, controller.signal)
    if (!controller.signal.aborted) persistedPhotoUrl.value = URL.createObjectURL(image)
  } catch {
    // Photo retrieval must not block editing other fields.
  } finally { loadingPhoto.value = false }
})
const draftSnapshot = computed(() => JSON.stringify([
  personnelNumber.value, lastName.value, firstName.value, middleName.value,
  birthDate.value, gender.value, email.value, phone.value, address.value,
  work_site.value, work_zone.value, work_team.value, supervisor_name.value,
]))
const initialSnapshot = draftSnapshot.value
const hasCoreChanges = computed(() => !props.edit || draftSnapshot.value !== initialSnapshot)
const hasChanges = computed(() => hasCoreChanges.value || !!selectedPhoto.value || removeStoredPhoto.value)
watch(hasChanges, value => emit('dirty', value), { immediate: true })
watch(saving, value => emit('saving', value))
function stageRemovePhoto() {
  clearPhoto()
  removeStoredPhoto.value = !!props.edit?.has_photo
  if (photoInput.value) photoInput.value.value = ''
}

function choosePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try { validateEmployeePhoto(file); clearPhoto(); removeStoredPhoto.value = false; selectedPhoto.value = file; selectedPhotoUrl.value = URL.createObjectURL(file); error.value = '' }
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
    if (!storedRecord.value && hasCoreChanges.value) {
      const response = props.edit
        ? await updateEmployee(props.companyId, props.edit.id, props.edit.revision, payload)
        : await createEmployee(props.companyId, payload)
      storedRecord.value = response.data
    }
    if (!storedRecord.value && props.edit) storedRecord.value = props.edit
    if (!storedRecord.value) throw new Error('Не удалось подготовить карточку к сохранению')
    if (selectedPhoto.value) {
      await uploadEmployeePhoto(props.companyId, storedRecord.value.id, storedRecord.value.revision, selectedPhoto.value)
      storedRecord.value = { ...storedRecord.value, revision: storedRecord.value.revision + 1, has_photo: true }
    } else if (removeStoredPhoto.value && storedRecord.value.has_photo) {
      await removeEmployeePhoto(props.companyId, storedRecord.value.id, storedRecord.value.revision)
      storedRecord.value = { ...storedRecord.value, revision: storedRecord.value.revision + 1, has_photo: false }
    }
    emit('saved', storedRecord.value)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Не удалось сохранить карточку сотрудника'
    error.value = storedRecord.value && (selectedPhoto.value || removeStoredPhoto.value) ? 'Данные карточки сохранены. Фото не загрузилось: ' + message : message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form :id="formId" class="employee-record-form"
    :class="{ 'employee-record-form--inline': showActions === false }" @submit.prevent="submit">
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <div v-if="!edit || managePhoto" class="photo-choice">
      <div v-if="edit && managePhoto" class="photo-choice-heading">
        <strong>Фотография</strong><span>JPG или PNG до 5 МБ · сохранение общей кнопкой выше</span>
      </div>
      <div class="photo-choice-image">
        <img v-if="selectedPhotoUrl || (persistedPhotoUrl && !removeStoredPhoto)"
          :src="selectedPhotoUrl || persistedPhotoUrl" alt="Предпросмотр фото сотрудника" />
        <span v-else aria-hidden="true">{{ loadingPhoto ? '…' : '+' }}</span>
        <button v-if="managePhoto" type="button" class="photo-choice-pencil"
          aria-label="Изменить фотографию сотрудника" title="Изменить фотографию"
          :disabled="saving" @click="photoInput?.click()"><Pencil :size="15" aria-hidden="true" /></button>
      </div>
      <div><strong>Фото сотрудника</strong><input ref="photoInput" class="photo-choice-input" type="file" accept="image/jpeg,image/png,.jpg,.png" aria-label="Фото для карточки сотрудника" :disabled="saving" @change="choosePhoto" /><BaseButton v-if="!managePhoto" variant="secondary" :disabled="saving" @click="photoInput?.click()">Выбрать файл</BaseButton><p>{{ selectedPhoto?.name || 'JPG или PNG, до 5 МБ' }}</p><button v-if="selectedPhoto" type="button" :disabled="saving" class="photo-choice-clear" @click="clearPhoto">Убрать выбранное фото</button>
        <button v-if="managePhoto && edit?.has_photo && !removeStoredPhoto" type="button"
          :disabled="saving" class="photo-choice-clear" @click="stageRemovePhoto">Удалить фотографию после сохранения</button>
        <span v-if="removeStoredPhoto" class="photo-choice-staged">Удаление отмечено · ещё не сохранено</span></div>
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
    <div v-if="showActions !== false" class="actions">
      <BaseButton v-if="storedRecord" variant="secondary" :disabled="saving" @click="emit('saved', storedRecord)">Открыть карточку</BaseButton>
      <BaseButton v-else type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : storedRecord ? 'Повторить загрузку фото' : edit ? 'Сохранить карточку' : 'Добавить сотрудника' }}</BaseButton>
    </div>
  </form>
</template>

<style scoped>
.employee-record-form{display:flex;flex-direction:column;gap:var(--space-4);min-height:calc(100dvh - 158px)}
.employee-record-form--inline{min-height:0;gap:18px;margin:0 0 16px}
.employee-record-form--inline .form-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;row-gap:12px}
.photo-choice{display:flex;align-items:center;flex-wrap:wrap;gap:12px;min-width:0;margin-bottom:8px}.photo-choice-heading{display:grid;gap:3px;flex:1 1 100%}.photo-choice-heading span{font-size:11px;color:var(--color-muted)}
.photo-choice-image{position:relative;display:grid;place-items:center;flex:0 0 128px;width:128px;height:128px;border:1px solid var(--color-stroke);border-radius:50%;overflow:hidden;background:var(--color-soft);color:var(--color-muted);font-size:40px;font-weight:400}.photo-choice-image img{width:100%;height:100%;object-fit:cover}.photo-choice>div:last-child{display:grid;gap:10px;min-width:0}.photo-choice strong{font-size:14px;font-weight:500}.photo-choice p{font-size:12px;line-height:1.5;color:var(--color-muted);margin:0;overflow-wrap:anywhere}.photo-choice-pencil{position:absolute;right:2px;bottom:2px;display:grid;place-items:center;width:29px;height:29px;border:1px solid var(--color-stroke);background:var(--color-surface);color:var(--color-text);border-radius:50%;cursor:pointer;box-shadow:var(--shadow-sm)}
.photo-choice-staged{font-size:11px;color:var(--color-warning)}
.photo-choice-input{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}.photo-choice-clear{border:0;background:transparent;padding:0;text-align:left;font:inherit;font-size:12px;color:var(--color-muted)}
.form-grid{display:grid;grid-template-columns:1fr;gap:18px;border:0;padding:0;margin:0;min-width:0}
legend{padding:0 0 16px;font-size:var(--font-section-heading);font-weight:600}
.actions{position:sticky;bottom:-34px;z-index:2;display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;margin-top:auto;padding:16px 0;background:var(--color-surface);border-top:1px solid var(--color-stroke)}
@media(max-width:600px){.employee-record-form--inline .form-grid{grid-template-columns:1fr}.employee-record-form{min-height:calc(100dvh - 128px)}.actions{bottom:-28px}.actions :deep(button){flex:1}}
</style>
