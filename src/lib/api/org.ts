import { supabase } from "@/lib/supabase";
import { resizeImage } from "@/lib/image";

export interface Org {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  subscriptionTier: string;
}

export interface UsageStats {
  projects: number;
  members: number;
  nodes: number;
  snapshots: number;
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, subscription_tier")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
    subscriptionTier: data.subscription_tier,
  };
}

export async function updateOrg(orgId: string, patch: { name?: string; logoUrl?: string | null }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  const { error } = await supabase.from("organizations").update(row).eq("id", orgId);
  if (error) throw error;
}

/**
 * Resize + upload a logo to the public `branding` bucket under the org path
 * (RLS requires the first path segment to be an org the caller administers).
 * `label` distinguishes org / client / consultant / contractor / sub logos.
 */
export async function uploadBranding(orgId: string, file: File, label: string): Promise<string> {
  const resized = await resizeImage(file);
  const path = `${orgId}/${label}-${Date.now()}.png`;
  const { error } = await supabase.storage.from("branding").upload(path, resized, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("branding").getPublicUrl(path).data.publicUrl;
}

/** Best-effort usage snapshot from row counts (free-tier visibility). */
export async function usageStats(orgId: string): Promise<UsageStats> {
  const projectIdsRes = await supabase.from("projects").select("id").eq("org_id", orgId);
  const projectIds = (projectIdsRes.data as { id: string }[] | null)?.map((p) => p.id) ?? [];

  const countOf = async (table: string): Promise<number> => {
    if (projectIds.length === 0) return 0;
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds);
    return count ?? 0;
  };

  const [members, nodes, snapshots] = await Promise.all([
    countOf("memberships"),
    countOf("nodes"),
    countOf("snapshots"),
  ]);
  return { projects: projectIds.length, members, nodes, snapshots };
}
