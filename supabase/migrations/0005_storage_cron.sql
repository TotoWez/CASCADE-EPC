-- ============================================================================
-- CASCADE-EPC · 0005 · Storage buckets + policies, and scheduled jobs
-- ============================================================================

-- ---- Buckets ---------------------------------------------------------------
-- attachments: private (note/RFI files). Path = {project_id}/{note_id}/{file}
-- branding:    public  (org + project logos).    Path = {org_id}/...
-- avatars:     public  (profile photos).          Path = {user_id}/...
insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('branding', 'branding', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---- attachments (private; scoped to project membership) -------------------
create policy "attachments read" on storage.objects for select using (
  bucket_id = 'attachments'
  and auth_project_role(((storage.foldername(name))[1])::uuid) is not null
);
create policy "attachments write" on storage.objects for insert with check (
  bucket_id = 'attachments'
  and can_add_note(((storage.foldername(name))[1])::uuid)
);
create policy "attachments delete" on storage.objects for delete using (
  bucket_id = 'attachments'
  and auth_project_role(((storage.foldername(name))[1])::uuid) in ('developer', 'admin', 'manager', 'engineer')
);

-- ---- branding (public read; org-admin write) -------------------------------
create policy "branding read" on storage.objects for select using (bucket_id = 'branding');
create policy "branding write" on storage.objects for insert with check (
  bucket_id = 'branding' and is_org_admin(((storage.foldername(name))[1])::uuid)
);
create policy "branding update" on storage.objects for update using (
  bucket_id = 'branding' and is_org_admin(((storage.foldername(name))[1])::uuid)
);
create policy "branding delete" on storage.objects for delete using (
  bucket_id = 'branding' and is_org_admin(((storage.foldername(name))[1])::uuid)
);

-- ---- avatars (public read; owner write) ------------------------------------
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars write" on storage.objects for insert with check (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);
create policy "avatars update" on storage.objects for update using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);
create policy "avatars delete" on storage.objects for delete using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);

-- ---- Daily auto-snapshot for opted-in projects -----------------------------
create or replace function auto_snapshot_all()
returns int language plpgsql security definer set search_path = public as $$
declare v_proj record; v_n int := 0; v_state jsonb; v_overall numeric; v_count int;
begin
  for v_proj in select id from projects where coalesce((settings ->> 'autoSnapshot')::boolean, false) loop
    v_overall := compute_overall_progress(v_proj.id);
    select count(*) into v_count from nodes where project_id = v_proj.id;
    v_state := jsonb_build_object(
      'nodes',        (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) from nodes n where n.project_id = v_proj.id),
      'dependencies', (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from node_dependencies d where d.project_id = v_proj.id),
      'notes',        (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from notes x where x.project_id = v_proj.id)
    );
    insert into snapshots (project_id, name, overall_progress, node_count, state, is_auto)
    values (v_proj.id, to_char(now(), 'YYYY-MM-DD') || ' (auto)', v_overall, v_count, v_state, true);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---- Schedule (best-effort: only if pg_cron is enabled) --------------------
-- Enable pg_cron in the Supabase dashboard (Database → Extensions) to activate.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Daily snapshot at 00:05 UTC.
    perform cron.schedule('cascade-auto-snapshot', '5 0 * * *', $cron$ select auto_snapshot_all(); $cron$);
    -- Keep-alive every 6h so the free-tier project does not pause on inactivity.
    perform cron.schedule('cascade-keepalive', '0 */6 * * *', $cron$ select 1; $cron$);
  end if;
end
$do$;
