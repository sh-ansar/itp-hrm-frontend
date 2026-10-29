<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseFormField from './ui/BaseFormField.vue'
import BaseSelectField from './ui/BaseSelectField.vue'
import BaseNotice from './ui/BaseNotice.vue'
import { reviewLeaveActual, type LeaveRow } from '../api/leaves'

const props = defineProps<{ companyId: string; record: LeaveRow }>()
const emit = defineEmits<{ saved: []; close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const state = ref<'taken' | 'not_taken'>(
  props.record.actual_review_state === 'not_taken' ? 'not_taken' : 'taken')
const first = ref(props.record.actual_started_on ?? '')
const last = ref(props.record.actual_ended_on ?? '')
const reason = ref('')
const busy = ref(false)
const error = ref('')
const options = [
  { id: 'taken', name: 'Отпуск состоялся' },
  { id: 'not_taken', name: 'Отпуск не использован' },
]
function close() { if (!busy.value) emit('close') }
function backdrop(event: MouseEvent) { if (event.target === dialog.value) close() }
async function save() {
  if (busy.value) return
  if (reason.value.trim().length < 10 || reason.value.trim().length > 500) {
    error.value = 'Укажите основание проверки — от 10 до 500 символов.'
    return
  }
  if (state.value === 'taken' && (!first.value || !last.value || first.value > last.value)) {
    error.value = 'Проверьте фактические даты отпуска.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await reviewLeaveActual(props.companyId, props.record.id, props.record.revision, {
      state: state.value,
      actual_started_on: state.value === 'taken' ? first.value : null,
      actual_ended_on: state.value === 'taken' ? last.value : null,
      reason: reason.value.trim(),
    })
    emit('saved')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить подтверждение'
  } finally { busy.value = false }
}
onMounted(async () => { await nextTick(); dialog.value?.showModal() })
onUnmounted(() => { if (dialog.value?.open) dialog.value.close() })
</script>

<template>
  <dialog ref="dialog" class="leave-actual-dialog" aria-label="Подтверждение факта отпуска"
    @cancel.prevent="close" @click="backdrop">
    <form class="leave-actual-sheet" @submit.prevent="save">
      <header>
        <div>
          <h2>Фактический отпуск</h2>
          <p>Исходный утверждённый план не изменяется. Решение попадёт в кадровый журнал.</p>
        </div>
        <button type="button" :disabled="busy" aria-label="Закрыть" @click="close">×</button>
      </header>
      <p class="leave-actual-plan">План: {{ record.planned_started_on }} — {{ record.planned_ended_on }},
        {{ record.planned_days }} дн.</p>
      <BaseSelectField v-model="state" label="Результат проверки"
        :options="options" :disabled="busy" />
      <div v-if="state === 'taken'" class="leave-actual-dates">
        <BaseFormField v-model="first" type="date" label="Фактическое начало" required :disabled="busy" />
        <BaseFormField v-model="last" type="date" label="Фактическое завершение" required :disabled="busy" />
      </div>
      <BaseNotice v-else tone="info">
        Подтверждение «Не использован» означает фактический расход 0 дней.
        Перенос дней выполняется отдельно в книге остатков после сверки всех периодов.
      </BaseNotice>
      <label class="leave-actual-reason">
        <span>Основание кадрового решения</span>
        <textarea v-model="reason" rows="3" maxlength="500" :disabled="busy"
          placeholder="Например: подтверждено кадровой службой по табелю и заявлению" required />
      </label>
      <BaseNotice v-if="error" tone="error">{{ error }}</BaseNotice>
      <footer>
        <BaseButton variant="secondary" type="button" :disabled="busy" @click="close">Отмена</BaseButton>
        <BaseButton type="submit" :disabled="busy">{{ busy ? 'Сохранение…' : 'Подтвердить факт' }}</BaseButton>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.leave-actual-dialog{inset:0;margin:auto;position:fixed;width:min(540px,calc(100vw - 22px));
  max-height:94dvh;overflow:auto;border:1px solid var(--color-stroke);border-radius:12px;
  padding:0;background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-float)}
.leave-actual-dialog::backdrop{background:var(--color-overlay)}
.leave-actual-sheet{padding:18px;display:grid;gap:15px;min-width:0}
.leave-actual-sheet>header{display:flex;align-items:start;justify-content:space-between;gap:12px}
.leave-actual-sheet h2{margin:0 0 5px;font-size:17px;font-weight:650}
.leave-actual-sheet header p{margin:0;font-size:12px;line-height:1.5;color:var(--color-muted)}
.leave-actual-sheet>header button{border:0;background:transparent;color:var(--color-muted);
  font-size:24px;cursor:pointer}
.leave-actual-plan{margin:0;color:var(--color-text);font-size:12px}
.leave-actual-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.leave-actual-reason{display:grid;gap:7px;font-size:12px}
.leave-actual-reason textarea{width:100%;min-height:88px;padding:10px;border:1px solid var(--color-stroke);
  border-radius:7px;color:var(--color-text);background:var(--color-surface);font:inherit;resize:vertical}
.leave-actual-sheet footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;border-top:1px solid var(--color-stroke);padding-top:14px}
@media(max-width:480px){.leave-actual-dates{grid-template-columns:1fr}.leave-actual-sheet{padding:13px;gap:11px}}
</style>
