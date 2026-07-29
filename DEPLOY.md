# Deploying CASCADE-EPC (free tier)

Static front-end on **Cloudflare Pages** + **Supabase** backend.

## 1. Supabase (backend)

1. Create a project at [supabase.com](https://supabase.com) — region **`ap-south-1` (Mumbai)**.
2. Apply the migrations in `supabase/migrations/0001…0014` (SQL editor in order, or
   `supabase db push`). See [`supabase/README.md`](supabase/README.md).
3. **Database → Extensions:** enable `pg_cron` to activate the daily auto-snapshot
   and the inactivity keep-alive jobs.
4. **Auth → URL configuration:** set Site URL and add redirect URLs:
   - `http://localhost:5173` (dev)
   - `https://cascade-epc.com` and your `*.pages.dev` preview URL
   Enable **email confirmations**.
5. Copy the project **URL** and **anon key** (Project Settings → API).

## 2. Cloudflare Pages (front-end)

1. Push this repo to GitHub/GitLab, then in Cloudflare → **Pages → Create** → connect it.
2. Build settings:
   - **Framework preset:** None / Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. **Environment variables** (Production + Preview):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Deploy. SPA routing is handled by [`public/_redirects`](public/_redirects)
   (`/* /index.html 200`).

## 3. Custom domain

Point **`cascade-epc.com`** at the Pages project (Pages → Custom domains). Cloudflare
issues the TLS certificate automatically. Add the domain to Supabase Auth redirect URLs.

## 4. Free-tier notes

- Supabase free pauses after ~7 days inactivity → the `cascade-keepalive` cron ping
  mitigates this (needs `pg_cron` enabled).
- Limits: 500 MB DB · 1 GB Storage (attachment cap 25 MiB) · 50k MAU. Track usage from
  the Admin **Org settings** page.
- Cloudflare Pages free: unlimited requests, 500 builds/month.

## Local development

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Ops (production)

- **Backups:** Supabase free tier has no point-in-time recovery. Weekly habit:
  open each active project → Control → **Export WBS (JSON)** and keep the file
  (attachments live in Storage; re-download anything critical). For a full DB
  dump use Supabase Dashboard → Database → Backups, or `pg_dump` via the
  connection string.
- **Uptime monitoring:** add a free ping on `https://cascade-epc.com/` (e.g.
  UptimeRobot, 5-min interval) so you learn about outages before users do.
- **Error monitoring:** create a free Sentry project and set `VITE_SENTRY_DSN`
  in Cloudflare Pages env (Production) — the app only loads Sentry when the
  var is present.
- **Plan limits** are enforced in the database (migrations `0011`/`0012`): projects /
  member seats / nodes-per-project / snapshot history / attachment size + MIME
  + org storage, per `organizations.subscription_tier` (default `free`). Tiers are
  `free` / `pro` / `pro_max` (AED, flat monthly) — see [`src/lib/plans.ts`](src/lib/plans.ts).

## 5. Platform owner console

You (the platform owner) oversee every customer from **`/app/platform`** — a page
that only appears for accounts whose `profiles.platform_role` is set. Grant yourself
access once, in the Supabase SQL editor:

```sql
update profiles set platform_role = 'owner' where email = 'you@example.com';
```

The console lists every workspace with its plan, owner email, usage vs caps, and a
suspend toggle, and lets you change any customer's plan by hand (no Stripe needed).
Suspending a workspace revokes all project access immediately (enforced in
`auth_project_role`, migration `0012`).

## 6. Stripe billing (optional — enables self-serve paid plans)

Payments run on **Cloudflare Pages Functions** in [`functions/api/stripe/`](functions/api/stripe)
— no separate server. Until you add the secrets below, the endpoints simply return
errors and the app stays free/manual; nothing breaks.

1. **Stripe → Products:** create two recurring **AED** prices:
   - **Pro** — 60 AED / month · **Pro Max** — 120 AED / month.
   Copy each **Price ID** (`price_…`).
2. **Cloudflare Pages → Settings → Environment variables** (Production; add to Preview
   for test keys). These are **server-only — do NOT prefix with `VITE_`**:
   - `STRIPE_SECRET_KEY` — Stripe secret key (`sk_test_…` first)
   - `STRIPE_WEBHOOK_SECRET` — from step 4
   - `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_MAX` — the two Price IDs
   - `SUPABASE_URL` — same as `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API → **service_role** key
     (secret; the webhook uses it to set tiers, bypassing the customer-facing lock)
   - *(optional)* `APP_URL` — canonical origin for redirect URLs (else derived from
     the request)
3. **Compatibility:** if the functions error on deploy, set the Pages project's
   **Compatibility flags** to include `nodejs_compat`.
4. **Stripe → Developers → Webhooks:** add endpoint
   `https://cascade-epc.com/api/stripe/webhook`, subscribe to
   `checkout.session.completed` and `customer.subscription.*`, then copy the
   **Signing secret** into `STRIPE_WEBHOOK_SECRET` and redeploy.
5. **Verify** the webhook route isn't shadowed by the SPA fallback:
   `curl -i https://cascade-epc.com/api/stripe/webhook` should return **400**
   ("Missing signature") — a **200 HTML** page means the Function didn't match.
6. **Test mode first:** upgrade from **Org settings → Billing**, pay with card
   `4242 4242 4242 4242`, and confirm the plan flips on `/app/platform`. Switch to
   live keys only once that round-trips.
