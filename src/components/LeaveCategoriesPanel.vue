<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import BaseDataTable from './ui/BaseDataTable.vue'
import BaseDrawer from './ui/BaseDrawer.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { createLeaveType, getLeaveTypes, type LeaveCategory,
  type LeaveTypeRecord } from '../api/leaves'

const props = defineProps<{ companyId: string; search?: string }>()
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const rows = ref<LeaveTypeRecord[]>([])
const allowed = ref(false)
const protectedSupported = ref(false)
const drawer = ref(false)
const code = ref('')
const name = ref('')
const days = ref('24')
const category = ref<LeaveCategory>('ordinary')
const method = ref<'calendar_days' | 'working_days'>('calendar_days')
let generation = 0
const categories = [
  { id: 'ordinary', name: 'Ежегодный и дополнительный' },
  { id: 'maternity', name: 'Декретный' },
  { id: 'childcare', name: 'По уходу за ребёнком' },
  { id: 'medical', name: 'По состоянию здоровья' },
]
const methods = [
  { id: 'calendar_days', name: 'Календарные дни' },
  { id: 'working_days', name: 'Рабочие дни' },
]
const columns = [
  { key: 'name', label: 'Категория / вид отпуска' },
  { key: 'code', label: 'Код' },
  { key: 'category_label', label: 'Группа' },
  { key: 'days', label: 'Норма по справочнику' },
  { key: 'method_label', label: 'Метод расчёта' },
]
const display = computed(() => rows.value.filter(item =>
  !props.search?.trim() || [item.name,item.code].join(' ').toLocaleLowerCase('ru')
    .includes(props.search.trim().toLocaleLowerCase('ru'))).map(item => ({
  ...item,
  category_label: categories.find(c => c.id === (item.category ?? 'ordinary'))?.name ?? '—',
  days: item.annual_days == null ? 'Индивидуально' : item.annual_days + ' дн.',
  method_label: methods.find(m => m.id === item.balance_method)?.name ?? '—',
})))
async function load() {
  const current = ++generation
  if (!props.companyId) return
  loading.value = true
  error.value = ''
  try {
    const response = await getLeaveTypes(props.companyId)
    if (current !== generation) return
    rows.value = response.data
    allowed.value = response.meta.can_manage_leave_types
    protectedSupported.value = ['maternity','childcare','medical'].every(v =>
      response.meta.supported_categories?.includes(v as LeaveCategory))
  } catch (cause) {
    if (current === generation) {
      rows.value = []
      error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить категории'
    }
  } finally { if (current === generation) loading.value = false }
}
watch(() => props.companyId, () => { drawer.value = false; notice.value = ''; void load() }, { immediate: true })
async function save() {
  if (!allowed.value || busy.value) return
  const next = code.value.trim().toLowerCase()
  const requested = category.value === 'ordinary' ? Number(days.value) : null
  if (!/^[a-z0-9_]{1,64}$/.test(next) || !name.value.trim()
    || (requested !== null && (!Number.isSafeInteger(requested) || requested < 1 || requested > 366))) {
    error.value = 'Проверьте код, название и продолжительность'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await createLeaveType(props.companyId, {
      code: next, name: name.value.trim(), annual_days: requested,
      balance_method: category.value === 'ordinary' ? method.value : 'calendar_days',
      category: category.value,
    })
    drawer.value = false
    notice.value = 'Категория добавлена'
    await load()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Ошибка сохранения' }
  finally { busy.value = false }
}
</script>

<template>
  <section class="leave-types-register">
    <header class="leave-types-heading">
      <div>
        <h2>Категории отпусков</h2>
        <p>Справочник видов и методов расчёта. Норма категории не начисляет дни сотрудникам автоматически.</p>
      </div>
      <BaseButton v-if="allowed" @click="drawer = true"><Plus :size="15" /> Добавить категорию</BaseButton>
    </header>
    <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
    <BaseNotice v-if="notice" tone="success">{{ notice }}</BaseNotice>
    <BaseDataTable :rows="display" :columns="columns" row-key="id" :loading="loading"
      caption="Справочник категорий отпусков" empty-title="Категорий пока нет" />
    <BaseDrawer :open="drawer" title="Новая категория отпуска" @close="drawer = false">
      <form class="leave-type-form" @submit.prevent="save">
        <BaseFormField v-model="name" label="Название категории" required :disabled="busy" />
        <BaseFormField v-model="code" label="Код (латинские буквы)" required
          placeholder="annual_extra" :disabled="busy" />
        <BaseSelectField v-model="category" label="Группа"
          :options="protectedSupported ? categories : categories.filter(item => item.id === 'ordinary')"
          :disabled="busy" />
        <template v-if="category === 'ordinary'">
          <BaseFormField v-model="days" label="Ориентировочная норма, дней" type="number" required :disabled="busy" />
          <BaseSelectField v-model="method" label="Расчёт" :options="methods" :disabled="busy" />
        </template>
        <BaseNotice tone="info">Индивидуальный отпуск и остатки сотрудника ведутся отдельно в книге отпускных прав.</BaseNotice>
        <div class="leave-type-actions">
          <BaseButton variant="secondary" :disabled="busy" @click="drawer = false">Отмена</BaseButton>
          <BaseButton type="submit" :disabled="busy">{{ busy ? 'Сохранение…' : 'Создать' }}</BaseButton>
        </div>
      </form>
    </BaseDrawer>
  </section>
</template>

<style scoped>
.leave-types-register{min-width:0;display:grid;gap:14px}
.leave-types-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.leave-types-heading h2{font-size:17px;font-weight:650;margin:0 0 5px}
.leave-types-heading p{font-size:12px;color:var(--color-muted);margin:0}
.leave-type-form{display:grid;gap:16px}
.leave-type-actions{display:flex;justify-content:flex-end;gap:8px}
</style>
