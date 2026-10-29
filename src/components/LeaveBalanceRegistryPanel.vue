<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDataTable from './ui/BaseDataTable.vue'
import BaseNotice from './ui/BaseNotice.vue'
import BasePagination from './ui/BasePagination.vue'
import LeaveBalancePanel from './LeaveBalancePanel.vue'
import { getLeaveBalanceRegistry, type LeaveBalanceRegistryItem,
  type VerifiedLeaveBalanceRow } from '../api/leaveBalances'

const props = defineProps<{ companyId: string; year: number; search: string; departmentId?: string }>()
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const items = ref<LeaveBalanceRegistryItem[]>([])
const loading = ref(false)
const error = ref('')
const selectedEmployee = ref('')
let generation = 0
interface BalanceViewRow extends Record<string, unknown> {
  key: string; employee_id: string; full_name: string; personnel_number: string
  department: string; position: string; leave_type: string; grant: number | null
  carried: number | null; adjusted: number | null; approved: number | null; overrun: number | null
  actual: number | null; unspent: number | null; available: number | null
  unverifiable: number; state: string; balance: VerifiedLeaveBalanceRow
}
const columns = [
  { key: 'full_name', label: 'Сотрудник', minWidth: 200 },
  { key: 'department', label: 'Подразделение', minWidth: 140 },
  { key: 'leave_type', label: 'Вид отпуска', minWidth: 130 },
  { key: 'grant', label: 'Начислено', minWidth: 105 },
  { key: 'carried', label: 'Перенесено', minWidth: 110 },
  { key: 'approved', label: 'Одобрено (план)', minWidth: 132 },
  { key: 'overrun', label: 'Факт сверх плана', minWidth: 130 },
  { key: 'actual', label: 'Фактически', minWidth: 120 },
  { key: 'unspent', label: 'Не использовано', minWidth: 128 },
  { key: 'available', label: 'Свободно для заявок', minWidth: 150 },
  { key: 'actions', label: 'Действия', width: 110, sortable: false, filterable: false },
]
const rows = computed<BalanceViewRow[]>(() => items.value.flatMap(employee =>
  employee.balances.map(balance => ({
    key: employee.employee_id + ':' + balance.leave_type_id,
    employee_id: employee.employee_id,
    personnel_number: employee.personnel_number,
    full_name: [employee.last_name, employee.first_name, employee.middle_name].filter(Boolean).join(' '),
    department: employee.department_name ?? '—',
    position: employee.position_name ?? '—',
    leave_type: balance.leave_type_name,
    grant: balance.granted_days,
    carried: balance.carried_days,
    adjusted: balance.adjustment_days,
    approved: balance.booked_days,
    overrun: balance.actual_over_plan_days ?? null,
    actual: balance.actual_verified_days,
    unspent: balance.unspent_entitlement_days,
    available: balance.available_days,
    unverifiable: balance.actual_unverified_records,
    state: balance.state,
    balance,
  })),
))
function format(value: number | null): string { return value === null ? '—' : String(value) }
async function load() {
  const token = ++generation
  if (!props.companyId) { items.value = []; return }
  loading.value = true
  error.value = ''
  try {
    const response = await getLeaveBalanceRegistry(props.companyId, props.year, page.value,
      props.search, props.departmentId ?? '')
    if (generation !== token) return
    items.value = response.data
    lastPage.value = response.meta.last_page
    total.value = response.meta.total
  } catch (cause) {
    if (generation !== token) return
    items.value = []
    error.value = cause instanceof Error ? cause.message : 'Ошибка загрузки остатков'
  } finally { if (generation === token) loading.value = false }
}
watch(() => [props.companyId, props.year, props.search, props.departmentId], () => {
  page.value = 1
  selectedEmployee.value = ''
  void load()
}, { immediate: true })
watch(page, () => { void load() })
</script>

<template>
  <section class="leave-balance-register">
    <div class="balance-register-heading">
      <div>
        <h2>Остатки отпусков</h2>
        <p>Плановые бронирования и подтверждённый факт показаны отдельно.</p>
      </div>
      <span>{{ total }} сотрудников</span>
    </div>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice tone="info">
      Неподтверждённый фактический отпуск не считается использованным и не превращается в ноль.
      «Свободно для заявок» учитывает уже одобренный план; «Не использовано» — только подтверждённый факт.
      Фактические дни сверх утверждённого плана дополнительно уменьшают свободный фонд.
      Перенос между годами проводится с основанием и историей, без автоматического списания.
    </BaseNotice>
    <BaseDataTable :rows="rows" :columns="columns" row-key="key" :loading="loading"
      :min-table-width="1450" caption="Реестр остатков отпусков"
      empty-title="Остатки не найдены"
      empty-description="Проверьте фильтры и начисления. Незаполненный баланс не приравнивается к 24 дням.">
      <template #cell-full_name="{ row }">
        <div class="balance-employee">
          <RouterLink :to="{ name: 'employee-detail', params: { company: companyId, employee: row.employee_id } }">
            {{ row.full_name }}
          </RouterLink>
          <span>{{ row.personnel_number }} · {{ row.position }}</span>
        </div>
      </template>
      <template #cell-grant="{ row }">{{ format(row.grant) }}</template>
      <template #cell-carried="{ row }">{{ format(row.carried) }}</template>
      <template #cell-approved="{ row }">{{ format(row.approved) }}</template>
      <template #cell-overrun="{ row }">{{ format(row.overrun) }}</template>
      <template #cell-actual="{ row }">
        <span :title="row.unverifiable ? 'Нет подтверждения фактического использования' : undefined">
          {{ row.unverifiable ? 'Не подтверждён' : format(row.actual) }}
        </span>
      </template>
      <template #cell-unspent="{ row }">
        <strong v-if="row.unspent !== null">{{ row.unspent }}</strong>
        <span v-else class="balance-unknown">Не определён</span>
      </template>
      <template #cell-available="{ row }">
        <span :class="{ 'balance-unknown': row.available === null }">{{ format(row.available) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <BaseButton variant="secondary" @click="selectedEmployee = row.employee_id">
          Детали
        </BaseButton>
      </template>
    </BaseDataTable>
    <BasePagination :page="page" :last-page="lastPage" :total="total" :loading="loading"
      :page-size="20" caption="Страницы остатков отпусков" :page-sizes="[20]"
      @previous="page--" @next="page++" @select-page="page = $event" />
    <section v-if="selectedEmployee" class="balance-ledger-detail" aria-label="Подробная книга отпусков">
      <header>
        <h3>Начисления, корректировки и перенос дней</h3>
        <BaseButton variant="secondary" @click="selectedEmployee = ''">Закрыть</BaseButton>
      </header>
      <LeaveBalancePanel :key="companyId + ':' + selectedEmployee + ':' + year"
        :company-id="companyId" :initial-employee-id="selectedEmployee" :initial-year="year"
        @changed="load" />
    </section>
  </section>
</template>

<style scoped>
.leave-balance-register{min-width:0;display:grid;gap:14px}
.balance-register-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.balance-register-heading h2{margin:0 0 5px;font-size:17px;font-weight:650;color:var(--color-text)}
.balance-register-heading p,.balance-register-heading>span{margin:0;font-size:12px;color:var(--color-muted)}
.balance-employee{display:grid;gap:4px}
.balance-employee a{color:var(--color-text);text-decoration:underline;text-underline-offset:3px}
.balance-employee span{font-size:11px;color:var(--color-muted)}
.balance-unknown{font-size:11px;color:var(--color-warning)}
.balance-ledger-detail{margin-top:8px;padding:16px 0;border-top:1px solid var(--color-stroke)}
.balance-ledger-detail>header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
.balance-ledger-detail h3{font-size:14px;margin:0;font-weight:600}
.balance-ledger-detail :deep(.leave-balances){background:transparent;border:0;padding:0;box-shadow:none}
@media(max-width:650px){.balance-ledger-detail{padding:12px 0}}
</style>
