-- ============================================================================
-- CASCADE-EPC · 0006 · Realtime
-- Add the live-collaboration tables to the `supabase_realtime` publication so
-- postgres_changes streams INSERT/UPDATE/DELETE to subscribed clients. RLS is
-- still enforced — a client only receives changes for rows it may SELECT.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['nodes', 'node_dependencies', 'notes', 'note_attachments', 'activity', 'memberships', 'snapshots']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- UPDATE/DELETE realtime payloads need the full old row for diffing.
alter table nodes replica identity full;
alter table node_dependencies replica identity full;
alter table notes replica identity full;
