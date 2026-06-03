import { supabase } from "@/lib/supabase";

export interface SnapshotMeta {
  id: string;
  name: string;
  takenAt: string;
  overallProgress: number;
  nodeCount: number;
  isAuto: boolean;
}

export interface SnapshotState {
  nodes: { id: string; node_code: string; title: string; progress: number; work_status: string }[];
}

export async function saveSnapshot(projectId: string, name?: string): Promise<string> {
  const { data, error } = await supabase.rpc("save_snapshot", { p_project: projectId, p_name: name ?? null, p_is_auto: false });
  if (error) throw error;
  return data as string;
}

export async function listSnapshots(projectId: string): Promise<SnapshotMeta[]> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("id, name, taken_at, overall_progress, node_count, is_auto")
    .eq("project_id", projectId)
    .order("taken_at", { ascending: true });
  if (error) throw error;
  return (data as any[]).map((s) => ({
    id: s.id, name: s.name, takenAt: s.taken_at, overallProgress: Number(s.overall_progress), nodeCount: s.node_count, isAuto: s.is_auto,
  }));
}

export async function getSnapshotState(id: string): Promise<SnapshotState> {
  const { data, error } = await supabase.from("snapshots").select("state").eq("id", id).single();
  if (error) throw error;
  return (data.state as SnapshotState) ?? { nodes: [] };
}

export async function deleteSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from("snapshots").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllSnapshots(projectId: string): Promise<void> {
  const { error } = await supabase.from("snapshots").delete().eq("project_id", projectId);
  if (error) throw error;
}
