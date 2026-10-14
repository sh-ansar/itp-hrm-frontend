<script setup lang="ts">
withDefaults(defineProps<{ columns?: 2 | 3 | 4; label?: string }>(), {
  columns: 4,
  label: 'Основные показатели',
})
</script>

<template>
  <section class="base-kpi-grid" :class="'base-kpi-grid--'+columns" :aria-label="label">
    <slot />
  </section>
</template>

<style scoped>
.base-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;min-width:0;max-width:100%}
.base-kpi-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}
.base-kpi-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}
@media(max-width:1200px){.base-kpi-grid,.base-kpi-grid--3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.base-kpi-grid,.base-kpi-grid--3,.base-kpi-grid--2{grid-template-columns:minmax(0,1fr);gap:9px}}
</style>
