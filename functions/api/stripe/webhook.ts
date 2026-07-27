// POST /api/stripe/webhook — Stripe → us. Verifies the signature, then mirrors
// subscription state onto the organization (tier / status / period end) using
// the service-role client. This is the ONLY path that grants a paid tier.
import Stripe from "stripe";
import { type Env, stripeClient, syncSubscription, json } from "./_shared";

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  const sig = request.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing signature" }, 400);

  const payload = await request.text();
  const stripe = stripeClient(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return json({ error: `Invalid signature: ${(err as Error).message}` }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(env, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(env, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Ignored event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Log via the response; Stripe will retry on non-2xx.
    return json({ error: `Handler error: ${(err as Error).message}` }, 500);
  }

  return json({ received: true });
};
