-- ============================================================================
-- CASCADE-EPC · 0014 · Refresh plan limits (attachments + snapshots)
--
-- Updates the per-tier caps to the current catalog. Mirrors src/lib/plans.ts.
-- Only attachment storage (MB) and snapshot history changed; projects / nodes /
-- seats are unchanged. The existing BEFORE-INSERT triggers (0011) and the
-- attachment validator (0012) read plan_limits(), so re-defining the function is
-- all that's needed — no trigger changes.
--
--   Tier      projects  nodes/proj  seats  storage_mb  snapshots
--   free            1        300        3        30          10
--   pro             5       5000       50       200         100
--   pro_max        12      12000      120       500         250
-- ============================================================================
create or replace function plan_limits(p_tier text)
returns jsonb language sql immutable as $$
  select case lower(coalesce(p_tier, 'free'))
    when 'pro' then jsonb_build_object(
      'projects', 5,  'nodes_per_project', 5000,  'members', 50,
      'storage_mb', 200, 'snapshots', 100)
    when 'pro_max' then jsonb_build_object(
      'projects', 12, 'nodes_per_project', 12000, 'members', 120,
      'storage_mb', 500, 'snapshots', 250)
    else jsonb_build_object(  -- free (and any unknown tier: safe default)
      'projects', 1,  'nodes_per_project', 300,   'members', 3,
      'storage_mb', 30, 'snapshots', 10)
  end;
$$;
