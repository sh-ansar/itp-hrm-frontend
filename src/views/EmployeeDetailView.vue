<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import EmployeeProfileSection from '../components/EmployeeProfileSection.vue'
import EmployeeDataGrid, { type EmployeeDisplayField } from '../components/EmployeeDataGrid.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import EmployeeAssignmentCreateForm from '../components/EmployeeAssignmentCreateForm.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { getEmployee, type EmployeeAssignment, type EmployeeDetail, type ProfileEditRow, type ProfileSection } from '../api/personnel'
import { localTodayISO } from '../utils/localDate'

const route = useRoute()
const profile = ref<EmployeeDetail | null>(null)
const loading = ref(false)
const error = ref('')
const editing = ref<{ section: ProfileSection; record: ProfileEditRow } | null>(null)
const assignmentEditing = ref<EmployeeAssignment | null>(null)
const assignmentTransitioning = ref<EmployeeAssignment | null>(null)
const identityEditOpen = ref(false)
const assignmentCreateOpen = ref(false)
const profileCreateOpen = ref(false)
const activeSection = ref('personal')
const sectionTabs = computed(() => [
  ...(profile.value?.meta.extended_sections_visible ? [
    { id: 'personal', label: 'Личные данные' },
    { id: 'organization', label: 'Организационные данные' },
  ] : []),
  { id: 'employment', label: 'Трудовые данные' },
  ...(profile.value?.meta.extended_sections_visible ? [
    { id: 'documents', label: 'Документы' },
    { id: 'payroll', label: 'Расчёты и начисления' },
    { id: 'schedule', label: 'График и табель' },
    { id: 'development', label: 'Кадровый резерв и обучение' },
    { id: 'history', label: 'История изменений' },
  ] : []),
])

function normalizeProfileTab(requested: unknown): string {
  const aliases: Record<string, string> = {
    experience: 'employment',
    training: 'development',
    reserve: 'development',
  }
  const proposed = typeof requested === 'string' ? (aliases[requested] ?? requested) : ''
  return sectionTabs.value.some(tab => tab.id === proposed)
    ? proposed : (sectionTabs.value[0]?.id ?? 'employment')
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const plain = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plain)) return value
  const date = new Date(plain + 'T12:00:00')
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function trainingModeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    in_person: 'Очное', remote: 'Дистанционное', on_the_job: 'На рабочем месте',
  }
  return labels[String(value)] ?? String(value ?? '—')
}
const today = localTodayISO()
const currentAssignment = computed(() => profile.value?.assignments.find(item =>
  item.valid_from <= today && (item.valid_to === null || item.valid_to >= today)) ?? null)
const plannedAssignment = computed(() => profile.value?.assignments.find(item =>
  item.valid_from > today && item.valid_to === null) ?? null)
const employmentStatus = computed(() => currentAssignment.value
  ? 'Активный сотрудник'
  : plannedAssignment.value ? 'Приём запланирован' : 'Нет активного назначения')
const displayName = computed(() => {
  const employee = profile.value?.data
  return employee
    ? [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' ')
    : 'Карточка сотрудника'
})

const initials = computed(() => {
  const data = profile.value?.data
  if (!data) return ''
  return [data.first_name, data.last_name].filter(Boolean).map(value => value.charAt(0).toUpperCase()).join('')
})

const reference = computed(() => profile.value?.reference_profile)
const genderLabel = computed(() => profile.value?.data.gender === 'male' ? 'Мужчина' : profile.value?.data.gender === 'female' ? 'Женщина' : '—')
function money(value: number | null | undefined, currency = 'KZT'): string {
  return value == null ? '—' : `${Number(value).toLocaleString('ru-RU')} ${currency}`
}
const personalFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'ИИН', value: reference.value?.personal.iin },
  { label: 'Дата рождения', value: formatDate(profile.value?.data.birth_date) },
  { label: 'Пол', value: genderLabel.value },
  { label: 'Гражданство', value: reference.value?.personal.citizenship },
  { label: 'Семейное положение', value: reference.value?.personal.marital_status },
  { label: 'Табельный номер', value: profile.value?.data.personnel_number },
])
const contactFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Email', value: profile.value?.data.email },
  { label: 'Телефон', value: profile.value?.data.phone },
  { label: 'Адрес проживания', value: reference.value?.personal.residence_address ?? profile.value?.data.address, wide: true },
  { label: 'Адрес регистрации', value: reference.value?.personal.registration_address, wide: true },
  { label: 'Контактное лицо', value: reference.value?.personal.emergency_contact_name },
  { label: 'Телефон контактного лица', value: reference.value?.personal.emergency_contact_phone },
])
const documentFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Тип документа', value: reference.value?.identity_document.type },
  { label: 'Номер документа', value: reference.value?.identity_document.number },
  { label: 'Дата выдачи', value: formatDate(reference.value?.identity_document.issued_on) },
  { label: 'Действителен до', value: formatDate(reference.value?.identity_document.expires_on) },
  { label: 'Кем выдан', value: reference.value?.identity_document.issued_by, wide: true },
])
const bankingFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Банк', value: reference.value?.banking.bank_name },
  { label: 'IBAN', value: reference.value?.banking.iban, wide: true },
  { label: 'Зарплатный счёт', value: reference.value?.banking.payroll_account },
])
const organizationFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Подразделение', value: currentAssignment.value?.department_name ?? plannedAssignment.value?.department_name },
  { label: 'Должность', value: currentAssignment.value?.position_name ?? plannedAssignment.value?.position_name },
  { label: 'Дата назначения', value: formatDate(currentAssignment.value?.valid_from ?? plannedAssignment.value?.valid_from) },
  { label: 'Объект', value: profile.value?.data.work_site },
  { label: 'Рабочая зона', value: profile.value?.data.work_zone },
  { label: 'Бригада / команда', value: profile.value?.data.work_team },
  { label: 'Непосредственный руководитель', value: profile.value?.data.supervisor_name, wide: true },
  { label: 'Статус сотрудника', value: employmentStatus.value },
])
const employmentFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Номер договора', value: reference.value?.employment.contract_number },
  { label: 'Дата договора', value: formatDate(reference.value?.employment.contract_date) },
  { label: 'Вид договора', value: reference.value?.employment.contract_type },
  { label: 'Тип занятости', value: reference.value?.employment.employment_type },
  { label: 'Основание приёма', value: currentAssignment.value?.basis_reference ?? plannedAssignment.value?.basis_reference },
  { label: 'Испытательный срок до', value: formatDate(reference.value?.employment.probation_until) },
  { label: 'График работы', value: reference.value?.employment.work_schedule, wide: true },
])
const payrollFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Оклад', value: money(reference.value?.payroll.salary, reference.value?.payroll.currency ?? 'KZT') },
  { label: 'Периодичность выплат', value: reference.value?.payroll.payment_frequency },
  { label: 'Следующая выплата', value: formatDate(reference.value?.payroll.next_payment_date) },
  { label: 'Банк', value: reference.value?.banking.bank_name },
  { label: 'IBAN', value: reference.value?.banking.iban, wide: true },
])
const scheduleFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'График', value: reference.value?.schedule.schedule_name },
  { label: 'Смена', value: reference.value?.schedule.shift },
  { label: 'Часов в неделю', value: reference.value?.schedule.hours_per_week },
  { label: 'Табельный период', value: reference.value?.schedule.timesheet_month },
  { label: 'План часов', value: reference.value?.schedule.planned_hours },
  { label: 'Отработано часов', value: reference.value?.schedule.worked_hours },
])
const documentColumns = [
  { key: 'title', label: 'Документ' },
  { key: 'number', label: 'Номер' },
  { key: 'issued_on', label: 'Дата' },
  { key: 'status', label: 'Статус' },
]
const historyColumns = [
  { key: 'action', label: 'Изменение' },
  { key: 'actor', label: 'Кто изменил' },
  { key: 'created_at', label: 'Дата' },
]

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
  identityEditOpen.value = false
  assignmentCreateOpen.value = false
  profileCreateOpen.value = false
  error.value = ''
  profile.value = null
  try {
    const result = await getEmployee(company, employee)
    if (current === generation) {
      profile.value = result
      // Keep the tab across refreshes and honor older deep-link names.
      activeSection.value = normalizeProfileTab(route.query.tab ?? activeSection.value)
    }
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось открыть карточку сотрудника'
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(() => [route.params.company, route.params.employee], () => {
  activeSection.value = 'personal'
  load()
})
watch(() => route.query.tab, () => {
  const requested = route.query.tab
  activeSection.value = normalizeProfileTab(requested)
})
onMounted(load)
</script>

<template>
  <section class="employee-profile">
    <nav class="employee-breadcrumb" aria-label="Навигация по разделам">
      <img src="/prototype-icons/Home.svg" alt="" aria-hidden="true" />
      <span>/</span>
      <RouterLink to="/employees">Сотрудники</RouterLink>
      <span>/</span>
      <RouterLink to="/employees">Реестр сотрудников</RouterLink>
      <span v-if="profile">/</span>
      <span v-if="profile" aria-current="page">{{ displayName }}</span>
    </nav>
    <div class="employee-page-heading">
      <div class="employee-page-title-row">
        <RouterLink class="employee-back-button" to="/employees" title="К реестру сотрудников" aria-label="К реестру сотрудников">
          <img src="/prototype-icons/arrow-back.svg" alt="" />
        </RouterLink>
        <h1>{{ displayName }}</h1>
      </div>
      <BaseButton v-if="profile?.meta.employee_writes_enabled" variant="secondary" @click="identityEditOpen = true">
        <img src="/prototype-icons/Edit.svg" class="employee-edit-icon" alt="" /> Изменить карточку
      </BaseButton>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loading" label="Загрузка карточки сотрудника" />

    <template v-else-if="profile">
      <div class="employee-identity">
        <div class="identity-photo-section">
          <p class="identity-caption">Фото сотрудника</p>
          <div class="identity-photo-row">
            <div class="avatar" aria-label="Фото сотрудника не загружено">{{ initials }}</div>
            <div class="identity-photo-help">Фото не загружено</div>
          </div>
          <div v-if="profile.meta.extended_sections_visible" class="gender-options" aria-label="Пол сотрудника">
            <span :class="{ 'gender-selected': profile.data.gender === 'male' }"><i aria-hidden="true"></i> Мужчина</span>
            <span :class="{ 'gender-selected': profile.data.gender === 'female' }"><i aria-hidden="true"></i> Женщина</span>
          </div>
        </div>
        <div class="identity-fields">
          <div class="identity-fields-top">
            <span class="status-toggle" :class="{ 'status-toggle--inactive': !currentAssignment }"><span class="status-toggle-dot"></span>{{ currentAssignment ? 'Карточка активна' : employmentStatus }}</span>
            <div class="personnel-id"><span>Табельный №</span><strong>{{ profile.data.personnel_number }}</strong></div>
          </div>
          <div class="identity-name-fields">
            <div class="read-field"><span>Фамилия</span><strong>{{ profile.data.last_name }}</strong></div>
            <div class="read-field"><span>Имя</span><strong>{{ profile.data.first_name }}</strong></div>
            <div class="read-field"><span>Отчество</span><strong>{{ profile.data.middle_name ?? '—' }}</strong></div>
            <div class="read-field"><span>Дата рождения</span><strong>{{ profile.meta.extended_sections_visible ? (formatDate(profile.data.birth_date)) : '—' }}</strong></div>
          </div>
        </div>
      </div>

      <BaseViewTabs v-model="activeSection" :options="sectionTabs" label="Разделы карточки сотрудника" />
      <template v-if="activeSection === 'personal' && profile.meta.extended_sections_visible">
        <EmployeeProfileSection title="Контакты и адреса">
          <div class="assignment-fields">
            <div class="read-field"><span>Email</span><strong>{{ profile.data.email ?? '—' }}</strong></div>
            <div class="read-field"><span>Телефон</span><strong>{{ profile.data.phone ?? '—' }}</strong></div>
            <div class="read-field read-field--wide"><span>Адрес</span><strong>{{ profile.data.address ?? '—' }}</strong></div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Документы, удостоверяющие личность">
          <p class="section-empty-note">Сведения об удостоверяющих документах пока не внесены.</p>
        </EmployeeProfileSection>
      </template>

      <template v-if="activeSection === 'organization' && profile.meta.extended_sections_visible">
        <EmployeeProfileSection title="Подразделение и должность">
          <div class="assignment-fields">
            <div class="read-field"><span>Отдел</span><strong>{{ currentAssignment?.department_name ?? plannedAssignment?.department_name ?? '—' }}</strong></div>
            <div class="read-field"><span>Должность</span><strong>{{ currentAssignment?.position_name ?? plannedAssignment?.position_name ?? '—' }}</strong></div>
            <div class="read-field"><span>Дата назначения на должность</span><strong>{{ formatDate(currentAssignment?.valid_from ?? plannedAssignment?.valid_from) }}</strong></div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Объект и место работы">
          <div class="assignment-fields">
            <div class="read-field"><span>Объект</span><strong>{{ profile.data.work_site ?? '—' }}</strong></div>
            <div class="read-field"><span>Рабочая зона</span><strong>{{ profile.data.work_zone ?? '—' }}</strong></div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Бригада и руководитель">
          <div class="assignment-fields">
            <div class="read-field"><span>Бригада</span><strong>{{ profile.data.work_team ?? '—' }}</strong></div>
            <div class="read-field"><span>Непосредственный руководитель</span><strong>{{ profile.data.supervisor_name ?? '—' }}</strong></div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Статус и штатная позиция">
          <div class="assignment-fields">
            <div class="read-field"><span>Статус сотрудника</span><strong>{{ employmentStatus }}</strong></div>
            <div class="read-field"><span>Должность</span><strong>{{ currentAssignment?.position_name ?? plannedAssignment?.position_name ?? '—' }}</strong></div>
          </div>
        </EmployeeProfileSection>
      </template>
      <div v-if="profile.meta.profile_writes_enabled && activeSection === 'development'" class="profile-toolbar">
        <BaseButton @click="profileCreateOpen = true"><Plus :size="16" /> Добавить сведения</BaseButton>
      </div>

      <template v-if="activeSection === 'employment'">
        <EmployeeProfileSection title="Договор и приём">
          <template v-if="profile.meta.assignment_writes_enabled" #actions>
            <BaseButton @click="assignmentCreateOpen = true"><Plus :size="16" /> Добавить назначение</BaseButton>
          </template>
          <div class="assignment-fields">
            <div class="read-field"><span>Основание назначения</span><strong>{{ currentAssignment?.basis_reference ?? plannedAssignment?.basis_reference ?? '—' }}</strong></div>
            <div class="read-field"><span>Дата приёма / назначения</span><strong>{{ formatDate(currentAssignment?.valid_from ?? plannedAssignment?.valid_from) }}</strong></div>
            <div class="read-field"><span>Дата окончания</span><strong>{{ formatDate(currentAssignment?.valid_to ?? plannedAssignment?.valid_to) }}</strong></div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Стаж и трудовой опыт">
          <h3 class="assignment-history-title">История назначений</h3>
          <BaseDataTable :columns="columns" :rows="profile.assignments" row-key="id"
            caption="Доступная история назначений" empty-title="Назначений не найдено"
            empty-description="Для сотрудника нет доступных кадровых назначений.">
            <template #cell-valid_from="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
            <template #cell-valid_to="{ value }">{{ typeof value === 'string' ? formatDate(value) : 'По настоящее время' }}</template>
            <template #cell-edit="{ row }">
              <div class="row-actions">
                <BaseButton variant="secondary" @click="assignmentEditing = row; assignmentTransitioning = null">Изменить</BaseButton>
                <BaseButton v-if="row.valid_to === null" @click="assignmentTransitioning = row; assignmentEditing = null">Перевести</BaseButton>
              </div>
            </template>
          </BaseDataTable>
          <BaseNotice v-if="profile.meta.assignments_truncated" tone="info">Показаны первые 100 назначений. Для полной истории требуется отдельный просмотр.</BaseNotice>
          <template v-if="profile.meta.extended_sections_visible">
            <h3 class="assignment-history-title">Периоды стажа</h3>
            <BaseDataTable :rows="profile.experience" row-key="id" caption="Периоды трудового стажа"
              :columns="[{key:'experience_type',label:'Вид стажа'},{key:'started_on',label:'Начало'},{key:'ended_on',label:'Окончание'},{key:'basis_reference',label:'Основание'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
              empty-title="Сведения о стаже отсутствуют" empty-description="Периоды стажа ещё не внесены.">
              <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('experience', row)">Изменить</BaseButton></template>
            </BaseDataTable>
          </template>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Условия труда и персонифицированный учёт">
          <p class="section-empty-note">Сведения об условиях труда пока не добавлены.</p>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Совмещение и дополнительные обязанности">
          <p class="section-empty-note">Сведения о совмещении и дополнительных обязанностях пока не добавлены.</p>
        </EmployeeProfileSection>
        <EmployeeProfileSection title="Прекращение договора">
          <p class="section-empty-note">Данные о прекращении договора пока не внесены.</p>
        </EmployeeProfileSection>
      </template>

      <template v-if="profile.meta.extended_sections_visible">
        <EmployeeProfileSection v-if="activeSection === 'documents'" title="Документы сотрудника">
          <p class="section-empty-note">Документы пока не связаны с личной карточкой через API.</p>
          <RouterLink class="related-module-link" to="/documents">Открыть реестр документов</RouterLink>
        </EmployeeProfileSection>
        <template v-if="activeSection === 'payroll'">
          <EmployeeProfileSection title="Начисления"><p class="section-empty-note">Сведения о начислениях пока не подключены.</p></EmployeeProfileSection>
          <EmployeeProfileSection title="Удержания"><p class="section-empty-note">Сведения об удержаниях пока не подключены.</p></EmployeeProfileSection>
        </template>
        <template v-if="activeSection === 'schedule'">
          <EmployeeProfileSection title="График работы"><p class="section-empty-note">График сотрудника пока не связан с карточкой.</p></EmployeeProfileSection>
          <EmployeeProfileSection title="Табель"><p class="section-empty-note">Табельные данные пока не подключены.</p></EmployeeProfileSection>
        </template>
        <template v-if="activeSection === 'development'">
          <EmployeeProfileSection title="Кадровый резерв">
            <BaseDataTable :rows="profile.reserve" row-key="id" caption="Кадровый резерв сотрудника"
              :columns="[{key:'target_position',label:'Резервируемая должность'},{key:'reserve_level',label:'Уровень'},{key:'reserve_type',label:'Вид'},{key:'joined_year',label:'Год зачисления'},{key:'left_year',label:'Год исключения'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
              empty-title="Записей резерва нет" empty-description="Сотрудник пока не включён в кадровый резерв.">
              <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('reserve', row)">Изменить</BaseButton></template>
            </BaseDataTable>
          </EmployeeProfileSection>
          <EmployeeProfileSection title="Обучение и повышение квалификации">
            <BaseDataTable :rows="profile.training" row-key="id" caption="Обучение сотрудника"
              :columns="[{key:'training_type',label:'Вид'},{key:'training_mode',label:'Формат'},{key:'topic',label:'Тема'},{key:'provider',label:'Центр обучения'},{key:'city',label:'Город'},{key:'started_on',label:'Начало'},{key:'ended_on',label:'Окончание'},{key:'document_reference',label:'Документ'}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:'Действия'}] : [])]"
              empty-title="Обучение не зарегистрировано" empty-description="Данные об обучении пока не внесены.">
              <template #cell-training_mode="{ value }">{{ trainingModeLabel(value) }}</template>
              <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('training', row)">Изменить</BaseButton></template>
            </BaseDataTable>
          </EmployeeProfileSection>
        </template>
        <EmployeeProfileSection v-if="activeSection === 'history'" title="История изменений">
          <p class="section-empty-note">Журнал изменений личной карточки пока не подключён к этому экрану.</p>
        </EmployeeProfileSection>
      </template>
    </template>

    <BaseDialog :open="assignmentCreateOpen" title="Новое назначение" @close="assignmentCreateOpen = false">
      <EmployeeAssignmentCreateForm v-if="assignmentCreateOpen && profile?.meta.assignment_writes_enabled"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="assignmentCreateOpen = false" />
    </BaseDialog>

    <BaseDialog :open="assignmentEditing !== null" title="Редактирование назначения" @close="assignmentEditing = null">
      <EmployeeAssignmentCreateForm v-if="assignmentEditing"
        :key="assignmentEditing.id + ':' + assignmentEditing.revision"
        :edit="assignmentEditing" :company-id="String(route.params.company)"
        :employee-id="String(route.params.employee)" @saved="load" @cancelled="assignmentEditing = null" />
    </BaseDialog>

    <BaseDialog :open="assignmentTransitioning !== null" title="Перевод сотрудника" @close="assignmentTransitioning = null">
      <EmployeeAssignmentCreateForm v-if="assignmentTransitioning"
        :key="assignmentTransitioning.id + ':' + assignmentTransitioning.revision"
        :transition-from="assignmentTransitioning"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="assignmentTransitioning = null" />
    </BaseDialog>

    <BaseDialog :open="profileCreateOpen" title="Добавить сведения" @close="profileCreateOpen = false">
      <EmployeeProfileCreateForm v-if="profileCreateOpen && profile?.meta.profile_writes_enabled"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" />
    </BaseDialog>

    <BaseDialog :open="editing !== null" title="Изменить сведения" @close="editing = null">
      <EmployeeProfileCreateForm v-if="editing && profile?.meta.profile_writes_enabled"
        :key="editing.record.id + ':' + editing.record.revision" :edit="editing"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="editing = null" />
    </BaseDialog>

    <BaseDialog :open="identityEditOpen" title="Основные данные сотрудника" @close="identityEditOpen = false">
      <EmployeeRecordForm
        v-if="profile"
        :key="profile.data.id + ':' + profile.data.revision"
        :company-id="String(route.params.company)"
        :edit="profile.data"
        @saved="identityEditOpen = false; load()"
        @cancelled="identityEditOpen = false"
      />
    </BaseDialog>
  </section>
</template>

<style scoped>
/* Detailed training records scroll inside the card instead of breaking dates and words. */
.employee-profile #training :deep(table){min-width:1220px}
.employee-profile{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;scroll-behavior:smooth;max-width:100%}
.employee-profile :deep(.base-card){box-shadow:none;border-radius:7px}
.employee-profile :deep(.view-tabs){margin:2px 0 6px}
.employee-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.7fr);gap:20px;align-items:center;background:transparent;border:0;box-shadow:none;padding:4px 0 8px}
.identity-block{display:flex;align-items:center;gap:18px;min-width:0}
.avatar{display:grid;place-items:center;flex:0 0 auto;width:96px;height:96px;border-radius:50%;background:#eef3f6;color:#263b46;font-size:22px;font-weight:700;border:1px solid #dde6eb;box-shadow:none}
.identity-copy{min-width:0}
.identity-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.identity-title-row h2{margin:0;font-size:20px;line-height:1.3}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:var(--color-success-surface);color:var(--color-success);font-size:11px;font-weight:700}
.status-pill--inactive{background:var(--color-soft);color:var(--color-muted)}
.status-pill--planned{background:var(--color-accent-soft);color:var(--color-primary)}
.current-role{margin:8px 0 3px;font-weight:700;font-size:15px}
.identity-copy .muted{margin:0}
.hero-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.hero-facts>div{display:grid;gap:5px;padding:0;border:0;background:transparent}
.hero-facts span{font-size:11px;color:var(--color-muted);font-weight:600}
.hero-facts strong{min-height:42px;display:flex;align-items:center;padding:0 12px;border:1px solid var(--color-stroke);border-radius:6px;background:#fff;font-size:13px;font-weight:600;overflow-wrap:anywhere}
.section-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:var(--space-4)}
.section-header.compact{align-items:end}
.section-header h2{font-size:16px;margin:0;font-weight:600}
.current-assignment{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:var(--radius-md);background:var(--color-soft);color:var(--color-text)}
.current-assignment span{display:grid;gap:2px}
.current-assignment small{font-size:11px;color:var(--color-muted)}
.counter{font-size:12px;color:var(--color-muted);padding:0;background:transparent}
.section-controls{display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap}
.section-controls :deep(button),.profile-toolbar :deep(button){display:inline-flex;align-items:center;justify-content:center;gap:8px}
.profile-toolbar{display:flex;justify-content:flex-end}

.row-actions{display:flex;gap:var(--space-2);flex-wrap:wrap}
.back-link{display:inline-flex;align-items:center;color:var(--color-text);font-weight:600;padding:var(--space-2);text-decoration:none}
.back-link:focus-visible{outline:3px solid var(--color-focus)}
@media(max-width:980px){.employee-hero{grid-template-columns:1fr}.hero-facts{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.identity-block{align-items:flex-start}.avatar{width:62px;height:62px;border-radius:50%}.identity-title-row h2{font-size:20px}.hero-facts{grid-template-columns:1fr}.section-header{align-items:stretch}.current-assignment{width:100%}}
.section-toggle{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:220px;border:0;background:transparent;padding:0;text-align:left;color:var(--color-text);cursor:pointer}
.section-toggle span{font-size:24px;line-height:1;color:var(--color-muted)}
.section-toggle:focus-visible{outline:2px solid var(--color-focus);outline-offset:6px}
.assignment-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}
.read-field{display:grid;align-content:start;gap:8px;min-width:0}
.read-field span{font-size:var(--font-label-size);font-weight:600;color:var(--color-text)}
.read-field strong{display:flex;align-items:center;min-height:42px;padding:10px 12px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface);font-size:var(--font-body-size);font-weight:400;overflow-wrap:anywhere}
.read-field--wide{grid-column:span 2}
.assignment-history-title{font-size:16px;line-height:1.4;margin:8px 0 14px}
@media(max-width:680px){.assignment-fields{grid-template-columns:1fr}.read-field--wide{grid-column:auto}.section-toggle{width:100%}}
.employee-identity{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,1.35fr);gap:26px;align-items:start;padding:4px 0 8px}
.identity-caption{margin:0 0 10px;font-size:13px;font-weight:600}
.identity-photo-row{display:flex;gap:14px;align-items:center}
.identity-photo-help{font-size:12px;line-height:1.5;color:var(--color-muted)}
.identity-fields{min-width:0;display:grid;gap:15px}
.identity-fields-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.status-toggle{display:inline-flex;align-items:center;gap:9px;color:var(--color-text);font-size:12px;font-weight:600}
.status-toggle-dot{width:28px;height:16px;border-radius:12px;background:var(--color-primary);position:relative;flex:0 0 auto}
.status-toggle-dot:after{content:'';position:absolute;right:3px;top:3px;width:10px;height:10px;border-radius:50%;background:white}
.status-toggle--inactive .status-toggle-dot{background:#b2c7d1}
.status-toggle--inactive .status-toggle-dot:after{right:auto;left:3px}
.personnel-id{display:flex;align-items:center;border:1px solid var(--color-stroke);border-radius:6px;overflow:hidden;font-size:12px}
.personnel-id span{background:var(--color-soft);padding:10px 12px;font-weight:600}
.personnel-id strong{padding:10px 12px;font-size:12px;font-weight:600}
.identity-name-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px}
@media(max-width:900px){.employee-identity{grid-template-columns:1fr;gap:18px}}
@media(max-width:500px){.identity-name-fields{grid-template-columns:1fr}.personnel-id{max-width:100%}}
.gender-options{display:flex;gap:18px;align-items:center;margin-top:14px;flex-wrap:wrap}
.gender-options span{display:inline-flex;align-items:center;gap:7px;color:var(--color-text);font-size:12px;font-weight:600}
.gender-options i{display:block;width:15px;height:15px;border:2px solid #d4e1e8;border-radius:50%;background:#fff}
.gender-options .gender-selected i{border:4px solid var(--color-primary)}
.section-empty-note{margin:0;color:var(--color-muted);font-size:13px;line-height:1.5}
.related-module-link{display:inline-flex;margin-top:12px;color:var(--color-primary);font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.employee-breadcrumb{display:flex;align-items:center;gap:9px;min-height:22px;flex-wrap:wrap;color:var(--color-muted);font-size:12px}
.employee-breadcrumb img{width:15px;height:15px;object-fit:contain}
.employee-breadcrumb a{color:var(--color-text)}
.employee-breadcrumb a:hover{text-decoration:underline;color:var(--color-primary)}
.employee-breadcrumb [aria-current="page"]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:min(380px,85vw)}
.employee-page-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.employee-page-title-row{display:flex;align-items:center;gap:11px;min-width:0}
.employee-page-title-row h1{margin:0;color:var(--color-text);font-size:var(--font-page-heading);font-weight:700;line-height:1.2;letter-spacing:-.02em;overflow-wrap:anywhere}
.employee-back-button{display:grid;place-items:center;flex:0 0 28px;width:28px;height:30px;border-radius:5px}
.employee-back-button:hover{background:var(--color-soft)}
.employee-back-button img,.employee-edit-icon{width:17px;height:17px;object-fit:contain}
@media(max-width:650px){.employee-page-heading{align-items:stretch}.employee-page-title-row h1{font-size:24px}.employee-page-heading :deep(button){width:100%;justify-content:center}}
</style>
