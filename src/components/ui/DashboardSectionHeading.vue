<script setup lang="ts">
import { publicAsset } from '../../utils/publicAsset'
defineProps<{title:string;to:string;actionLabel:string;subtitle?:string}>()
</script>
<template>
  <div class="dashboard-section-heading">
    <div class="section-copy"><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
    <div class="section-actions"><slot name="actions"></slot>
      <RouterLink class="section-open" :to="to" :aria-label="actionLabel" :title="actionLabel">
        <span>{{ actionLabel }}</span><img :src="publicAsset('prototype-icons/Arrow-more.svg')" alt="" aria-hidden="true" />
      </RouterLink>
    </div>
  </div>
</template>
<style scoped>
.dashboard-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;flex-wrap:wrap;margin-bottom:12px}
.section-copy{min-width:0}
.section-copy h2{margin:0;color:var(--color-text);font-size:22px;line-height:29px;font-weight:700;letter-spacing:-.022em}
.section-copy p{margin:4px 0 0;color:var(--color-muted);font-size:11px}
.section-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.section-open{display:inline-flex;justify-content:center;align-items:center;gap:6px;min-height:34px;max-width:100%;padding:6px 10px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);box-shadow:var(--shadow-control);color:var(--color-text);font-size:12px;font-weight:600}
.section-open img{width:17px;height:17px;flex:none}
.section-open:hover{border-color:var(--color-primary-stroke);color:var(--color-primary)}
@media(max-width:650px){.section-copy h2{font-size:18px;line-height:25px}.section-open span{display:none}.section-open{width:34px;padding:6px}}
</style>
