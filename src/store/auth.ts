import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { OrgRole } from "@/lib/types";

export interface ProfileRow {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
  avatar_url: string | null;
  platform_role: "owner" | "developer" | null;
}

export interface OrgRef {
  orgId: string;
  name: string;
  orgRole: OrgRole;
}

type Status = "loading" | "authed" | "anon";

interface AuthState {
  status: Status;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  orgs: OrgRef[];
  initialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function loadProfileAndOrgs(userId: string): Promise<{ profile: ProfileRow | null; orgs: OrgRef[] }> {
  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("org_members").select("org_role, organizations(id, name)").eq("user_id", userId),
  ]);
  const orgs: OrgRef[] = [];
  for (const m of (members ?? []) as any[]) {
    const o = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    if (o) orgs.push({ orgId: o.id, name: o.name, orgRole: m.org_role });
  }
  return { profile: (profile as ProfileRow) ?? null, orgs };
}

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  user: null,
  profile: null,
  orgs: [],
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    if (!env.hasSupabase) {
      set({ status: "anon" });
      return;
    }

    const apply = async (session: Session | null) => {
      if (session?.user) {
        const { profile, orgs } = await loadProfileAndOrgs(session.user.id);
        set({ status: "authed", session, user: session.user, profile, orgs });
      } else {
        set({ status: "anon", session: null, user: null, profile: null, orgs: [] });
      }
    };

    const { data } = await supabase.auth.getSession();
    await apply(data.session);
    supabase.auth.onAuthStateChange((_event, session) => {
      void apply(session);
    });
  },

  refresh: async () => {
    const user = get().user;
    if (!user) return;
    const { profile, orgs } = await loadProfileAndOrgs(user.id);
    set({ profile, orgs });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ status: "anon", session: null, user: null, profile: null, orgs: [] });
  },
}));
