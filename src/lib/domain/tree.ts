import type { WbsNode } from "@/lib/types";

export type NodeMap = Record<string, WbsNode>;
/** parentId (or null for roots) → ordered children. */
export type ChildrenIndex = Map<string | null, WbsNode[]>;

export function toNodeMap(nodes: WbsNode[]): NodeMap {
  const map: NodeMap = {};
  for (const n of nodes) map[n.id] = n;
  return map;
}

/** Build a parent→children index, each child list sorted by orderIndex. */
export function buildChildrenIndex(nodes: WbsNode[]): ChildrenIndex {
  const index: ChildrenIndex = new Map();
  for (const n of nodes) {
    const key = n.parentId;
    const arr = index.get(key);
    if (arr) arr.push(n);
    else index.set(key, [n]);
  }
  for (const arr of index.values()) arr.sort((a, b) => a.orderIndex - b.orderIndex);
  return index;
}

export function getChildren(index: ChildrenIndex, parentId: string | null): WbsNode[] {
  return index.get(parentId) ?? [];
}

export function getRoots(index: ChildrenIndex): WbsNode[] {
  return index.get(null) ?? [];
}

/** All descendant ids of `id` (excluding `id`). */
export function getDescendantIds(index: ChildrenIndex, id: string): string[] {
  const out: string[] = [];
  const stack = [...getChildren(index, id)];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n.id);
    stack.push(...getChildren(index, n.id));
  }
  return out;
}

/** Ancestor chain from the node's parent up to the root. */
export function getAncestorIds(nodes: NodeMap, id: string): string[] {
  const out: string[] = [];
  let cur = nodes[id]?.parentId ?? null;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    out.push(cur);
    cur = nodes[cur]?.parentId ?? null;
  }
  return out;
}

/** Would attaching `nodeId` under `targetParentId` create a tree cycle? */
export function wouldCreateTreeCycle(index: ChildrenIndex, nodeId: string, targetParentId: string | null): boolean {
  if (targetParentId === null) return false;
  if (targetParentId === nodeId) return true;
  return getDescendantIds(index, nodeId).includes(targetParentId);
}

export function isLeaf(index: ChildrenIndex, id: string): boolean {
  return getChildren(index, id).length === 0;
}
