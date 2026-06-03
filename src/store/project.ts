import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { getProject } from "@/lib/api/projects";
import { listMembers, type ProjectMember } from "@/lib/api/members";
import { useAuth } from "@/store/auth";
import type { Project, Role } from "@/lib/types";

interface ProjectState {
  loading: boolean;
  project: Project | null;
  role: Role | null; // caller's effective role on this project
  members: ProjectMember[];
  error: string | null;
  load: (projectId: string) => Promise<void>;
  setProject: (p: Project) => void;
  reloadMembers: () => Promise<void>;
  clear: () => void;
}

/** Resolve the caller's effective project role: developer > admin > membership. */
async function resolveRole(project: Project): Promise<Role | null> {
  const auth = useAuth.getState();
  if (auth.profile?.platform_role) return "developer";
  if (auth.orgs.some((o) => o.orgId === project.orgId && o.orgRole === "admin")) return "admin";
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", uid)
    .maybeSingle();
  return (data?.role as Role) ?? null;
}

export const useProject = create<ProjectState>((set, get) => ({
  loading: false,
  project: null,
  role: null,
  members: [],
  error: null,

  load: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const project = await getProject(projectId);
      if (!project) {
        set({ loading: false, error: "Project not found or access denied.", project: null });
        return;
      }
      const [role, members] = await Promise.all([resolveRole(project), listMembers(projectId)]);
      set({ loading: false, project, role, members });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? String(e) });
    }
  },

  setProject: (p) => set({ project: p }),

  reloadMembers: async () => {
    const p = get().project;
    if (!p) return;
    set({ members: await listMembers(p.id) });
  },

  clear: () => set({ project: null, role: null, members: [], error: null }),
}));
