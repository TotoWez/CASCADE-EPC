import { supabase } from "@/lib/supabase";

export interface ActivityRow {
  id: number;
  type: string;
  role: string | null;
  actorId: string | null;
  message: string;
  nodeId: string | null;
  nodeCode: string | null;
  createdAt: string;
}

/** Newest-first activity for a project (capped to 500 by the DB trigger). */
export async function listActivity(projectId: string): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity")
    .select("id, type, role, actor_id, message, node_id, node_code, created_at")
    .eq("project_id", projectId)
    .order("id", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id,
    type: r.type,
    role: r.role,
    actorId: r.actor_id,
    message: r.message,
    nodeId: r.node_id,
    nodeCode: r.node_code,
    createdAt: r.created_at,
  }));
}

export async function clearActivity(projectId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_activity", { p_project: projectId });
  if (error) throw error;
}
