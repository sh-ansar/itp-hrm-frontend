<script setup lang="ts">
withDefaults(defineProps<{ vertical?: boolean }>(), { vertical: false })
</script>

<template>
  <span class="ui-divider" :class="{ 'ui-divider--vertical': vertical }" aria-hidden="true"></span>
</template>

<style scoped>
.ui-divider{display:block;flex:none;width:100%;height:1px;border-radius:999px;background:var(--color-stroke)}
.ui-divider--vertical{width:1px;height:auto;align-self:stretch}
</style>
