<script setup lang="ts">import BaseCard from '../components/ui/BaseCard.vue'
const modules=['Организационная структура','Сотрудники','Штатное расписание','Кадровые документы']
</script>
<template><h1 class="page-title">Обзор системы</h1><p class="muted">Модули первой очереди. Реальные показатели появятся после подключения API.</p><div class="cards"><BaseCard v-for="module in modules" :key="module"><strong>{{module}}</strong><div class="muted" style="margin-top:12px">Подготовка модуля</div></BaseCard></div><BaseCard style="margin-top:24px"><h2>Кадровые данные</h2><div class="empty">Данные отсутствуют. Подключение к backend ещё не настроено.</div></BaseCard></template>
