<script setup lang="ts">
import { ref, useId } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  initiallyOpen?: boolean
}>(), { initiallyOpen: true })

const expanded = ref(props.initiallyOpen)
const contentId = useId()
</script>

<template>
  <section class="employee-profile-section">
    <header class="section-heading">
      <h2>{{ title }}</h2>
      <div class="section-actions">
        <slot name="actions" />
        <button type="button" class="expand-button" :aria-expanded="expanded"
          :aria-controls="contentId" :aria-label="expanded ? 'Свернуть: ' + title : 'Развернуть: ' + title"
          @click="expanded = !expanded">
          <span class="chevron" :class="{ 'chevron--expanded': expanded }" aria-hidden="true"></span>
        </button>
      </div>
    </header>
    <div v-show="expanded" :id="contentId" class="section-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.employee-profile-section{min-width:0;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-card)}
.section-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:58px;padding:12px 18px;border-bottom:1px solid var(--color-stroke)}
.section-heading h2{margin:0;color:var(--color-text);font-size:15px;font-weight:600;line-height:1.4}
.section-actions{display:flex;align-items:center;gap:10px;min-width:0}
.expand-button{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border:1px solid var(--color-stroke);border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-muted)}
.expand-button:hover{background:var(--color-soft);color:var(--color-primary)}
.expand-button:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}
.chevron{width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .15s ease}
.chevron--expanded{transform:translateY(2px) rotate(225deg)}
.section-content{min-width:0;padding:16px 18px 18px}
@media(max-width:600px){.section-heading{min-height:54px;padding:11px 13px}.section-heading h2{font-size:14px}.section-content{padding:14px 13px 16px}}
@media(prefers-reduced-motion:reduce){.chevron{transition:none}}
</style>
