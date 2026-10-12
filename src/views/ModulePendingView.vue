<script setup lang="ts">
import BaseCard from '../components/ui/BaseCard.vue'
import BaseEmptyState from '../components/ui/BaseEmptyState.vue'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <h1 class="page-title">{{ title }}</h1>
  <p class="muted">Функциональный модуль</p>
  <BaseCard>
    <BaseEmptyState title="Раздел в разработке" :description="description" tone="warning">
      <p class="muted">Для этого раздела пока нет подключённых кадровых данных или доступных операций.</p>
    </BaseEmptyState>
  </BaseCard>
</template>
