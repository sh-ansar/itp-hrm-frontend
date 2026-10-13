<script setup lang="ts">
import { computed, ref } from 'vue'
import { Building2, ChevronDown, FolderTree, UsersRound, BriefcaseBusiness } from 'lucide-vue-next'
import type { DepartmentTreeItem } from '../utils/departmentTree'

defineOptions({ name: 'DepartmentTreeNode' })
const props = defineProps<{
  node: DepartmentTreeItem
  counts?: Record<string, { planned: number; occupied: number; vacant: number }>
}>()
const expanded = ref(true)
const numbers = computed(() => props.counts?.[props.node.id] ?? null)
function pretty(value: number): string { return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) }
</script>

<template>
  <div class="tree-branch">
    <div class="tree-card">
      <div class="tree-header">
        <span class="tree-icon" aria-hidden="true"><Building2 :size="18" /></span>
        <div class="tree-copy">
          <strong>{{ node.name }}</strong>
          <span v-if="node.hiddenParent">Родитель вне доступного списка</span>
          <span v-else-if="node.children.length"><FolderTree :size="13" /> {{ node.children.length }} подразделений ниже</span>
          <span v-else>Подразделение</span>
        </div>
        <button v-if="node.children.length" type="button"
          :aria-label="expanded ? 'Свернуть ' + node.name : 'Развернуть ' + node.name"
          :aria-expanded="expanded" @click="expanded = !expanded">
          <ChevronDown :size="18" :class="{ closed: !expanded }" />
        </button>
      </div>
      <div v-if="numbers" class="tree-figures">
        <span><UsersRound :size="14" /> {{ pretty(numbers.occupied) }} занято</span>
        <span><BriefcaseBusiness :size="14" /> {{ pretty(numbers.vacant) }} вакансий</span>
      </div>
    </div>
    <div v-if="expanded && node.children.length" class="tree-children">
      <DepartmentTreeNode v-for="child in node.children" :key="child.id" :node="child" :counts="counts" />
    </div>
  </div>
</template>

<style scoped>
.tree-branch{position:relative;display:grid;align-content:start;gap:14px;min-width:0}
.tree-card{width:100%;min-width:0;padding:14px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:9px;box-shadow:var(--shadow-card)}
.tree-header{display:flex;align-items:center;gap:10px}
.tree-icon{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;color:var(--color-primary);background:var(--color-accent-soft);border-radius:9px}
.tree-copy{display:grid;gap:5px;min-width:0;flex:1}
.tree-copy strong{font-size:13px;font-weight:700;line-height:1.35;overflow-wrap:anywhere}
.tree-copy span{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--color-muted);line-height:1.35}
.tree-header button{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;background:var(--color-soft);border:1px solid var(--color-stroke);border-radius:7px;color:var(--color-muted);cursor:pointer}
.tree-header button:focus-visible{outline:3px solid var(--color-focus)}
.tree-header button svg{transition:transform .15s ease}
.tree-header button svg.closed{transform:rotate(-90deg)}
.tree-figures{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--color-stroke)}
.tree-figures span{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--color-primary);white-space:nowrap}
.tree-figures span:last-child{color:var(--color-warning)}
.tree-children{position:relative;display:grid;gap:14px;padding-left:18px;border-left:1px solid var(--color-primary-stroke);margin-left:18px}
@media(max-width:600px){.tree-card{padding:12px}.tree-icon{flex-basis:32px;width:32px;height:32px}.tree-children{margin-left:12px;padding-left:12px}}
</style>
