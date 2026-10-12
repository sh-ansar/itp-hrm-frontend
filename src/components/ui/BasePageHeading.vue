<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>
<template>
  <header class="base-page-heading">
    <div class="base-page-heading__copy">
      <h1 class="page-title">{{ title }}</h1>
      <p class="muted">{{ description }}</p>
    </div>
    <div class="base-page-heading__actions"><slot /></div>
  </header>
</template>
<style scoped>
.base-page-heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap}
.base-page-heading__copy{min-width:0}
.base-page-heading__copy p{margin:0;font-size:var(--font-body-size)}
.base-page-heading__actions{display:flex;gap:var(--space-2)}
@media(max-width:600px){.base-page-heading{align-items:flex-start}.base-page-heading__actions{width:100%}.base-page-heading__actions :deep(button){width:100%}}
</style>
