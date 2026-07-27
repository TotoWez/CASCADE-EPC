import { supabase } from "@/lib/supabase";
import type { PlanId } from "@/lib/plans";

/**
 * Platform-owner API. All three calls go through SECURITY DEFINER RPCs
 * (supabase/migrations/0012) that re-check `is_platform_staff()` server-side —
 * a non-platform user calling these gets "Not authorized" from Postgres, so the
 * client gate is UX only, not the security boundary.
 */

export interface PlatformOrg {
  orgId: string;
  name: string;
  tier: string;
  suspended: boolean;
  createdAt: string;
  ownerEmail: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  projects: number;
  members: number;
  nodes: number;
  snapshots: number;
  storageBytes: number;
}

interface OverviewRow {
  org_id: string;
  name: string;
  tier: string;
  suspended: boolean;
  created_at: string;
  owner_email: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  projects: number;
  members: number;
  nodes: number;
  snapshots: number;
  storage_bytes: number;
}

export async function platformOverview(): Promise<PlatformOrg[]> {
  const { data, error } = await supabase.rpc("platform_overview");
  if (error) throw error;
  return ((data as OverviewRow[] | null) ?? []).map((r) => ({
    orgId: r.org_id,
    name: r.name,
    tier: r.tier,
    suspended: r.suspended,
    createdAt: r.created_at,
    ownerEmail: r.owner_email,
    subscriptionStatus: r.subscription_status,
    currentPeriodEnd: r.current_period_end,
    projects: r.projects,
    members: r.members,
    nodes: r.nodes,
    snapshots: r.snapshots,
    storageBytes: r.storage_bytes,
  }));
}

export async function setTier(orgId: string, tier: PlanId): Promise<void> {
  const { error } = await supabase.rpc("platform_set_tier", { p_org: orgId, p_tier: tier });
  if (error) throw error;
}

export async function setSuspended(orgId: string, value: boolean): Promise<void> {
  const { error } = await supabase.rpc("platform_set_suspended", { p_org: orgId, p_val: value });
  if (error) throw error;
}
