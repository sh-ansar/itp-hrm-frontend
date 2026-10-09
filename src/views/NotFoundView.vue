<script setup lang="ts">
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
</script>

<template>
  <h1 class="page-title">Страница не найдена</h1>
  <BaseCard>
    <div class="not-found" role="status">
      <div class="error-number">404</div>
      <p class="muted">Проверьте адрес страницы. Возможно, раздел был перемещён или ссылка указана неверно.</p>
      <RouterLink to="/" custom v-slot="{ navigate }">
        <BaseButton variant="primary" @click="navigate">Перейти к обзору</BaseButton>
      </RouterLink>
    </div>
  </BaseCard>
</template>

<style scoped>
.not-found{text-align:center;padding:30px 12px;max-width:520px;margin:auto}
.error-number{font-weight:700;font-size:54px;color:var(--color-text)}
.not-found p{line-height:1.6;margin:12px 0 24px}
</style>
