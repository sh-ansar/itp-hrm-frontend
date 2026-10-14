<script setup lang="ts">
export interface FilterSummaryItem { id: string; label: string }

withDefaults(defineProps<{
  items: FilterSummaryItem[]
  label?: string
  clearLabel?: string
}>(), {
  label: 'Активные фильтры',
  clearLabel: 'Сбросить всё',
})

const emit = defineEmits<{
  remove: [id: string]
  clear: []
}>()
</script>

<template>
  <div v-if="items.length" class="filter-summary" :aria-label="label">
    <div class="filter-summary__pills">
      <button v-for="item in items" :key="item.id" type="button" class="filter-pill"
        :aria-label="'Сбросить: ' + item.label" @click="emit('remove', item.id)">
        <span class="filter-pill__title">{{ item.label }}</span>
        <span class="filter-pill__close" aria-hidden="true">×</span>
      </button>
    </div>
    <button v-if="items.length > 1" type="button" class="filter-summary__clear" @click="emit('clear')">
      {{ clearLabel }}
    </button>
  </div>
</template>

<style scoped>
.filter-summary{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap}
.filter-summary__pills{min-width:0;display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.filter-pill{
  min-height:32px;max-width:100%;display:inline-flex;align-items:center;gap:var(--space-1);
  padding:5px 9px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);
  background:var(--color-surface-raised);color:var(--color-text);box-shadow:var(--shadow-control);
  font:inherit;font-size:12px;line-height:16px;font-weight:500;cursor:pointer
}
.filter-pill:hover{background:var(--color-hover)}
.filter-pill:focus-visible,.filter-summary__clear:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.filter-pill__title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.filter-pill__close{flex:none;color:var(--color-muted);font-size:17px;line-height:14px}
.filter-summary__clear{min-height:32px;padding:4px 8px;border:0;background:transparent;color:var(--color-primary);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
</style>
