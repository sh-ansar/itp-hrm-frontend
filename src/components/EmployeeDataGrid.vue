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
/* Employee-card reference: compact labels above restrained 36px readonly fields.
   This component is deliberately scoped so the global BNT scale is unchanged. */
.employee-data-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  column-gap:18px;
  row-gap:16px;
  min-width:0;
}
.employee-data-field{
  display:grid;
  align-content:start;
  gap:6px;
  min-width:0;
}
.employee-data-field>span{
  font-size:12px;
  line-height:17px;
  font-weight:600;
  color:var(--color-text);
}
.employee-data-field>strong{
  min-width:0;
  min-height:36px;
  display:flex;
  align-items:center;
  padding:7px 10px;
  border:1px solid var(--color-stroke);
  border-radius:var(--radius-sm);
  background:var(--color-surface);
  box-shadow:var(--shadow-control);
  color:var(--color-text);
  font-size:13px;
  line-height:19px;
  font-weight:400;
  overflow-wrap:anywhere;
}
.employee-data-field--wide{grid-column:span 2}
.employee-data-field--muted>strong{color:var(--color-muted)}
@media(max-width:980px){
  .employee-data-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px}
}
@media(max-width:640px){
  .employee-data-grid{grid-template-columns:1fr;row-gap:12px}
  .employee-data-field--wide{grid-column:auto}
}
</style>
