<script setup lang="ts">
import { ref } from 'vue'
import { Building2, ChevronDown, FolderTree } from 'lucide-vue-next'
import type { DepartmentTreeItem } from '../utils/departmentTree'

defineOptions({ name: 'DepartmentTreeNode' })
defineProps<{ node: DepartmentTreeItem }>()
const expanded = ref(true)
</script>

<template>
  <div class="tree-branch">
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
      <button v-if="node.children.length" type="button"
        :aria-label="expanded ? 'Свернуть ' + node.name : 'Развернуть ' + node.name"
        :aria-expanded="expanded" @click="expanded = !expanded">
        <ChevronDown :size="18" :class="{ closed: !expanded }" />
      </button>
    </div>
    <div v-if="expanded && node.children.length" class="tree-children">
      <DepartmentTreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>

<style scoped>
.tree-branch{position:relative;display:grid;gap:12px;min-width:0}
.tree-card{
  display:flex;align-items:center;gap:12px;width:100%;min-width:0;max-width:580px;min-height:74px;
  padding:13px 16px;background:var(--color-surface);border:1px solid var(--color-stroke);
  border-radius:var(--radius-md);box-shadow:var(--shadow-card)
}
.tree-icon{
  display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;
  color:var(--color-primary);background:var(--color-accent-soft);border-radius:11px
}
.tree-copy{display:grid;gap:5px;min-width:0;flex:1}
.tree-copy strong{font-size:13px;line-height:1.35;font-weight:600;overflow-wrap:anywhere}
.tree-copy span{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--color-muted);line-height:1.45}
.tree-card button{
  display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;background:var(--color-soft);
  border:1px solid var(--color-stroke);border-radius:8px;color:var(--color-muted);cursor:pointer
}
.tree-card button:hover{background:var(--color-hover);color:var(--color-primary)}
.tree-card button:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.tree-card button svg{transition:transform .15s ease}
.tree-card button svg.closed{transform:rotate(-90deg)}
.tree-children{
  position:relative;display:grid;gap:12px;padding-left:clamp(15px,3vw,28px);
  border-left:1px solid var(--color-primary-stroke);margin-left:19px
}
@media(max-width:600px){
  .tree-card{padding:11px 12px;min-height:66px}
  .tree-icon{flex-basis:32px;width:32px;height:32px;border-radius:8px}
  .tree-children{margin-left:12px;padding-left:12px}
}
@media(prefers-reduced-motion:reduce){.tree-card button svg{transition:none}}
</style>
