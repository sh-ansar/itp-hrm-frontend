<script setup lang="ts">
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
defineProps<{ title: string; description: string }>()
</script>

<template>
  <h1 class="page-title">{{ title }}</h1>
  <p class="muted">Функциональный модуль</p>
  <BaseCard>
    <div class="module-state" role="status">
      <span class="state-indicator" aria-hidden="true"></span>
      <div>
        <h2 class="module-state-title">Раздел в разработке</h2>
        <p class="muted">{{ description }}</p>
        <p class="muted">Для этого раздела пока нет подключённых кадровых данных или доступных операций.</p>
        <RouterLink to="/" custom v-slot="{ navigate }">
          <BaseButton variant="secondary" @click="navigate">Вернуться к обзору</BaseButton>
        </RouterLink>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.module-state{display:flex;align-items:flex-start;gap:16px;padding:12px 0}
.state-indicator{width:12px;height:12px;flex:none;margin-top:7px;background:#e5a500;border-radius:50%}
.module-state-title{margin:0 0 8px;font-size:20px}
.module-state p{max-width:700px;line-height:1.6}
</style>
