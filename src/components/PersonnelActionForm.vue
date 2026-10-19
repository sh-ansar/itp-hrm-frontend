<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { localTodayISO } from '../utils/localDate'
import { usePersonnelActionCopy } from '../i18n/personnelActionWorkflow'
import BaseButton from './ui/BaseButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import {
  getEmployee,
  listEmployees,
  type EmployeeAssignment,
  type EmployeeRecord,
} from '../api/personnel'
import { listDepartments, listPositions, type DepartmentRecord, type PositionRecord } from '../api/organization'
import {
  hireEmployee,
  terminateEmployee,
  transferEmployee,
  type PersonnelActionType,
} from '../api/personnelActions'

const props=defineProps<{companyId:string}>()
const { copy } = usePersonnelActionCopy()
const emit=defineEmits<{saved:[];cancelled:[]}>()

const search=ref('')
const searchBusy=ref(false)
const employees=ref<EmployeeRecord[]>([])
const selectedEmployeeId=ref('')
const selectedEmployee=ref<EmployeeRecord|null>(null)
const assignments=ref<EmployeeAssignment[]>([])
const detailBusy=ref(false)
const operation=ref<PersonnelActionType>('hire')
const departmentId=ref('')
const positionId=ref('')
const effectiveOn=ref(localTodayISO())
const basisReference=ref('')
const notes=ref('')
const departments=ref<DepartmentRecord[]>([])
const positions=ref<PositionRecord[]>([])
const directoriesBusy=ref(false)
const saving=ref(false)
const error=ref('')
const confirmOpen=ref(false)

const openAssignment=computed(()=>assignments.value.find(item=>item.valid_to===null)??null)
const availableOperations=computed(()=>{
  if(openAssignment.value){
    return [
      {id:'transfer',name:copy.value.transfer},
      {id:'termination',name:copy.value.termination},
    ]
  }
  return [{id:'hire',name:copy.value.hire}]
})
const employeeOptions=computed(()=>employees.value.map(item=>({
  id:item.id,
  name:`${item.last_name} ${item.first_name}${item.middle_name?' '+item.middle_name:''} · ${item.personnel_number}`,
})))
const operationLabel=computed(()=>operation.value==='hire'?copy.value.hire:operation.value==='transfer'?copy.value.transfer:copy.value.termination)
const targetDepartment=computed(()=>departments.value.find(item=>item.id===departmentId.value)?.name??'—')
const targetPosition=computed(()=>positions.value.find(item=>item.id===positionId.value)?.name??'—')
const currentAssignmentSummary=computed(()=>openAssignment.value
  ? [openAssignment.value.position_name,openAssignment.value.department_name].filter(Boolean).join(' · ')
  : copy.value.noAssignmentShort)

async function searchEmployees(){
  selectedEmployeeId.value=''
  selectedEmployee.value=null
  assignments.value=[]
  employees.value=[]
  searchBusy.value=true
  error.value=''
  try{
    const result=await listEmployees(props.companyId,1,search.value)
    employees.value=result.data
    if(result.data.length===1){
      selectedEmployeeId.value=result.data[0].id
    }
  }catch(cause){
    error.value=cause instanceof Error?cause.message:copy.value.employeeSearchFailed
    employees.value=[]
  }finally{searchBusy.value=false}
}

async function loadSelectedEmployee(){
  if(!selectedEmployeeId.value){
    selectedEmployee.value=null
    assignments.value=[]
    return
  }
  detailBusy.value=true
  error.value=''
  try{
    const detail=await getEmployee(props.companyId,selectedEmployeeId.value)
    selectedEmployee.value=detail.data
    assignments.value=detail.assignments
    operation.value=openAssignment.value?'transfer':'hire'
    if(openAssignment.value){
      departmentId.value=openAssignment.value.department_id
      positionId.value=openAssignment.value.position_id
    }else{
      departmentId.value=''
      positionId.value=''
    }
  }catch(cause){
    error.value=cause instanceof Error?cause.message:copy.value.employeeLoadFailed
    selectedEmployee.value=null
    assignments.value=[]
  }finally{detailBusy.value=false}
}

async function loadDirectories(){
  directoriesBusy.value=true
  try{
    const [d,p]=await Promise.all([
      listDepartments(props.companyId),
      listPositions(props.companyId),
    ])
    departments.value=d.data
    positions.value=p.data
  }catch(cause){
    error.value=cause instanceof Error?cause.message:copy.value.directoriesFailed
  }finally{directoriesBusy.value=false}
}

function validate(): string | null {
  if (!selectedEmployee.value) return copy.value.missingEmployee
  if (!effectiveOn.value || !basisReference.value.trim()) return copy.value.missingDateBasis
  if (operation.value !== 'termination' && (!departmentId.value || !positionId.value)) {
    return copy.value.missingDestination
  }
  if ((operation.value === 'transfer' || operation.value === 'termination') && !openAssignment.value) {
    return copy.value.missingAssignment
  }
  if (operation.value === 'hire' && openAssignment.value) {
    return copy.value.alreadyAssigned
  }
  return null
}

function prepare() {
  error.value = validate() ?? ''
  if (!error.value) confirmOpen.value = true
}
function closeConfirmation() {
  if (!saving.value) confirmOpen.value = false
}
async function execute() {
  if (!confirmOpen.value || saving.value) return
  error.value = validate() ?? ''
  if (error.value) {
    confirmOpen.value = false
    return
  }
  saving.value = true
  try {
    const employeeId = selectedEmployee.value!.id
    if (operation.value === 'hire') {
      await hireEmployee(props.companyId, employeeId, {
        department_id: departmentId.value,
        position_id: positionId.value,
        effective_on: effectiveOn.value,
        basis_reference: basisReference.value.trim(),
        notes: notes.value.trim() || null,
      })
    } else if (operation.value === 'transfer' && openAssignment.value) {
      await transferEmployee(props.companyId, employeeId, {
        source_assignment_id: openAssignment.value.id,
        source_assignment_revision: openAssignment.value.revision,
        department_id: departmentId.value,
        position_id: positionId.value,
        effective_on: effectiveOn.value,
        basis_reference: basisReference.value.trim(),
        notes: notes.value.trim() || null,
      })
    } else if (operation.value === 'termination' && openAssignment.value) {
      await terminateEmployee(props.companyId, employeeId, {
        source_assignment_id: openAssignment.value.id,
        source_assignment_revision: openAssignment.value.revision,
        effective_on: effectiveOn.value,
        basis_reference: basisReference.value.trim(),
        notes: notes.value.trim() || null,
      })
    }
    confirmOpen.value = false
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : copy.value.actionFailed
  } finally {
    saving.value = false
  }
}

watch(selectedEmployeeId,loadSelectedEmployee)
watch(operation,value=>{
  if(value==='transfer'&&openAssignment.value){
    departmentId.value=openAssignment.value.department_id
    positionId.value=openAssignment.value.position_id
  }
})
loadDirectories()
</script>

<template>
  <form class="action-form" @submit.prevent="prepare">
    <BaseNotice v-if="error" tone="error" role="alert">{{ error }}</BaseNotice>

    <div class="employee-search">
      <BaseFormField v-model="search" :label="copy.search" :placeholder="copy.searchPlaceholder" :disabled="searchBusy||saving" />
      <BaseButton type="button" variant="secondary" :disabled="searchBusy||saving" @click="searchEmployees">
        {{ searchBusy?copy.searching:copy.find }}
      </BaseButton>
    </div>

    <BaseSelectField
      v-if="employees.length"
      v-model="selectedEmployeeId"
      :label="copy.employee"
      :placeholder="copy.chooseEmployee"
      :options="employeeOptions"
      :disabled="detailBusy||saving"
      required
    />

    <div v-if="selectedEmployee" class="employee-summary">
      <strong>{{ selectedEmployee.last_name }} {{ selectedEmployee.first_name }} {{ selectedEmployee.middle_name ?? '' }}</strong>
      <span>{{ copy.personnelNumber }} {{ selectedEmployee.personnel_number }}</span>
      <span v-if="openAssignment">
        {{ copy.currentAssignment }}: {{ openAssignment.position_name }} · {{ openAssignment.department_name }} {{ copy.since }} {{ openAssignment.valid_from }}
      </span>
      <span v-else>{{ copy.noAssignment }}</span>
    </div>

    <BaseSelectField
      v-if="selectedEmployee"
      v-model="operation"
      :label="copy.operation"
      :options="availableOperations"
      :disabled="saving"
      required
    />

    <div v-if="selectedEmployee" class="form-grid">
      <BaseFormField v-model="effectiveOn" :label="copy.effectiveDate" type="date" :disabled="saving" required />
      <BaseFormField v-model="basisReference" :label="copy.basis" :placeholder="copy.basisPlaceholder" :disabled="saving" required />
      <BaseSelectField
        v-if="operation!=='termination'"
        v-model="departmentId"
        :label="copy.department"
        :placeholder="copy.chooseDepartment"
        :options="departments"
        :disabled="directoriesBusy||saving"
        required
      />
      <BaseSelectField
        v-if="operation!=='termination'"
        v-model="positionId"
        :label="copy.position"
        :placeholder="copy.choosePosition"
        :options="positions"
        :disabled="directoriesBusy||saving"
        required
      />
      <BaseFormField v-model="notes" :label="copy.note" :placeholder="copy.optional" :disabled="saving" />
    </div>

    <BaseNotice v-if="selectedEmployee&&operation==='termination'" tone="warning">
      {{ copy.terminationWarning }}
    </BaseNotice>
    <BaseNotice v-else-if="selectedEmployee&&operation==='transfer'" tone="info">
      {{ copy.transferWarning }}
    </BaseNotice>

    <div class="actions">
      <BaseButton type="button" variant="secondary" :disabled="saving" @click="emit('cancelled')">{{ copy.cancel }}</BaseButton>
      <BaseButton type="submit" :disabled="saving||detailBusy||!selectedEmployee">
        {{ saving?copy.processing:copy.continue+operationLabel }}
      </BaseButton>
    </div>

    <BaseDialog :open="confirmOpen" :title="copy.confirmation" @close="closeConfirmation">
      <div class="action-confirmation">
        <BaseNotice tone="warning">
          {{ copy.confirmationWarning }}
        </BaseNotice>
        <dl>
          <div><dt>{{ copy.action }}</dt><dd>{{ operationLabel }}</dd></div>
          <div><dt>{{ copy.employee }}</dt><dd>{{ selectedEmployee?.last_name }} {{ selectedEmployee?.first_name }} · {{ selectedEmployee?.personnel_number }}</dd></div>
          <div><dt>{{ copy.date }}</dt><dd>{{ effectiveOn }}</dd></div>
          <div><dt>{{ copy.currentAssignment }}</dt><dd>{{ currentAssignmentSummary }}</dd></div>
          <div v-if="operation!=='termination'"><dt>{{ copy.targetDepartment }}</dt><dd>{{ targetDepartment }}</dd></div>
          <div v-if="operation!=='termination'"><dt>{{ copy.targetPosition }}</dt><dd>{{ targetPosition }}</dd></div>
          <div><dt>{{ copy.basis }}</dt><dd>{{ basisReference }}</dd></div>
        </dl>
        <BaseNotice v-if="error" tone="error" role="alert">{{ error }}</BaseNotice>
      </div>
      <template #footer>
        <BaseButton type="button" variant="secondary" :disabled="saving" @click="closeConfirmation">{{ copy.back }}</BaseButton>
        <BaseButton type="button" :disabled="saving" @click="execute">
          {{ saving ? copy.processing : copy.execute }}
        </BaseButton>
      </template>
    </BaseDialog>
  </form>
</template>

<style scoped>
.action-form{display:grid;gap:var(--space-4)}
.employee-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
.employee-summary{display:grid;gap:4px;padding:12px 14px;border-radius:var(--radius-md);background:var(--color-soft)}
.employee-summary strong{font-size:14px}
.employee-summary span{font-size:12px;color:var(--color-muted);line-height:1.4}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4)}
.form-grid>*:last-child{grid-column:1/-1}
.actions{display:flex;justify-content:flex-end;gap:var(--space-2)}
.action-confirmation{display:grid;gap:var(--space-3)}
.action-confirmation dl{display:grid;gap:var(--space-2);margin:0}
.action-confirmation dl>div{display:grid;gap:var(--space-1);padding:var(--space-2) 0;border-bottom:1px solid var(--color-stroke)}
.action-confirmation dt{font-size:var(--font-caption-size);color:var(--color-muted)}
.action-confirmation dd{margin:0;font-size:var(--font-label-size);font-weight:600;overflow-wrap:anywhere}
@media(max-width:640px){
  .employee-search,.form-grid{grid-template-columns:1fr}
  .employee-search :deep(button){width:100%}
  .actions :deep(button){flex:1}
}
</style>
