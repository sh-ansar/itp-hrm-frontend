<script setup lang="ts">
import { publicAsset } from '../utils/publicAsset'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, LockKeyhole, Pencil, Plus } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import EmployeeProfileSection from '../components/EmployeeProfileSection.vue'
import EmployeePrivateProfileEditor from '../components/EmployeePrivateProfileEditor.vue'
import EmployeePrivateRecordsManager from '../components/EmployeePrivateRecordsManager.vue'
import EmployeePhoto from '../components/EmployeePhoto.vue'
import EmployeeDocumentsPanel from '../components/EmployeeDocumentsPanel.vue'
import EmployeeDataGrid from '../components/EmployeeDataGrid.vue'
import EmployeeMonthWorktime from '../components/EmployeeMonthWorktime.vue'
import EmployeeTimesheetHistory from '../components/EmployeeTimesheetHistory.vue'
import EmployeeAddressBook from '../components/EmployeeAddressBook.vue'
import EmployeeFamilyList from '../components/EmployeeFamilyList.vue'
import type { EmployeeFieldEditGroup } from '../types/employeeFields'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseDataTable from '../components/ui/BaseDataTable.vue'
import BaseNotice from '../components/ui/BaseNotice.vue'
import BaseLoadingState from '../components/ui/BaseLoadingState.vue'
import EmployeeProfileCreateForm from '../components/EmployeeProfileCreateForm.vue'
import EmployeeAssignmentCreateForm from '../components/EmployeeAssignmentCreateForm.vue'
import EmployeeRecordForm from '../components/EmployeeRecordForm.vue'
import EmployeeContractEditor from '../components/EmployeeContractEditor.vue'
import BaseDialog from '../components/ui/BaseDialog.vue'
import BaseViewTabs from '../components/ui/BaseViewTabs.vue'
import { getEmployee, listEmployeeContracts, type EmployeeAssignment, type EmployeeContract, type EmployeeDetail, type EmployeeIdentityDocument, type EmployeeReferenceProfile, type EmployeePrivateSection, type EmployeePrivateRecordSection, type ProfileEditRow, type ProfileSection } from '../api/personnel'
import { localTodayISO } from '../utils/localDate'
import { useUiFormatters } from '../composables/useUiFormatters'

const { tr } = useWorkspaceI18n()

type EmployeeDisplayField = { label: string; value: string | number | null | undefined; wide?: boolean; muted?: boolean; editGroup?: EmployeeFieldEditGroup }

const route = useRoute()
const fmt = useUiFormatters()
const profile = ref<EmployeeDetail | null>(null)
const historyRows = computed(() => import.meta.env.VITE_DEMO_MODE === 'true'
  ? (profile.value?.history ?? profile.value?.reference_profile?.history ?? [])
  : (profile.value?.history ?? []))
const loading = ref(false)
const error = ref('')
const editing = ref<{ section: ProfileSection; record: ProfileEditRow } | null>(null)
const assignmentEditing = ref<EmployeeAssignment | null>(null)
const assignmentTransitioning = ref<EmployeeAssignment | null>(null)
const identityEditOpen = ref(false)
const privateEditorSection = ref<EmployeePrivateSection | null>(null)
const privateRecordsSection = ref<EmployeePrivateRecordSection | null>(null)
const focusedIdentityId = ref<string | null>(null)
function openIdentityRecord(recordId: string | null = null) {
  if (!profile.value?.meta.private_profile_writes_enabled || profile.value.meta.private_identities_truncated) return
  focusedIdentityId.value = recordId
  privateRecordsSection.value = 'identity'
}
const focusedFamilyId = ref<string | null>(null)
const createFamilyOnOpen = ref(false)
function openFamilyEditor(recordId: string | null = null, create = false) {
  if (!profile.value?.meta.private_profile_writes_enabled || profile.value.meta.private_family_truncated) return
  focusedFamilyId.value = recordId
  createFamilyOnOpen.value = create
  privateRecordsSection.value = 'family'
}
function closePrivateRecords() {
  privateRecordsSection.value = null
  focusedFamilyId.value = null
  focusedIdentityId.value = null
  createFamilyOnOpen.value = false
}
const assignmentCreateOpen = ref(false)
const profileCreateOpen = ref(false)
const contracts = ref<EmployeeContract[]>([])
const contractWritesEnabled = ref(false)
const contractEditorOpen = ref(false)
const editingContract = ref<EmployeeContract | null>(null)
const activeSection = ref('personal')
const legacyContactsOpen = ref(false)
const sectionTabs = computed(() => [
  ...(profile.value?.meta.extended_sections_visible ? [
    { id: 'personal', label: tr('Личные данные') },
    { id: 'organization', label: tr('Организационные данные') },
  ] : []),
  { id: 'employment', label: tr('Трудовые данные') },
  ...(profile.value?.meta.extended_sections_visible ? [
    { id: 'documents', label: tr('Документы') },
    { id: 'payroll', label: tr('Расчёты и начисления') },
    { id: 'schedule', label: tr('График и табель') },
    { id: 'development', label: tr('Кадровый резерв и обучение') },
    { id: 'history', label: tr('История изменений') },
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
  return value ? fmt.date(value) : '—'
}

function trainingModeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    in_person: 'Очное', remote: 'Дистанционное', on_the_job: 'На рабочем месте',
  }
  return labels[String(value)] ?? String(value ?? '—')
}
function trainingTypeLabel(value: unknown): string {
  const labels: Record<string, string> = { internal: 'Внутреннее', external: 'Внешнее' }
  return labels[String(value)] ?? String(value ?? '—')
}
const today = localTodayISO()
const currentAssignment = computed(() => profile.value?.assignments.find(item =>
  item.valid_from <= today && (item.valid_to === null || item.valid_to >= today)) ?? null)
const currentContract = computed(() => contracts.value.find(item =>
  item.valid_from <= today && (item.valid_to === null || item.valid_to >= today)) ?? null)
function contractTypeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    indefinite: 'Бессрочный',
    fixed_term: 'Срочный',
    temporary: 'Временный',
    seasonal: 'Сезонный',
    other: 'Другой',
  }
  return labels[String(value)] ?? String(value ?? '—')
}
function employmentTypeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    full_time: 'Основное место, полная занятость',
    part_time: 'Неполная занятость',
    secondary: 'Совместительство',
    remote: 'Дистанционная работа',
    other: 'Другой',
  }
  return labels[String(value)] ?? String(value ?? '—')
}
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

const reference = computed<EmployeeReferenceProfile | undefined>(() => {
  if (profile.value?.reference_profile) return profile.value.reference_profile
  // Connected mode: project ONLY real HR-authorized database records.
  // Missing payroll/documents are empty, not synthetic demo data.
  const source = profile.value?.private_profile
  if (!source) return undefined
  return {
    personal: source.personal,
    military: source.military,
    // Primary document is the card's detail view; all versions are managed
    // through the separate normalized document drawer.
    identity_document: source.identity_documents?.find(document => document.is_primary)
      ?? source.identity_documents?.[0] ?? {},
    family: source.family ?? [],
    education: source.education ?? [],
    banking: {},
    employment: {},
    payroll: {},
    schedule: {},
    documents: [],
    history: [],
  }
})
const genderLabel = computed(() => profile.value?.data.gender === 'male' ? 'Мужчина' : profile.value?.data.gender === 'female' ? 'Женщина' : '—')

/** Only expose edit actions backed by an authorized write endpoint. Projections
 * such as age, salary, staffing position and status remain informative. */
const editableFieldGroups = computed<EmployeeFieldEditGroup[]>(() => [
  ...(profile.value?.meta.employee_writes_enabled ? ['employee' as const] : []),
  ...(profile.value?.meta.private_profile_writes_enabled
    ? ['private-personal' as const, 'private-military' as const, 'identity' as const] : []),
  ...(contractWritesEnabled.value && currentContract.value ? ['contract' as const] : []),
])
function openFieldEditor(group: EmployeeFieldEditGroup) {
  if (!editableFieldGroups.value.includes(group)) return
  if (group === 'employee') identityEditOpen.value = true
  else if (group === 'private-personal') privateEditorSection.value = 'personal'
  else if (group === 'private-military') privateEditorSection.value = 'military'
  else if (group === 'identity') privateRecordsSection.value = 'identity'
  else if (group === 'contract') openContractEditor(currentContract.value)
}
function money(value: number | null | undefined, currency = 'KZT'): string {
  return value == null ? '—' : `${fmt.number(Number(value), 0)} ${currency}`
}
function ageFromBirthDate(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return '—'
  const born = new Date(value.slice(0, 10) + 'T12:00:00')
  const now = new Date()
  let years = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) years -= 1
  return years >= 0 ? String(years) : '—'
}

const personalFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'ИИН', value: reference.value?.personal.iin, editGroup: 'private-personal' },
  { label: 'Дата рождения', value: formatDate(profile.value?.data.birth_date), editGroup: 'employee' },
  { label: 'Возраст', value: ageFromBirthDate(profile.value?.data.birth_date) },
  { label: 'Пол', value: genderLabel.value, editGroup: 'employee' },
  { label: 'Национальность', value: reference.value?.personal.nationality, editGroup: 'private-personal' },
  { label: 'Гражданство', value: reference.value?.personal.citizenship, editGroup: 'private-personal' },
  { label: 'Табельный номер', value: profile.value?.data.personnel_number, editGroup: 'employee' },
])
// The ZIP puts login, email and telephone on one row, followed by repeatable addresses.
const contactFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Логин', value: reference.value?.personal.login, editGroup: 'private-personal' },
  { label: 'Email', value: profile.value?.data.email, editGroup: 'employee' },
  { label: 'Телефон', value: profile.value?.data.phone, editGroup: 'employee' },
])
// Old address strings remain available, but must not masquerade as entries in
// the newer, revision-checked address collection.
const legacyContactFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Адрес проживания', value: reference.value?.personal.residence_address ?? profile.value?.data.address, wide: true,
    editGroup: reference.value?.personal.residence_address ? 'private-personal' : 'employee' },
  { label: 'Адрес регистрации', value: reference.value?.personal.registration_address, wide: true, editGroup: 'private-personal' },
  { label: 'Подъезд', value: reference.value?.personal.address_entrance, editGroup: 'private-personal' },
  { label: 'Этаж', value: reference.value?.personal.address_floor, editGroup: 'private-personal' },
  { label: 'Квартира', value: reference.value?.personal.address_apartment, editGroup: 'private-personal' },
  { label: 'Контактное лицо', value: reference.value?.personal.emergency_contact_name, editGroup: 'private-personal' },
  { label: 'Телефон контактного лица', value: reference.value?.personal.emergency_contact_phone, editGroup: 'private-personal' },
])
const hasLegacyContactValues = computed(() => legacyContactFields.value.some(field =>
  field.value !== null && field.value !== undefined && field.value !== '' && field.value !== '—'))
const hasNormalizedAddressStore = computed(() =>
  Array.isArray(profile.value?.private_profile?.addresses)
  || profile.value?.meta.private_address_writes_enabled === true)

// Existing normalized documents take precedence over old flat reference fields;
// edited/archived records must never appear to "revert" to stale legacy data.
const hasNormalizedIdentityStore = computed(() =>
  Array.isArray(profile.value?.private_profile?.identity_documents))
const normalizedIdentities = computed(() => [...(profile.value?.private_profile?.identity_documents ?? [])]
  .sort((left,right) => Number(right.is_primary) - Number(left.is_primary)))
const identityPersonFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Национальность', value: reference.value?.personal.nationality, editGroup: 'private-personal' },
  { label: 'Гражданство', value: reference.value?.personal.citizenship, editGroup: 'private-personal' },
])
/** Private identifiers are masked in ordinary profile viewing, even for HR.
 * The selected protected record is only opened in the authorized editor. */
function maskedIdentity(value: string | null | undefined): string {
  return value ? '••••' + value.slice(-4) : '—'
}
function normalizedIdentityFields(identity: EmployeeIdentityDocument): EmployeeDisplayField[] {
  return [
    { label: 'Персональный номер', value: maskedIdentity(identity.personal_number) },
    { label: 'Страна выдачи', value: identity.country_of_issue },
    { label: 'Тип документа', value: identity.type },
    { label: 'Номер документа', value: maskedIdentity(identity.number) },
    { label: 'Кем выдан', value: identity.issued_by, wide: true },
    { label: 'Дата выдачи', value: formatDate(identity.issued_on) },
    { label: 'Действителен до', value: formatDate(identity.expires_on) },
  ]
}
// Legacy flat projections have no persisted record revision: do not imply edit.
const legacyDocumentFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Персональный номер', value: maskedIdentity(reference.value?.identity_document.personal_number) },
  { label: 'Страна выдачи', value: reference.value?.identity_document.country_of_issue },
  { label: 'Тип документа', value: reference.value?.identity_document.type },
  { label: 'Номер документа', value: maskedIdentity(reference.value?.identity_document.number) },
  { label: 'Кем выдан', value: reference.value?.identity_document.issued_by, wide: true },
  { label: 'Дата выдачи', value: formatDate(reference.value?.identity_document.issued_on) },
  { label: 'Действителен до', value: formatDate(reference.value?.identity_document.expires_on) },
  { label: 'Файл документа', value: reference.value?.identity_document.attachment_name, wide: true },
])
const birthPlaceFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Место рождения', value: reference.value?.personal.place_of_birth, wide: true, editGroup: 'private-personal' },
  { label: 'Свидетельство о рождении', value: reference.value?.personal.birth_certificate_attachment, wide: true },
])
const militaryFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Статус воинского учёта', value: reference.value?.military?.status, editGroup: 'private-military' },
  { label: 'Категория учёта', value: reference.value?.military?.category, editGroup: 'private-military' },
  { label: 'Военный билет', value: reference.value?.military?.document_reference, wide: true, editGroup: 'private-military' },
  { label: 'Общий комментарий', value: reference.value?.military?.comment, wide: true, editGroup: 'private-military' },
])
const maritalStatusFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Семейное положение', value: reference.value?.personal.marital_status, editGroup: 'private-personal' },
])

const organizationPositionFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Компания', value: reference.value?.organization?.company_name },
  { label: 'Подразделение', value: currentAssignment.value?.department_name ?? plannedAssignment.value?.department_name },
  { label: 'Должность', value: currentAssignment.value?.position_name ?? plannedAssignment.value?.position_name },
  { label: 'Категория сотрудника', value: reference.value?.organization?.employee_category },
  { label: 'Тип персонала', value: reference.value?.organization?.personnel_type },
  { label: 'Дата назначения', value: formatDate(currentAssignment.value?.valid_from ?? plannedAssignment.value?.valid_from) },
  { label: 'Основное место работы', value: reference.value?.organization?.primary_workplace },
])
const workplaceFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Объект', value: profile.value?.data.work_site, editGroup: 'employee' },
  { label: 'Рабочая зона', value: profile.value?.data.work_zone, editGroup: 'employee' },
  { label: 'Участок / площадка', value: reference.value?.organization?.site_area },
  { label: 'Местоположение', value: reference.value?.organization?.location, wide: true },
  { label: 'Статус доступа', value: reference.value?.organization?.access_status },
  { label: 'Номер пропуска', value: reference.value?.organization?.pass_number },
  { label: 'Дата выдачи пропуска', value: formatDate(reference.value?.organization?.pass_issued_on) },
])
const teamFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Бригада / команда', value: reference.value?.organization?.brigade ?? profile.value?.data.work_team, editGroup: reference.value?.organization?.brigade ? undefined : 'employee' },
  { label: 'Бригадир', value: reference.value?.organization?.brigadier },
  { label: 'Руководитель подразделения', value: reference.value?.organization?.department_manager },
  { label: 'Непосредственный руководитель', value: profile.value?.data.supervisor_name, wide: true, editGroup: 'employee' },
  { label: 'Статус закрепления', value: reference.value?.organization?.assignment_status },
  { label: 'Дата закрепления', value: formatDate(reference.value?.organization?.assignment_date) },
])
const staffingStatusFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Статус сотрудника', value: employmentStatus.value },
  { label: 'Архивный сотрудник', value: reference.value?.organization?.archived },
  { label: 'Штатная позиция', value: reference.value?.organization?.staffing_position ?? currentAssignment.value?.position_name },
  { label: 'Код штатной позиции', value: reference.value?.organization?.staffing_position_code },
  { label: 'Причина изменения статуса', value: reference.value?.organization?.status_change_reason, wide: true },
  { label: 'Дата изменения статуса', value: formatDate(reference.value?.organization?.status_change_date) },
  { label: 'Вид занятости', value: reference.value?.organization?.employment_type },
  { label: 'В должности с', value: formatDate(reference.value?.organization?.position_since) },
])

const contractFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Номер договора', value: currentContract.value?.contract_number ?? reference.value?.employment.contract_number, editGroup: 'contract' },
  { label: 'Тип договора', value: currentContract.value ? contractTypeLabel(currentContract.value.contract_type) : reference.value?.employment.contract_type, editGroup: 'contract' },
  { label: 'Дата подписания', value: formatDate(currentContract.value?.signed_on ?? reference.value?.employment.contract_date), editGroup: 'contract' },
  { label: 'Действует с', value: formatDate(currentContract.value?.valid_from ?? reference.value?.employment.valid_from), editGroup: 'contract' },
  { label: 'Действует до', value: currentContract.value?.valid_to === null ? tr('Бессрочно') : formatDate(currentContract.value?.valid_to ?? reference.value?.employment.valid_to), editGroup: 'contract' },
  { label: 'Испытание до', value: formatDate(currentContract.value?.probation_until ?? reference.value?.employment.probation_until), editGroup: 'contract' },
  { label: 'Основание', value: currentContract.value?.basis_reference ?? reference.value?.employment.hire_basis ?? currentAssignment.value?.basis_reference ?? plannedAssignment.value?.basis_reference, wide: true, editGroup: 'contract' },
  { label: 'Вид занятости', value: currentContract.value ? employmentTypeLabel(currentContract.value.employment_type) : reference.value?.employment.employment_type, editGroup: 'contract' },
])
const seniorityFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Общий стаж', value: reference.value?.employment.total_seniority },
  { label: 'Стаж в компании', value: reference.value?.employment.company_seniority },
  { label: 'Стаж в текущей должности', value: reference.value?.employment.position_seniority },
  { label: 'Стаж на объекте', value: reference.value?.employment.site_seniority },
  { label: 'Специальный стаж', value: reference.value?.employment.special_seniority },
])
const workingConditionFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Условия труда', value: reference.value?.working_conditions?.condition_type },
  { label: 'Код условий труда', value: reference.value?.working_conditions?.condition_code },
  { label: 'Код позиции списка', value: reference.value?.working_conditions?.list_position_code },
  { label: 'Компенсации и льготы', value: reference.value?.working_conditions?.compensation, wide: true },
  { label: 'Основание', value: reference.value?.working_conditions?.basis, wide: true },
  { label: 'Действует с', value: formatDate(reference.value?.working_conditions?.valid_from) },
  { label: 'Действует до', value: formatDate(reference.value?.working_conditions?.valid_to) },
  { label: 'Документ', value: reference.value?.working_conditions?.attachment_name, wide: true },
])
const combinationFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Совмещение', value: reference.value?.combination?.enabled },
  { label: 'С даты', value: formatDate(reference.value?.combination?.valid_from) },
  { label: 'По дату', value: formatDate(reference.value?.combination?.valid_to) },
  { label: 'Совмещаемая должность', value: reference.value?.combination?.position },
  { label: 'Причина', value: reference.value?.combination?.reason, wide: true },
  { label: 'Замещаемый сотрудник', value: reference.value?.combination?.replaced_employee },
  { label: 'Основание', value: reference.value?.combination?.basis, wide: true },
  { label: 'Дополнительные обязанности', value: reference.value?.combination?.duties, wide: true },
  { label: 'Материальная ответственность', value: reference.value?.combination?.material_responsibility },
  { label: 'Документ', value: reference.value?.combination?.material_attachment, wide: true },
])
const terminationFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Договор прекращён', value: reference.value?.termination?.terminated },
  { label: 'Дата прекращения', value: formatDate(reference.value?.termination?.termination_date) },
  { label: 'Основание', value: reference.value?.termination?.basis, wide: true },
  { label: 'Группа основания', value: reference.value?.termination?.basis_group },
  { label: 'Причина', value: reference.value?.termination?.reason, wide: true },
  { label: 'Комментарий', value: reference.value?.termination?.comment, wide: true },
  { label: 'Документ', value: reference.value?.termination?.attachment_name, wide: true },
])

const payConditionFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Вид оплаты', value: reference.value?.payroll.payment_type },
  { label: 'Валюта', value: reference.value?.payroll.currency },
  { label: 'Базовая ставка', value: reference.value?.payroll.base_rate ?? money(reference.value?.payroll.salary, reference.value?.payroll.currency ?? 'KZT') },
  { label: 'Расчётный период', value: reference.value?.payroll.settlement_period },
  { label: 'Метод расчёта', value: reference.value?.payroll.calculation_method, wide: true },
  { label: 'Источник данных', value: reference.value?.payroll.data_source, wide: true },
  { label: 'Периодичность выплат', value: reference.value?.payroll.payment_frequency },
  { label: 'Следующая выплата', value: formatDate(reference.value?.payroll.next_payment_date) },
])
const bankTaxFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Банк', value: reference.value?.banking.bank_name },
  { label: 'IBAN / счёт', value: reference.value?.banking.iban, wide: true },
  { label: 'Зарплатный счёт', value: reference.value?.banking.payroll_account },
  { label: 'Получатель', value: reference.value?.banking.recipient, wide: true },
  { label: 'Медицинское страхование', value: reference.value?.banking.medical_insurance },
  { label: 'Налоговый статус', value: reference.value?.banking.tax_status },
  { label: 'Пенсионные начисления', value: reference.value?.banking.pension_accruals },
  { label: 'Документ', value: reference.value?.banking.attachment_name, wide: true },
])
const payrollAdjustmentColumns = [
  { key: 'kind', label: 'Вид' },
  { key: 'name', label: 'Начисление / удержание' },
  { key: 'period', label: 'Период' },
  { key: 'amount', label: 'Сумма' },
  { key: 'hours', label: 'Часы' },
  { key: 'basis', label: 'Основание' },
]
const payrollHistoryColumns = [
  { key: 'period', label: 'Период' },
  { key: 'accrued', label: 'Начислено' },
  { key: 'withheld', label: 'Удержано' },
  { key: 'paid', label: 'Выплачено' },
  { key: 'worked_hours', label: 'Часы' },
  { key: 'worked_days', label: 'Дни' },
]
const payrollSummaryFields = computed<EmployeeDisplayField[]>(() => {
  const current = reference.value?.payroll_history?.[0]
  return [
    { label: 'Начислено', value: current ? money(current.accrued, reference.value?.payroll.currency ?? 'KZT') : null },
    { label: 'Удержано', value: current ? money(current.withheld, reference.value?.payroll.currency ?? 'KZT') : null },
    { label: 'К выплате', value: current ? money(current.paid, reference.value?.payroll.currency ?? 'KZT') : null },
    { label: 'Отработано часов', value: current?.worked_hours },
    { label: 'Отработано дней', value: current?.worked_days },
    { label: 'Расчётный период', value: current?.period },
  ]
})

const scheduleFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Производственный календарь', value: reference.value?.schedule.production_calendar, wide: true },
  { label: 'График / режим', value: reference.value?.schedule.schedule_name },
  { label: 'Тип графика', value: reference.value?.schedule.schedule_type },
  { label: 'Метод учёта времени', value: reference.value?.schedule.time_accounting },
  { label: 'Смена по умолчанию', value: reference.value?.schedule.shift },
  { label: 'Продолжительность смены', value: reference.value?.schedule.shift_duration },
  { label: 'Часов в неделю', value: reference.value?.schedule.hours_per_week },
  { label: 'Действует с', value: formatDate(reference.value?.schedule.valid_from) },
  { label: 'Действует до', value: formatDate(reference.value?.schedule.valid_to) },
  { label: 'Основание', value: reference.value?.schedule.basis, wide: true },
  { label: 'Ночные смены', value: reference.value?.schedule.night_shifts },
  { label: 'Работа в выходные / праздники', value: reference.value?.schedule.weekend_work, wide: true },
])
const leaveSummaryFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Положено дней', value: reference.value?.leave_summary?.entitled_days },
  { label: 'Использовано', value: reference.value?.leave_summary?.used_days },
  { label: 'Остаток', value: reference.value?.leave_summary?.balance_days },
  { label: 'Запланировано до', value: formatDate(reference.value?.leave_summary?.planned_until) },
  { label: 'Расчётный год', value: reference.value?.leave_summary?.settlement_year },
  { label: 'Рабочий год с', value: formatDate(reference.value?.leave_summary?.work_year_from) },
  { label: 'Рабочий год по', value: formatDate(reference.value?.leave_summary?.work_year_to) },
  { label: 'Метод расчёта остатка', value: reference.value?.leave_summary?.balance_method },
  { label: 'Источник', value: reference.value?.leave_summary?.data_source, wide: true },
])
const currentTimesheetFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Табельный период', value: reference.value?.schedule.timesheet_month },
  { label: 'План часов', value: reference.value?.schedule.planned_hours },
  { label: 'Отработано часов', value: reference.value?.schedule.worked_hours },
  { label: 'Отклонение', value: reference.value?.schedule.planned_hours != null && reference.value?.schedule.worked_hours != null
    ? reference.value.schedule.worked_hours - reference.value.schedule.planned_hours : null },
])
const leaveLimitColumns = [
  { key: 'leave_type', label: 'Вид отсутствия / отпуска' },
  { key: 'accrual_method', label: 'Метод начисления' },
  { key: 'entitled_days', label: 'Положено' },
  { key: 'used_days', label: 'Использовано' },
  { key: 'balance_days', label: 'Остаток' },
  { key: 'basis', label: 'Основание' },
]
const timesheetHistoryColumns = [
  { key: 'period', label: 'Период' },
  { key: 'planned_hours', label: 'План' },
  { key: 'worked_hours', label: 'Отработано' },
  { key: 'deviation_hours', label: 'Отклонение' },
  { key: 'work_days', label: 'Рабочие дни' },
  { key: 'night_hours', label: 'Ночные часы' },
  { key: 'overtime_hours', label: 'Сверхурочно' },
  { key: 'absences_days', label: 'Неявки, дни' },
]

const reserveSummaryFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Статус резерва', value: reference.value?.reserve_profile?.status },
  { label: 'Соответствие требованиям', value: reference.value?.reserve_profile?.match_percent == null ? null : reference.value.reserve_profile.match_percent + '%' },
  { label: 'Образование', value: reference.value?.reserve_profile?.education },
  { label: 'План обучения', value: reference.value?.reserve_profile?.learning_plan },
])
const reserveDetailFields = computed<EmployeeDisplayField[]>(() => [
  { label: 'Включён в резерв', value: reference.value?.reserve_profile?.enabled },
  { label: 'Целевая должность', value: reference.value?.reserve_profile?.target_position },
  { label: 'Дата включения', value: formatDate(reference.value?.reserve_profile?.included_on) },
  { label: 'Дата пересмотра', value: formatDate(reference.value?.reserve_profile?.review_on) },
  { label: 'Уровень резерва', value: reference.value?.reserve_profile?.reserve_level },
  { label: 'Вид резерва', value: reference.value?.reserve_profile?.reserve_type },
  { label: 'Основание', value: reference.value?.reserve_profile?.basis, wide: true },
  { label: 'Документ-основание', value: reference.value?.reserve_profile?.basis_document, wide: true },
  { label: 'Комментарий', value: reference.value?.reserve_profile?.comment, wide: true },
])
const educationColumns = [
  { key: 'education_type', label: 'Вид образования' },
  { key: 'organization', label: 'Организация' },
  { key: 'specialization', label: 'Специальность / программа' },
  { key: 'started_on', label: 'Начало' },
  { key: 'ended_on', label: 'Окончание' },
  { key: 'document_reference', label: 'Документ' },
]
const fitColumns = [
  { key: 'criterion', label: 'Критерий' },
  { key: 'requirement', label: 'Требование' },
  { key: 'fact', label: 'Факт' },
  { key: 'score_percent', label: 'Соответствие' },
  { key: 'recommendation', label: 'Рекомендация' },
]

function historyActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'personnel.employee_photo_updated': 'Обновлено фото сотрудника',
    'personnel.employee_photo_removed': 'Удалено фото сотрудника',
    'personnel.employee_created': 'Создана карточка сотрудника',
    'personnel.employee_updated': 'Изменены данные сотрудника',
    'personnel.profile_record_created': 'Добавлены кадровые сведения',
    'personnel.profile_record_updated': 'Изменены кадровые сведения',
    'personnel.assignment_created': 'Добавлено назначение',
    'personnel.assignment_updated': 'Изменено назначение',
    'personnel.assignment_transitioned': 'Изменено место работы',
  }
  return labels[action] ?? action
}
const historyColumns = [
  { key: 'created_at', label: 'Дата и время' },
  { key: 'section', label: 'Раздел' },
  { key: 'action', label: 'Изменение' },
  { key: 'before', label: 'Было' },
  { key: 'after', label: 'Стало' },
  { key: 'result', label: 'Результат системы' },
  { key: 'actor', label: 'Автор' },
]

function beginEdit(section: ProfileSection, record: ProfileEditRow) {
  editing.value = { section, record }
}

let generation = 0
const contractColumns = computed(() => [
  { key: 'contract_number', label: 'Номер договора' },
  { key: 'contract_type', label: 'Тип договора' },
  { key: 'employment_type', label: 'Вид занятости' },
  { key: 'valid_from', label: 'Действует с' },
  { key: 'valid_to', label: 'Действует до' },
  { key: 'probation_until', label: 'Испытание до' },
  { key: 'basis_reference', label: 'Основание' },
  ...(contractWritesEnabled.value ? [{ key: 'edit', label: 'Действия' }] : []),
])
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
  privateEditorSection.value = null
  privateRecordsSection.value = null
  assignmentCreateOpen.value = false
  profileCreateOpen.value = false
  contractEditorOpen.value = false
  editingContract.value = null
  contracts.value = []
  contractWritesEnabled.value = false
  error.value = ''
  profile.value = null
  try {
    const result = await getEmployee(company, employee)
    let contractResult = null
    if (result.meta.extended_sections_visible) {
      try {
        contractResult = await listEmployeeContracts(company, employee)
      } catch (cause) {
        if (current === generation)
          error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить трудовые договоры'
      }
    }
    if (current === generation) {
      profile.value = result
      contracts.value = contractResult?.data ?? []
      contractWritesEnabled.value = contractResult?.meta.writes_enabled ?? false
      // Keep the tab across refreshes and honor older deep-link names.
      activeSection.value = normalizeProfileTab(route.query.tab ?? activeSection.value)
    }
  } catch (cause) {
    if (current === generation) error.value = cause instanceof Error ? cause.message : 'Не удалось открыть карточку сотрудника'
  } finally {
    if (current === generation) loading.value = false
  }
}

function openContractEditor(contract: EmployeeContract | null = null) {
  editingContract.value = contract
  contractEditorOpen.value = true
}

function contractSaved() {
  contractEditorOpen.value = false
  editingContract.value = null
  void load()
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
    <nav class="employee-breadcrumb" :aria-label="tr('Навигация по разделам')">
      <img :src="publicAsset('prototype-icons/Home.svg')" alt="" aria-hidden="true" />
      <span>/</span>
      <RouterLink to="/employees">{{ tr('Сотрудники') }}</RouterLink>
      <span>/</span>
      <RouterLink to="/employees">{{ tr('Реестр сотрудников') }}</RouterLink>
      <span v-if="profile">/</span>
      <span v-if="profile" aria-current="page">{{ displayName }}</span>
    </nav>
    <div class="employee-page-heading">
      <div class="employee-page-title-row">
        <RouterLink class="employee-back-button" to="/employees" :title="tr('К реестру сотрудников')" :aria-label="tr('К реестру сотрудников')">
          <img :src="publicAsset('prototype-icons/arrow-back.svg')" alt="" />
        </RouterLink>
        <h1>{{ displayName }}</h1>
      </div>
      <BaseButton v-if="profile?.meta.employee_writes_enabled" variant="secondary" @click="identityEditOpen = true">
        <img :src="publicAsset('prototype-icons/Edit.svg')" class="employee-edit-icon" alt="" /> {{ tr('Изменить карточку') }}</BaseButton>
    </div>

    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseLoadingState v-if="loading" :label="tr('Загрузка карточки сотрудника')" />

    <template v-else-if="profile">
      <div class="employee-identity">
        <div class="identity-photo-section">
          <EmployeePhoto v-if="profile.meta.extended_sections_visible"
            :company-id="String(route.params.company)" :employee-id="profile.data.id"
            :revision="profile.data.revision" :has-photo="!!profile.data.has_photo"
            :can-edit="profile.meta.employee_writes_enabled" :name="displayName" :initials="initials" @saved="load" />
          <div v-else class="avatar" :aria-label="tr('Карточка сотрудника')">{{ initials }}</div>
          <div v-if="profile.meta.extended_sections_visible" class="gender-options" :aria-label="tr('Пол сотрудника')">
            <span :class="{ 'gender-selected': profile.data.gender === 'male' }"><i aria-hidden="true"></i> {{ tr('Мужчина') }}</span>
            <span :class="{ 'gender-selected': profile.data.gender === 'female' }"><i aria-hidden="true"></i> {{ tr('Женщина') }}</span>
          </div>
        </div>
        <div class="identity-fields">
          <div class="identity-fields-top">
            <span class="status-toggle" role="status" :class="{ 'status-toggle--inactive': !currentAssignment }">{{ currentAssignment ? tr('Карточка активна') : employmentStatus }}</span>
            <div class="personnel-id"><span>{{ tr('Табельный №') }}</span><strong>{{ profile.data.personnel_number }}</strong></div>
          </div>
          <div class="identity-name-fields">
            <div class="read-field" :data-field-state="profile.meta.employee_writes_enabled ? 'editable' : 'informative'">
              <span>{{ tr('Фамилия') }}</span>
              <div class="read-field-value" :class="{ 'read-field-value--editable': profile.meta.employee_writes_enabled }">
                <strong>{{ profile.data.last_name }}</strong>
                <BaseButton v-if="profile.meta.employee_writes_enabled" icon-only variant="secondary" class="identity-field-edit"
                  :aria-label="tr('Изменить поле:') + ' ' + tr('Фамилия')" @click="openFieldEditor('employee')">
                  <Pencil :size="14" aria-hidden="true"/>
                </BaseButton>
              </div>
            </div>
            <div class="read-field" :data-field-state="profile.meta.employee_writes_enabled ? 'editable' : 'informative'">
              <span>{{ tr('Имя') }}</span>
              <div class="read-field-value" :class="{ 'read-field-value--editable': profile.meta.employee_writes_enabled }">
                <strong>{{ profile.data.first_name }}</strong>
                <BaseButton v-if="profile.meta.employee_writes_enabled" icon-only variant="secondary" class="identity-field-edit"
                  :aria-label="tr('Изменить поле:') + ' ' + tr('Имя')" @click="openFieldEditor('employee')">
                  <Pencil :size="14" aria-hidden="true"/>
                </BaseButton>
              </div>
            </div>
            <div class="read-field" :data-field-state="profile.meta.employee_writes_enabled ? 'editable' : 'informative'">
              <span>{{ tr('Отчество') }}</span>
              <div class="read-field-value" :class="{ 'read-field-value--editable': profile.meta.employee_writes_enabled }">
                <strong>{{ profile.data.middle_name ?? '—' }}</strong>
                <BaseButton v-if="profile.meta.employee_writes_enabled" icon-only variant="secondary" class="identity-field-edit"
                  :aria-label="tr('Изменить поле:') + ' ' + tr('Отчество')" @click="openFieldEditor('employee')">
                  <Pencil :size="14" aria-hidden="true"/>
                </BaseButton>
              </div>
            </div>
            <div class="read-field" :data-field-state="profile.meta.employee_writes_enabled ? 'editable' : 'informative'">
              <span>{{ tr('Дата рождения') }}</span>
              <div class="read-field-value" :class="{ 'read-field-value--editable': profile.meta.employee_writes_enabled }">
                <strong>{{ profile.meta.extended_sections_visible ? formatDate(profile.data.birth_date) : '—' }}</strong>
                <BaseButton v-if="profile.meta.employee_writes_enabled" icon-only variant="secondary" class="identity-field-edit"
                  :aria-label="tr('Изменить поле:') + ' ' + tr('Дата рождения')" @click="openFieldEditor('employee')">
                  <Pencil :size="14" aria-hidden="true"/>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BaseViewTabs v-model="activeSection" :options="sectionTabs" :label="tr('Разделы карточки сотрудника')" />
      <div class="employee-field-legend" role="note">
        <span v-if="editableFieldGroups.length"><Pencil :size="13" aria-hidden="true" /> {{ tr('Поле можно изменить') }}</span>
        <span><LockKeyhole :size="13" aria-hidden="true" /> {{ tr('Информационные поля — только просмотр') }}</span>
      </div>
      <template v-if="activeSection === 'personal' && profile.meta.extended_sections_visible">

        <EmployeeProfileSection :title="tr('Контакты и адреса')">
          <EmployeeDataGrid :fields="contactFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          <EmployeeAddressBook v-if="hasNormalizedAddressStore"
            :company-id="String(route.params.company)" :employee-id="profile.data.id"
            :addresses="profile.private_profile?.addresses ?? []"
            :writable="Boolean(profile.meta.private_address_writes_enabled)"
            :truncated="Boolean(profile.meta.private_addresses_truncated)"
            @changed="load" />
          <div v-if="hasLegacyContactValues" class="employee-legacy-contact-section">
            <BaseButton v-if="hasNormalizedAddressStore" variant="secondary"
              class="employee-legacy-contact-trigger" :aria-expanded="legacyContactsOpen"
              aria-controls="employee-legacy-contact-values"
              @click="legacyContactsOpen = !legacyContactsOpen">
              <ChevronDown :size="15" aria-hidden="true" :class="{ 'legacy-chevron-open': legacyContactsOpen }" />
              {{ tr('Дополнительные контакты и прежние адреса') }}
            </BaseButton>
            <div v-if="!hasNormalizedAddressStore || legacyContactsOpen" id="employee-legacy-contact-values"
              class="employee-legacy-contact-values">
              <EmployeeDataGrid :fields="legacyContactFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
            </div>
          </div>
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Документы, удостоверяющие личность')">
          <template v-if="profile.meta.private_profile_writes_enabled" #actions>
            <BaseButton variant="secondary" :disabled="Boolean(profile.meta.private_identities_truncated)"
              @click="openIdentityRecord()">{{ tr('Управлять документами') }}</BaseButton>
          </template>
          <EmployeeDataGrid :fields="identityPersonFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          <div v-if="hasNormalizedIdentityStore" class="employee-identity-records">
            <div v-for="(document,index) in normalizedIdentities" :key="document.id" class="employee-identity-record">
              <div class="employee-identity-record-heading">
                <span>{{ tr('Документ') }}<template v-if="normalizedIdentities.length > 1"> {{ index + 1 }}</template></span>
                <span v-if="document.is_primary" class="employee-identity-primary">{{ tr('Основной') }}</span>
                <BaseButton v-if="profile.meta.private_profile_writes_enabled && !profile.meta.private_identities_truncated"
                  icon-only variant="secondary" class="identity-row-edit"
                  :aria-label="tr('Изменить документ') + ': ' + document.type"
                  :title="tr('Изменить документ')"
                  @click="openIdentityRecord(document.id)">
                  <Pencil :size="15" aria-hidden="true" />
                </BaseButton>
              </div>
              <EmployeeDataGrid :fields="normalizedIdentityFields(document)" />
            </div>
            <p v-if="!normalizedIdentities.length" class="employee-identity-empty">
              {{ tr('Документы, удостоверяющие личность, не внесены') }}
            </p>
          </div>
          <EmployeeDataGrid v-else :fields="legacyDocumentFields" />
          <BaseNotice v-if="profile.meta.private_identities_truncated" tone="warning">
            {{ tr('Показаны не все документы. Для полной истории откройте управление документами.') }}
          </BaseNotice>
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Место рождения')">
          <EmployeeDataGrid :fields="birthPlaceFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Семейные данные')">
          <template v-if="profile.meta.private_profile_writes_enabled" #actions>
            <BaseButton variant="secondary" :disabled="Boolean(profile.meta.private_family_truncated)"
              @click="openFamilyEditor()">{{ tr('Изменить') }}</BaseButton>
          </template>
          <EmployeeDataGrid :fields="maritalStatusFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          <EmployeeFamilyList :members="profile.private_profile?.family ?? reference?.family ?? []"
            :writable="Boolean(profile.meta.private_profile_writes_enabled)"
            :truncated="Boolean(profile.meta.private_family_truncated)"
            @create="openFamilyEditor(null, true)" @edit="openFamilyEditor($event)" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Воинский учёт')">
          <template v-if="profile.meta.private_profile_writes_enabled" #actions>
            <BaseButton variant="secondary" @click="privateEditorSection = 'military'">{{ tr('Изменить') }}</BaseButton>
          </template>
          <EmployeeDataGrid :fields="militaryFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Основные личные данные')">
          <template v-if="profile.meta.private_profile_writes_enabled" #actions>
            <BaseButton variant="secondary" @click="privateEditorSection = 'personal'">{{ tr('Изменить') }}</BaseButton>
          </template>
          <EmployeeDataGrid :fields="personalFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
      </template>

      <template v-if="activeSection === 'organization' && profile.meta.extended_sections_visible">
        <EmployeeProfileSection :title="tr('Подразделение и должность')">
          <EmployeeDataGrid :fields="organizationPositionFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Объект и место работы')">
          <EmployeeDataGrid :fields="workplaceFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Бригада и руководитель')">
          <EmployeeDataGrid :fields="teamFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
        <EmployeeProfileSection :title="tr('Статус и штатная позиция')">
          <EmployeeDataGrid :fields="staffingStatusFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
      </template>
      <div v-if="profile.meta.profile_writes_enabled && activeSection === 'development'" class="profile-toolbar">
        <BaseButton @click="profileCreateOpen = true"><Plus :size="16" /> {{ tr('Добавить сведения') }}</BaseButton>
      </div>

      <template v-if="activeSection === 'employment'">
        <EmployeeProfileSection :title="tr('Договор и приём')">
          <template v-if="contractWritesEnabled || profile.meta.assignment_writes_enabled" #actions>
            <div class="row-actions">
              <BaseButton v-if="contractWritesEnabled" @click="openContractEditor()">
                <Plus :size="16" /> {{ tr('Новый договор') }}
              </BaseButton>
              <BaseButton v-if="profile.meta.assignment_writes_enabled" variant="secondary" @click="assignmentCreateOpen = true">
                <Plus :size="16" /> {{ tr('Добавить назначение') }}
              </BaseButton>
            </div>
          </template>
          <EmployeeDataGrid :fields="contractFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />

          <template v-if="profile.meta.extended_sections_visible">
            <h3 class="assignment-history-title">{{ tr('История трудовых договоров') }}</h3>
            <BaseDataTable density="compact" :columns="contractColumns" :rows="contracts" row-key="id"
              :caption="tr('История трудовых договоров сотрудника')"
              :empty-title="tr('Трудовые договоры не внесены')"
              :empty-description="tr('Добавьте первый трудовой договор сотрудника.')">
              <template #cell-contract_type="{ value }">{{ contractTypeLabel(value) }}</template>
              <template #cell-employment_type="{ value }">{{ employmentTypeLabel(value) }}</template>
              <template #cell-valid_from="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
              <template #cell-valid_to="{ value }">{{ typeof value === 'string' ? formatDate(value) : tr('Бессрочно') }}</template>
              <template #cell-probation_until="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
              <template #cell-edit="{ row }">
                <BaseButton v-if="contractWritesEnabled" variant="secondary" @click="openContractEditor(row)">
                  {{ tr('Изменить') }}
                </BaseButton>
              </template>
            </BaseDataTable>
          </template>
        </EmployeeProfileSection>

        <EmployeeProfileSection :title="tr('Стаж и трудовой опыт')">
          <EmployeeDataGrid :fields="seniorityFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          <h3 class="assignment-history-title">{{ tr('История назначений') }}</h3>
          <BaseDataTable density="compact" :columns="columns" :rows="profile.assignments" row-key="id"
            :caption="tr('Доступная история назначений')" :empty-title="tr('Назначений не найдено')"
            :empty-description="tr('Для сотрудника нет доступных кадровых назначений.')">
            <template #cell-valid_from="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
            <template #cell-valid_to="{ value }">{{ typeof value === 'string' ? formatDate(value) : tr('По настоящее время') }}</template>
            <template #cell-edit="{ row }">
              <div class="row-actions">
                <BaseButton variant="secondary" @click="assignmentEditing = row; assignmentTransitioning = null">{{ tr('Изменить') }}</BaseButton>
                <BaseButton v-if="row.valid_to === null" @click="assignmentTransitioning = row; assignmentEditing = null">{{ tr('Перевести') }}</BaseButton>
              </div>
            </template>
          </BaseDataTable>
          <BaseNotice v-if="profile.meta.assignments_truncated" tone="info">{{ tr('Показаны первые 100 назначений. Для полной истории требуется отдельный просмотр.') }}</BaseNotice>

          <h3 class="assignment-history-title">{{ tr('Периоды стажа') }}</h3>
          <BaseDataTable density="compact" :rows="profile.experience" row-key="id" :caption="tr('Периоды трудового стажа')"
            :columns="[{key:'experience_type',label:tr('Вид стажа')},{key:'started_on',label:tr('Начало')},{key:'ended_on',label:tr('Окончание')},{key:'basis_reference',label:tr('Основание')}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:tr('Действия')}] : [])]"
            :empty-title="tr('Сведения о стаже отсутствуют')" :empty-description="tr('Периоды стажа ещё не внесены.')">
            <template #cell-started_on="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
            <template #cell-ended_on="{ value }">{{ typeof value === 'string' ? formatDate(value) : tr('По настоящее время') }}</template>
            <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('experience', row)">{{ tr('Изменить') }}</BaseButton></template>
          </BaseDataTable>
        </EmployeeProfileSection>

        <EmployeeProfileSection :title="tr('Условия труда и персонифицированный учёт')">
          <EmployeeDataGrid :fields="workingConditionFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>

        <EmployeeProfileSection :title="tr('Совмещение и дополнительные обязанности')">
          <EmployeeDataGrid :fields="combinationFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>

        <EmployeeProfileSection :title="tr('Прекращение договора')">
          <EmployeeDataGrid :fields="terminationFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
        </EmployeeProfileSection>
      </template>
      <template v-if="profile.meta.extended_sections_visible">
        <EmployeeProfileSection v-if="activeSection === 'documents'" :title="tr('Документы сотрудника')">
          <EmployeeDocumentsPanel :company-id="String(route.params.company)" :employee-id="profile.data.id" :documents="reference?.documents ?? []" />
        </EmployeeProfileSection>

        <template v-if="activeSection === 'payroll'">
          <EmployeeProfileSection :title="tr('Условия оплаты')">
            <EmployeeDataGrid :fields="payConditionFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Надбавки, компенсации и удержания')">
            <BaseDataTable density="compact" :rows="reference?.payroll_adjustments ?? []"
              :columns="payrollAdjustmentColumns" row-key="id"
              :caption="tr('Начисления и удержания сотрудника')"
              :empty-title="tr('Начисления не найдены')"
              :empty-description="tr('Для сотрудника пока нет доступных начислений и удержаний.')">
              <template #cell-amount="{ value }">{{ money(Number(value), reference?.payroll.currency ?? 'KZT') }}</template>
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Расчётный лист')">
            <EmployeeDataGrid :fields="payrollSummaryFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Динамика выплат и отработанных часов')">
            <BaseDataTable density="compact" :rows="reference?.payroll_history ?? []"
              :columns="payrollHistoryColumns" row-key="id"
              :caption="tr('История начислений и рабочего времени')"
              :empty-title="tr('История начислений пуста')"
              :empty-description="tr('Нет данных за предыдущие расчётные периоды.')">
              <template #cell-accrued="{ value }">{{ money(Number(value), reference?.payroll.currency ?? 'KZT') }}</template>
              <template #cell-withheld="{ value }">{{ money(Number(value), reference?.payroll.currency ?? 'KZT') }}</template>
              <template #cell-paid="{ value }">{{ money(Number(value), reference?.payroll.currency ?? 'KZT') }}</template>
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Банковские и налоговые данные')">
            <EmployeeDataGrid :fields="bankTaxFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          </EmployeeProfileSection>
        </template>

        <template v-if="activeSection === 'schedule'">
          <EmployeeProfileSection v-if="reference?.schedule" :title="tr('График работы')">
            <EmployeeDataGrid :fields="scheduleFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          </EmployeeProfileSection>

          <EmployeeProfileSection v-if="reference?.leave_summary || reference?.leave_limits?.length" :title="tr('Отпуска и лимиты отсутствий')">
            <EmployeeDataGrid :fields="leaveSummaryFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
            <h3 class="assignment-history-title">{{ tr('Лимиты и остатки') }}</h3>
            <BaseDataTable density="compact" :rows="reference?.leave_limits ?? []"
              :columns="leaveLimitColumns" row-key="id"
              :caption="tr('Лимиты отпусков и отсутствий')"
              :empty-title="tr('Лимиты не заданы')"
              :empty-description="tr('Для сотрудника не найдены доступные лимиты отпусков.')">
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection v-if="reference?.schedule" :title="tr('Табель за период')">
            <EmployeeDataGrid :fields="currentTimesheetFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Явки, неявки и отсутствия')">
            <EmployeeMonthWorktime :company-id="String(route.params.company)" :employee-id="profile.data.id" />
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('История табелей')">
            <EmployeeTimesheetHistory :company-id="String(route.params.company)" :employee-id="profile.data.id" />
          </EmployeeProfileSection>
        </template>

        <template v-if="activeSection === 'development'">
          <EmployeeProfileSection :title="tr('Кадровый резерв')">
            <EmployeeDataGrid :fields="reserveSummaryFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
            <h3 class="assignment-history-title">{{ tr('Параметры резерва') }}</h3>
            <EmployeeDataGrid :fields="reserveDetailFields" :editable-groups="editableFieldGroups" @edit="openFieldEditor" />
            <h3 class="assignment-history-title">{{ tr('История кадрового резерва') }}</h3>
            <BaseDataTable density="compact" :rows="profile.reserve" row-key="id" :caption="tr('Кадровый резерв сотрудника')"
              :columns="[{key:'target_position',label:tr('Резервируемая должность')},{key:'reserve_level',label:tr('Уровень')},{key:'reserve_type',label:tr('Вид')},{key:'joined_year',label:tr('Год зачисления')},{key:'left_year',label:tr('Год исключения')}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:tr('Действия')}] : [])]"
              :empty-title="tr('Записей резерва нет')" :empty-description="tr('Сотрудник пока не включён в кадровый резерв.')">
              <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('reserve', row)">{{ tr('Изменить') }}</BaseButton></template>
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Образование и квалификация')">
            <template v-if="profile.meta.private_profile_writes_enabled" #actions>
              <BaseButton variant="secondary" @click="privateRecordsSection = 'education'">{{ tr('Изменить') }}</BaseButton>
            </template>
            <BaseDataTable density="compact" :rows="reference?.education ?? []"
              :columns="educationColumns" row-key="id"
              :caption="tr('Образование и квалификация сотрудника')"
              :empty-title="tr('Сведения об образовании отсутствуют')"
              :empty-description="tr('Для сотрудника пока нет записей об образовании и квалификации.')">
              <template #cell-started_on="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
              <template #cell-ended_on="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Оценка соответствия и решения комиссии')">
            <BaseDataTable density="compact" :rows="reference?.fit_assessment ?? []"
              :columns="fitColumns" row-key="id"
              :caption="tr('Оценка соответствия требованиям кадрового резерва')"
              :empty-title="tr('Оценка не проведена')"
              :empty-description="tr('Для сотрудника пока нет результатов оценки.')">
              <template #cell-score_percent="{ value }">{{ value }}%</template>
            </BaseDataTable>
          </EmployeeProfileSection>

          <EmployeeProfileSection :title="tr('Дополнительное обучение')">
            <BaseDataTable density="compact" :rows="profile.training" row-key="id" :caption="tr('Обучение сотрудника')"
              :columns="[{key:'training_type',label:tr('Вид')},{key:'training_mode',label:tr('Формат')},{key:'topic',label:tr('Тема')},{key:'provider',label:tr('Центр обучения')},{key:'city',label:tr('Город')},{key:'started_on',label:tr('Начало')},{key:'ended_on',label:tr('Окончание')},{key:'document_reference',label:tr('Документ')}, ...(profile.meta.profile_writes_enabled ? [{key:'edit',label:tr('Действия')}] : [])]"
              :empty-title="tr('Обучение не зарегистрировано')" :empty-description="tr('Добавьте сведения об обучении сотрудника.')">
              <template #cell-training_type="{ value }">{{ trainingTypeLabel(value) }}</template>
              <template #cell-training_mode="{ value }">{{ trainingModeLabel(value) }}</template>
              <template #cell-started_on="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
              <template #cell-ended_on="{ value }">{{ formatDate(typeof value === 'string' ? value : null) }}</template>
              <template #cell-edit="{ row }"><BaseButton variant="secondary" @click="beginEdit('training', row)">{{ tr('Изменить') }}</BaseButton></template>
            </BaseDataTable>
          </EmployeeProfileSection>
        </template>

        <EmployeeProfileSection v-if="activeSection === 'history'" :title="tr('История изменений')">
          <BaseDataTable density="compact" :rows="historyRows" :columns="historyColumns" row-key="id"
            :caption="tr('История изменений карточки сотрудника')"
            :empty-title="tr('История изменений пуста')"
            :empty-description="tr('Для карточки ещё нет доступных событий.')">
            <template #cell-action="{ value }">{{ historyActionLabel(String(value)) }}</template>
            <template #cell-created_at="{ value }">{{ fmt.dateTime(String(value)) }}</template>
          </BaseDataTable>
          <BaseNotice v-if="profile.meta.history_truncated" tone="info">{{ tr('Показаны последние') }} {{ fmt.number(profile.meta.history_limit ?? 100, 0) }} {{ tr('изменений.') }}</BaseNotice>
        </EmployeeProfileSection>
      </template>
    </template>

    <BaseDialog :open="assignmentCreateOpen" :title="tr('Новое назначение')" @close="assignmentCreateOpen = false">
      <EmployeeAssignmentCreateForm v-if="assignmentCreateOpen && profile?.meta.assignment_writes_enabled"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="assignmentCreateOpen = false" />
    </BaseDialog>

    <BaseDialog :open="assignmentEditing !== null" :title="tr('Редактирование назначения')" @close="assignmentEditing = null">
      <EmployeeAssignmentCreateForm v-if="assignmentEditing"
        :key="assignmentEditing.id + ':' + assignmentEditing.revision"
        :edit="assignmentEditing" :company-id="String(route.params.company)"
        :employee-id="String(route.params.employee)" @saved="load" @cancelled="assignmentEditing = null" />
    </BaseDialog>

    <BaseDialog :open="assignmentTransitioning !== null" :title="tr('Перевод сотрудника')" @close="assignmentTransitioning = null">
      <EmployeeAssignmentCreateForm v-if="assignmentTransitioning"
        :key="assignmentTransitioning.id + ':' + assignmentTransitioning.revision"
        :transition-from="assignmentTransitioning"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="assignmentTransitioning = null" />
    </BaseDialog>

    <BaseDialog :open="profileCreateOpen" :title="tr('Добавить сведения')" @close="profileCreateOpen = false">
      <EmployeeProfileCreateForm v-if="profileCreateOpen && profile?.meta.profile_writes_enabled"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" />
    </BaseDialog>

    <BaseDialog :open="editing !== null" :title="tr('Изменить сведения')" @close="editing = null">
      <EmployeeProfileCreateForm v-if="editing && profile?.meta.profile_writes_enabled"
        :key="editing.record.id + ':' + editing.record.revision" :edit="editing"
        :company-id="String(route.params.company)" :employee-id="String(route.params.employee)"
        @saved="load" @cancelled="editing = null" />
    </BaseDialog>

    <BaseDialog :open="identityEditOpen" :title="tr('Основные данные сотрудника')" @close="identityEditOpen = false">
      <EmployeeRecordForm
        v-if="identityEditOpen && profile?.meta.employee_writes_enabled"
        :key="profile.data.id + ':' + profile.data.revision"
        :company-id="String(route.params.company)"
        :edit="profile.data"
        @saved="identityEditOpen = false; load()"
        @cancelled="identityEditOpen = false"
      />
    </BaseDialog>
    <EmployeePrivateProfileEditor v-if="profile && privateEditorSection !== null"
      :open="true" :company-id="String(route.params.company)" :employee-id="profile.data.id"
      :section="privateEditorSection" :profile="profile.private_profile"
      @close="privateEditorSection = null" @saved="privateEditorSection = null; load()" />
    <EmployeeContractEditor v-if="profile"
      :open="contractEditorOpen"
      :company-id="String(route.params.company)"
      :employee-id="profile.data.id"
      :contract="editingContract"
      @close="contractEditorOpen = false; editingContract = null"
      @saved="contractSaved" />

    <EmployeePrivateRecordsManager v-if="profile && privateRecordsSection !== null && profile.meta.private_profile_writes_enabled"
      :open="true" :company-id="String(route.params.company)" :employee-id="profile.data.id"
      :section="privateRecordsSection" :family="profile.private_profile?.family ?? []"
      :identities="profile.private_profile?.identity_documents ?? []"
      :education="profile.private_profile?.education ?? []"
      :initial-family-id="focusedFamilyId" :create-family-on-open="createFamilyOnOpen"
      :initial-identity-id="focusedIdentityId"
      :truncated="privateRecordsSection === 'family' ? profile.meta.private_family_truncated
        : privateRecordsSection === 'education' ? profile.meta.private_education_truncated
        : profile.meta.private_identities_truncated"
      @close="closePrivateRecords()" @saved="closePrivateRecords(); load()"
      @refresh="closePrivateRecords(); load()" />
  </section>
</template>

<style scoped>
.employee-profile{
  display:grid;grid-template-columns:minmax(0,1fr);gap:12px;
  max-width:100%;min-width:0;scroll-behavior:smooth;
  /* Source ZIP renders 12-13px labels and values rather than oversized global clamp tokens. */
  --employee-text:13px;
  --employee-caption:12px;
}
.employee-profile :deep(.view-tabs){
  margin:0 0 4px;
  min-height:36px;
  overflow-x:auto;
  overflow-y:hidden;
}
.employee-profile :deep(.view-tab){
  min-height:36px;
  padding:8px 12px;
  font-size:13px;
  line-height:17px;
}
.employee-breadcrumb{
  display:flex;align-items:center;gap:8px;min-height:20px;flex-wrap:wrap;
  color:var(--color-muted);font-size:11px;line-height:16px;
}
.employee-breadcrumb img{width:14px;height:14px;object-fit:contain}
.employee-breadcrumb a{color:var(--color-text)}
.employee-breadcrumb a:hover{color:var(--color-primary)}
.employee-breadcrumb [aria-current="page"]{
  max-width:min(420px,85vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.employee-page-heading{
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
}
.employee-page-title-row{display:flex;align-items:center;gap:10px;min-width:0}
.employee-page-title-row h1{
  margin:0;color:var(--color-text);font-size:20px;
  line-height:26px;font-weight:700;letter-spacing:-.015em;overflow-wrap:anywhere;
}
.employee-back-button{
  display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;
  border-radius:var(--radius-sm);
}
.employee-back-button:hover{background:var(--color-hover)}
.employee-back-button img,.employee-edit-icon{width:16px;height:16px;object-fit:contain}
.employee-page-heading :deep(.base-button){font-size:12px;min-height:34px}
.employee-identity{
  display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr);
  gap:18px;align-items:stretch;padding:16px;
  border:1px solid var(--color-stroke);border-radius:var(--radius-md);
  background:var(--color-surface);box-shadow:var(--shadow-card);
}
.identity-photo-section{
  min-width:0;padding-right:16px;border-right:1px solid var(--color-stroke);
}
.avatar{
  display:grid;place-items:center;flex:0 0 92px;width:92px;height:92px;
  border:1px solid var(--color-stroke-strong);border-radius:50%;
  background:var(--color-accent-soft);color:var(--color-primary);
  font-size:20px;line-height:1;font-weight:700;
}
.gender-options{display:flex;gap:13px;align-items:center;margin-top:13px;flex-wrap:wrap}
.gender-options span{
  display:inline-flex;align-items:center;gap:6px;
  color:var(--color-text);font-size:11px;font-weight:500;
}
.gender-options i{
  display:block;width:14px;height:14px;border:2px solid var(--color-stroke-strong);
  border-radius:50%;background:var(--color-surface);
}
.gender-options .gender-selected i{border:4px solid var(--color-primary)}
.identity-fields{min-width:0;display:grid;gap:14px;align-content:start}
.identity-fields-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.status-toggle{
  display:inline-flex;align-items:center;gap:7px;
  color:var(--color-text);font-size:11px;font-weight:600;
}
.personnel-id{
  display:flex;align-items:stretch;border:1px solid var(--color-stroke);
  border-radius:var(--radius-sm);overflow:hidden;font-size:11px;
}
.personnel-id span{
  display:flex;align-items:center;padding:7px 9px;background:var(--color-soft);
  color:var(--color-muted);font-weight:500;
}
.personnel-id strong{
  display:flex;align-items:center;padding:7px 9px;color:var(--color-text);font-weight:600;
}
.identity-name-fields{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 16px;
}
.read-field{display:grid;align-content:start;gap:5px;min-width:0}
.read-field>span{color:var(--color-muted);font-size:12px;line-height:17px;font-weight:500}
.read-field-value{display:flex;align-items:center;gap:4px;min-height:34px;min-width:0;padding:3px 0}
.read-field-value>strong{flex:1;min-width:0;color:var(--color-text);font-size:13px;line-height:19px;font-weight:500;overflow-wrap:anywhere}
.read-field-value--editable{padding:2px 3px 2px 10px;background:var(--color-surface-raised);border:1px solid var(--color-stroke);border-radius:var(--radius-sm)}
.read-field-value--editable>strong{font-weight:400}
.identity-field-edit{width:28px;min-width:28px;height:28px;min-height:28px;padding:0;background:transparent;border-color:transparent;box-shadow:none;color:var(--color-muted)}
.identity-field-edit :deep(svg){width:14px;height:14px}
.identity-field-edit:hover:not(:disabled){background:var(--color-accent-soft);color:var(--color-primary)}
.employee-legacy-contact-section{display:grid;gap:10px;min-width:0;margin-top:10px}
.employee-legacy-contact-trigger{justify-self:start;min-height:30px;height:auto;gap:7px;font-size:12px;font-weight:500;white-space:normal;text-align:start}
.employee-legacy-contact-trigger :deep(svg){flex:none;transition:transform .15s ease}
.employee-legacy-contact-trigger .legacy-chevron-open{transform:rotate(180deg)}
.employee-legacy-contact-values{border-top:1px solid var(--color-stroke);padding-top:12px;min-width:0}
.employee-identity-records{display:grid;gap:12px;min-width:0;margin-top:13px}
.employee-identity-record{display:grid;gap:12px;min-width:0;padding-top:12px;border-top:1px solid var(--color-stroke)}
.employee-identity-record-heading{display:flex;align-items:center;gap:9px;flex-wrap:wrap;color:var(--color-muted);font-size:12px;font-weight:600}
.identity-row-edit{flex:none;width:28px;min-width:28px;height:28px;min-height:28px;padding:0;border-color:transparent;box-shadow:none;background:transparent;color:var(--color-muted)}
.identity-row-edit:hover:not(:disabled){background:var(--color-accent-soft);color:var(--color-primary)}
.identity-row-edit :deep(svg){width:15px;height:15px}
.employee-identity-primary{padding:2px 7px;border-radius:4px;background:var(--color-success-surface);color:var(--color-success);font-size:11px;font-weight:500}
.employee-identity-empty{font-size:12px;color:var(--color-muted);line-height:1.5;margin:0}
.employee-field-legend{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:-5px 0 1px;font-size:11px;line-height:17px;color:var(--color-muted)}
.employee-field-legend>span{display:inline-flex;align-items:center;gap:5px}
.employee-field-legend svg{flex:none;color:var(--color-muted)}
.profile-toolbar{display:flex;justify-content:flex-end}
.profile-toolbar :deep(.base-button){min-height:34px;font-size:12px}
.row-actions{display:flex;gap:8px;flex-wrap:wrap}
.assignment-history-title{
  margin:2px 0 10px;color:var(--color-text);font-size:13px;line-height:19px;font-weight:600;
}
.assignment-history-title:not(:first-child){margin-top:16px}
.related-module-link{
  display:inline-flex;margin-top:10px;color:var(--color-primary);
  font-size:12px;font-weight:600;text-decoration:underline;text-underline-offset:3px;
}
@media(max-width:1000px){
  .employee-identity{grid-template-columns:minmax(175px,220px) minmax(0,1fr);gap:14px}
  .identity-photo-section{padding-right:14px}
}
@media(max-width:760px){
  .employee-identity{grid-template-columns:1fr;gap:14px}
  .identity-photo-section{padding-right:0;padding-bottom:14px;border-right:0;border-bottom:1px solid var(--color-stroke)}
}
@media(max-width:650px){
  .employee-page-heading{align-items:stretch}
  .employee-page-title-row h1{font-size:19px;line-height:24px}
  .employee-page-heading :deep(.base-button){width:100%;justify-content:center}
  .employee-identity{padding:13px}
  .avatar{flex-basis:74px;width:74px;height:74px;font-size:18px}
  .identity-fields-top{align-items:stretch}
  .personnel-id{width:max-content;max-width:100%}
  .identity-name-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .profile-toolbar :deep(.base-button){width:100%}
  .row-actions{display:grid;grid-template-columns:1fr}
  .row-actions :deep(.base-button){width:100%}
}
@media(max-width:400px){.identity-name-fields{grid-template-columns:1fr}}
</style>
