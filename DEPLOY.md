# Deploying CASCADE-EPC (free tier)

Static front-end on **Cloudflare Pages** + **Supabase** backend.

## 1. Supabase (backend)

1. Create a project at [supabase.com](https://supabase.com) — region **`ap-south-1` (Mumbai)**.
2. Apply the migrations in `supabase/migrations/0001…0005` (SQL editor in order, or
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
