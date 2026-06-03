-- ============================================================================
-- CASCADE-EPC · 0002 · Functions, helpers & trigger bodies
-- All role helpers are SECURITY DEFINER so they can read membership tables
-- without tripping RLS recursion. search_path pinned to public for safety.
-- ============================================================================

-- ---- Platform / org / project role resolution ------------------------------

create or replace function is_platform_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and platform_role is not null);
$$;

create or replace function is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_staff()
      or exists (
        select 1 from org_members
        where org_id = p_org and user_id = auth.uid() and org_role = 'admin'
      );
$$;

-- Effective role for a project: developer (platform) > admin (org) > membership role.
create or replace function auth_project_role(p_project uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when is_platform_staff() then 'developer'
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

-- ---- Node edit-scope checks ------------------------------------------------
-- Manager+ : any node. Engineer: nodes in a subtree assigned to them.
-- Supervisor: only directly-assigned nodes. QAQC/HSE/Viewer: no work edits.
create or replace function can_edit_node(p_node uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_proj uuid;
  v_role text;
  v_uid  uuid := auth.uid();
begin
  select project_id into v_proj from nodes where id = p_node;
  if v_proj is null then return false; end if;

  v_role := auth_project_role(v_proj);
  if v_role is null then return false; end if;
  if v_role in ('developer', 'admin', 'manager') then return true; end if;

  if v_role = 'engineer' then
    return exists (
      with recursive chain as (
        select id, parent_id, assigned_user_id from nodes where id = p_node
        union all
        select n.id, n.parent_id, n.assigned_user_id
        from nodes n join chain c on n.id = c.parent_id
      )
      select 1 from chain where assigned_user_id = v_uid
    );
  end if;

  if v_role = 'supervisor' then
    return exists (select 1 from nodes where id = p_node and assigned_user_id = v_uid);
  end if;

  return false;
end;
$$;

-- Can the caller add a child under p_parent (null = root) in this project?
create or replace function can_add_child(p_parent uuid, p_project uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text := auth_project_role(p_project);
begin
  if v_role in ('developer', 'admin', 'manager') then return true; end if;
  if v_role = 'engineer' and p_parent is not null then
    return can_edit_node(p_parent);
  end if;
  return false;
end;
$$;

-- ---- Weighted progress rollup (mirror of src/lib/domain/rollup.ts) ---------
-- Leaf = its own progress. Parent = round(Σ(childEff × clamp(vol,1,10)) / Σw).
create or replace function node_effective_progress(p_node uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_child record;
  v_total_w numeric := 0;
  v_acc numeric := 0;
  v_w numeric;
  v_has_child boolean := false;
  v_leaf int;
begin
  for v_child in select id, volume from nodes where parent_id = p_node loop
    v_has_child := true;
    v_w := least(greatest(v_child.volume, 1), 10);
    v_total_w := v_total_w + v_w;
    v_acc := v_acc + node_effective_progress(v_child.id) * v_w;
  end loop;

  if not v_has_child then
    select progress into v_leaf from nodes where id = p_node;
    return coalesce(v_leaf, 0);
  end if;
  if v_total_w = 0 then return 0; end if;
  return round(v_acc / v_total_w);
end;
$$;

create or replace function compute_overall_progress(p_project uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_root record;
  v_total_w numeric := 0;
  v_acc numeric := 0;
  v_w numeric;
begin
  for v_root in select id, volume from nodes where project_id = p_project and parent_id is null loop
    v_w := least(greatest(v_root.volume, 1), 10);
    v_total_w := v_total_w + v_w;
    v_acc := v_acc + node_effective_progress(v_root.id) * v_w;
  end loop;
  if v_total_w = 0 then return 0; end if;
  return round(v_acc / v_total_w);
end;
$$;

-- ---- Trigger bodies --------------------------------------------------------

-- Enforce gate ownership regardless of path, stamp who/when, bump updated_at.
create or replace function enforce_gate_authority()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if NEW.qa_gate is distinct from OLD.qa_gate then
    v_role := auth_project_role(NEW.project_id);
    if v_role is null or v_role not in ('qaqc', 'admin', 'developer') then
      raise exception 'Only QAQC, Admin, or Developer may change the QA gate';
    end if;
    NEW.qa_gate_by := auth.uid();
    NEW.qa_gate_at := now();
  end if;

  if NEW.hse_gate is distinct from OLD.hse_gate then
    v_role := auth_project_role(NEW.project_id);
    if v_role is null or v_role not in ('hse', 'admin', 'developer') then
      raise exception 'Only HSE, Admin, or Developer may change the HSE gate';
    end if;
    NEW.hse_gate_by := auth.uid();
    NEW.hse_gate_at := now();
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at := now(); return NEW; end;
$$;

-- Cap activity at 500 rows per project (statement-level, uses transition table).
create or replace function prune_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from activity a
  using (
    select id, row_number() over (partition by project_id order by id desc) as rn
    from activity
    where project_id in (select distinct project_id from new_rows)
  ) ranked
  where a.id = ranked.id and ranked.rn > 500;
  return null;
end;
$$;

-- Auto-create a profile row when an auth user is created.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
