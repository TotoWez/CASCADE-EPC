import { create } from "zustand";
import type { WbsNode, Priority } from "@/lib/types";
import {
  buildChildrenIndex,
  toNodeMap,
  getDescendantIds,
  getChildren,
  isLeaf,
  type ChildrenIndex,
  type NodeMap,
} from "@/lib/domain/tree";
import { computeEffectiveProgress, effectiveWorkStatus } from "@/lib/domain/rollup";
import { buildDownstreamMap, isBlocked } from "@/lib/domain/status";
import { emptyFilters, type Filters } from "@/lib/domain/filter";
import * as nodesApi from "@/lib/api/nodes";
import * as catApi from "@/lib/api/categories";
import * as notesApi from "@/lib/api/notes";
import { uniqueFilename } from "@/lib/domain/notes";
import { toast } from "@/store/toast";
import { useAuth } from "@/store/auth";
import type { NoteAttachment } from "@/lib/types";

interface Derived {
  nodeMap: NodeMap;
  index: ChildrenIndex;
  effMap: Record<string, number>;
  downstream: Record<string, string[]>;
}

function derive(nodes: WbsNode[]): Derived {
  const nodeMap = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const effMap = computeEffectiveProgress(nodeMap, index);
  const downstream = buildDownstreamMap(nodes);
  return { nodeMap, index, effMap, downstream };
}

function readZoom(): number {
  if (typeof localStorage === "undefined") return 1;
  const v = Number(localStorage.getItem("cascade.zoom"));
  return v >= 0.5 && v <= 2 ? v : 1;
}

/** Next NODE-<n> code from existing nodes (suffix-aware, base 1000). */
export function nextNodeCode(nodes: WbsNode[]): string {
  let max = 999;
  for (const n of nodes) {
    const m = /NODE-(\d+)/.exec(n.nodeCode);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `NODE-${max + 1}`;
}

interface TreeState extends Derived {
  projectId: string | null;
  loading: boolean;
  nodes: WbsNode[];
  categories: catApi.Category[];
  expanded: Set<string>;
  selectedId: string | null; // primary (single) selection — drives the inspector
  selectedIds: string[]; // full multi-selection — drives the bulk panel
  linesOn: boolean;
  clipboard: { nodes: WbsNode[]; withKids: boolean } | null;
  filters: Filters;
  zoom: number;

  load: (projectId: string) => Promise<void>;
  realtimeResync: () => Promise<void>;
  setNodesLocal: (nodes: WbsNode[]) => void;
  setFilter: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  setZoom: (z: number) => void;

  select: (id: string | null, additive?: boolean) => void;
  clearSelection: () => void;
  bulkApply: (ids: string[], patch: nodesApi.BulkPatch) => Promise<number>;

  copy: (withKids: boolean) => void;
  clearClipboard: () => void;
  paste: (targetParentId: string | null) => Promise<void>;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  addChild: (parentId: string | null, opts?: { title?: string; category?: string }) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  patch: (id: string, patch: nodesApi.NodePatch, activity?: { type: string; message: string }) => Promise<void>;
  reorder: (parentId: string | null, orderedIds: string[]) => Promise<void>;

  setQaGate: (id: string, value: WbsNode["qaGate"], actorId?: string) => Promise<void>;
  setHseGate: (id: string, value: WbsNode["hseGate"], actorId?: string) => Promise<void>;

  toggleLines: () => void;
  addDependency: (nodeId: string, targetId: string) => Promise<void>;
  removeDependency: (nodeId: string, targetId: string) => Promise<void>;

  /** Cluster-aware progress/status edits (sync the whole linked cluster). */
  setProgress: (id: string, progress: number) => Promise<void>;
  setStatus: (id: string, ws: WbsNode["workStatus"]) => Promise<void>;
  link: (aId: string, bId: string) => Promise<void>;
  unlink: (id: string) => Promise<void>;

  addNote: (nodeId: string, source: string, text: string) => Promise<void>;
  updateNote: (nodeId: string, noteId: string, patch: { source?: string; text?: string; checked?: boolean }) => Promise<void>;
  deleteNote: (nodeId: string, noteId: string) => Promise<void>;
  addAttachment: (nodeId: string, noteId: string, file: File) => Promise<void>;
  removeAttachment: (nodeId: string, noteId: string, att: NoteAttachment) => Promise<void>;

  reloadCategories: () => Promise<void>;
}

export const useTree = create<TreeState>((set, get) => ({
  projectId: null,
  loading: false,
  nodes: [],
  nodeMap: {},
  index: new Map(),
  effMap: {},
  downstream: {},
  categories: [],
  expanded: new Set(),
  selectedId: null,
  selectedIds: [],
  linesOn: false,
  clipboard: null,
  filters: emptyFilters(),
  zoom: readZoom(),

  setFilter: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: emptyFilters() }),
  setZoom: (z) => {
    const clamped = Math.min(2, Math.max(0.5, Math.round(z * 100) / 100));
    try { localStorage.setItem("cascade.zoom", String(clamped)); } catch { /* ignore */ }
    set({ zoom: clamped });
  },

  load: async (projectId) => {
    set({ loading: true, projectId });
    const [nodes, categories] = await Promise.all([
      nodesApi.listProjectNodes(projectId),
      catApi.listCategories(projectId),
    ]);
    const d = derive(nodes);
    // Expand roots by default for an immediately useful view.
    const expanded = new Set(getChildren(d.index, null).map((n) => n.id));
    set({ loading: false, nodes, categories, expanded, ...d });
  },

  // Re-pull the tree after a remote change and toast any node that just
  // became unblocked for the current user (the §II "notified when unblocked" flow).
  realtimeResync: async () => {
    const { projectId, nodes, effMap } = get();
    if (!projectId) return;
    const myId = useAuth.getState().user?.id;
    const wasBlockedForMe = new Set(
      nodes.filter((n) => n.assignedUserId === myId && isBlocked(n, effMap)).map((n) => n.id),
    );
    const fresh = await nodesApi.listProjectNodes(projectId);
    const d = derive(fresh);
    set({ nodes: fresh, ...d });
    if (myId) {
      for (const n of fresh) {
        if (n.assignedUserId === myId && wasBlockedForMe.has(n.id) && !isBlocked(n, d.effMap)) {
          toast.success(`${n.nodeCode} is now unblocked — ready to start.`);
        }
      }
    }
  },

  setNodesLocal: (nodes) => set({ nodes, ...derive(nodes) }),

  select: (id, additive) =>
    set((s) => {
      if (id === null) return { selectedIds: [], selectedId: null };
      if (additive) {
        const next = s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id];
        return { selectedIds: next, selectedId: next.length === 1 ? next[0]! : null };
      }
      return { selectedIds: [id], selectedId: id };
    }),

  clearSelection: () => set({ selectedIds: [], selectedId: null }),

  bulkApply: async (ids, patch) => {
    const { projectId } = get();
    if (!projectId) return 0;
    const count = await nodesApi.bulkEditNodes(ids, patch);
    if (count !== ids.length) {
      // Some nodes weren't editable server-side — resync from the source of truth.
      const fresh = await nodesApi.listProjectNodes(projectId);
      set({ nodes: fresh, ...derive(fresh) });
      return count;
    }
    const idset = new Set(ids);
    const nextNodes = get().nodes.map((n) => {
      if (!idset.has(n.id)) return n;
      const m: WbsNode = { ...n };
      if (patch.workStatus !== undefined) m.workStatus = patch.workStatus;
      if (patch.progress !== undefined) m.progress = patch.progress;
      if (patch.priority !== undefined) m.priority = patch.priority;
      if (patch.category !== undefined) m.category = patch.category;
      if (patch.assigneeName !== undefined) m.assignee = { ...n.assignee, name: patch.assigneeName };
      if (patch.startDate !== undefined) m.startDate = patch.startDate;
      if (patch.dueDate !== undefined) m.dueDate = patch.dueDate;
      return m;
    });
    set({ nodes: nextNodes, ...derive(nextNodes) });
    return count;
  },

  copy: (withKids) => {
    const { selectedIds, selectedId, nodes, index, nodeMap, projectId } = get();
    const base = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    const setIds = new Set<string>();
    for (const id of base) {
      const n = nodeMap[id];
      if (!n || n.parentId === null) continue; // cannot copy root
      setIds.add(id);
      if (withKids) for (const d of getDescendantIds(index, id)) setIds.add(d);
    }
    if (setIds.size === 0) {
      toast.error("Select non-root nodes to copy.");
      return;
    }
    const snapshot = nodes
      .filter((n) => setIds.has(n.id))
      .map((n) => ({ ...n, dependencies: [...n.dependencies], notes: n.notes.map((x) => ({ ...x })) }));
    set({ clipboard: { nodes: snapshot, withKids } });
    if (projectId) void nodesApi.logActivity(projectId, "copy", `Copied ${snapshot.length} node(s)`);
    toast.info(`Copied ${snapshot.length} node(s)${withKids ? " with children" : ""}.`);
  },

  clearClipboard: () => set({ clipboard: null }),

  paste: async (targetParentId) => {
    const { clipboard, projectId, nodes } = get();
    if (!clipboard || !projectId) return;
    const setIds = new Set(clipboard.nodes.map((n) => n.id));
    if (targetParentId && setIds.has(targetParentId)) {
      toast.error("Cannot paste into a copied node.");
      return;
    }

    const used = new Set(nodes.map((n) => n.nodeCode));
    const freshCode = (b: string) => {
      let i = 2;
      let c = `${b}(${i})`;
      while (used.has(c)) c = `${b}(${++i})`;
      used.add(c);
      return c;
    };

    // Order copied nodes parent-before-child (within the copied set).
    const byParent = new Map<string | null, WbsNode[]>();
    for (const n of clipboard.nodes) {
      const k = n.parentId && setIds.has(n.parentId) ? n.parentId : null;
      (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(n);
    }
    const ordered: WbsNode[] = [];
    const queue = [...(byParent.get(null) ?? [])];
    while (queue.length) {
      const n = queue.shift()!;
      ordered.push(n);
      queue.push(...(byParent.get(n.id) ?? []));
    }

    try {
      const idMap = new Map<string, string>();
      let orderBase = getChildren(get().index, targetParentId).length;
      for (const n of ordered) {
        const newParent = n.parentId && setIds.has(n.parentId) ? idMap.get(n.parentId)! : targetParentId;
        const created = await nodesApi.createNode({
          projectId, nodeCode: freshCode(n.nodeCode), parentId: newParent ?? null,
          title: n.title, category: n.category, priority: n.priority, volume: n.volume,
          orderIndex: newParent === targetParentId ? orderBase++ : 0,
        });
        idMap.set(n.id, created.id);
        await nodesApi.updateNode(created.id, { progress: n.progress, workStatus: n.workStatus, startDate: n.startDate, dueDate: n.dueDate, assignee: n.assignee });
      }
      // Remap internal dependencies only.
      for (const n of ordered) {
        const newId = idMap.get(n.id)!;
        for (const dep of n.dependencies) if (setIds.has(dep)) await nodesApi.addDependency(projectId, newId, idMap.get(dep)!);
      }
      // Re-cluster copied peers that shared a cluster (fresh shared id).
      const groups = new Map<string, string[]>();
      for (const n of ordered) if (n.clusterId) (groups.get(n.clusterId) ?? groups.set(n.clusterId, []).get(n.clusterId)!).push(idMap.get(n.id)!);
      for (const [, newIds] of groups) if (newIds.length >= 2) { const cid = crypto.randomUUID(); for (const id of newIds) await nodesApi.updateNode(id, { clusterId: cid }); }
      // Freshen notes (attachments are not duplicated).
      for (const n of ordered) {
        const newId = idMap.get(n.id)!;
        for (const note of n.notes) {
          const c = await notesApi.addNote(projectId, newId, note.source, note.text);
          if (note.checked) await notesApi.updateNote(c.id, { checked: true });
        }
      }
      const fresh = await nodesApi.listProjectNodes(projectId);
      set({ nodes: fresh, ...derive(fresh) });
      void nodesApi.logActivity(projectId, "paste", `Pasted ${ordered.length} node(s)`);
      toast.success(`Pasted ${ordered.length} node(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? String(e));
    }
  },

  toggleExpand: (id) =>
    set((s) => {
      const next = new Set(s.expanded);
      next.has(id) ? next.delete(id) : next.add(id);
      return { expanded: next };
    }),

  expandAll: () => set((s) => ({ expanded: new Set(s.nodes.map((n) => n.id)) })),
  collapseAll: () => set({ expanded: new Set() }),

  addChild: async (parentId, opts) => {
    const { projectId, nodes } = get();
    if (!projectId) return null;
    const code = nextNodeCode(nodes);
    const siblings = getChildren(buildChildrenIndex(nodes), parentId);
    const parentCat = parentId ? get().nodeMap[parentId]?.category : undefined;
    const node = await nodesApi.createNode({
      projectId,
      nodeCode: code,
      parentId,
      title: opts?.title ?? "New Node",
      category: opts?.category ?? (parentCat && parentCat !== "root" ? parentCat : "general"),
      orderIndex: siblings.length,
    });
    const nextNodes = [...nodes, node];
    set({ nodes: nextNodes, ...derive(nextNodes), selectedId: node.id });
    if (parentId) set((s) => ({ expanded: new Set(s.expanded).add(parentId) }));
    void nodesApi.logActivity(projectId, "create", `Created ${node.nodeCode}`, node.id, node.nodeCode);
    return node.id;
  },

  remove: async (id) => {
    const { projectId, nodes, index } = get();
    if (!projectId) return;
    const removed = new Set([id, ...getDescendantIds(index, id)]);
    const node = get().nodeMap[id];
    await nodesApi.deleteNode(id);
    const nextNodes = nodes
      .filter((n) => !removed.has(n.id))
      .map((n) => ({ ...n, dependencies: n.dependencies.filter((d) => !removed.has(d)) }));
    set((s) => ({
      nodes: nextNodes,
      ...derive(nextNodes),
      selectedId: s.selectedId && removed.has(s.selectedId) ? null : s.selectedId,
    }));
    void nodesApi.logActivity(projectId, "delete", `Deleted ${node?.nodeCode ?? id}`, undefined, node?.nodeCode);
  },

  rename: async (id, title) => {
    const { projectId } = get();
    await nodesApi.updateNode(id, { title });
    const nextNodes = get().nodes.map((n) => (n.id === id ? { ...n, title } : n));
    set({ nodes: nextNodes, ...derive(nextNodes) });
    const code = get().nodeMap[id]?.nodeCode;
    if (projectId) void nodesApi.logActivity(projectId, "rename", `Renamed ${code} → "${title}"`, id, code);
  },

  patch: async (id, patch, activity) => {
    const { projectId } = get();
    await nodesApi.updateNode(id, patch);
    const nextNodes = get().nodes.map((n) => {
      if (n.id !== id) return n;
      const merged: WbsNode = { ...n };
      if (patch.title !== undefined) merged.title = patch.title;
      if (patch.category !== undefined) merged.category = patch.category;
      if (patch.priority !== undefined) merged.priority = patch.priority as Priority;
      if (patch.workStatus !== undefined) merged.workStatus = patch.workStatus;
      if (patch.progress !== undefined) merged.progress = patch.progress;
      if (patch.volume !== undefined) merged.volume = patch.volume;
      if (patch.startDate !== undefined) merged.startDate = patch.startDate;
      if (patch.dueDate !== undefined) merged.dueDate = patch.dueDate;
      if (patch.clusterId !== undefined) merged.clusterId = patch.clusterId;
      if (patch.assignedUserId !== undefined) merged.assignedUserId = patch.assignedUserId;
      if (patch.nodeCode !== undefined) merged.nodeCode = patch.nodeCode;
      if (patch.assignee) merged.assignee = { ...n.assignee, ...patch.assignee };
      return merged;
    });
    set({ nodes: nextNodes, ...derive(nextNodes) });
    if (projectId && activity) {
      const code = get().nodeMap[id]?.nodeCode;
      void nodesApi.logActivity(projectId, activity.type, activity.message, id, code);
    }
  },

  reorder: async (parentId, orderedIds) => {
    const { projectId, nodes } = get();
    const orderById = new Map(orderedIds.map((id, i) => [id, i]));
    const nextNodes = nodes.map((n) =>
      n.parentId === parentId && orderById.has(n.id) ? { ...n, orderIndex: orderById.get(n.id)! } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
    await nodesApi.reorderNodes(orderedIds.map((id, i) => ({ id, orderIndex: i })));
    if (projectId) void nodesApi.logActivity(projectId, "reorder", "Reordered nodes");
  },

  setQaGate: async (id, value, actorId) => {
    await nodesApi.setQaGate(id, value);
    const at = new Date().toISOString();
    const nextNodes = get().nodes.map((n) => (n.id === id ? { ...n, qaGate: value, qaGateBy: actorId ?? n.qaGateBy, qaGateAt: at } : n));
    set({ nodes: nextNodes, ...derive(nextNodes) });
  },

  setHseGate: async (id, value, actorId) => {
    await nodesApi.setHseGate(id, value);
    const at = new Date().toISOString();
    const nextNodes = get().nodes.map((n) => (n.id === id ? { ...n, hseGate: value, hseGateBy: actorId ?? n.hseGateBy, hseGateAt: at } : n));
    set({ nodes: nextNodes, ...derive(nextNodes) });
  },

  toggleLines: () => set((s) => ({ linesOn: !s.linesOn })),

  addDependency: async (nodeId, targetId) => {
    const { projectId } = get();
    if (!projectId) return;
    await nodesApi.addDependency(projectId, nodeId, targetId);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, dependencies: [...n.dependencies, targetId] } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
    const code = get().nodeMap[nodeId]?.nodeCode;
    void nodesApi.logActivity(projectId, "dependency", `${code} now depends on ${get().nodeMap[targetId]?.nodeCode}`, nodeId, code);
  },

  removeDependency: async (nodeId, targetId) => {
    const { projectId } = get();
    if (!projectId) return;
    await nodesApi.removeDependency(nodeId, targetId);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, dependencies: n.dependencies.filter((d) => d !== targetId) } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
    const code = get().nodeMap[nodeId]?.nodeCode;
    void nodesApi.logActivity(projectId, "dependency", `${code} dependency removed`, nodeId, code);
  },

  setProgress: async (id, progress) => {
    const { projectId, nodes, nodeMap, index } = get();
    const node = nodeMap[id];
    if (!node) return;
    const ws = effectiveWorkStatus(progress);
    // Cluster-aware: apply to every leaf in the cluster, else just this node.
    const targets = node.clusterId
      ? nodes.filter((n) => n.clusterId === node.clusterId && isLeaf(index, n.id))
      : [node];
    await Promise.all(targets.map((n) => nodesApi.updateNode(n.id, { progress, workStatus: ws })));
    const ids = new Set(targets.map((n) => n.id));
    const nextNodes = nodes.map((n) => (ids.has(n.id) ? { ...n, progress, workStatus: ws } : n));
    set({ nodes: nextNodes, ...derive(nextNodes) });
    if (projectId) void nodesApi.logActivity(projectId, "progress", `${node.nodeCode} progress ${progress}%${node.clusterId ? " (cluster)" : ""}`, id, node.nodeCode);
  },

  setStatus: async (id, ws) => {
    const progress = ws === "done" ? 100 : ws === "not_started" ? 0 : Math.max(1, Math.min(99, get().nodeMap[id]?.progress ?? 50));
    await get().setProgress(id, progress);
  },

  link: async (aId, bId) => {
    const { projectId, nodes, nodeMap, index, effMap } = get();
    const a = nodeMap[aId];
    const b = nodeMap[bId];
    if (!a || !b || aId === bId) return;
    const oldClusters = new Set([a.clusterId, b.clusterId].filter(Boolean) as string[]);
    const cluster = a.clusterId ?? b.clusterId ?? crypto.randomUUID();
    const memberIds = new Set<string>([aId, bId]);
    for (const n of nodes) if (n.clusterId && oldClusters.has(n.clusterId)) memberIds.add(n.id);
    // Sync to the furthest-along value so linking never discards progress.
    const sync = Math.max(...[...memberIds].map((id) => effMap[id] ?? 0), 0);
    const ws = effectiveWorkStatus(sync);
    await Promise.all(
      [...memberIds].map((id) =>
        nodesApi.updateNode(id, { clusterId: cluster, ...(isLeaf(index, id) ? { progress: sync, workStatus: ws } : {}) }),
      ),
    );
    const nextNodes = nodes.map((n) =>
      memberIds.has(n.id) ? { ...n, clusterId: cluster, ...(isLeaf(index, n.id) ? { progress: sync, workStatus: ws } : {}) } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
    if (projectId) void nodesApi.logActivity(projectId, "link", `${a.nodeCode} linked with ${b.nodeCode}`, aId, a.nodeCode);
  },

  unlink: async (id) => {
    const { projectId, nodes, nodeMap } = get();
    const node = nodeMap[id];
    if (!node?.clusterId) return;
    const cluster = node.clusterId;
    const remaining = nodes.filter((n) => n.clusterId === cluster && n.id !== id);
    await nodesApi.updateNode(id, { clusterId: null });
    let nextNodes = nodes.map((n) => (n.id === id ? { ...n, clusterId: null } : n));
    // A cluster of one is no cluster — clear the lone survivor too.
    if (remaining.length === 1) {
      const lone = remaining[0]!;
      await nodesApi.updateNode(lone.id, { clusterId: null });
      nextNodes = nextNodes.map((n) => (n.id === lone.id ? { ...n, clusterId: null } : n));
    }
    set({ nodes: nextNodes, ...derive(nextNodes) });
    if (projectId) void nodesApi.logActivity(projectId, "link", `${node.nodeCode} unlinked`, id, node.nodeCode);
  },

  addNote: async (nodeId, source, text) => {
    const { projectId, nodeMap } = get();
    if (!projectId) return;
    const note = await notesApi.addNote(projectId, nodeId, source, text);
    const nextNodes = get().nodes.map((n) => (n.id === nodeId ? { ...n, notes: [...n.notes, note] } : n));
    set({ nodes: nextNodes, ...derive(nextNodes) });
    void nodesApi.logActivity(projectId, "note", `Note added to ${nodeMap[nodeId]?.nodeCode}`, nodeId, nodeMap[nodeId]?.nodeCode);
  },

  updateNote: async (nodeId, noteId, patch) => {
    await notesApi.updateNote(noteId, patch);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, notes: n.notes.map((nt) => (nt.id === noteId ? { ...nt, ...patch } : nt)) } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
    const { projectId, nodeMap } = get();
    if (projectId && patch.checked !== undefined) {
      void nodesApi.logActivity(projectId, "note", `Note ${patch.checked ? "resolved" : "reopened"} on ${nodeMap[nodeId]?.nodeCode}`, nodeId, nodeMap[nodeId]?.nodeCode);
    }
  },

  deleteNote: async (nodeId, noteId) => {
    await notesApi.deleteNote(noteId);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId ? { ...n, notes: n.notes.filter((nt) => nt.id !== noteId) } : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
  },

  addAttachment: async (nodeId, noteId, file) => {
    const { projectId, nodeMap } = get();
    if (!projectId) return;
    const note = nodeMap[nodeId]?.notes.find((nt) => nt.id === noteId);
    const existing = new Set((note?.attachments ?? []).map((a) => a.fileName));
    const fileName = uniqueFilename(file.name, existing);
    const att = await notesApi.uploadAttachment(projectId, noteId, file, fileName);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId
        ? { ...n, notes: n.notes.map((nt) => (nt.id === noteId ? { ...nt, attachments: [...nt.attachments, att] } : nt)) }
        : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
  },

  removeAttachment: async (nodeId, noteId, att) => {
    await notesApi.deleteAttachment(att);
    const nextNodes = get().nodes.map((n) =>
      n.id === nodeId
        ? { ...n, notes: n.notes.map((nt) => (nt.id === noteId ? { ...nt, attachments: nt.attachments.filter((a) => a.id !== att.id) } : nt)) }
        : n,
    );
    set({ nodes: nextNodes, ...derive(nextNodes) });
  },

  reloadCategories: async () => {
    const { projectId } = get();
    if (!projectId) return;
    set({ categories: await catApi.listCategories(projectId) });
  },
}));
