<script setup lang="ts">
import { ArrowRight, BriefcaseBusiness, FileText, Network, UserRoundCheck, Users } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'

const focusModules = [
  { to: '/employees', title: 'Сотрудники', description: 'Реестр, карточки, назначения и история кадровых данных', icon: Users, status: 'Подключено' },
  { to: '/organization', title: 'Оргструктура', description: 'Компании и доступная иерархия подразделений', icon: Network, status: 'Подключено' },
  { to: '/staffing', title: 'Штатное расписание', description: 'Справочник должностей подключён, версии штатного расписания развиваются', icon: BriefcaseBusiness, status: 'В работе' },
  { to: '/personnel-actions', title: 'Кадровые действия', description: 'Приём, перевод и увольнение как единые бизнес-операции', icon: UserRoundCheck, status: 'Следующий этап' },
]

const nextModules = [
  { to: '/documents', label: 'Документы и приказы', icon: FileText },
  { to: '/leaves', label: 'Отпуска' },
  { to: '/timesheets', label: 'Табельный учёт' },
  { to: '/reports', label: 'Отчёты и аналитика' },
]
</script>

<template>
  <section class="overview-page">
    <BasePageHeading
      title="Обзор системы"
      description="Кадровые процессы, организационная структура и развитие персонала в едином рабочем пространстве."
    />
    <div class="hero-grid">
      <BaseCard class="hero-card">
        <p class="eyebrow">Текущий контур</p>
        <h2>Кадровый учёт уже подключён к реальным API</h2>
        <p class="muted">Реестр сотрудников, карточка, история назначений, стаж, обучение и кадровый резерв работают на защищённом backend. Следующий шаг — бизнес-процессы и документы.</p>
        <RouterLink class="primary-link" to="/employees">Перейти к сотрудникам <ArrowRight :size="17" /></RouterLink>
      </BaseCard>
      <BaseCard>
        <p class="eyebrow">Фокус разработки</p>
        <div class="focus-list">
          <div><strong>1</strong><span>Полная карточка сотрудника</span></div>
          <div><strong>2</strong><span>Штатное расписание и вакансии</span></div>
          <div><strong>3</strong><span>Приказы и кадровые действия</span></div>
        </div>
      </BaseCard>
    </div>

    <div class="module-grid">
      <RouterLink v-for="module in focusModules" :key="module.to" :to="module.to" class="module-link">
        <BaseCard class="module-card">
          <div class="module-icon"><component :is="module.icon" :size="22" /></div>
          <div class="module-copy">
            <div class="module-title-row"><strong>{{ module.title }}</strong><span class="status">{{ module.status }}</span></div>
            <p>{{ module.description }}</p>
          </div>
          <ArrowRight class="module-arrow" :size="18" />
        </BaseCard>
      </RouterLink>
    </div>

    <BaseCard>
      <div class="section-heading">
        <div><p class="eyebrow">Следующая очередь</p><h2>Остальные модули уже заложены в навигацию</h2></div>
        <span class="muted">Без декоративных «готовых» экранов без backend</span>
      </div>
      <div class="next-grid">
        <RouterLink v-for="item in nextModules" :key="item.to" :to="item.to">{{ item.label }} <ArrowRight :size="15" /></RouterLink>
      </div>
    </BaseCard>
  </section>
</template>

<style scoped>
.overview-page{display:grid;gap:var(--space-5)}
.hero-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,.8fr);gap:var(--space-4)}
.hero-card{background:linear-gradient(135deg,#fff 0%,#f3fbff 100%)}
.eyebrow{margin:0 0 8px;color:var(--color-primary);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
h2{margin:0;font-size:var(--font-section-heading);line-height:1.35}
.hero-card .muted{max-width:760px;line-height:1.6;margin:12px 0 18px}
.primary-link{display:inline-flex;align-items:center;gap:7px;color:var(--color-primary);font-weight:700}
.focus-list{display:grid;gap:14px;margin-top:18px}
.focus-list div{display:flex;align-items:center;gap:12px}
.focus-list strong{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:var(--color-accent-soft);color:var(--color-primary)}
.focus-list span{font-size:14px;font-weight:600}
.module-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.module-link{min-width:0}
.module-card{height:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:14px;transition:transform .15s ease,border-color .15s ease}
.module-link:hover .module-card{transform:translateY(-2px);border-color:rgba(6,151,224,.3)}
.module-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--color-accent-soft);color:var(--color-primary)}
.module-copy{min-width:0}
.module-title-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.module-copy p{margin:8px 0 0;color:var(--color-muted);font-size:13px;line-height:1.5}
.status{font-size:11px;font-weight:700;color:var(--color-primary);background:var(--color-accent-soft);padding:5px 8px;border-radius:999px}
.module-arrow{color:var(--color-muted);margin-top:10px}
.section-heading{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.next-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.next-grid a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);font-size:13px;font-weight:600}
@media(max-width:900px){.hero-grid,.module-grid{grid-template-columns:1fr}.next-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.next-grid{grid-template-columns:1fr}}
</style>
