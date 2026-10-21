<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { getEmployeeWorktimeMonth } from '../api/worktime'
import BaseDataTable from './ui/BaseDataTable.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseLoadingState from './ui/BaseLoadingState.vue'
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { useUiFormatters } from '../composables/useUiFormatters'
import { localTodayISO } from '../utils/localDate'

const props = defineProps<{ companyId: string; employeeId: string }>()
const { tr } = useWorkspaceI18n()
const fmt = useUiFormatters()
const selectedYear = ref(Number(localTodayISO().slice(0,4)))
const rows = ref<Record<string, unknown>[]>([])
const busy = ref(false)
const error = ref('')
let requestId = 0
const columns = computed(() => [
  { key:'period', label:tr('Период') },
  { key:'planned', label:tr('План, ч') },
  { key:'worked', label:tr('Отработано, ч') },
  { key:'deviation', label:tr('Отклонение, ч') },
  { key:'days', label:tr('Дней с записями') },
  { key:'overtime', label:tr('Сверхурочно, ч') },
  { key:'absence', label:tr('Отсутствие, ч') },
])
function displayMinutes(minutes:number|null|undefined) {
  return minutes == null ? '—' : fmt.number(minutes/60,1)
}
async function load() {
  const id=++requestId
  busy.value=true
  error.value=''
  rows.value=[]
  const now=localTodayISO().slice(0,7)
  const months=Array.from({length:12},(_,i)=>selectedYear.value+'-'+String(12-i).padStart(2,'0'))
    .filter(month=>month<=now)
  try {
    // API provides employee-authorized month facts, not a fabricated demo history.
    // Bound concurrency avoids hammering the Laravel service.
    const collected:Record<string,unknown>[]=[]
    for (let i=0;i<months.length;i+=3) {
      const group=await Promise.all(months.slice(i,i+3).map(async period=>{
        const response=await getEmployeeWorktimeMonth(props.companyId,props.employeeId,period)
        const s=response.data.summary
        return s.days_recorded ? {
          id:period,period,
          planned:displayMinutes(s.planned_minutes),
          worked:displayMinutes(s.worked_minutes),
          deviation:s.planned_minutes==null||s.worked_minutes==null?'—':displayMinutes(s.worked_minutes-s.planned_minutes),
          days:s.days_recorded,
          overtime:displayMinutes(s.overtime_minutes),
          absence:displayMinutes(s.absence_minutes),
        } : null
      }))
      if(id!==requestId)return
      collected.push(...group.filter((row):row is NonNullable<typeof row>=>row!==null))
    }
    if(id===requestId)rows.value=collected
  } catch {
    if(id===requestId)error.value=tr('Не удалось загрузить историю табелей')
  } finally {
    if(id===requestId)busy.value=false
  }
}
watch([()=>props.companyId,()=>props.employeeId,selectedYear],()=>{void load()},{immediate:true})
onBeforeUnmount(()=>{requestId++})
</script>

<template>
  <section class="employee-timesheet-history" :aria-label="tr('История табелей сотрудника')">
    <div class="timesheet-history-toolbar">
      <label :for="'timesheet-year-'+employeeId">{{ tr('Год') }}</label>
      <select :id="'timesheet-year-'+employeeId" v-model.number="selectedYear" :disabled="busy">
        <option v-for="year in 4" :key="year" :value="Number(localTodayISO().slice(0,4))-(year-1)">{{ Number(localTodayISO().slice(0,4))-(year-1) }}</option>
      </select>
      <BaseButton variant="secondary" :disabled="busy" @click="load">{{ tr('Обновить') }}</BaseButton>
      <span class="history-readonly">{{ tr('Только просмотр') }}</span>
    </div>
    <BaseLoadingState v-if="busy" :label="tr('Загрузка истории табелей')" />
    <template v-else-if="error">
      <BaseNotice tone="error">{{ error }}</BaseNotice>
      <BaseButton variant="secondary" @click="load">{{ tr('Повторить') }}</BaseButton>
    </template>
    <template v-else>
      <p class="history-note">{{ tr('Только месяцы с сохранёнными записями. Ночные часы и дни неявок не вычисляются без подтверждённого источника.') }}</p>
      <BaseDataTable density="compact" :rows="rows" :columns="columns" row-key="id"
        :caption="tr('История табелей сотрудника')" :empty-title="tr('История табелей пуста')"
        :empty-description="tr('За выбранный год сохранённых табелей нет')" />
    </template>
  </section>
</template>

<style scoped>
.employee-timesheet-history{display:grid;gap:12px;min-width:0}
.timesheet-history-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.timesheet-history-toolbar label,.history-note,.history-readonly{font-size:12px;color:var(--color-muted)}
.timesheet-history-toolbar select{min-height:36px;padding:7px 25px 7px 10px;border-radius:var(--radius-sm);border:1px solid var(--color-stroke);color:var(--color-text);background:var(--color-surface)}
.history-readonly{margin-left:auto}
.history-note{margin:0;line-height:1.5}
@media(max-width:480px){.history-readonly{margin-left:0}}
</style>
