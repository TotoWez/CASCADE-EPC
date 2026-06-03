import { supabase } from "@/lib/supabase";
import type { Note, WbsNode, Priority, QaGate, HseGate, WorkStatus } from "@/lib/types";

interface NodeRow {
  id: string;
  project_id: string;
  node_code: string;
  parent_id: string | null;
  title: string;
  category: string;
  priority: number;
  work_status: WorkStatus;
  progress: number;
  volume: number;
  qa_gate: QaGate;
  hse_gate: HseGate;
  qa_gate_by: string | null;
  qa_gate_at: string | null;
  hse_gate_by: string | null;
  hse_gate_at: string | null;
  start_date: string | null;
  due_date: string | null;
  assignee_name: string;
  assignee_email: string;
  assignee_phone: string;
  assigned_user_id: string | null;
  cluster_id: string | null;
  order_index: number;
}

function rowToNode(r: NodeRow): WbsNode {
  return {
    id: r.id,
    nodeCode: r.node_code,
    projectId: r.project_id,
    parentId: r.parent_id,
    title: r.title,
    category: r.category,
    priority: (r.priority as Priority) ?? 3,
    workStatus: r.work_status,
    progress: r.progress,
    volume: r.volume,
    qaGate: r.qa_gate,
    hseGate: r.hse_gate,
    qaGateBy: r.qa_gate_by,
    qaGateAt: r.qa_gate_at,
    hseGateBy: r.hse_gate_by,
    hseGateAt: r.hse_gate_at,
    startDate: r.start_date,
    dueDate: r.due_date,
    assignee: { name: r.assignee_name, email: r.assignee_email, phone: r.assignee_phone },
    assignedUserId: r.assigned_user_id,
    clusterId: r.cluster_id,
    orderIndex: r.order_index,
    dependencies: [],
    notes: [],
  };
}

/** Load the full WBS for a project (nodes + dependencies + notes/attachments). */
export async function listProjectNodes(projectId: string): Promise<WbsNode[]> {
  const [nodesRes, depsRes, notesRes] = await Promise.all([
    supabase.from("nodes").select("*").eq("project_id", projectId),
    supabase.from("node_dependencies").select("node_id, depends_on_node_id").eq("project_id", projectId),
    supabase
      .from("notes")
      .select("id, node_id, source, text, checked, created_by, created_at, note_attachments(id, file_name, storage_path, mime, size)")
      .eq("project_id", projectId),
  ]);
  if (nodesRes.error) throw nodesRes.error;
  if (depsRes.error) throw depsRes.error;
  if (notesRes.error) throw notesRes.error;

  const nodes = (nodesRes.data as NodeRow[]).map(rowToNode);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const d of (depsRes.data as { node_id: string; depends_on_node_id: string }[]) ?? []) {
    byId.get(d.node_id)?.dependencies.push(d.depends_on_node_id);
  }

  for (const row of (notesRes.data as any[]) ?? []) {
    const note: Note = {
      id: row.id,
      source: row.source ?? "",
      text: row.text ?? "",
      checked: row.checked ?? false,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at ?? undefined,
      attachments: (row.note_attachments ?? []).map((a: any) => ({
        id: a.id,
        fileName: a.file_name,
        storagePath: a.storage_path,
        mime: a.mime,
        size: a.size,
      })),
    };
    byId.get(row.node_id)?.notes.push(note);
  }

  return nodes;
}

export interface CreateNodeInput {
  projectId: string;
  nodeCode: string;
  parentId: string | null;
  title?: string;
  category?: string;
  priority?: Priority;
  volume?: number;
  orderIndex?: number;
}

export async function createNode(input: CreateNodeInput): Promise<WbsNode> {
  const { data, error } = await supabase
    .from("nodes")
    .insert({
      project_id: input.projectId,
      node_code: input.nodeCode,
      parent_id: input.parentId,
      title: input.title ?? "New Node",
      category: input.category ?? "general",
      priority: input.priority ?? 3,
      volume: input.volume ?? 1,
      order_index: input.orderIndex ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToNode(data as NodeRow);
}

export interface NodePatch {
  title?: string;
  nodeCode?: string;
  category?: string;
  priority?: Priority;
  workStatus?: WorkStatus;
  progress?: number;
  volume?: number;
  startDate?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
  orderIndex?: number;
  clusterId?: string | null;
  assignedUserId?: string | null;
  assignee?: { name?: string; email?: string; phone?: string };
}

export async function updateNode(id: string, patch: NodePatch): Promise<void> {
  const row: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => v !== undefined && (row[k] = v);
  set("title", patch.title);
  set("node_code", patch.nodeCode);
  set("category", patch.category);
  set("priority", patch.priority);
  set("work_status", patch.workStatus);
  set("progress", patch.progress);
  set("volume", patch.volume);
  set("start_date", patch.startDate);
  set("due_date", patch.dueDate);
  set("parent_id", patch.parentId);
  set("order_index", patch.orderIndex);
  set("cluster_id", patch.clusterId);
  set("assigned_user_id", patch.assignedUserId);
  if (patch.assignee) {
    set("assignee_name", patch.assignee.name);
    set("assignee_email", patch.assignee.email);
    set("assignee_phone", patch.assignee.phone);
  }
  const { error } = await supabase.from("nodes").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await supabase.from("nodes").delete().eq("id", id);
  if (error) throw error;
}

/** Persist new sibling order (and optional reparent) for a set of nodes. */
export async function reorderNodes(updates: { id: string; orderIndex: number; parentId?: string | null }[]): Promise<void> {
  await Promise.all(
    updates.map((u) =>
      updateNode(u.id, { orderIndex: u.orderIndex, ...(u.parentId !== undefined ? { parentId: u.parentId } : {}) }),
    ),
  );
}

// ---- Gates (RPC; authority enforced server-side) ---------------------------
export async function setQaGate(nodeId: string, value: QaGate): Promise<void> {
  const { error } = await supabase.rpc("set_qa_gate", { p_node: nodeId, p_value: value });
  if (error) throw error;
}
export async function setHseGate(nodeId: string, value: HseGate): Promise<void> {
  const { error } = await supabase.rpc("set_hse_gate", { p_node: nodeId, p_value: value });
  if (error) throw error;
}

// ---- Dependencies ----------------------------------------------------------
export async function addDependency(projectId: string, nodeId: string, dependsOn: string): Promise<void> {
  const { error } = await supabase
    .from("node_dependencies")
    .insert({ project_id: projectId, node_id: nodeId, depends_on_node_id: dependsOn });
  if (error) throw error;
}
export async function removeDependency(nodeId: string, dependsOn: string): Promise<void> {
  const { error } = await supabase
    .from("node_dependencies")
    .delete()
    .eq("node_id", nodeId)
    .eq("depends_on_node_id", dependsOn);
  if (error) throw error;
}

// ---- Smart bulk edit (one activity entry, server-enforced edit scope) ------
export interface BulkPatch {
  workStatus?: WorkStatus;
  progress?: number;
  priority?: Priority;
  category?: string;
  assigneeName?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export async function bulkEditNodes(nodeIds: string[], patch: BulkPatch): Promise<number> {
  const p: Record<string, unknown> = {};
  if (patch.workStatus !== undefined) p.work_status = patch.workStatus;
  if (patch.progress !== undefined) p.progress = patch.progress;
  if (patch.priority !== undefined) p.priority = patch.priority;
  if (patch.category !== undefined) p.category = patch.category;
  if (patch.assigneeName !== undefined) p.assignee_name = patch.assigneeName;
  if (patch.startDate !== undefined) p.start_date = patch.startDate ?? "";
  if (patch.dueDate !== undefined) p.due_date = patch.dueDate ?? "";
  const { data, error } = await supabase.rpc("bulk_edit_nodes", { p_node_ids: nodeIds, p_patch: p });
  if (error) throw error;
  return (data as number) ?? 0;
}

// ---- Activity --------------------------------------------------------------
export async function logActivity(
  projectId: string,
  type: string,
  message: string,
  nodeId?: string,
  nodeCode?: string,
): Promise<void> {
  const { error } = await supabase.rpc("log_activity", {
    p_project: projectId,
    p_type: type,
    p_message: message,
    p_node: nodeId ?? null,
    p_node_code: nodeCode ?? null,
  });
  if (error) throw error;
}
