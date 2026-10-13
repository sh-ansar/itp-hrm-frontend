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
.tree-branch{position:relative;display:grid;align-content:start;justify-items:stretch;gap:18px;min-width:0}
.tree-card{position:relative;width:100%;min-width:0;padding:13px 14px 12px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:7px;box-shadow:0 2px 9px rgba(9,48,68,.045)}
.tree-card::before{content:'';position:absolute;left:0;top:10px;bottom:10px;width:2px;border-radius:2px;background:var(--color-primary)}
.tree-header{display:flex;align-items:center;gap:9px;padding-left:3px}
.tree-icon{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;color:var(--color-primary);background:var(--color-accent-soft);border-radius:6px}
.tree-copy{display:grid;gap:3px;min-width:0;flex:1}
.tree-copy strong{font-size:12px;font-weight:650;line-height:1.35;overflow-wrap:anywhere}
.tree-copy span{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--color-muted);line-height:1.35}
.tree-header button{display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;background:transparent;border:0;border-radius:5px;color:var(--color-muted);cursor:pointer}
.tree-header button:hover{background:var(--color-soft);color:var(--color-primary)}
.tree-header button:focus-visible{outline:3px solid var(--color-focus)}
.tree-header button svg{transition:transform .15s ease}
.tree-header button svg.closed{transform:rotate(-90deg)}
.tree-figures{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:11px;padding-top:9px;border-top:1px solid var(--color-stroke)}
.tree-figures span{display:inline-flex;align-items:center;gap:4px;min-width:0;font-size:10px;color:var(--color-text);white-space:nowrap}
.tree-figures span:last-child{justify-content:flex-end;color:var(--color-primary)}
.tree-children{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));align-items:start;gap:18px;padding-top:18px}
.tree-children::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:var(--color-primary-stroke)}
.tree-children>.tree-branch::before{content:'';position:absolute;top:-18px;left:50%;width:1px;height:18px;background:var(--color-primary-stroke)}
.tree-children :deep(.tree-children){grid-template-columns:1fr;padding-top:15px;margin-left:10px}
.tree-children :deep(.tree-children)::before{left:20px;right:auto;width:1px;height:100%;top:-8px}
.tree-children :deep(.tree-children)>.tree-branch::before{top:22px;left:-10px;width:10px;height:1px}
@media(max-width:760px){
 .tree-card{padding:12px}
 .tree-children{grid-template-columns:1fr}
 .tree-children::before,.tree-children>.tree-branch::before{display:none}
}
</style>
