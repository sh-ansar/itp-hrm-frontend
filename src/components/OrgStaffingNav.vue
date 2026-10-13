<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { House } from 'lucide-vue-next'

const route = useRoute()
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
    <nav class="org-staffing-tabs" aria-label="Разделы оргструктуры и штатного расписания">
      <RouterLink v-for="tab in tabs" :key="tab.id" :to="tab.to"
        class="org-staffing-tab" :class="{ 'org-staffing-tab--active': current === tab.id }"
        :aria-current="current === tab.id ? 'page' : undefined">
        {{ tab.label }}
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.org-staffing-navigation{display:grid;gap:13px;min-width:0}
.org-breadcrumbs{display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden;white-space:nowrap;color:var(--color-muted);font-size:var(--font-caption-size)}
.org-breadcrumbs a{display:inline-flex;align-items:center;gap:6px}
.org-breadcrumbs a:hover{color:var(--color-primary)}
.org-breadcrumbs span[aria-current]{overflow:hidden;text-overflow:ellipsis;color:var(--color-text)}
.org-staffing-tabs{display:flex;align-items:center;gap:4px;max-width:100%;overflow-x:auto;border-bottom:1px solid var(--color-stroke);scrollbar-width:thin}
.org-staffing-tab{position:relative;display:inline-flex;align-items:center;min-height:39px;padding:11px 16px;color:var(--color-text);font-size:var(--font-label-size);font-weight:500;white-space:nowrap;border-radius:8px 8px 0 0;transition:color .15s,background .15s}
.org-staffing-tab:hover{color:var(--color-primary);background:var(--color-soft)}
.org-staffing-tab--active{color:var(--color-primary);background:var(--color-surface)}
.org-staffing-tab--active::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--color-primary)}
@media(max-width:720px){.org-staffing-navigation{gap:7px}.org-breadcrumbs{display:none}.org-staffing-tab{padding:10px 13px;font-size:12px}}
</style>
