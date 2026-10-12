<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import EmployeeAssignmentCreateForm from '../components/EmployeeAssignmentCreateForm.vue'
import { getEmployee, type EmployeeDetail, type ProfileEditRow, type ProfileSection } from '../api/personnel'

const route = useRoute()
const profile = ref<EmployeeDetail | null>(null)
const loading = ref(false)
const error = ref('')
const editing = ref<{ section: ProfileSection; record: ProfileEditRow } | null>(null)
function beginEdit(section: ProfileSection, record: ProfileEditRow) {
  editing.value = { section, record }
}
let generation = 0
const columns = [
  { key: 'department_name', label: 'Подразделение' },
  { key: 'position_name', label: 'Должность' },
  { key: 'valid_from', label: 'С даты' },
  { key: 'valid_to', label: 'По дату' },
  { key: 'basis_reference', label: 'Основание' },
]
async function load() {
  const current = ++generation
  const company = String(route.params.company ?? '')
  const employee = String(route.params.employee ?? '')
  loading.value = true
  editing.value = null
  error.value = ''
  profile.value = null
  try {
    const result = await getEmployee(company, employee)
    if (current === generation) profile.value = result
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось открыть карточку сотрудника'
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(() => [route.params.company, route.params.employee], load)
onMounted(load)
</script>

<template>
  <section class="employee-profile">
    <BasePageHeading title="Карточка сотрудника" description="Кадровые сведения и доступная история назначений">
      <RouterLink class="back-link" to="/employees">К реестру</RouterLink>
      <BaseButton variant="secondary" :disabled="loading" @click="load">Обновить</BaseButton>
    </BasePageHeading>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loading" label="Загрузка карточки сотрудника" />
    <template v-else-if="profile">
      <BaseCard>
        <div class="profile-grid">
          <div><span class="field-label">ФИО</span><strong>{{ profile.data.last_name }} {{ profile.data.first_name }} {{ profile.data.middle_name ?? '' }}</strong></div>
          <div><span class="field-label">Табельный номер</span><strong>{{ profile.data.personnel_number }}</strong></div>
        </div>
      </BaseCard>
      <BaseCard>
        <h2>История назначений</h2>
        <BaseDataTable :columns="columns" :rows="profile.assignments" row-key="id"
          caption="Доступная история назначений" empty-title="Назначений не найдено"
          empty-description="Для сотрудника нет доступных кадровых назначений.">
          <template #cell-valid_to="{ value }">{{ value ?? 'По настоящее время' }}</template>
        </BaseDataTable>
        <BaseNotice v-if="profile.meta.assignments_truncated" tone="info">Отображены первые 100 назначений. Полная история требует отдельного просмотра.</BaseNotice>
        <EmployeeAssignmentCreateForm
          v-if="profile.meta.assignment_writes_enabled"
          :company-id="String(route.params.company)"
          :employee-id="String(route.params.employee)"
          @saved="load"
        />
      </BaseCard>
      <BaseCard v-if="profile.meta.profile_writes_enabled">
        <EmployeeProfileCreateForm :company-id="String(route.params.company)" :employee-id="String(route.params.employee)" @saved="load" />
      </BaseCard>
      <template v-if="profile.meta.extended_sections_visible">
        <BaseCard>
          <h2>Трудовой стаж</h2>
          <BaseDataTable :rows="profile.experience" row-key="id" caption="Периоды трудового стажа"
            :columns="[{key:'experience_type',label:'Вид стажа'},{key:'started_on',label:'Начало'},{key:'ended_on',label:'Окончание'},{key:'basis_reference',label:'Основание'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Сведения о стаже отсутствуют" empty-description="Периоды стажа ещё не внесены." >
            <template #cell-edit="{ row }">
              <BaseButton variant="secondary" @click="beginEdit('experience', row)">Изменить</BaseButton>
            </template>
          </BaseDataTable>
          <EmployeeProfileCreateForm
            v-if="editing?.section === 'experience' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision"
            :edit="editing" :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>
        <BaseCard>
          <h2>Кадровый резерв</h2>
          <BaseDataTable :rows="profile.reserve" row-key="id" caption="Кадровый резерв сотрудника"
            :columns="[{key:'target_position',label:'Резервируемая должность'},{key:'reserve_level',label:'Уровень'},{key:'reserve_type',label:'Вид'},{key:'joined_year',label:'Год зачисления'},{key:'left_year',label:'Год исключения'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Записей резерва нет" empty-description="Сотрудник не включён в записи кадрового резерва." >
            <template #cell-edit="{ row }">
              <BaseButton variant="secondary" @click="beginEdit('reserve', row)">Изменить</BaseButton>
            </template>
          </BaseDataTable>
          <EmployeeProfileCreateForm
            v-if="editing?.section === 'reserve' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision"
            :edit="editing" :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>
        <BaseCard>
          <h2>Дополнительное обучение</h2>
          <BaseDataTable :rows="profile.training" row-key="id" caption="Обучение сотрудника"
            :columns="[{key:'training_type',label:'Вид'},{key:'training_mode',label:'Способ'},{key:'topic',label:'Тема'},{key:'provider',label:'Центр обучения'},{key:'city',label:'Город'},{key:'started_on',label:'С даты'},{key:'ended_on',label:'По дату'},{key:'document_reference',label:'Документ'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Обучение не зарегистрировано" empty-description="Данных о дополнительном обучении пока нет." >
            <template #cell-edit="{ row }">
              <BaseButton variant="secondary" @click="beginEdit('training', row)">Изменить</BaseButton>
            </template>
          </BaseDataTable>
          <EmployeeProfileCreateForm
            v-if="editing?.section === 'training' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision"
            :edit="editing" :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>
      </template>
    </template>
  </section>
</template>

<style scoped>
.employee-profile{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4)}
.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-5)}
.profile-grid>div{display:grid;gap:var(--space-2)}
.field-label{font-size:var(--font-caption-size);color:var(--color-muted)}
strong{font-size:var(--font-body-size);overflow-wrap:anywhere}
h2{font-size:var(--font-section-heading);margin:0 0 var(--space-4)}
.back-link{display:inline-flex;align-items:center;color:var(--color-primary);font-weight:600;padding:var(--space-2)}
.back-link:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:600px){.profile-grid{grid-template-columns:minmax(0,1fr)}}
</style>
