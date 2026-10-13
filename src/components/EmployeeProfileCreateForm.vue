<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { createEmployeeProfileRecord, updateEmployeeProfileRecord, type ProfileEditRow, type ProfileSection } from '../api/personnel'

const props = defineProps<{ companyId: string; employeeId: string; edit?: { section: ProfileSection; record: ProfileEditRow }; initialSection?: ProfileSection }>()
const emit = defineEmits<{ saved: []; cancelled: [] }>()
const section = ref<ProfileSection>(props.edit?.section ?? props.initialSection ?? 'experience')
const saving = ref(false)
const error = ref('')
const success = ref('')
// The component is keyed by record ID/revision when used as an editor: an
// outdated form cannot silently inherit fields from another employee record.
const form = reactive<Record<string, string>>(Object.fromEntries(
  Object.entries(props.edit?.record ?? {}).map(([key, value]) => [key, value == null ? '' : String(value)]),
))
const sections: { value: ProfileSection; label: string }[] = [
  { value: 'experience', label: 'Стаж' },
  { value: 'reserve', label: 'Кадровый резерв' },
  { value: 'training', label: 'Обучение' },
]
const fields: Record<ProfileSection, { key: string; label: string; required?: boolean; type?: string }[]> = {
  experience: [
    { key:'experience_type',label:'Вид стажа',required:true },
    { key:'started_on',label:'Дата начала',type:'date',required:true },
    { key:'ended_on',label:'Дата окончания',type:'date' },
    { key:'basis_reference',label:'Основание' },
  ],
  reserve: [
    { key:'target_position',label:'Резервируемая должность',required:true },
    { key:'reserve_level',label:'Уровень резерва',required:true },
    { key:'reserve_type',label:'Вид резерва',required:true },
    { key:'joined_year',label:'Год зачисления',type:'number',required:true },
    { key:'left_year',label:'Год исключения',type:'number' },
    { key:'notes',label:'Примечание' },
  ],
  training: [
    { key:'training_type',label:'Вид обучения',required:true },
    { key:'training_mode',label:'Способ обучения',required:true },
    { key:'topic',label:'Тема',required:true },
    { key:'provider',label:'Учебный центр' },
    { key:'city',label:'Город' },
    { key:'started_on',label:'Дата начала',type:'date',required:true },
    { key:'ended_on',label:'Дата окончания',type:'date' },
    { key:'document_reference',label:'Документ об обучении' },
  ],
}
const visible = computed(() => fields[section.value])
function selectSection(next: ProfileSection) {
  section.value = next
  for (const key of Object.keys(form)) delete form[key]
  error.value = ''
  success.value = ''
}
async function submit() {
  if (saving.value) return
  error.value = ''
  success.value = ''
  const body: Record<string, string | number | null> = {}
  for (const field of visible.value) {
    const value = (form[field.key] ?? '').trim()
    if (field.required && !value) {
      error.value = 'Заполните обязательные поля.'
      return
    }
    body[field.key] = value ? (field.type === 'number' ? Number(value) : value) : null
  }
  const start = form.started_on
  const end = form.ended_on
  if (start && end && end < start) {
    error.value = 'Дата окончания не может быть раньше даты начала.'
    return
  }
  if (section.value === 'reserve' && form.left_year && Number(form.left_year) < Number(form.joined_year)) {
    error.value = 'Год исключения не может быть раньше года зачисления.'
    return
  }
  saving.value = true
  try {
    if (props.edit) {
      await updateEmployeeProfileRecord(
        props.companyId, props.employeeId, section.value,
        props.edit.record.id, props.edit.record.revision, body,
      )
    } else {
      await createEmployeeProfileRecord(props.companyId, props.employeeId, section.value, body)
      for (const key of Object.keys(form)) delete form[key]
    }
    success.value = props.edit ? 'Изменения сохранены.' : 'Запись создана.'
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить запись'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="create-form" :aria-label="edit ? 'Редактирование кадровых сведений' : 'Добавление кадровых сведений'">
    <h2>{{ edit ? 'Редактировать кадровые сведения' : 'Добавить кадровые сведения' }}</h2>
    <p class="form-hint">Изменения сохраняются с проверкой прав и журналом аудита.</p>
    <div v-if="!edit && !initialSection" class="section-tabs" role="group" aria-label="Раздел карточки">
      <BaseButton v-for="item in sections" :key="item.value" variant="secondary"
        :disabled="saving" @click="selectSection(item.value)">{{ item.label }}{{ section === item.value ? ' ✓' : '' }}</BaseButton>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <label v-for="field in visible" :key="field.key" class="field">
          <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
          <select v-if="field.key === 'training_mode'" v-model="form[field.key]" required>
            <option value="">Выберите способ</option>
            <option value="in_person">Очно</option>
            <option value="remote">Дистанционно</option>
            <option value="on_the_job">Без отрыва от работы</option>
          </select>
          <input v-else v-model="form[field.key]" :type="field.type ?? 'text'"
            :required="field.required" :min="field.type === 'number' ? 1900 : undefined"
            :max="field.type === 'number' ? 2100 : undefined" autocomplete="off" />
        </label>
      </div>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <BaseNotice v-if="success" tone="info">{{ success }}</BaseNotice>
      <div class="form-actions">
        <BaseButton type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : (edit ? 'Сохранить изменения' : 'Сохранить запись') }}</BaseButton>
        <BaseButton v-if="edit" variant="secondary" :disabled="saving" @click="emit('cancelled')">Отмена</BaseButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.create-form{display:grid;gap:var(--space-4);min-width:0}
.create-form h2{margin:0;font-size:var(--font-section-heading)}
.form-hint{margin:0;color:var(--color-muted)}
.section-tabs,.form-actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}
.create-form form{display:grid;gap:var(--space-4)}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.field{display:grid;gap:var(--space-2);min-width:0;font-size:var(--font-body-size)}
.field input,.field select{width:100%;min-width:0;min-height:var(--control-height);background:var(--color-surface);color:var(--color-text);border:1px solid var(--color-stroke);border-radius:var(--radius-md);padding:8px 12px;font:inherit}
.field input:focus-visible,.field select:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:600px){.form-grid{grid-template-columns:minmax(0,1fr)}}
</style>
