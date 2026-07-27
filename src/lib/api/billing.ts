import { supabase } from "@/lib/supabase";
import type { PlanId } from "@/lib/plans";

/**
 * Client for the Stripe Pages Functions (functions/api/stripe/*). Each call
 * attaches the caller's Supabase access token; the function re-checks that the
 * user administers the org before doing anything with Stripe.
 */

async function post(path: string, body: unknown): Promise<{ url: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !payload.url) throw new Error(payload.error || "Billing request failed.");
  return { url: payload.url };
}

/** Start a Checkout session for a paid tier and redirect the browser to Stripe. */
export async function startCheckout(orgId: string, tier: Exclude<PlanId, "free">): Promise<void> {
  const { url } = await post("/api/stripe/checkout", { orgId, tier });
  window.location.href = url;
}

/** Open the Stripe Billing Portal (manage / cancel / update card) and redirect. */
export async function openPortal(orgId: string): Promise<void> {
  const { url } = await post("/api/stripe/portal", { orgId });
  window.location.href = url;
}
