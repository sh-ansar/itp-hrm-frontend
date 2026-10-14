<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, UserRound, BriefcaseBusiness, ShieldCheck } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseCard from './ui/BaseCard.vue'
import BaseField from './ui/BaseField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { useUiPreferencesStore, type UiLocale } from '../stores/uiPreferences'

const props = withDefaults(defineProps<{
  companyName?: string
  employeeName?: string
  employeeEmail?: string
  departmentName?: string
  positionName?: string
}>(), {
  companyName: 'ITP HRM',
  employeeName: '',
  employeeEmail: '',
  departmentName: '',
  positionName: '',
})

const emit = defineEmits<{ completed: [] }>()

const ui = useUiPreferencesStore()
const step = ref(1)
const fullName = ref(props.employeeName || '')
const city = ref('Астана')
const email = ref(props.employeeEmail || '')
const phone = ref('')
const department = ref(props.departmentName || 'Отдел не назначен')
const position = ref(props.positionName || 'Должность не назначена')

watch(() => props.employeeName, value => { if (!fullName.value && value) fullName.value = value })
watch(() => props.employeeEmail, value => { if (!email.value && value) email.value = value })
watch(() => props.departmentName, value => { department.value = value || 'Отдел не назначен' })
watch(() => props.positionName, value => { position.value = value || 'Должность не назначена' })

const access = ref({
  corporateMail: true,
  hrm: true,
  documents: true,
  reports: false,
  staffing: false,
  directories: false,
})
const confirmations = ref({
  confidentiality: false,
  personalData: false,
  responsibility: false,
})

type Copy = {
  welcome: string
  intro: string
  personal: string
  workplace: string
  responsibility: string
  fullName: string
  city: string
  email: string
  phone: string
  department: string
  position: string
  company: string
  personalHint: string
  standardAccess: string
  additionalAccess: string
  mail: string
  hrm: string
  documents: string
  reports: string
  staffing: string
  directories: string
  accessHint: string
  assignedRole: string
  confidentiality: string
  personalData: string
  responsibilityConfirm: string
  responsibilityHint: string
  previous: string
  next: string
  finish: string
  required: string
  step: string
}
const copy: Record<UiLocale, Copy> = {
  ru: {
    welcome: 'Добро пожаловать в систему',
    intro: 'Проверьте личные данные, настройте рабочее место и подтвердите правила доступа. Это займёт несколько минут.',
    personal: 'Личная информация пользователя',
    workplace: 'Настройка рабочего места',
    responsibility: 'Подтверждение ответственности',
    fullName: 'ФИО',
    city: 'Город',
    email: 'Корпоративная почта',
    phone: 'Телефон',
    department: 'Подразделение',
    position: 'Должность',
    company: 'Компания',
    personalHint: 'Данные используются для рабочего профиля и кадровых процессов.',
    standardAccess: 'Стандартный доступ',
    additionalAccess: 'Дополнительные права',
    mail: 'Корпоративная почта и уведомления',
    hrm: 'Личный кабинет HRM',
    documents: 'Кадровые документы и приказы',
    reports: 'Отчёты и аналитика',
    staffing: 'Оргструктура и штатное расписание',
    directories: 'Справочники',
    accessHint: 'Дополнительные права могут требовать согласования руководителя или HR.',
    assignedRole: 'Базовая роль «Сотрудник» будет назначена для работы в системе.',
    confidentiality: 'Я ознакомлен(а) с требованиями конфиденциальности',
    personalData: 'Я ознакомлен(а) с правилами обработки персональных данных',
    responsibilityConfirm: 'Я принимаю ответственность за действия под своей учётной записью',
    responsibilityHint: 'После подтверждения настройки считаются завершёнными.',
    previous: 'Назад',
    next: 'Продолжить',
    finish: 'Приступить к работе',
    required: 'Подтвердите все пункты ответственности.',
    step: 'Шаг',
  },
  kk: {
    welcome: 'Жүйеге қош келдіңіз',
    intro: 'Жеке деректерді тексеріңіз, жұмыс орнын баптаңыз және қолжетімділік ережелерін растаңыз.',
    personal: 'Пайдаланушының жеке ақпараты',
    workplace: 'Жұмыс орнын баптау',
    responsibility: 'Жауапкершілікті растау',
    fullName: 'Аты-жөні',
    city: 'Қала',
    email: 'Корпоративтік пошта',
    phone: 'Телефон',
    department: 'Бөлімше',
    position: 'Лауазым',
    company: 'Компания',
    personalHint: 'Деректер жұмыс профилі мен кадрлық процестер үшін пайдаланылады.',
    standardAccess: 'Стандартты қолжетімділік',
    additionalAccess: 'Қосымша құқықтар',
    mail: 'Корпоративтік пошта және хабарландырулар',
    hrm: 'HRM жеке кабинеті',
    documents: 'Кадрлық құжаттар мен бұйрықтар',
    reports: 'Есептер және аналитика',
    staffing: 'Ұйымдық құрылым және штат',
    directories: 'Анықтамалықтар',
    accessHint: 'Қосымша құқықтар басшы немесе HR келісімін талап етуі мүмкін.',
    assignedRole: 'Жүйеде жұмыс істеу үшін базалық «Қызметкер» рөлі тағайындалады.',
    confidentiality: 'Құпиялылық талаптарымен таныстым',
    personalData: 'Жеке деректерді өңдеу ережелерімен таныстым',
    responsibilityConfirm: 'Өз тіркелгімдегі әрекеттер үшін жауапкершілікті қабылдаймын',
    responsibilityHint: 'Растаудан кейін баптау аяқталды деп есептеледі.',
    previous: 'Артқа',
    next: 'Жалғастыру',
    finish: 'Жұмысты бастау',
    required: 'Жауапкершілік тармақтарының барлығын растаңыз.',
    step: 'Қадам',
  },
  en: {
    welcome: 'Welcome to the system',
    intro: 'Review your profile, configure your workplace access and confirm the access rules. It only takes a few minutes.',
    personal: 'Personal information',
    workplace: 'Workplace setup',
    responsibility: 'Responsibility confirmation',
    fullName: 'Full name',
    city: 'City',
    email: 'Corporate email',
    phone: 'Phone',
    department: 'Department',
    position: 'Position',
    company: 'Company',
    personalHint: 'This information is used for the work profile and HR processes.',
    standardAccess: 'Standard access',
    additionalAccess: 'Additional permissions',
    mail: 'Corporate email and notifications',
    hrm: 'HRM self-service',
    documents: 'HR documents and orders',
    reports: 'Reports and analytics',
    staffing: 'Organization and staffing',
    directories: 'Directories',
    accessHint: 'Additional permissions may require manager or HR approval.',
    assignedRole: 'The base Employee role will be assigned for system access.',
    confidentiality: 'I have read the confidentiality requirements',
    personalData: 'I have read the personal-data processing rules',
    responsibilityConfirm: 'I accept responsibility for actions under my account',
    responsibilityHint: 'Setup is complete after these confirmations.',
    previous: 'Back',
    next: 'Continue',
    finish: 'Start working',
    required: 'Confirm all responsibility items.',
    step: 'Step',
  },
  ka: {
    welcome: 'კეთილი იყოს თქვენი მობრძანება სისტემაში',
    intro: 'გადაამოწმეთ პირადი მონაცემები, მოაწესრიგეთ სამუშაო წვდომა და დაადასტურეთ წესები. ამას რამდენიმე წუთი დასჭირდება.',
    personal: 'მომხმარებლის პირადი ინფორმაცია',
    workplace: 'სამუშაო ადგილის გამართვა',
    responsibility: 'პასუხისმგებლობის დადასტურება',
    fullName: 'სახელი და გვარი',
    city: 'ქალაქი',
    email: 'კორპორაციული ელფოსტა',
    phone: 'ტელეფონი',
    department: 'ქვედანაყოფი',
    position: 'თანამდებობა',
    company: 'კომპანია',
    personalHint: 'მონაცემები გამოიყენება სამუშაო პროფილისა და საკადრო პროცესებისთვის.',
    standardAccess: 'სტანდარტული წვდომა',
    additionalAccess: 'დამატებითი უფლებები',
    mail: 'კორპორაციული ელფოსტა და შეტყობინებები',
    hrm: 'HRM პირადი კაბინეტი',
    documents: 'საკადრო დოკუმენტები და ბრძანებები',
    reports: 'ანგარიშები და ანალიტიკა',
    staffing: 'ორგსტრუქტურა და საშტატო განრიგი',
    directories: 'ცნობარები',
    accessHint: 'დამატებითი უფლებები შესაძლოა საჭიროებდეს ხელმძღვანელის ან HR-ის თანხმობას.',
    assignedRole: 'სისტემით სარგებლობისთვის მოგენიჭებათ საბაზისო როლი „თანამშრომელი“.',
    confidentiality: 'გავეცანი კონფიდენციალურობის მოთხოვნებს',
    personalData: 'გავეცანი პერსონალური მონაცემების დამუშავების წესებს',
    responsibilityConfirm: 'ვიღებ პასუხისმგებლობას ჩემი ანგარიშით შესრულებულ მოქმედებებზე',
    responsibilityHint: 'დადასტურების შემდეგ გამართვა დასრულებულად ჩაითვლება.',
    previous: 'უკან',
    next: 'გაგრძელება',
    finish: 'მუშაობის დაწყება',
    required: 'დაადასტურეთ პასუხისმგებლობის ყველა პუნქტი.',
    step: 'ნაბიჯი',
  },
}

const t = computed(() => copy[ui.locale])
const titles = computed(() => [t.value.personal, t.value.workplace, t.value.responsibility])
const allConfirmed = computed(() => Object.values(confirmations.value).every(Boolean))
const validationMessage = ref('')

function next() {
  validationMessage.value = ''
  if (step.value < 3) step.value += 1
}
function previous() {
  validationMessage.value = ''
  if (step.value > 1) step.value -= 1
}
function finish() {
  if (!allConfirmed.value) {
    validationMessage.value = t.value.required
    return
  }
  validationMessage.value = ''
  emit('completed')
}
</script>

<template>
  <section class="onboarding-shell" :aria-label="t.welcome">
    <div class="onboarding-intro">
      <div>
        <h2>{{ t.welcome }}</h2>
        <p>{{ t.intro }}</p>
      </div>
      <span class="onboarding-step-count">{{ t.step }} {{ step }} / 3</span>
    </div>

    <ol class="onboarding-progress" aria-label="Onboarding progress">
      <li v-for="(title,index) in titles" :key="title"
        :class="{ active: step === index + 1, done: step > index + 1 }">
        <span class="step-dot">
          <Check v-if="step > index + 1" :size="13" aria-hidden="true" />
          <span v-else>{{ index + 1 }}</span>
        </span>
        <strong>{{ title }}</strong>
      </li>
    </ol>

    <BaseCard class="onboarding-card">
      <template v-if="step === 1">
        <div class="onboarding-section-heading">
          <UserRound :size="22" aria-hidden="true" />
          <div><h3>{{ t.personal }}</h3><p>{{ t.personalHint }}</p></div>
        </div>
        <div class="profile-layout">
          <div class="profile-avatar" aria-hidden="true">
            {{ (fullName || 'HR').split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase() || 'HR' }}
          </div>
          <div class="form-grid">
            <BaseField id="onboarding-name" v-model="fullName" :label="t.fullName" />
            <BaseField id="onboarding-city" v-model="city" :label="t.city" />
            <BaseField id="onboarding-email" v-model="email" :label="t.email" type="email" />
            <BaseField id="onboarding-phone" v-model="phone" :label="t.phone" />
            <div class="readonly-field"><span>{{ t.company }}</span><strong>{{ companyName }}</strong></div>
            <div class="readonly-field"><span>{{ t.department }}</span><strong>{{ department }}</strong></div>
            <div class="readonly-field"><span>{{ t.position }}</span><strong>{{ position }}</strong></div>
          </div>
        </div>
      </template>

      <template v-else-if="step === 2">
        <div class="onboarding-section-heading">
          <BriefcaseBusiness :size="22" aria-hidden="true" />
          <div><h3>{{ t.workplace }}</h3><p>{{ t.accessHint }}</p></div>
        </div>
        <div class="access-columns">
          <fieldset class="access-group">
            <legend>{{ t.standardAccess }}</legend>
            <label><input v-model="access.corporateMail" type="checkbox" /><span>{{ t.mail }}</span></label>
            <label><input v-model="access.hrm" type="checkbox" /><span>{{ t.hrm }}</span></label>
            <label><input v-model="access.documents" type="checkbox" /><span>{{ t.documents }}</span></label>
          </fieldset>
          <fieldset class="access-group">
            <legend>{{ t.additionalAccess }}</legend>
            <label><input v-model="access.reports" type="checkbox" /><span>{{ t.reports }}</span></label>
            <label><input v-model="access.staffing" type="checkbox" /><span>{{ t.staffing }}</span></label>
            <label><input v-model="access.directories" type="checkbox" /><span>{{ t.directories }}</span></label>
          </fieldset>
        </div>
      </template>

      <template v-else>
        <div class="onboarding-section-heading">
          <ShieldCheck :size="22" aria-hidden="true" />
          <div><h3>{{ t.responsibility }}</h3><p>{{ t.assignedRole }}</p></div>
        </div>
        <div class="confirmations">
          <label><input v-model="confirmations.confidentiality" type="checkbox" /><span>{{ t.confidentiality }}</span></label>
          <label><input v-model="confirmations.personalData" type="checkbox" /><span>{{ t.personalData }}</span></label>
          <label><input v-model="confirmations.responsibility" type="checkbox" /><span>{{ t.responsibilityConfirm }}</span></label>
        </div>
        <p class="responsibility-hint">{{ t.responsibilityHint }}</p>
        <BaseNotice v-if="validationMessage" tone="warning">{{ validationMessage }}</BaseNotice>
      </template>

      <div class="onboarding-actions">
        <BaseButton v-if="step > 1" variant="secondary" @click="previous">
          <ChevronLeft :size="16" aria-hidden="true" /> {{ t.previous }}
        </BaseButton>
        <span class="action-spacer"></span>
        <BaseButton v-if="step < 3" @click="next">
          {{ t.next }} <ChevronRight :size="16" aria-hidden="true" />
        </BaseButton>
        <BaseButton v-else :disabled="!allConfirmed" @click="finish">{{ t.finish }}</BaseButton>
      </div>
    </BaseCard>
  </section>
</template>

<style scoped>
.onboarding-shell{display:grid;gap:18px;min-width:0}
.onboarding-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.onboarding-intro>div{display:grid;gap:5px;max-width:760px}
.onboarding-intro h2{margin:0;font-size:24px;line-height:31px;letter-spacing:-.02em}
.onboarding-intro p{margin:0;color:var(--color-muted);font-size:13px;line-height:19px}
.onboarding-step-count{padding:6px 10px;border:1px solid var(--color-stroke);border-radius:999px;background:var(--color-surface);color:var(--color-muted);font-size:11px;font-weight:700}
.onboarding-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:0;list-style:none;border-bottom:1px solid var(--color-stroke)}
.onboarding-progress li{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;min-width:0;padding:10px 8px 13px;color:var(--color-muted);font-size:11px;text-align:center}
.onboarding-progress li::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:transparent}
.onboarding-progress li.active,.onboarding-progress li.done{color:var(--color-success)}
.onboarding-progress li.active::after,.onboarding-progress li.done::after{background:var(--color-success)}
.step-dot{display:grid;place-items:center;flex:0 0 20px;width:20px;height:20px;border-radius:50%;border:1px solid var(--color-stroke-strong);background:var(--color-surface);font-size:10px;font-weight:800}
.onboarding-progress li.active .step-dot,.onboarding-progress li.done .step-dot{border-color:var(--color-success);background:var(--color-success-surface);color:var(--color-success)}
.onboarding-card{min-width:0}
.onboarding-section-heading{display:flex;align-items:flex-start;gap:11px;margin-bottom:18px}
.onboarding-section-heading>svg{flex:0 0 auto;color:var(--color-primary)}
.onboarding-section-heading>div{display:grid;gap:3px}
.onboarding-section-heading h3{margin:0;font-size:16px;line-height:22px}
.onboarding-section-heading p{margin:0;color:var(--color-muted);font-size:11px;line-height:16px}
.profile-layout{display:grid;grid-template-columns:100px minmax(0,1fr);gap:20px;align-items:start}
.profile-avatar{display:grid;place-items:center;width:88px;height:88px;border-radius:50%;border:1px solid var(--color-primary-stroke);background:var(--color-accent-soft);color:var(--color-primary);font-size:24px;font-weight:800}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 18px}
.readonly-field{display:grid;gap:8px;min-width:0}
.readonly-field span{font-size:14px;font-weight:600}
.readonly-field strong{min-height:44px;display:flex;align-items:center;padding:11px 13px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-soft);font-size:13px;font-weight:500;overflow-wrap:anywhere}
.access-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
.access-group{display:grid;gap:0;margin:0;padding:0;border:0}
.access-group legend{padding:0 0 8px;font-size:12px;font-weight:700}
.access-group label,.confirmations label{display:flex;align-items:flex-start;gap:10px;padding:11px 0;border-bottom:1px solid var(--color-stroke);font-size:12px;line-height:17px}
.access-group input,.confirmations input{width:17px;height:17px;flex:0 0 17px;accent-color:var(--color-primary);margin-top:1px}
.confirmations{display:grid;gap:0}
.responsibility-hint{margin:14px 0 0;color:var(--color-muted);font-size:11px;line-height:16px}
.onboarding-actions{display:flex;align-items:center;gap:9px;margin-top:20px;padding-top:16px;border-top:1px solid var(--color-stroke)}
.action-spacer{flex:1}
@media(max-width:720px){
  .profile-layout{grid-template-columns:1fr}
  .profile-avatar{width:72px;height:72px}
  .form-grid,.access-columns{grid-template-columns:1fr}
  .onboarding-progress{grid-template-columns:1fr;border:1px solid var(--color-stroke);border-radius:8px;overflow:hidden}
  .onboarding-progress li{justify-content:flex-start;text-align:left;border-bottom:1px solid var(--color-stroke)}
  .onboarding-progress li:last-child{border-bottom:0}
  .onboarding-progress li::after{top:0;bottom:0;right:auto;width:3px;height:auto}
}
@media(max-width:520px){
  .onboarding-intro h2{font-size:21px;line-height:28px}
  .onboarding-actions{flex-wrap:wrap}
  .onboarding-actions :deep(.base-button){flex:1}
  .action-spacer{display:none}
}
</style>
