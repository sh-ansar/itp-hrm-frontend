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
.base-page-heading{min-width:0;display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap}
.base-page-heading__copy{min-width:0;max-width:760px;display:grid;gap:0}
.base-page-heading__copy :deep(.page-title){margin:0;color:var(--color-text);font-size:var(--font-page-heading);line-height:1.333;font-weight:700;letter-spacing:0}
.base-page-heading__copy p{margin:0;color:var(--color-muted);font-size:var(--font-body-size);line-height:var(--line-body);font-weight:400}
.base-page-heading__actions{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
@media(max-width:600px){.base-page-heading{align-items:flex-start}.base-page-heading__actions{width:100%;justify-content:flex-start}.base-page-heading__actions :deep(button){width:100%}}
</style>
