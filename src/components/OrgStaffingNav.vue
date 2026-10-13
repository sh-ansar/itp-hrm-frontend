<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { House } from 'lucide-vue-next'
import BaseViewTabs from './ui/BaseViewTabs.vue'

const route = useRoute()
const router = useRouter()
const current = computed(() => {
  if (route.path === '/organization') return 'organization'
  const view = String(route.query.view ?? 'all')
  if (view === 'vacant') return 'vacant'
  if (view === 'changes') return 'changes'
  return 'staffing'
})
const tabs = [
  { id: 'organization', label: 'Организационная структура', to: '/organization' },
  { id: 'staffing', label: 'Штатное расписание', to: '/staffing?view=all' },
  { id: 'vacant', label: 'Вакантные позиции', to: '/staffing?view=vacant' },
  { id: 'changes', label: 'Изменения штатного расписания', to: '/staffing?view=changes' },
]
const currentLabel = computed(() => tabs.find(item => item.id === current.value)?.label ?? tabs[0].label)
const tabOptions = tabs.map(({ id, label }) => ({ id, label }))
function selectTab(id: string) {
  const target = tabs.find(item => item.id === id)
  if (target) router.push(target.to)
}
</script>

<template>
  <div class="org-staffing-navigation">
    <nav class="org-breadcrumbs" aria-label="Навигационная цепочка">
      <RouterLink to="/" aria-label="Главная"><House :size="15" /></RouterLink>
      <span aria-hidden="true">/</span>
      <RouterLink to="/organization">Оргструктура и штатка</RouterLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ currentLabel }}</span>
    </nav>
    <BaseViewTabs :model-value="current" :options="tabOptions"
      label="Разделы оргструктуры и штатного расписания"
      @update:model-value="selectTab" />
  </div>
</template>

<style scoped>
.org-staffing-navigation{display:grid;gap:13px;min-width:0}
.org-breadcrumbs{display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden;white-space:nowrap;color:var(--color-muted);font-size:var(--font-caption-size)}
.org-breadcrumbs a{display:inline-flex;align-items:center;gap:6px}
.org-breadcrumbs a:hover{color:var(--color-primary)}
.org-breadcrumbs span[aria-current]{overflow:hidden;text-overflow:ellipsis;color:var(--color-text)}
@media(max-width:720px){.org-staffing-navigation{gap:7px}.org-breadcrumbs{display:none}}
</style>
