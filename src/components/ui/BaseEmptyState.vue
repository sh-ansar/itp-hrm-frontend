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
    <span class="state-marker" aria-hidden="true"></span>
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
.empty-state{display:flex;gap:16px;align-items:flex-start;padding:16px 0;max-width:780px}
.state-marker{height:12px;width:12px;border-radius:50%;flex:none;margin-top:8px;background:#8ba9ba}
.warning .state-marker{background:#c48b26}
.body{min-width:0}
h2{font-size:20px;line-height:1.3;margin:0 0 10px;color:var(--color-text)}
p{line-height:1.6;margin:0 0 18px;color:var(--color-muted);overflow-wrap:anywhere}
@media(max-width:520px){.empty-state{gap:12px;padding:8px 0}h2{font-size:18px}}
</style>
