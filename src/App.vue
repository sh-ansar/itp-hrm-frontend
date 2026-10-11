<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LayoutDashboard, Users, Network, BriefcaseBusiness } from 'lucide-vue-next'
import BaseButton from './components/ui/BaseButton.vue'
import { useSessionStore } from './stores/session'
import { browserLoginEnabled } from './router'

const router = useRouter()
const session = useSessionStore()
const logoutError = ref('')
const links = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard },
  { to: '/employees', label: 'Сотрудники', icon: Users },
  { to: '/organization', label: 'Структура', icon: Network },
  { to: '/staffing', label: 'Штатное расписание', icon: BriefcaseBusiness },
]

async function logout() {
  logoutError.value = ''
  try {
    await session.logout()
    await router.replace({ name: 'login' })
  } catch (cause) {
    logoutError.value = cause instanceof Error ? cause.message : 'Не удалось завершить сеанс'
  }
}
</script>

<template>
  <RouterView v-if="$route.name === 'login'" />
  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">ITP HRM<small>Кадровая система</small></div>
      <nav aria-label="Главная навигация">
        <RouterLink v-for="link in links" :key="link.to" class="nav-item" :to="link.to">
          <component :is="link.icon" :size="19" />{{ link.label }}
        </RouterLink>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <strong>Кадровая служба</strong>
        <div v-if="browserLoginEnabled && session.user" class="user-panel">
          <span class="muted">{{ session.user.name }}</span>
          <BaseButton variant="secondary" :disabled="session.loading" @click="logout">Выйти</BaseButton>
        </div>
        <span v-else class="muted">Демонстрационная среда</span>
      </header>
      <p v-if="logoutError" class="shell-error" role="alert">{{ logoutError }}</p>
      <main class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.user-panel{display:flex;gap:12px;align-items:center}
.shell-error{color:#b72b2b;margin:12px 32px}
@media(max-width:700px){.user-panel{gap:8px}.user-panel .muted{max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
