// POST /api/stripe/checkout  { orgId, tier }  → { url } (Stripe Checkout URL)
// Creates (or reuses) the org's Stripe customer and opens a subscription
// Checkout session for the requested paid tier. Caller must administer the org.
import {
  type Env,
  type PaidTier,
  stripeClient,
  serviceClient,
  priceForTier,
  requireOrgAdmin,
  appOrigin,
  json,
} from "./_shared";

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  let body: { orgId?: string; tier?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const orgId = body.orgId;
  const tier = body.tier as PaidTier | undefined;
  if (!orgId || (tier !== "pro" && tier !== "pro_max")) {
    return json({ error: "orgId and a valid paid tier are required" }, 400);
  }

  const gate = await requireOrgAdmin(env, request, orgId);
  if ("error" in gate) return gate.error;
  const org = gate.org;

  const priceId = priceForTier(env, tier);
  if (!priceId) return json({ error: "This tier is not purchasable" }, 400);

  const stripe = stripeClient(env);

  // Reuse the org's customer if we have one, else create + persist it.
  let customerId = org.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: (org.name as string) || undefined,
      metadata: { orgId },
    });
    customerId = customer.id;
    await serviceClient(env).from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
  }

  const origin = appOrigin(env, request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { orgId, tier } },
    metadata: { orgId, tier },
    allow_promotion_codes: true,
    success_url: `${origin}/app/org?billing=success`,
    cancel_url: `${origin}/app/org?billing=cancelled`,
  });

  return json({ url: session.url });
};
