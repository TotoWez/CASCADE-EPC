# CASCADE-EPC · Supabase backend

Multi-tenant Postgres schema with Row-Level Security and SECURITY DEFINER RPCs.

## Migrations (apply in order)

| File | Contents |
|---|---|
| `0001_schema.sql` | Extensions, enums, tables, indexes |
| `0002_functions.sql` | Role resolution, edit-scope checks, weighted rollup, trigger bodies |
| `0003_rls.sql` | Enable RLS + all policies |
| `0004_rpcs.sql` | Triggers + RPCs (gates, invites, bulk, snapshots, signup) |
| `0005_storage_cron.sql` | Storage buckets + policies, daily auto-snapshot, keep-alive |
| `0006_realtime.sql` | Add live-collaboration tables to the `supabase_realtime` publication |
| `0007_fix_rls_recursion.sql` | Fix RLS recursion (42P17) on profiles/organizations/org_members via SECURITY DEFINER helpers |
| `0008_fix_project_insert_and_slug.sql` | Fix project-creation WITH CHECK (re-create is_org_admin) + drop global-unique org slug |
| `0009_fix_projects_select.sql` | Fix project INSERT…RETURNING read-back (projects_select no longer self-queries projects) |
| `0010_lock_platform_role.sql` | **Security:** trigger blocking users from self-setting `platform_role` (privilege escalation) |
| `seed.sql` | Optional demo org/project/WBS (attaches to first profile) |

## Apply to a hosted project (free tier)

1. Create a project at supabase.com — **region `ap-south-1` (Mumbai)**.
2. Copy the project URL + anon key into the app's `.env.local`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Apply migrations either way:
   - **SQL editor:** paste each `00xx_*.sql` in order and run; or
   - **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
4. **Database → Extensions:** enable `pg_cron` (and `pg_net` if you later move
   auto-snapshot to an Edge Function) to activate the scheduled jobs.
5. **Auth → URL config:** add `https://cascade-epc.com` and your Pages preview
   URL to redirect URLs. Enable email confirmations.

## Security model

- **RLS** keys on `auth_project_role(project_id)` — `developer` (platform) >
  `admin` (org) > the per-project `memberships.role`.
- **Gates** are column-sensitive: `enforce_gate_authority()` rejects QA changes
  from non-QAQC and HSE changes from non-HSE (Admin/Developer always allowed),
  regardless of path. `set_qa_gate` / `set_hse_gate` RPCs provide the interface
  and stamp who/when.
- **Edit scope:** `can_edit_node()` — Manager+ any node; Engineer within a
  subtree assigned to them; Supervisor only directly-assigned nodes.
- **Cross-role writes** (role-scoped invites, one-entry bulk edits, snapshots,
  clear-activity) go through SECURITY DEFINER RPCs that re-check `auth.uid()`.

## Free-tier notes

- Project pauses after ~7 days inactivity → the `cascade-keepalive` cron ping
  mitigates this once `pg_cron` is enabled.
- Limits: 500 MB DB, 1 GB Storage (attachment cap 25 MiB in `config.toml`),
  50k MAU. Watch usage from the Admin org page (P3).
