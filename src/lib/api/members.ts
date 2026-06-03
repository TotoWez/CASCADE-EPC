import { supabase } from "@/lib/supabase";
import type { ProjectRole } from "@/lib/types";

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  canComment: boolean;
  name: string;
  email: string;
  position: string;
  avatarUrl: string | null;
}

export interface OrgMemberRef {
  userId: string;
  name: string;
  email: string;
  orgRole: "admin" | "member";
}

export interface Invitation {
  id: string;
  role: ProjectRole;
  email: string | null;
  code: string;
  canComment: boolean;
  expiresAt: string | null;
  maxUses: number;
  uses: number;
  createdAt: string;
  acceptedAt: string | null;
}

function pickProfile(p: any): { name: string; email: string; position: string; avatarUrl: string | null } {
  const prof = Array.isArray(p) ? p[0] : p;
  return {
    name: prof?.full_name ?? "",
    email: prof?.email ?? "",
    position: prof?.position ?? "",
    avatarUrl: prof?.avatar_url ?? null,
  };
}

export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  // Disambiguate: memberships has two FKs to profiles (user_id, invited_by).
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, can_comment, profiles!memberships_user_id_fkey(full_name, email, position, avatar_url)")
    .eq("project_id", projectId);
  if (error) throw error;
  return (data as any[]).map((m) => ({
    userId: m.user_id,
    role: m.role,
    canComment: m.can_comment,
    ...pickProfile(m.profiles),
  }));
}

export async function listOrgMembers(orgId: string): Promise<OrgMemberRef[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, org_role, profiles(full_name, email)")
    .eq("org_id", orgId);
  if (error) throw error;
  return (data as any[]).map((m) => {
    const prof = pickProfile(m.profiles);
    return { userId: m.user_id, name: prof.name, email: prof.email, orgRole: m.org_role };
  });
}

export async function createInvitation(args: {
  projectId: string;
  role: ProjectRole;
  email?: string | null;
  canComment?: boolean;
  expiresAt?: string | null;
  maxUses?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_invitation", {
    p_project: args.projectId,
    p_role: args.role,
    p_email: args.email ?? null,
    p_can_comment: args.canComment ?? false,
    p_expires_at: args.expiresAt ?? null,
    p_max_uses: args.maxUses ?? 1,
  });
  if (error) throw error;
  return data as string;
}

export async function assignRole(args: {
  projectId: string;
  userId: string;
  role: ProjectRole;
  canComment?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("assign_member_role", {
    p_project: args.projectId,
    p_user: args.userId,
    p_role: args.role,
    p_can_comment: args.canComment ?? false,
  });
  if (error) throw error;
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("memberships").delete().eq("project_id", projectId).eq("user_id", userId);
  if (error) throw error;
}

export async function listInvitations(projectId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, role, email, code, can_comment, expires_at, max_uses, uses, created_at, accepted_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map((i) => ({
    id: i.id,
    role: i.role,
    email: i.email,
    code: i.code,
    canComment: i.can_comment,
    expiresAt: i.expires_at,
    maxUses: i.max_uses,
    uses: i.uses,
    createdAt: i.created_at,
    acceptedAt: i.accepted_at,
  }));
}

export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}
