// Shared helpers for the Stripe Pages Functions. The leading underscore keeps
// Cloudflare from routing this file. These run on the Cloudflare Workers
// runtime, so Stripe must use the fetch HTTP client + SubtleCrypto provider.
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_PRO: string;
  STRIPE_PRICE_PRO_MAX: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Optional explicit app origin for redirect URLs (else derived from request). */
  APP_URL?: string;
}

export type PaidTier = "pro" | "pro_max";

export function stripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Service-role Supabase client — bypasses RLS + the billing-column lock trigger. */
export function serviceClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function priceForTier(env: Env, tier: string): string | null {
  if (tier === "pro") return env.STRIPE_PRICE_PRO;
  if (tier === "pro_max") return env.STRIPE_PRICE_PRO_MAX;
  return null;
}

export function tierForPrice(env: Env, priceId: string | undefined): PaidTier | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_PRO_MAX) return "pro_max";
  return null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function appOrigin(env: Env, request: Request): string {
  return env.APP_URL || new URL(request.url).origin;
}

/**
 * Validate the caller's Supabase JWT and confirm they administer `orgId`
 * (org admin or platform staff). Returns the org row on success, else a Response
 * to return directly. Uses the service client so it can read across RLS.
 */
export async function requireOrgAdmin(
  env: Env,
  request: Request,
  orgId: string,
): Promise<{ org: Record<string, unknown> } | { error: Response }> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { error: json({ error: "Not authenticated" }, 401) };

  const supa = serviceClient(env);
  const { data: userRes, error: userErr } = await supa.auth.getUser(token);
  if (userErr || !userRes.user) return { error: json({ error: "Invalid session" }, 401) };
  const userId = userRes.user.id;

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supa.from("org_members").select("org_role").eq("org_id", orgId).eq("user_id", userId).maybeSingle(),
    supa.from("profiles").select("platform_role").eq("id", userId).maybeSingle(),
  ]);
  const isAdmin = membership?.org_role === "admin" || Boolean(profile?.platform_role);
  if (!isAdmin) return { error: json({ error: "Not authorized for this workspace" }, 403) };

  const { data: org, error: orgErr } = await supa
    .from("organizations")
    .select("id, name, stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr || !org) return { error: json({ error: "Workspace not found" }, 404) };
  return { org: org as Record<string, unknown> };
}

/**
 * Write a Stripe subscription's state onto its organization. Idempotent — safe
 * to call from checkout.completed and every subscription.* webhook.
 */
export async function syncSubscription(env: Env, sub: Stripe.Subscription): Promise<void> {
  const supa = serviceClient(env);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id;
  const tier = tierForPrice(env, priceId);

  let orgId = (sub.metadata && sub.metadata.orgId) || null;
  if (!orgId) {
    const { data } = await supa.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    orgId = (data?.id as string) ?? null;
  }
  if (!orgId) return;

  const active = sub.status === "active" || sub.status === "trialing";
  await supa
    .from("organizations")
    .update({
      subscription_tier: active && tier ? tier : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    })
    .eq("id", orgId);
}
