<script setup lang="ts">
interface EmployeeDisplayField {
  label: string
  value: string | number | null | undefined
  wide?: boolean
  muted?: boolean
}
defineProps<{ fields: EmployeeDisplayField[] }>()
</script>

<template>
  <div class="employee-data-grid">
    <div v-for="field in fields" :key="field.label"
      class="employee-data-field" :class="{ 'employee-data-field--wide': field.wide, 'employee-data-field--muted': field.muted }">
      <span>{{ field.label }}</span>
      <strong>{{ field.value === null || field.value === undefined || field.value === '' ? '—' : field.value }}</strong>
    </div>
  </div>
</template>

<style scoped>
.employee-data-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 24px}
.employee-data-field{display:grid;align-content:start;gap:7px;min-width:0}
.employee-data-field>span{font-size:var(--font-body-size);line-height:var(--line-caption);font-weight:500;color:var(--color-text)}
.employee-data-field>strong{
  min-width:0;min-height:22px;display:flex;align-items:flex-start;padding:0;
  color:var(--color-text);font-size:var(--font-body-size);line-height:1.5;font-weight:400;overflow-wrap:anywhere
}

.employee-data-field--wide{grid-column:span 2}
.employee-data-field--muted>strong{color:var(--color-muted)}
@media(max-width:980px){.employee-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.employee-data-grid{grid-template-columns:1fr}.employee-data-field--wide{grid-column:auto}}
</style>
