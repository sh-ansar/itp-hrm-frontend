<script setup lang="ts">
import BaseButton from './BaseButton.vue'

withDefaults(defineProps<{
  title: string
  description: string
  actionLabel?: string
  tone?: 'neutral' | 'warning'
}>(), {
  actionLabel: 'Вернуться к обзору',
  tone: 'neutral',
})
</script>

<template>
  <section class="empty-state" role="status" :class="tone">
    <div class="body">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <slot />
      <RouterLink to="/" custom v-slot="{ navigate }">
        <BaseButton variant="secondary" @click="navigate">{{ actionLabel }}</BaseButton>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.empty-state{display:flex;gap:var(--space-3);align-items:flex-start;padding:var(--space-4) 0;max-width:780px}
.body{min-width:0}
h2{font-size:var(--font-section-heading);line-height:1.4;font-weight:600;margin:0 0 var(--space-2);color:var(--color-text)}
p{font-size:var(--font-body-size);line-height:var(--line-body);margin:0 0 var(--space-4);color:var(--color-muted);overflow-wrap:anywhere}
@media(max-width:520px){.empty-state{gap:var(--space-2);padding:var(--space-2) 0}}
</style>
