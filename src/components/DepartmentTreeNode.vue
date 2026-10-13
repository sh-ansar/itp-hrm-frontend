<script setup lang="ts">
import { ref } from 'vue'
import { Building2, ChevronDown, FolderTree } from 'lucide-vue-next'
import type { DepartmentTreeItem } from '../utils/departmentTree'
import BaseButton from './ui/BaseButton.vue'

defineOptions({ name: 'DepartmentTreeNode' })
withDefaults(defineProps<{ node: DepartmentTreeItem; depth?: number }>(), { depth: 0 })
const expanded = ref(true)
</script>

<template>
  <div class="tree-branch" :class="`tree-branch--level-${depth}`">
    <div class="tree-card">
      <span class="tree-icon" aria-hidden="true"><Building2 :size="18" /></span>
      <div class="tree-copy">
        <strong>{{ node.name }}</strong>
        <span v-if="node.hiddenParent">Родитель вне доступного списка</span>
        <span v-else-if="node.children.length">
          <FolderTree :size="13" /> {{ node.children.length }} подчинённых подразделений
        </span>
        <span v-else>Подразделение</span>
      </div>
      <BaseButton v-if="node.children.length" icon-only variant="secondary"
        :aria-label="expanded ? 'Свернуть ' + node.name : 'Развернуть ' + node.name"
        :aria-expanded="expanded" @click="expanded = !expanded">
        <ChevronDown :size="18" :class="{ closed: !expanded }" />
      </BaseButton>
    </div>
    <div v-if="expanded && node.children.length" class="tree-children">
      <DepartmentTreeNode v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1" />
    </div>
  </div>
</template>

<style scoped>
.tree-branch{position:relative;display:grid;align-content:start;gap:12px;min-width:0}
.tree-card{
  display:flex;align-items:center;gap:9px;width:100%;min-width:0;max-width:580px;min-height:70px;
  padding:11px 12px;background:var(--color-surface);border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);box-shadow:var(--shadow-card)
}
.tree-icon{
  display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;
  color:var(--color-primary);background:var(--color-accent-soft);border-radius:11px
}
.tree-copy{display:grid;gap:5px;min-width:0;flex:1}
.tree-copy strong{font-size:12px;line-height:1.35;font-weight:600;overflow-wrap:normal;word-break:normal;hyphens:none}
.tree-copy span{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--color-muted);line-height:1.45}
.tree-card :deep(.base-button){flex:0 0 30px;width:30px;min-width:30px;height:30px;min-height:30px;color:var(--color-muted);background:var(--color-soft)}
.tree-card :deep(.base-button:hover){color:var(--color-primary)}
.tree-card :deep(.base-button svg){transition:transform .15s ease}
.tree-card :deep(.base-button svg.closed){transform:rotate(-90deg)}
.tree-children{
  position:relative;display:grid;gap:12px;padding-left:clamp(15px,3vw,28px);
  border-left:1px solid var(--color-primary-stroke);margin-left:19px
}
.tree-branch--level-0>.tree-card{margin-inline:auto}
.tree-branch--level-0>.tree-children{
  grid-template-columns:repeat(5,minmax(0,1fr));gap:18px;
  margin-left:0;padding:30px 0 0;border-left:0
}
.tree-branch--level-0>.tree-children::before{
  content:'';position:absolute;top:14px;left:9%;right:9%;height:1px;background:var(--color-primary-stroke)
}
.tree-branch--level-0>.tree-children>.tree-branch--level-1::before{
  content:'';position:absolute;top:-16px;left:50%;width:1px;height:16px;background:var(--color-primary-stroke)
}
.tree-branch--level-0>.tree-children>.tree-branch--level-1>.tree-card{max-width:none;min-height:104px;align-self:start}
@media(max-width:1100px){
  .tree-branch--level-0>.tree-children{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tree-branch--level-0>.tree-children::before,
  .tree-branch--level-0>.tree-children>.tree-branch--level-1::before{display:none}
}
@media(max-width:600px){
  .tree-card{padding:11px 12px;min-height:66px}
  .tree-icon{flex-basis:32px;width:32px;height:32px;border-radius:8px}
  .tree-children{margin-left:12px;padding-left:12px}
  .tree-branch--level-0>.tree-children{
    grid-template-columns:1fr;gap:12px;margin-left:12px;padding:12px 0 0 12px;border-left:1px solid var(--color-primary-stroke)
  }
}
@media(prefers-reduced-motion:reduce){.tree-card button svg{transition:none}}
</style>
