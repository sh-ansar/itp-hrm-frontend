<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BadgeCheck, BookOpenCheck, BriefcaseBusiness, Clock3, ShieldCheck, UserRound } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import BaseCard from '../components/ui/BaseCard.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import EmployeeAssignmentCreateForm from '../components/EmployeeAssignmentCreateForm.vue'
import { getEmployee, type EmployeeAssignment, type EmployeeDetail, type ProfileEditRow, type ProfileSection } from '../api/personnel'

const route = useRoute()
const profile = ref<EmployeeDetail | null>(null)
const loading = ref(false)
const error = ref('')
const editing = ref<{ section: ProfileSection; record: ProfileEditRow } | null>(null)
const assignmentEditing = ref<EmployeeAssignment | null>(null)
const assignmentTransitioning = ref<EmployeeAssignment | null>(null)

const currentAssignment = computed(() => profile.value?.assignments.find(item => item.valid_to === null) ?? profile.value?.assignments[0] ?? null)
const initials = computed(() => {
  const data = profile.value?.data
  if (!data) return ''
  return [data.first_name, data.last_name].filter(Boolean).map(value => value.charAt(0).toUpperCase()).join('')
})

function beginEdit(section: ProfileSection, record: ProfileEditRow) {
  editing.value = { section, record }
}

let generation = 0
const columns = computed(() => [
  { key: 'department_name', label: 'Подразделение' },
  { key: 'position_name', label: 'Должность' },
  { key: 'valid_from', label: 'С даты' },
  { key: 'valid_to', label: 'По дату' },
  { key: 'basis_reference', label: 'Основание' },
  ...(profile.value?.meta.assignment_writes_enabled ? [{ key: 'edit', label: 'Действия' }] : []),
])

async function load() {
  const current = ++generation
  const company = String(route.params.company ?? '')
  const employee = String(route.params.employee ?? '')
  loading.value = true
  editing.value = null
  assignmentEditing.value = null
  assignmentTransitioning.value = null
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
    <BasePageHeading title="Карточка сотрудника" description="Единая карточка кадровых сведений, назначений и развития">
      <RouterLink class="back-link" to="/employees">К реестру</RouterLink>
      <BaseButton variant="secondary" :disabled="loading" @click="load">Обновить</BaseButton>
    </BasePageHeading>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loading" label="Загрузка карточки сотрудника" />

    <template v-else-if="profile">
      <BaseCard class="employee-hero">
        <div class="identity-block">
          <div class="avatar" aria-hidden="true">{{ initials }}</div>
          <div class="identity-copy">
            <div class="identity-title-row">
              <h2>{{ profile.data.last_name }} {{ profile.data.first_name }} {{ profile.data.middle_name ?? '' }}</h2>
              <span class="status-pill"><BadgeCheck :size="14" /> Активный сотрудник</span>
            </div>
            <p class="current-role">{{ currentAssignment?.position_name ?? 'Должность не назначена' }}</p>
            <p class="muted">{{ currentAssignment?.department_name ?? 'Подразделение не назначено' }}</p>
          </div>
        </div>
        <div class="hero-facts">
          <div><span>Табельный номер</span><strong>{{ profile.data.personnel_number }}</strong></div>
          <div><span>Текущее назначение</span><strong>{{ currentAssignment?.valid_from ?? '—' }}</strong></div>
          <div><span>История назначений</span><strong>{{ profile.assignments.length }}</strong></div>
        </div>
      </BaseCard>

      <nav class="profile-nav" aria-label="Разделы карточки сотрудника">
        <a href="#employment"><BriefcaseBusiness :size="16" /> Работа и назначения</a>
        <a v-if="profile.meta.extended_sections_visible" href="#experience"><Clock3 :size="16" /> Стаж</a>
        <a v-if="profile.meta.extended_sections_visible" href="#training"><BookOpenCheck :size="16" /> Обучение</a>
        <a v-if="profile.meta.extended_sections_visible" href="#reserve"><ShieldCheck :size="16" /> Кадровый резерв</a>
      </nav>

      <BaseCard id="employment">
        <div class="section-header">
          <div>
            <p class="section-kicker">Работа</p>
            <h2>Назначения и кадровое положение</h2>
          </div>
          <div v-if="currentAssignment" class="current-assignment">
            <UserRound :size="17" />
            <span><strong>{{ currentAssignment.position_name }}</strong><small>{{ currentAssignment.department_name }}</small></span>
          </div>
        </div>
        <BaseDataTable :columns="columns" :rows="profile.assignments" row-key="id"
          caption="Доступная история назначений" empty-title="Назначений не найдено"
          empty-description="Для сотрудника нет доступных кадровых назначений.">
          <template #cell-valid_to="{ value }">{{ value ?? 'По настоящее время' }}</template>
          <template #cell-edit="{ row }">
            <div class="row-actions">
              <BaseButton variant="secondary" @click="assignmentEditing = row; assignmentTransitioning = null">Изменить</BaseButton>
              <BaseButton v-if="row.valid_to === null" @click="assignmentTransitioning = row; assignmentEditing = null">Перевести</BaseButton>
            </div>
          </template>
        </BaseDataTable>
        <BaseNotice v-if="profile.meta.assignments_truncated" tone="info">Отображены первые 100 назначений. Полная история требует отдельного просмотра.</BaseNotice>

        <div class="embedded-form">
          <EmployeeAssignmentCreateForm
            v-if="profile.meta.assignment_writes_enabled && !assignmentEditing && !assignmentTransitioning"
            :company-id="String(route.params.company)"
            :employee-id="String(route.params.employee)"
            @saved="load"
          />
          <EmployeeAssignmentCreateForm
            v-if="profile.meta.assignment_writes_enabled && assignmentEditing"
            :key="assignmentEditing.id + ':' + assignmentEditing.revision"
            :edit="assignmentEditing"
            :company-id="String(route.params.company)"
            :employee-id="String(route.params.employee)"
            @saved="load"
            @cancelled="assignmentEditing = null"
          />
          <EmployeeAssignmentCreateForm
            v-if="profile.meta.assignment_writes_enabled && assignmentTransitioning"
            :key="'transition:' + assignmentTransitioning.id + ':' + assignmentTransitioning.revision"
            :transition-from="assignmentTransitioning"
            :company-id="String(route.params.company)"
            :employee-id="String(route.params.employee)"
            @saved="load"
            @cancelled="assignmentTransitioning = null"
          />
        </div>
      </BaseCard>

      <BaseCard v-if="profile.meta.profile_writes_enabled" class="profile-action-card">
        <div class="section-header compact">
          <div><p class="section-kicker">Развитие</p><h2>Добавить сведения в карточку</h2></div>
          <span class="muted">Стаж · резерв · обучение</span>
        </div>
        <EmployeeProfileCreateForm :company-id="String(route.params.company)" :employee-id="String(route.params.employee)" @saved="load" />
      </BaseCard>

      <template v-if="profile.meta.extended_sections_visible">
        <BaseCard id="experience">
          <div class="section-header compact"><div><p class="section-kicker">История</p><h2>Трудовой стаж</h2></div><span class="counter">{{ profile.experience.length }} записей</span></div>
          <BaseDataTable :rows="profile.experience" row-key="id" caption="Периоды трудового стажа"
            :columns="[{key:'experience_type',label:'Вид стажа'},{key:'started_on',label:'Начало'},{key:'ended_on',label:'Окончание'},{key:'basis_reference',label:'Основание'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Сведения о стаже отсутствуют" empty-description="Периоды стажа ещё не внесены.">
            <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('experience', row)">Изменить</BaseButton></template>
          </BaseDataTable>
          <EmployeeProfileCreateForm v-if="editing?.section === 'experience' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision" :edit="editing"
            :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>

        <BaseCard id="training">
          <div class="section-header compact"><div><p class="section-kicker">Развитие</p><h2>Дополнительное обучение</h2></div><span class="counter">{{ profile.training.length }} записей</span></div>
          <BaseDataTable :rows="profile.training" row-key="id" caption="Обучение сотрудника"
            :columns="[{key:'training_type',label:'Вид'},{key:'training_mode',label:'Способ'},{key:'topic',label:'Тема'},{key:'provider',label:'Центр обучения'},{key:'city',label:'Город'},{key:'started_on',label:'С даты'},{key:'ended_on',label:'По дату'},{key:'document_reference',label:'Документ'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Обучение не зарегистрировано" empty-description="Данных о дополнительном обучении пока нет.">
            <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('training', row)">Изменить</BaseButton></template>
          </BaseDataTable>
          <EmployeeProfileCreateForm v-if="editing?.section === 'training' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision" :edit="editing"
            :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>

        <BaseCard id="reserve">
          <div class="section-header compact"><div><p class="section-kicker">Развитие</p><h2>Кадровый резерв</h2></div><span class="counter">{{ profile.reserve.length }} записей</span></div>
          <BaseDataTable :rows="profile.reserve" row-key="id" caption="Кадровый резерв сотрудника"
            :columns="[{key:'target_position',label:'Резервируемая должность'},{key:'reserve_level',label:'Уровень'},{key:'reserve_type',label:'Вид'},{key:'joined_year',label:'Год зачисления'},{key:'left_year',label:'Год исключения'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
            empty-title="Записей резерва нет" empty-description="Сотрудник не включён в записи кадрового резерва.">
            <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('reserve', row)">Изменить</BaseButton></template>
          </BaseDataTable>
          <EmployeeProfileCreateForm v-if="editing?.section === 'reserve' && profile.meta.profile_writes_enabled"
            :key="editing.record.id + ':' + editing.record.revision" :edit="editing"
            :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
            @saved="load" @cancelled="editing = null" />
        </BaseCard>
      </template>
    </template>
  </section>
</template>

<style scoped>
.employee-profile{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--space-4);scroll-behavior:smooth}
.employee-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.8fr);gap:var(--space-5);align-items:center;background:linear-gradient(135deg,#fff 0%,#f4fbff 100%)}
.identity-block{display:flex;align-items:center;gap:18px;min-width:0}
.avatar{display:grid;place-items:center;flex:0 0 auto;width:70px;height:70px;border-radius:22px;background:linear-gradient(135deg,var(--color-primary),#65c7f7);color:#fff;font-size:22px;font-weight:700;box-shadow:0 8px 20px rgba(6,151,224,.18)}
.identity-copy{min-width:0}
.identity-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.identity-title-row h2{margin:0;font-size:24px;line-height:1.25}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:11px;font-weight:700}
.current-role{margin:8px 0 3px;font-weight:700;font-size:15px}
.identity-copy .muted{margin:0}
.hero-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.hero-facts>div{display:grid;gap:5px;padding:13px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:rgba(255,255,255,.72)}
.hero-facts span{font-size:11px;color:var(--color-muted)}
.hero-facts strong{font-size:13px;overflow-wrap:anywhere}
.profile-nav{display:flex;gap:8px;overflow-x:auto;padding:4px 0 2px}
.profile-nav a{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;padding:9px 12px;border:1px solid var(--color-stroke);border-radius:999px;background:#fff;color:#416579;font-size:13px;font-weight:600}
.profile-nav a:hover{border-color:rgba(6,151,224,.3);color:var(--color-primary)}
.section-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-header.compact{align-items:end}
.section-header h2{font-size:var(--font-section-heading);margin:0}
.section-kicker{margin:0 0 5px;color:var(--color-primary);font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase}
.current-assignment{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:var(--radius-md);background:var(--color-soft);color:var(--color-text)}
.current-assignment span{display:grid;gap:2px}
.current-assignment small{font-size:11px;color:var(--color-muted)}
.counter{font-size:12px;color:var(--color-muted);padding:6px 9px;border-radius:999px;background:var(--color-soft)}
.embedded-form{margin-top:var(--space-5);padding-top:var(--space-5);border-top:1px solid var(--color-stroke)}
.row-actions{display:flex;gap:var(--space-2);flex-wrap:wrap}
.back-link{display:inline-flex;align-items:center;color:var(--color-primary);font-weight:600;padding:var(--space-2)}
.back-link:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:980px){.employee-hero{grid-template-columns:1fr}.hero-facts{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.identity-block{align-items:flex-start}.avatar{width:56px;height:56px;border-radius:18px}.identity-title-row h2{font-size:20px}.hero-facts{grid-template-columns:1fr}.section-header{align-items:stretch}.current-assignment{width:100%}}
</style>
