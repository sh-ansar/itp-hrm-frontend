<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowUpRight, CalendarDays, Award, FileText, RefreshCw } from 'lucide-vue-next'
import BaseButton from './ui/BaseButton.vue'
import { ApiError } from '../api/client'
import { getLeaveRequests } from '../api/leaves'
import { getEmployeeBonuses } from '../api/bonuses'
import { listDocuments } from '../api/documents'
import { useApprovalInboxCopy } from '../i18n/approvalInbox'

const props = defineProps<{ companyId: string }>()
type Kind = 'leaves' | 'bonuses' | 'orders'
const { inboxCopy: copy } = useApprovalInboxCopy()
const counts = ref<Record<Kind, number | null>>({ leaves: null, bonuses: null, orders: null })
const busy = ref(false)
const partial = ref(false)
let generation = 0

const links = computed(() => [
  { kind: 'leaves' as const, label: copy.value.leaves, count: counts.value.leaves,
    icon: CalendarDays, to: '/leaves' },
  { kind: 'bonuses' as const, label: copy.value.bonuses, count: counts.value.bonuses,
    icon: Award, to: { path: '/personnel-actions', query: { view: 'bonuses' } } },
  { kind: 'orders' as const, label: copy.value.orders, count: counts.value.orders,
    icon: FileText, to: { path: '/documents', query: { type: 'order', status: 'submitted' } } },
].filter(item => item.count !== null))

async function load(): Promise<void> {
  const id = props.companyId
  const current = ++generation
  counts.value = { leaves: null, bonuses: null, orders: null }
  partial.value = false
  if (!id) {
    busy.value = false
    return
  }
  busy.value = true
  // Each API performs its own strict company role check. Never simulate roles
  // or infer a count by reading an unfiltered, partially paginated register.
  const results = await Promise.allSettled([
    getLeaveRequests(id, 1, 'submitted'),
    getEmployeeBonuses(id, 1, 'submitted'),
    listDocuments(id, 1, 'order', '', 'submitted'),
  ])
  if (current !== generation || id !== props.companyId) return
  const next: Record<Kind, number | null> = { leaves: null, bonuses: null, orders: null }
  for (const [i, kind] of (['leaves', 'bonuses', 'orders'] as const).entries()) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      const count = result.value.meta.total
      if (Number.isSafeInteger(count) && count >= 0) next[kind] = count
      else partial.value = true
    } else if (!(result.reason instanceof ApiError && [403, 404].includes(result.reason.status ?? 0))) {
      // Unavailable feature/permission is not a failing entire dashboard.
      partial.value = true
    }
  }
  counts.value = next
  busy.value = false
}

watch(() => props.companyId, () => { void load() }, { immediate: true })
</script>

<template>
  <section v-if="busy || links.length || partial" class="approval-inbox" role="region"
    :aria-label="copy.title">
    <div class="approval-inbox__heading">
      <div class="approval-inbox__heading-text">
        <h2>{{ copy.title }}</h2>
        <p>{{ copy.caption }}</p>
      </div>
      <BaseButton variant="secondary" :disabled="busy" @click="load">
        <RefreshCw :size="16" aria-hidden="true" />
        {{ busy ? copy.loading : copy.refresh }}
      </BaseButton>
    </div>
    <div v-if="links.length" class="approval-inbox__grid">
      <RouterLink v-for="item in links" :key="item.kind"
        :to="item.to" :class="['approval-inbox__card', 'approval-inbox__card--' + item.kind]">
        <span class="approval-inbox__icon"><component :is="item.icon" :size="18" aria-hidden="true" /></span>
        <span class="approval-inbox__label">{{ item.label }}</span>
        <strong class="approval-inbox__count">{{ item.count }}</strong>
        <span class="approval-inbox__view">{{ copy.view }} <ArrowUpRight :size="15" aria-hidden="true" /></span>
      </RouterLink>
    </div>
    <p v-if="partial" class="approval-inbox__notice" role="status">{{ copy.partial }}</p>
    <p v-else-if="busy && !links.length" class="approval-inbox__notice" role="status">{{ copy.loading }}</p>
  </section>
</template>

<style scoped>
.approval-inbox{display:grid;gap:var(--space-3);min-width:0}
.approval-inbox__heading{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}
.approval-inbox__heading-text{display:grid;gap:var(--space-1)}
.approval-inbox__heading h2{margin:0;font-size:var(--font-section-heading);font-weight:650}
.approval-inbox__heading p{margin:0;color:var(--color-muted);font-size:var(--font-caption-size)}
.approval-inbox__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3)}
.approval-inbox__card{min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:var(--space-2);padding:var(--space-3);border:1px solid var(--color-stroke);border-radius:var(--radius-lg);background:var(--color-surface);color:var(--color-text);text-decoration:none;box-shadow:var(--shadow-card)}
.approval-inbox__card:hover{background:var(--color-hover)}
.approval-inbox__card:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.approval-inbox__icon{display:grid;place-items:center;color:var(--color-primary)}
.approval-inbox__label{font-size:var(--font-label-size);font-weight:600;min-width:0}
.approval-inbox__count{justify-self:end;font-size:21px;font-variant-numeric:tabular-nums}
.approval-inbox__view{grid-column:2 / 4;justify-self:end;display:flex;gap:var(--space-1);align-items:center;color:var(--color-primary);font-size:var(--font-caption-size)}
.approval-inbox__notice{margin:0;color:var(--color-muted);font-size:var(--font-caption-size)}
@media(max-width:820px){.approval-inbox__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:550px){.approval-inbox__grid{grid-template-columns:minmax(0,1fr)}.approval-inbox__heading :deep(button){width:100%}}
</style>
