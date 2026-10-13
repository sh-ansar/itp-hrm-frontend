<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary'; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }>(),{
  variant:'primary',type:'button',disabled:false,
})
</script>

<template>
  <button :type="type" :disabled="disabled" :class="['base-button',variant]"><slot /></button>
</template>

<style scoped>
.base-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--control-height);padding:10px var(--space-4);border:1px solid var(--color-stroke);border-radius:var(--radius-md);font:inherit;font-size:13px;font-weight:600;line-height:1.3;white-space:normal;text-align:center;transition:background .15s ease,border-color .15s ease}
.primary{background:var(--color-primary);color:var(--color-on-primary);border-color:var(--color-primary)}
.primary:hover:not(:disabled){background:#087eb9}
.secondary{background:var(--color-surface);color:var(--color-text)}
.secondary:hover:not(:disabled){background:var(--color-accent-soft);border-color:rgba(6,151,224,.26)}
.base-button:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px}
.base-button:disabled{opacity:.5;cursor:not-allowed}
@media(prefers-reduced-motion:reduce){.base-button{transition:none}}
</style>
