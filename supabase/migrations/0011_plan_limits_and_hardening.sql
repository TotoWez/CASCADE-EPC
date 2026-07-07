-- CASCADE-EPC · 0011 · Plan-limit enforcement + upload validation + invite race fix
-- The pricing page (src/lib/plans.ts) promises per-tier limits; until now nothing
-- enforced them. The DB is the source of truth: BEFORE-INSERT triggers raise
-- friendly exceptions the client surfaces via errMessage(). Also validates
-- attachment size/MIME server-side and makes accept_invitation concurrency-safe.

-- ---- Tier limits (mirrors src/lib/plans.ts — keep in sync) ------------------
create or replace function plan_limits(p_tier text)
returns jsonb language sql immutable as $$
  select case lower(coalesce(p_tier, 'free'))
    when 'team' then jsonb_build_object(
      'projects', 25,  'nodes_per_project', 5000,  'members', 25,
      'storage_gb', 25, 'snapshots', 90)
    when 'business' then jsonb_build_object(
      'projects', 150, 'nodes_per_project', 20000, 'members', 100,
      'storage_gb', 100, 'snapshots', null)
    when 'enterprise' then jsonb_build_object(
      'projects', null, 'nodes_per_project', null, 'members', null,
      'storage_gb', null, 'snapshots', null)
    else jsonb_build_object(  -- free (and any unknown tier: safe default)
      'projects', 3,   'nodes_per_project', 500,   'members', 5,
      'storage_gb', 1,  'snapshots', 10)
  end;
$$;

-- Tier of the org that owns a project.
create or replace function org_tier(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select subscription_tier from organizations where id = p_org;
$$;

-- ---- Projects per org -------------------------------------------------------
create or replace function enforce_project_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap int; v_count int;
begin
  v_cap := (plan_limits(org_tier(new.org_id)) ->> 'projects')::int;
  if v_cap is not null then
    select count(*) into v_count from projects where org_id = new.org_id;
    if v_count >= v_cap then
      raise exception 'Plan limit reached: your plan allows % project(s). Upgrade at /pricing.', v_cap;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_limit on projects;
create trigger trg_project_limit before insert on projects
  for each row execute function enforce_project_limit();

-- ---- Nodes per project ------------------------------------------------------
create or replace function enforce_node_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap int; v_count int;
begin
  select (plan_limits(org_tier(p.org_id)) ->> 'nodes_per_project')::int
    into v_cap from projects p where p.id = new.project_id;
  if v_cap is not null then
    select count(*) into v_count from nodes where project_id = new.project_id;
    if v_count >= v_cap then
      raise exception 'Plan limit reached: your plan allows % nodes per project. Upgrade at /pricing.', v_cap;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_node_limit on nodes;
create trigger trg_node_limit before insert on nodes
  for each row execute function enforce_node_limit();

-- ---- Seats (distinct project members across the org) ------------------------
create or replace function enforce_member_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_cap int; v_count int;
begin
  select org_id into v_org from projects where id = new.project_id;
  v_cap := (plan_limits(org_tier(v_org)) ->> 'members')::int;
  if v_cap is not null then
    select count(distinct m.user_id) into v_count
      from memberships m join projects p on p.id = m.project_id
      where p.org_id = v_org;
    -- Re-inviting an existing member must not count as a new seat.
    if v_count >= v_cap and not exists (
      select 1 from memberships m join projects p on p.id = m.project_id
      where p.org_id = v_org and m.user_id = new.user_id
    ) then
      raise exception 'Plan limit reached: your plan allows % member seat(s). Upgrade at /pricing.', v_cap;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_member_limit on memberships;
create trigger trg_member_limit before insert on memberships
  for each row execute function enforce_member_limit();

-- ---- Snapshot history: rolling window (keeps cron + manual saves working) ---
create or replace function enforce_snapshot_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap int;
begin
  select (plan_limits(org_tier(p.org_id)) ->> 'snapshots')::int
    into v_cap from projects p where p.id = new.project_id;
  if v_cap is not null then
    -- Trim oldest (auto first) so the new snapshot fits inside the cap.
    delete from snapshots where id in (
      select id from snapshots
      where project_id = new.project_id
      order by is_auto desc, taken_at asc
      offset greatest(v_cap - 1, 0)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_limit on snapshots;
create trigger trg_snapshot_limit before insert on snapshots
  for each row execute function enforce_snapshot_limit();

-- ---- Attachment validation (size, MIME, per-note count, org storage cap) ----
create or replace function validate_attachment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_cap_gb int; v_used bigint; v_per_note int;
begin
  if new.size is null or new.size <= 0 or new.size > 10 * 1024 * 1024 then
    raise exception 'Attachments are limited to 10 MB.';
  end if;
  if new.mime is null or new.mime !~* '^(image/(png|jpe?g|gif|webp|svg\+xml)|application/pdf|application/(zip|x-zip-compressed)|application/vnd\.(openxmlformats-officedocument|ms-excel|ms-powerpoint|ms-word)[a-z0-9.\-]*|application/msword|text/(plain|csv))$' then
    raise exception 'File type "%" is not allowed. Use images, PDF, Office documents, text/CSV or ZIP.', coalesce(new.mime, 'unknown');
  end if;
  select count(*) into v_per_note from note_attachments where note_id = new.note_id;
  if v_per_note >= 10 then
    raise exception 'A note can hold at most 10 attachments.';
  end if;
  select p.org_id into v_org from projects p where p.id = new.project_id;
  v_cap_gb := (plan_limits(org_tier(v_org)) ->> 'storage_gb')::int;
  if v_cap_gb is not null then
    select coalesce(sum(a.size), 0) into v_used
      from note_attachments a join projects p on p.id = a.project_id
      where p.org_id = v_org;
    if v_used + new.size > v_cap_gb::bigint * 1024 * 1024 * 1024 then
      raise exception 'Plan limit reached: your plan includes % GB of attachment storage. Upgrade at /pricing.', v_cap_gb;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_attachment on note_attachments;
create trigger trg_validate_attachment before insert on note_attachments
  for each row execute function validate_attachment();

-- ---- accept_invitation: lock the row so max_uses can't be raced -------------
create or replace function accept_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv invitations;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_inv from invitations where code = p_code for update;
  if not found then raise exception 'Invalid invitation code'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then raise exception 'Invitation expired'; end if;
  if v_inv.uses >= v_inv.max_uses then raise exception 'Invitation fully used'; end if;

  insert into org_members (org_id, user_id, org_role) values (v_inv.org_id, auth.uid(), 'member')
    on conflict (org_id, user_id) do nothing;

  if v_inv.project_id is not null then
    insert into memberships (project_id, user_id, role, can_comment, invited_by)
    values (v_inv.project_id, auth.uid(), v_inv.role, v_inv.can_comment, v_inv.created_by)
    on conflict (project_id, user_id) do update
      set role = excluded.role, can_comment = excluded.can_comment;
  end if;

  update invitations set uses = uses + 1, accepted_at = coalesce(accepted_at, now()) where id = v_inv.id;
  return v_inv.project_id;
end;
$$;
