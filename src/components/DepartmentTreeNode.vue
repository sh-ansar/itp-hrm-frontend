<script setup lang="ts">
import { useWorkspaceI18n } from '../composables/useWorkspaceI18n'
import { computed, ref, watch } from 'vue'
import { ChevronDown, Users } from 'lucide-vue-next'
import type { DepartmentTreeItem } from '../utils/departmentTree'
import { selectDepartmentLeader } from '../utils/departmentLeader'
import BaseButton from './ui/BaseButton.vue'
defineOptions({ name: 'DepartmentTreeNode' })
const { tr } = useWorkspaceI18n()

const props = withDefaults(defineProps<{ node: DepartmentTreeItem; depth?: number; companyId: string; expandAll?: boolean; tone?: number }>(), { depth: 0, expandAll: true, tone: 0 })
// Keep the first department tier visible beneath the company anchor.
// The expand-all control only opens deeper branches.
const expanded = ref(props.depth === 0 || props.expandAll)
const allMembers = ref(false)
watch(() => props.expandAll, value => { expanded.value = props.depth === 0 || value })
const members = computed(() => props.node.members ?? [])
const departmentLeader = computed(() => selectDepartmentLeader(props.node.name, members.value))
function countMembers(node: DepartmentTreeItem): number {
  return (node.members?.length ?? 0) + node.children.reduce((sum, child) => sum + countMembers(child), 0)
}
const totalMembers = computed(() => countMembers(props.node))
const visibleMembers = computed(() => allMembers.value ? members.value : members.value.slice(0, 3))
function initials(name: string) { return name.split(' ').slice(0,2).map(word=>word[0] ?? '').join('') }
</script>
<template>
  <div class="tree-branch" :class="[`tree-branch--level-${depth}`, tone % 2 ? 'tree-branch--green' : 'tree-branch--blue']">
    <div class="tree-card" :class="{ 'tree-card--department': depth > 0 }">
      <div class="tree-copy">
        <strong><i v-if="depth > 0" class="department-dot" aria-hidden="true" />{{ node.name }}</strong>
        <template v-if="depth === 0 && departmentLeader">
          <RouterLink class="root-person" :to="{ name:'employee-detail',params:{company:companyId,employee:departmentLeader.id} }"><span class="person-avatar">{{ initials(departmentLeader.name) }}</span>{{ departmentLeader.name }}</RouterLink>
        </template>
        <RouterLink v-if="depth > 0 && departmentLeader" class="department-leader"
          :to="{ name:'employee-detail', params:{company:companyId,employee:departmentLeader.id} }">
          <span class="department-leader-caption">Руководитель по штатной должности</span>
          <span class="department-leader-name">{{ departmentLeader.name }}</span>
        </RouterLink>
        <span v-if="node.hiddenParent">{{ tr('Родитель вне доступного списка') }}</span>
        <span v-else class="department-count"><Users :size="15" /> {{ totalMembers }} {{ tr("сотрудников") }}<span v-if="node.children.length"> · {{ node.children.length }} {{ tr("подразделений") }}</span></span>
      </div>
      <BaseButton v-if="node.children.length || members.length" icon-only variant="secondary"
        :aria-label="expanded ? tr('Свернуть ') + node.name : tr('Развернуть ') + node.name" :aria-expanded="expanded" @click="expanded = !expanded">
        <ChevronDown :size="16" :class="{ closed: !expanded }" />
      </BaseButton>
    </div>
    <div v-if="expanded && depth > 0 && members.length" class="tree-members">
      <RouterLink v-for="member in visibleMembers" :key="member.id" class="person-card" :to="{name:'employee-detail',params:{company:companyId,employee:member.id}}">
        <strong>{{ member.position || tr('Сотрудник') }}</strong><div class="person-row"><span class="person-avatar">{{ initials(member.name) }}</span><span>{{ member.name }}</span></div>
      </RouterLink>
      <BaseButton v-if="members.length > 3" variant="secondary" @click="allMembers = !allMembers">{{ allMembers ? tr('Свернуть сотрудников') : tr('Ещё ') + (members.length - 3) }}</BaseButton>
    </div>
    <div v-if="expanded && node.children.length" class="tree-children">
      <DepartmentTreeNode v-for="(child,index) in node.children" :key="child.id" :node="child" :depth="depth + 1" :company-id="companyId" :expand-all="expandAll" :tone="depth === 0 ? index : tone" />
    </div>
  </div>
</template>
<style scoped>
.tree-branch{--branch-color:var(--color-primary-stroke);position:relative;display:grid;align-content:start;gap:24px;min-width:320px;width:max-content}
.tree-branch--green{--branch-color:color-mix(in srgb,var(--color-success) 55%,var(--color-stroke))}
.tree-card{position:relative;display:flex;align-items:start;gap:12px;width:320px;min-width:0;max-width:100%;padding:18px 16px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:var(--radius-md);box-shadow:var(--shadow-card)}
.tree-card--department{background:color-mix(in srgb,var(--color-primary) 12%,var(--color-surface));border-color:color-mix(in srgb,var(--color-primary) 18%,var(--color-stroke))}
.tree-branch--green>.tree-card--department{background:color-mix(in srgb,var(--color-success) 12%,var(--color-surface));border-color:color-mix(in srgb,var(--color-success) 18%,var(--color-stroke))}
.tree-copy{display:grid;gap:12px;min-width:0;flex:1}.tree-copy strong{font-size:15px;line-height:1.45;font-weight:500;overflow-wrap:normal;word-break:normal;hyphens:none}
.department-dot{display:inline-block;width:10px;height:10px;margin-right:8px;background:var(--color-primary);border-radius:50%}.tree-branch--green .department-dot{background:var(--color-success)}
.department-leader{display:grid;gap:3px;padding:9px 10px;background:var(--color-soft);border:1px solid var(--color-stroke);border-radius:var(--radius-sm);color:inherit;text-decoration:none}
.department-leader-caption{font-size:11px;line-height:1.3;color:var(--color-muted)}
.department-leader-name{font-size:12px;line-height:1.35;font-weight:500;overflow-wrap:anywhere}
.department-leader:hover{text-decoration:underline}
.department-count{display:flex;flex-wrap:wrap;align-items:center;gap:5px;color:var(--color-muted);font-size:13px;line-height:1.5}.department-count svg{color:var(--color-primary)}
.tree-card :deep(.base-button){position:absolute;bottom:-10px;right:12px;width:24px;min-width:24px;height:24px;min-height:24px;border-radius:50%;padding:0;color:var(--color-muted)}
.closed{transform:rotate(-90deg)}
.tree-members{display:grid;gap:14px;margin-left:14px;padding-left:18px;border-left:1px solid var(--branch-color)}
.person-card{position:relative;display:grid;gap:10px;width:290px;max-width:100%;padding:16px;background:var(--color-surface);border:1px solid var(--color-stroke);border-radius:var(--radius-md);box-shadow:var(--shadow-card)}
.person-card::before{content:'';position:absolute;left:-19px;top:50%;width:18px;border-top:1px solid var(--branch-color)}
.person-card>strong{font-size:14px;font-weight:500;line-height:1.5}.person-row,.root-person{display:flex;align-items:center;gap:10px;font-size:13px;line-height:1.4}
.person-avatar{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;background:var(--color-accent-soft);color:var(--color-muted);border:1px solid var(--color-stroke);border-radius:50%;font-size:17px}
.tree-children{position:relative;display:grid;gap:24px;padding-left:18px;border-left:1px solid var(--branch-color);margin-left:14px}
.tree-branch--level-0>.tree-card{margin-inline:auto}
.tree-branch--level-0>.tree-children{display:flex;align-items:flex-start;gap:48px;margin-left:0;padding:38px 0 0;border-left:0}
.tree-branch--level-0>.tree-children::before{content:'';position:absolute;top:14px;left:160px;right:160px;height:1px;background:var(--color-primary-stroke)}
.tree-branch--level-0>.tree-children>.tree-branch{width:max-content;min-width:320px;flex:0 0 auto}
.tree-branch--level-0>.tree-children>.tree-branch::before{content:'';position:absolute;top:-24px;left:160px;width:1px;height:24px;background:var(--branch-color)}
</style>
