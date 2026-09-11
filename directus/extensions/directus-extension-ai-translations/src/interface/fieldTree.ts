export type AnyField = {
  field: string
  name?: string | null
  type?: string
  special?: string | string[] | null
  interface?: string | null
  meta?: {
    special?: string | string[] | null
    interface?: string | null
    group?: string | null
    hidden?: boolean
    width?: string | null
    note?: string | null
    options?: Record<string, unknown> | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export type FieldTreeNode =
  | {
      kind: 'group'
      field: AnyField
      children: FieldTreeNode[]
      /** All descendant leaf field names (for master AI checkbox). */
      leafNames: string[]
      startOpen: boolean
    }
  | {
      kind: 'leaf-row'
      fields: AnyField[]
    }

function specialList(f: AnyField): string[] {
  const raw = f.meta?.special ?? f.special ?? []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

export function isGroupField(f: AnyField): boolean {
  const iface = String(f.meta?.interface ?? f.interface ?? '')
  if (iface.startsWith('group-')) return true
  return specialList(f).includes('group')
}

export function parentGroupKey(f: AnyField): string | null {
  const g = f.meta?.group
  if (g == null || g === '') return null
  return String(g)
}

function groupStartsOpen(f: AnyField): boolean {
  const start = f.meta?.options?.start
  if (start === 'closed') return false
  return true
}

function collectLeafNames(nodes: FieldTreeNode[]): string[] {
  const out: string[] = []
  for (const n of nodes) {
    if (n.kind === 'leaf-row') {
      for (const f of n.fields) out.push(f.field)
    } else {
      out.push(...n.leafNames)
    }
  }
  return out
}

/** Pair consecutive half-width leaf siblings; leave groups as their own nodes. */
function siblingsToNodes(
  siblings: AnyField[],
  childrenByParent: Map<string, AnyField[]>,
): FieldTreeNode[] {
  const nodes: FieldTreeNode[] = []
  let i = 0
  while (i < siblings.length) {
    const f = siblings[i]!
    if (isGroupField(f)) {
      const kids = childrenByParent.get(f.field) ?? []
      const children = siblingsToNodes(kids, childrenByParent)
      nodes.push({
        kind: 'group',
        field: f,
        children,
        leafNames: collectLeafNames(children),
        startOpen: groupStartsOpen(f),
      })
      i += 1
      continue
    }

    const isHalf = f.meta?.width === 'half'
    const next = siblings[i + 1]
    const nextIsHalfLeaf =
      next != null && !isGroupField(next) && next.meta?.width === 'half'
    if (isHalf && nextIsHalfLeaf) {
      nodes.push({ kind: 'leaf-row', fields: [f, next] })
      i += 2
    } else {
      nodes.push({ kind: 'leaf-row', fields: [f] })
      i += 1
    }
  }
  return nodes
}

/**
 * Build a nested field tree from a flat Directus fields list.
 * Honors `meta.group` and group-* interfaces (detail / raw / accordion).
 */
export function buildFieldTree(fields: AnyField[]): FieldTreeNode[] {
  const byParent = new Map<string, AnyField[]>()
  const roots: AnyField[] = []

  for (const f of fields) {
    const parent = parentGroupKey(f)
    if (!parent) {
      roots.push(f)
      continue
    }
    const list = byParent.get(parent) ?? []
    list.push(f)
    byParent.set(parent, list)
  }

  // Preserve Directus sort order within each sibling list (already sorted in input).
  return siblingsToNodes(roots, byParent)
}

/** Leaf fields only (excludes group containers). */
export function collectLeafFields(fields: AnyField[]): AnyField[] {
  return fields.filter((f) => !isGroupField(f))
}
