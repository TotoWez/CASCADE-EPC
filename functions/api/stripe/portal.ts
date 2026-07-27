// POST /api/stripe/portal  { orgId }  → { url } (Stripe Billing Portal URL)
// Self-serve management: upgrade / downgrade / cancel / update card. Caller must
// administer the org and the org must already have a Stripe customer.
import { type Env, stripeClient, requireOrgAdmin, appOrigin, json } from "./_shared";

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const orgId = body.orgId;
  if (!orgId) return json({ error: "orgId is required" }, 400);

  const gate = await requireOrgAdmin(env, request, orgId);
  if ("error" in gate) return gate.error;

  const customerId = gate.org.stripe_customer_id as string | null;
  if (!customerId) return json({ error: "No billing account yet — upgrade first." }, 400);

  const stripe = stripeClient(env);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appOrigin(env, request)}/app/org`,
  });

  return json({ url: session.url });
};
