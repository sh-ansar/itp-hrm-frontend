<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowRight, BriefcaseBusiness, FileText, Network, UserRoundCheck, Users, ClipboardList } from 'lucide-vue-next'
import BaseCard from '../components/ui/BaseCard.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'
import { listCompanies, listDepartments, listPositions } from '../api/organization'
import { listEmployees } from '../api/personnel'
import { listPersonnelActions } from '../api/personnelActions'

const companyName = ref('')
const loading = ref(true)
const summary = ref<{ employees: number | null; departments: number | null; positions: number | null; actions: number | null }>({
  employees: null, departments: null, positions: null, actions: null,
})
const shortcuts = [
  { to: '/employees', title: 'Сотрудники', description: 'Реестр и личные карточки', icon: Users },
  { to: '/organization', title: 'Оргструктура', description: 'Подразделения и иерархия', icon: Network },
  { to: '/staffing', title: 'Штатное расписание', description: 'Плановые ставки и вакансии', icon: BriefcaseBusiness },
  { to: '/personnel-actions', title: 'Кадровые действия', description: 'Приём, перевод и увольнение', icon: UserRoundCheck },
  { to: '/documents', title: 'Документы и приказы', description: 'Кадровый реестр и PDF', icon: FileText },
  { to: '/directories', title: 'Справочники', description: 'Должности и настройки учёта', icon: ClipboardList },
]

async function loadSummary() {
  loading.value = true
  try {
    const companies = await listCompanies()
    const company = companies.data[0]
    if (!company) return
    companyName.value = company.name
    const values = await Promise.allSettled([
      listEmployees(company.id),
      listDepartments(company.id),
      listPositions(company.id),
      listPersonnelActions(company.id),
    ])
    summary.value = {
      employees: values[0].status === 'fulfilled' ? values[0].value.meta.total : null,
      departments: values[1].status === 'fulfilled' ? values[1].value.meta.total : null,
      positions: values[2].status === 'fulfilled' ? values[2].value.meta.total : null,
      actions: values[3].status === 'fulfilled' ? values[3].value.meta.total : null,
    }
  } catch {
    companyName.value = ''
  } finally {
    loading.value = false
  }
}
onMounted(loadSummary)
</script>

<template>
  <section class="overview-page">
    <BasePageHeading title="Обзор системы" description="Сводная информация по персоналу и кадровым процессам" />
    <BaseCard class="welcome">
      <div class="welcome-copy">
        <span class="eyebrow">Кадровая служба</span>
        <h2>Управление персоналом</h2>
        <p>Все данные о сотрудниках, должностях, назначениях и документах — в одном рабочем пространстве.</p>
        <RouterLink to="/employees" class="primary-link">Открыть реестр сотрудников <ArrowRight :size="17" /></RouterLink>
      </div>
      <div class="welcome-icon" aria-hidden="true"><Users :size="64" :stroke-width="1.1" /></div>
    </BaseCard>

    <div class="section-line"><h2>Кадровая сводка</h2><span>{{ companyName }}</span></div>
    <div class="stats">
      <BaseCard><span>Сотрудники</span><strong>{{ loading ? '…' : summary.employees ?? '—' }}</strong><Users :size="18" /></BaseCard>
      <BaseCard><span>Подразделения</span><strong>{{ loading ? '…' : summary.departments ?? '—' }}</strong><Network :size="18" /></BaseCard>
      <BaseCard><span>Должности</span><strong>{{ loading ? '…' : summary.positions ?? '—' }}</strong><BriefcaseBusiness :size="18" /></BaseCard>
      <BaseCard><span>Кадровые события</span><strong>{{ loading ? '…' : summary.actions ?? '—' }}</strong><UserRoundCheck :size="18" /></BaseCard>
    </div>

    <div class="section-line"><h2>Разделы системы</h2></div>
    <div class="module-grid">
      <RouterLink v-for="item in shortcuts" :key="item.to" :to="item.to" class="module-link">
        <BaseCard class="module-card">
          <div class="module-icon"><component :is="item.icon" :size="22" :stroke-width="1.8" /></div>
          <div><strong>{{ item.title }}</strong><p>{{ item.description }}</p></div>
          <ArrowRight class="module-arrow" :size="17" />
        </BaseCard>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.overview-page{display:grid;gap:var(--space-5);min-width:0}
.welcome{display:flex;align-items:center;justify-content:space-between;gap:24px;background:linear-gradient(115deg,#fff,#f2faff);min-height:206px}
.welcome-copy{max-width:620px}
.eyebrow{font-size:11px;text-transform:uppercase;color:var(--color-primary);font-weight:700;letter-spacing:.07em}
.welcome h2{font-size:clamp(22px,2vw,28px);letter-spacing:-.025em;margin:9px 0}
.welcome p{font-size:14px;line-height:1.6;color:var(--color-muted);margin:0 0 20px}
.welcome-icon{flex:0 0 118px;width:118px;height:118px;display:grid;place-items:center;background:var(--color-accent-soft);color:var(--color-primary);border-radius:30px}
.primary-link{display:inline-flex;align-items:center;gap:8px;color:var(--color-primary);font-size:13px;font-weight:700}
.section-line{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 -10px}
.section-line h2{margin:0;font-size:18px;letter-spacing:-.02em}
.section-line span{font-size:12px;color:var(--color-muted)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-4)}
.stats :deep(.base-card){position:relative;min-height:120px;display:grid;align-content:space-between;gap:10px}
.stats span{font-size:12px;color:var(--color-muted)}
.stats strong{font-size:27px;font-weight:700}
.stats svg{position:absolute;top:22px;right:23px;color:var(--color-primary)}
.module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4)}
.module-link{min-width:0}
.module-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;min-height:112px;transition:border-color .15s ease,transform .15s ease}
.module-link:hover .module-card{transform:translateY(-2px);border-color:var(--color-primary)}
.module-icon{width:46px;height:46px;display:grid;place-items:center;background:var(--color-accent-soft);color:var(--color-primary);border-radius:13px}
.module-card strong{font-size:14px}
.module-card p{margin:6px 0 0;font-size:12px;color:var(--color-muted);line-height:1.4}
.module-arrow{color:var(--color-muted)}
@media(max-width:1200px){.module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1000px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.stats,.module-grid{grid-template-columns:1fr}.welcome{padding:20px!important;min-height:0}.welcome-icon{display:none}.overview-page{gap:var(--space-4)}}
</style>
