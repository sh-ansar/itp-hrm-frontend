import type { DepartmentRecord } from '../api/organization'

export interface DepartmentTreeItem extends DepartmentRecord {
  children: DepartmentTreeItem[]
  hiddenParent: boolean
}

/** Build a display-only forest of visible departments; never infer missing parent identities. */
export function buildDepartmentForest(departments: DepartmentRecord[]): DepartmentTreeItem[] {
  const byId = new Map<string, DepartmentTreeItem>(
    departments.map(row => [row.id, { ...row, hiddenParent: false, children: [] }]),
  )
  const roots: DepartmentTreeItem[] = []
  for (const row of departments) {
    const node = byId.get(row.id)!
    let parent = row.parent_id ? byId.get(row.parent_id) : undefined
    if (parent) {
      // Legacy cycles must not recurse forever or render a bogus root relationship.
      const visited = new Set([row.id])
      let next = row.parent_id
      while (next) {
        if (visited.has(next)) { parent = undefined; break }
        visited.add(next)
        next = byId.get(next)?.parent_id ?? null
      }
    }
    if (parent) parent.children.push(node)
    else {
      node.hiddenParent = Boolean(row.parent_id)
      roots.push(node)
    }
  }
  const sort = (nodes: DepartmentTreeItem[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    nodes.forEach(item => sort(item.children))
  }
  sort(roots)
  return roots
}
