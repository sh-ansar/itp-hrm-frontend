<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>(), { description: '', eyebrow: '' })
</script>

<template>
  <header class="base-page-heading">
    <div class="base-page-heading__copy">
      <span v-if="eyebrow" class="base-page-heading__eyebrow">{{ eyebrow }}</span>
      <div class="base-page-heading__title-row">
        <h1 class="page-title">{{ title }}</h1>
        <slot name="info" />
      </div>
      <p v-if="description" class="muted">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="base-page-heading__actions"><slot /></div>
  </header>
</template>

<style scoped>
.base-page-heading{min-width:0;display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-5);flex-wrap:wrap}
.base-page-heading__copy{min-width:0;max-width:760px;display:grid;gap:0}
.base-page-heading__eyebrow{
  display:block;margin:0;color:var(--color-primary);font-size:12px;line-height:17px;
  font-weight:500;letter-spacing:0;text-transform:uppercase
}
.base-page-heading__title-row{min-width:0;display:flex;align-items:flex-start;gap:var(--space-1)}
.base-page-heading__copy :deep(.page-title){margin:0;color:var(--color-text);font-size:var(--font-page-heading);line-height:1.333;font-weight:700;letter-spacing:0}
.base-page-heading__copy p{margin:0;color:var(--color-muted);font-size:var(--font-body-size);line-height:var(--line-body);font-weight:400}
.base-page-heading__actions{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
@media(max-width:600px){
  .base-page-heading{align-items:flex-start;gap:var(--space-3)}
  .base-page-heading__actions{width:100%;justify-content:flex-start}
  .base-page-heading__actions :deep(button){width:100%}
}
</style>
