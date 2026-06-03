# CASCADE-EPC

> Plan it. Track it. CASCADE it.

A hierarchical EPC execution tracker for substation / transmission / industrial
projects: WBS planning, volume-weighted progress rollup, physical dependency &
blocker awareness, linked-node mirroring, QA/HSE gates, client-ready PDF
reports, and a SCADA/HMI-grade UI.

## Stack

- **Front-end:** React + Vite + TypeScript + Tailwind CSS (static SPA)
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime), region `ap-south-1`
- **Reports:** jsPDF + jspdf-autotable
- **Tree DnD:** dnd-kit · **State:** Zustand
- **Hosting:** Cloudflare Pages (free tier) → `cascade-epc.com`

## Develop

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev                  # http://localhost:5173
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript only |
| `npm run test` | Vitest unit tests (domain logic) |
| `npm run e2e` | Playwright end-to-end |

## Layout

```
src/
  lib/        supabase client, env, types, domain logic, pdf builders
  store/      zustand slices (ui/theme, auth, tree, selection, filters)
  components/ shared UI primitives (Brand, ThemeToggle, ...)
  pages/      route-level screens
  features/   wbs, notes, reports, snapshots, ... (added per phase)
supabase/
  migrations/ schema + RLS + RPCs
public/brand/ logo mark, app icon, Orbitron font
```

Build proceeds in dependency-ordered phases P0–P14 (see the project plan).

## Testing

**Unit (Vitest)** — pure domain logic: weighted rollup, display status / gate-clearing /
due-state, dependency + tree cycle guards, linked-cluster rules, bulk classification,
filters, and the permission matrix.

```bash
npm run test          # 24 tests, no backend needed
```

**End-to-end (Playwright)** — `e2e/`, two viewports (`desktop`, `mobile`). Split in two:

- `e2e/public/**` — landing, routing, theme persistence, About/help, auth screens,
  responsive overflow. **Run with zero configuration** (the dev server starts automatically):

  ```bash
  npx playwright install chromium   # one-time
  npm run e2e
  ```

- `e2e/app/**` — live end-to-end against a **throwaway Supabase TEST project**. These
  **skip automatically** unless you provide a pre-confirmed test user. To run them, start
  the dev server with `.env.local` pointed at the test project, then:

  ```bash
  E2E_TEST_EMAIL=tester@example.com E2E_TEST_PASSWORD=... npm run e2e
  ```

CI runs build + unit + the backend-free E2E on every push
(`.github/workflows/ci.yml`).
