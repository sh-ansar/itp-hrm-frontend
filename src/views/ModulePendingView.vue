<script setup lang="ts">
import BaseCard from '../components/ui/BaseCard.vue'
import BaseEmptyState from '../components/ui/BaseEmptyState.vue'
import BasePageHeading from '../components/ui/BasePageHeading.vue'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <section class="pending-page">
    <BasePageHeading :title="title" :description="description" />
    <BaseCard>
      <BaseEmptyState title="Пока нет данных" description="Записи для этого раздела сейчас недоступны." />
    </BaseCard>
  </section>
</template>

<style scoped>
.pending-page{display:grid;gap:var(--space-4);min-width:0}
</style>
