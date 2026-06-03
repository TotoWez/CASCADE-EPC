import type { Project, WbsNode, Priority, WorkStatus, QaGate, HseGate } from "@/lib/types";
import { createNode, updateNode, addDependency } from "@/lib/api/nodes";
import { addNote, updateNote } from "@/lib/api/notes";
import { addCategory } from "@/lib/api/categories";
import { clamp, clampVolume } from "@/lib/domain/rollup";

export interface ProjectExport {
  version: 1;
  app: "CASCADE-EPC";
  exportedAt: string;
  project: { code: string; name: string };
  categories: { name: string; color: string | null }[];
  nodes: WbsNode[];
}

/** Serialize the project's WBS tree (nodes + deps + links + notes) to JSON. */
export function exportProjectData(project: Project, nodes: WbsNode[], categories: { name: string; color: string | null }[]): ProjectExport {
  return {
    version: 1,
    app: "CASCADE-EPC",
    exportedAt: new Date().toISOString(),
    project: { code: project.code, name: project.name },
    categories,
    nodes: nodes.map((n) => ({ ...n, notes: n.notes.map((nt) => ({ ...nt, attachments: [] })) })),
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Defensive normalization of imported node data (never trust the file). */
function normalizeNodes(raw: any[]): WbsNode[] {
  return (raw ?? []).map((n) => ({
    id: String(n.id),
    nodeCode: String(n.nodeCode ?? n.node_code ?? "NODE"),
    projectId: "",
    parentId: n.parentId ?? n.parent_id ?? null,
    title: String(n.title ?? "Untitled"),
    category: String(n.category ?? "general"),
    priority: (Math.min(3, Math.max(1, Number(n.priority) || 3)) as Priority),
    workStatus: (["not_started", "on_progress", "done"].includes(n.workStatus) ? n.workStatus : "not_started") as WorkStatus,
    progress: clamp(Number(n.progress) || 0, 0, 100),
    volume: clampVolume(Number(n.volume) || 1),
    qaGate: (["na", "open", "closed"].includes(n.qaGate) ? n.qaGate : "na") as QaGate,
    hseGate: (["na", "complied", "not_complied"].includes(n.hseGate) ? n.hseGate : "na") as HseGate,
    startDate: n.startDate ?? null,
    dueDate: n.dueDate ?? null,
    assignee: {
      name: String(n.assignee?.name ?? ""),
      email: String(n.assignee?.email ?? ""),
      phone: String(n.assignee?.phone ?? ""),
    },
    assignedUserId: null,
    clusterId: n.clusterId ?? null,
    orderIndex: Number(n.orderIndex) || 0,
    dependencies: Array.isArray(n.dependencies) ? n.dependencies.map(String) : [],
    notes: Array.isArray(n.notes)
      ? n.notes.map((nt: any) => ({ id: String(nt.id ?? ""), source: String(nt.source ?? ""), text: String(nt.text ?? ""), checked: Boolean(nt.checked), attachments: [] }))
      : [],
  }));
}

/**
 * Recreate an imported WBS under a project (additive). Preserves hierarchy and
 * internal dependency/link references; fresh ids + collision-safe codes.
 * Returns the number of nodes created.
 */
export async function importProjectData(
  projectId: string,
  data: ProjectExport,
  existingCodes: Set<string>,
): Promise<number> {
  // categories first (ignore duplicates / protected)
  for (const c of data.categories ?? []) {
    if (c.name === "root" || c.name === "general") continue;
    try { await addCategory(projectId, c.name, c.color); } catch { /* dup */ }
  }

  const nodes = normalizeNodes(data.nodes);
  const setIds = new Set(nodes.map((n) => n.id));
  const used = new Set(existingCodes);
  const freshCode = (base: string) => {
    if (!used.has(base)) { used.add(base); return base; }
    let i = 2;
    let c = `${base}(${i})`;
    while (used.has(c)) c = `${base}(${++i})`;
    used.add(c);
    return c;
  };

  // Order parent-before-child within the imported set.
  const byParent = new Map<string | null, WbsNode[]>();
  for (const n of nodes) {
    const k = n.parentId && setIds.has(n.parentId) ? n.parentId : null;
    (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(n);
  }
  const ordered: WbsNode[] = [];
  const queue = [...(byParent.get(null) ?? [])];
  while (queue.length) { const n = queue.shift()!; ordered.push(n); queue.push(...(byParent.get(n.id) ?? [])); }

  const idMap = new Map<string, string>();
  for (const n of ordered) {
    const parent = n.parentId && setIds.has(n.parentId) ? idMap.get(n.parentId)! : null;
    const created = await createNode({ projectId, nodeCode: freshCode(n.nodeCode), parentId: parent, title: n.title, category: n.category, priority: n.priority, volume: n.volume, orderIndex: n.orderIndex });
    idMap.set(n.id, created.id);
    await updateNode(created.id, { progress: n.progress, workStatus: n.workStatus, startDate: n.startDate, dueDate: n.dueDate, assignee: n.assignee });
  }
  for (const n of ordered) {
    const newId = idMap.get(n.id)!;
    for (const dep of n.dependencies) if (setIds.has(dep)) await addDependency(projectId, newId, idMap.get(dep)!);
  }
  const groups = new Map<string, string[]>();
  for (const n of ordered) if (n.clusterId) (groups.get(n.clusterId) ?? groups.set(n.clusterId, []).get(n.clusterId)!).push(idMap.get(n.id)!);
  for (const [, ids] of groups) if (ids.length >= 2) { const cid = crypto.randomUUID(); for (const id of ids) await updateNode(id, { clusterId: cid }); }
  for (const n of ordered) {
    const newId = idMap.get(n.id)!;
    for (const note of n.notes) { const c = await addNote(projectId, newId, note.source, note.text); if (note.checked) await updateNote(c.id, { checked: true }); }
  }
  return ordered.length;
}
