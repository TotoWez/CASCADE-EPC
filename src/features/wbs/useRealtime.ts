import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import { useTree } from "@/store/tree";

/**
 * Subscribe to live changes for a project (nodes / dependencies / notes) and
 * debounce-resync the tree so collaborators see each other's edits without a
 * reload. RLS is enforced server-side, so only authorised rows stream through.
 * No-op when Supabase isn't configured.
 */
export function useRealtime(projectId: string | null) {
  useEffect(() => {
    if (!projectId || !env.hasSupabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const resync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void useTree.getState().realtimeResync(), 600);
    };

    const filter = `project_id=eq.${projectId}`;
    const channel = supabase
      .channel(`project:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "nodes", filter }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "node_dependencies", filter }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter }, resync)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [projectId]);
}
