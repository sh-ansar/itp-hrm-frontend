<script setup lang="ts">
import BaseButton from './BaseButton.vue'
withDefaults(defineProps<{ page: number; lastPage: number; loading?: boolean; caption?: string }>(), {
  loading: false,
  caption: 'Страницы реестра',
})
defineEmits<{ previous: []; next: [] }>()
</script>

<template>
  <nav v-if="lastPage > 1" class="base-pagination" :aria-label="caption">
    <BaseButton variant="secondary" :disabled="loading || page <= 1" @click="$emit('previous')">Назад</BaseButton>
    <span class="base-pagination__label" aria-live="polite">Страница {{ page }} из {{ lastPage }}</span>
    <BaseButton variant="secondary" :disabled="loading || page >= lastPage" @click="$emit('next')">Далее</BaseButton>
  </nav>
</template>
<style scoped>
.base-pagination{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-4)}
.base-pagination__label{font-size:var(--font-caption-size);color:var(--color-muted)}
</style>
