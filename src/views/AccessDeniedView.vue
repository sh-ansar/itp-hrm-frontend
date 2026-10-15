<script setup lang="ts">
import { computed } from 'vue'
import { useUiPreferencesStore } from '../stores/uiPreferences'
import { useCompanyAccessStore } from '../stores/companyAccess'
import BaseCard from '../components/ui/BaseCard.vue'

const ui = useUiPreferencesStore()
const access = useCompanyAccessStore()
const copy = {
  ru: ['Доступ ограничен', 'Раздел недоступен для вашей роли в выбранной компании. Если вам нужен доступ, обратитесь к администратору.', 'Личный кабинет сотрудника пока не подключён.', 'Перейти в настройки'],
  kk: ['Қолжетімділік шектелген', 'Бұл бөлім таңдалған компаниядағы рөліңізге қолжетімсіз. Әкімшіге хабарласыңыз.', 'Қызметкердің жеке кабинеті әлі қосылмаған.', 'Параметрлерге өту'],
  en: ['Access restricted', 'Your role in the selected company does not allow this page. Contact an administrator if access is required.', 'Employee self-service is not connected yet.', 'Open settings'],
  ka: ['წვდომა შეზღუდულია', 'ეს განყოფილება არჩეულ კომპანიაში თქვენი როლისთვის მიუწვდომელია. საჭიროების შემთხვევაში მიმართეთ ადმინისტრატორს.', 'თანამშრომლის პირადი კაბინეტი ჯერ არ არის დაკავშირებული.', 'პარამეტრების გახსნა'],
}
const text = computed(() => copy[ui.locale])
</script>
<template>
  <section class="access-restricted">
    <BaseCard class="access-card">
      <h1>{{ text[0] }}</h1>
      <p>{{ text[1] }}</p>
      <p v-if="access.active?.role_code === 'employee'">{{ text[2] }}</p>
      <RouterLink to="/settings" class="access-settings">{{ text[3] }}</RouterLink>
    </BaseCard>
  </section>
</template>
<style scoped>
.access-restricted{display:grid;place-items:center;min-height:60vh;padding:18px}
.access-card{display:grid;gap:12px;max-width:540px;width:100%}
h1{margin:0;font-size:22px;color:var(--color-text)}
p{margin:0;color:var(--color-muted);font-size:14px;line-height:1.6}
.access-settings{font-size:13px;color:var(--color-primary);font-weight:700}
</style>
