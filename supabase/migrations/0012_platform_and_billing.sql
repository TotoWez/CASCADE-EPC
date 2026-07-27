-- ============================================================================
-- CASCADE-EPC · 0012 · Platform owner console + Stripe billing + hardening
--
-- Adds the columns and privileged RPCs behind the in-app platform-owner console
-- and Stripe self-serve billing, and closes a privilege-escalation gap:
-- `orgs_update` (0003) has no column restriction, so a customer's org admin
-- could set their own `subscription_tier` and upgrade for free. We lock the
-- billing/plan columns with a trigger (same pattern as 0010's platform_role),
-- so only the service-role webhook, the SQL editor, or a SECURITY DEFINER RPC
-- may change them.
--
-- Also retiers the plan catalog to free / pro / pro_max (AED, flat per
-- workspace) to match src/lib/plans.ts, switching the attachment-storage limit
-- from GB to MB (Free is 300 MB, not a whole GB).
-- ============================================================================

-- ---- New columns on organizations ------------------------------------------
alter table organizations
  add column if not exists suspended             boolean not null default false,
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text,
  add column if not exists current_period_end     timestamptz;

-- Normalise any legacy placeholder tiers (team/business/enterprise) to free so
-- plan_limits() below resolves them predictably. Safe: no paying orgs exist yet.
update organizations set subscription_tier = 'free'
  where subscription_tier not in ('free', 'pro', 'pro_max');

-- ---- Security: lock billing / plan columns from customers -------------------
-- BEFORE-UPDATE trigger. RLS cannot compare OLD vs NEW, so a trigger enforces
-- it. service_role (webhook) and postgres (SQL editor / SECURITY DEFINER RPCs)
-- run as roles other than 'authenticated'/'anon', so they bypass this.
create or replace function lock_billing_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.subscription_tier     is distinct from old.subscription_tier
    or new.stripe_customer_id     is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.subscription_status    is distinct from old.subscription_status
    or new.current_period_end     is distinct from old.current_period_end
    or new.suspended              is distinct from old.suspended
  ) then
    raise exception 'Billing / plan fields are managed by the platform and cannot be changed here';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_billing on organizations;
create trigger trg_lock_billing before update on organizations
  for each row execute function lock_billing_columns();

-- ---- Retier plan_limits() (mirrors src/lib/plans.ts — keep in sync) ---------
-- Storage is now expressed in MB (storage_mb) so sub-GB tiers work.
create or replace function plan_limits(p_tier text)
returns jsonb language sql immutable as $$
  select case lower(coalesce(p_tier, 'free'))
    when 'pro' then jsonb_build_object(
      'projects', 5,  'nodes_per_project', 5000,  'members', 50,
      'storage_mb', 2048, 'snapshots', 50)
    when 'pro_max' then jsonb_build_object(
      'projects', 12, 'nodes_per_project', 12000, 'members', 120,
      'storage_mb', 5120, 'snapshots', 120)
    else jsonb_build_object(  -- free (and any unknown tier: safe default)
      'projects', 1,  'nodes_per_project', 300,   'members', 3,
      'storage_mb', 300, 'snapshots', 5)
  end;
$$;

-- ---- Re-issue attachment validation against storage_mb ---------------------
-- Identical to 0011 except the org storage cap now reads storage_mb (MB, not GB).
create or replace function validate_attachment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_cap_mb int; v_used bigint; v_per_note int;
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
  v_cap_mb := (plan_limits(org_tier(v_org)) ->> 'storage_mb')::int;
  if v_cap_mb is not null then
    select coalesce(sum(a.size), 0) into v_used
      from note_attachments a join projects p on p.id = a.project_id
      where p.org_id = v_org;
    if v_used + new.size > v_cap_mb::bigint * 1024 * 1024 then
      raise exception 'Plan limit reached: your plan includes % MB of attachment storage. Upgrade at /pricing.', v_cap_mb;
    end if;
  end if;
  return new;
end;
$$;
-- Trigger already created in 0011; the function body is swapped above.

-- ---- Suspend enforcement ----------------------------------------------------
-- A suspended org loses ALL project-scoped access through the keystone helper
-- auth_project_role() (every node/note/gate/dependency/snapshot/membership/
-- category/activity policy routes through it). Platform staff always bypass.
-- The org shell (organizations/org_members SELECT) stays visible so the app can
-- render a "suspended" notice. Re-issued from 0002 with the suspended branch.
create or replace function org_suspended(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select suspended from organizations where id = p_org), false);
$$;
grant execute on function org_suspended(uuid) to authenticated;

create or replace function auth_project_role(p_project uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when is_platform_staff() then 'developer'
    when exists (
      select 1 from projects pr
      join organizations o on o.id = pr.org_id
      where pr.id = p_project and o.suspended
    ) then null  -- suspended org: no effective role → all project policies fail
    when exists (
      select 1 from projects pr
      join org_members om on om.org_id = pr.org_id
      where pr.id = p_project and om.user_id = auth.uid() and om.org_role = 'admin'
    ) then 'admin'
    else (
      select m.role::text from memberships m
      where m.project_id = p_project and m.user_id = auth.uid()
    )
  end;
$$;

-- ---- Platform-owner RPCs (SECURITY DEFINER, gated to platform staff) --------
-- One aggregated read for the console (avoids frontend N+1), plus guarded
-- mutators for tier and suspend that bypass the lock trigger legitimately.

create or replace function platform_overview()
returns table (
  org_id               uuid,
  name                 text,
  tier                 text,
  suspended            boolean,
  created_at           timestamptz,
  owner_email          text,
  subscription_status  text,
  current_period_end   timestamptz,
  projects             int,
  members              int,
  nodes                int,
  snapshots            int,
  storage_bytes        bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_staff() then
    raise exception 'Not authorized';
  end if;
  return query
  select
    o.id, o.name, o.subscription_tier, o.suspended, o.created_at,
    p.email, o.subscription_status, o.current_period_end,
    (select count(*)::int from projects pr where pr.org_id = o.id),
    (select count(distinct m.user_id)::int
       from memberships m join projects pr on pr.id = m.project_id where pr.org_id = o.id),
    (select count(*)::int
       from nodes n join projects pr on pr.id = n.project_id where pr.org_id = o.id),
    (select count(*)::int
       from snapshots s join projects pr on pr.id = s.project_id where pr.org_id = o.id),
    (select coalesce(sum(a.size), 0)::bigint
       from note_attachments a join projects pr on pr.id = a.project_id where pr.org_id = o.id)
  from organizations o
  left join profiles p on p.id = o.created_by
  order by o.created_at desc;
end;
$$;
grant execute on function platform_overview() to authenticated;

create or replace function platform_set_tier(p_org uuid, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_staff() then raise exception 'Not authorized'; end if;
  if lower(p_tier) not in ('free', 'pro', 'pro_max') then
    raise exception 'Unknown tier: %', p_tier;
  end if;
  update organizations set subscription_tier = lower(p_tier) where id = p_org;
end;
$$;
grant execute on function platform_set_tier(uuid, text) to authenticated;

create or replace function platform_set_suspended(p_org uuid, p_val boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_staff() then raise exception 'Not authorized'; end if;
  update organizations set suspended = p_val where id = p_org;
end;
$$;
grant execute on function platform_set_suspended(uuid, boolean) to authenticated;
