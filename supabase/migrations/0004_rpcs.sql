-- ============================================================================
-- CASCADE-EPC · 0004 · Triggers + SECURITY DEFINER RPCs
-- RPCs handle column-sensitive / cross-role / atomic operations that plain
-- RLS cannot express (gate ownership, role-scoped invites, one-entry bulk).
-- ============================================================================

-- ---- Triggers --------------------------------------------------------------
create trigger trg_nodes_gate
  before update on nodes
  for each row execute function enforce_gate_authority();

create trigger trg_notes_updated
  before update on notes
  for each row execute function set_updated_at();

create trigger trg_activity_prune
  after insert on activity
  referencing new table as new_rows
  for each statement execute function prune_activity();

create trigger trg_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- Role-assignment matrix helper -----------------------------------------
create or replace function can_assign_role(p_project uuid, p_target_role project_role)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text := auth_project_role(p_project);
begin
  if v_role in ('developer', 'admin') then return true; end if;
  if v_role = 'manager' then
    return p_target_role in ('engineer', 'supervisor', 'qaqc', 'hse', 'viewer');
  end if;
  if v_role = 'engineer' then
    return p_target_role in ('supervisor', 'viewer');
  end if;
  return false;
end;
$$;

-- ---- Signup: create org + admin membership ---------------------------------
create or replace function bootstrap_org(p_name text, p_slug text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into organizations (name, slug, created_by)
  values (p_name, coalesce(p_slug, lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'))), auth.uid())
  returning id into v_org;
  insert into org_members (org_id, user_id, org_role) values (v_org, auth.uid(), 'admin');
  return v_org;
end;
$$;

-- ---- Activity logging ------------------------------------------------------
create or replace function log_activity(
  p_project uuid, p_type activity_type, p_message text default '',
  p_node uuid default null, p_node_code text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_project_role(p_project) is null then raise exception 'Not a project member'; end if;
  insert into activity (project_id, type, role, actor_id, message, node_id, node_code)
  values (p_project, p_type, auth_project_role(p_project), auth.uid(), coalesce(p_message, ''), p_node, p_node_code);
end;
$$;

-- ---- Gates (sole authority enforced by trigger; RPC stamps + logs) ---------
create or replace function set_qa_gate(p_node uuid, p_value qa_gate)
returns void language plpgsql security definer set search_path = public as $$
declare v_proj uuid; v_code text;
begin
  select project_id, node_code into v_proj, v_code from nodes where id = p_node;
  if v_proj is null then raise exception 'Node not found'; end if;
  update nodes set qa_gate = p_value where id = p_node;       -- trigger checks role
  perform log_activity(v_proj, 'gate', 'QA gate → ' || p_value, p_node, v_code);
end;
$$;

create or replace function set_hse_gate(p_node uuid, p_value hse_gate)
returns void language plpgsql security definer set search_path = public as $$
declare v_proj uuid; v_code text;
begin
  select project_id, node_code into v_proj, v_code from nodes where id = p_node;
  if v_proj is null then raise exception 'Node not found'; end if;
  update nodes set hse_gate = p_value where id = p_node;      -- trigger checks role
  perform log_activity(v_proj, 'gate', 'HSE gate → ' || p_value, p_node, v_code);
end;
$$;

-- ---- Invitations -----------------------------------------------------------
create or replace function create_invitation(
  p_project uuid, p_role project_role, p_email text default null,
  p_can_comment boolean default false, p_expires_at timestamptz default null,
  p_max_uses int default 1
)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_org uuid;
begin
  if not can_assign_role(p_project, p_role) then raise exception 'You may not assign this role'; end if;
  select org_id into v_org from projects where id = p_project;
  v_code := translate(encode(gen_random_bytes(9), 'base64'), '/+=', '_-');
  insert into invitations (org_id, project_id, email, role, code, can_comment, expires_at, max_uses, created_by)
  values (v_org, p_project, p_email, p_role, v_code, coalesce(p_can_comment, false), p_expires_at, coalesce(p_max_uses, 1), auth.uid());
  perform log_activity(p_project, 'assignee', 'Invited ' || p_role || coalesce(' (' || p_email || ')', ''));
  return v_code;
end;
$$;

create or replace function accept_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv invitations;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_inv from invitations where code = p_code;
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

create or replace function assign_member_role(
  p_project uuid, p_user uuid, p_role project_role, p_can_comment boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_assign_role(p_project, p_role) then raise exception 'You may not assign this role'; end if;
  insert into org_members (org_id, user_id, org_role)
    select org_id, p_user, 'member' from projects where id = p_project
    on conflict (org_id, user_id) do nothing;
  insert into memberships (project_id, user_id, role, can_comment, invited_by)
  values (p_project, p_user, p_role, coalesce(p_can_comment, false), auth.uid())
  on conflict (project_id, user_id) do update
    set role = excluded.role, can_comment = excluded.can_comment;
end;
$$;

-- ---- Smart bulk edit (one activity entry for the whole operation) ----------
create or replace function bulk_edit_nodes(p_node_ids uuid[], p_patch jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int; v_proj uuid;
begin
  select project_id into v_proj from nodes where id = any(p_node_ids) limit 1;
  if v_proj is null then return 0; end if;

  update nodes n set
    work_status   = coalesce((p_patch ->> 'work_status')::work_status, n.work_status),
    progress      = coalesce((p_patch ->> 'progress')::smallint, n.progress),
    priority      = coalesce((p_patch ->> 'priority')::smallint, n.priority),
    category      = coalesce(p_patch ->> 'category', n.category),
    assignee_name = coalesce(p_patch ->> 'assignee_name', n.assignee_name),
    start_date    = case when p_patch ? 'start_date' then nullif(p_patch ->> 'start_date', '')::date else n.start_date end,
    due_date      = case when p_patch ? 'due_date'   then nullif(p_patch ->> 'due_date', '')::date   else n.due_date end
  where n.id = any(p_node_ids) and can_edit_node(n.id);

  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform log_activity(v_proj, 'bulk', 'Bulk edit applied to ' || v_count || ' node(s)');
  end if;
  return v_count;
end;
$$;

-- ---- Snapshots -------------------------------------------------------------
create or replace function save_snapshot(p_project uuid, p_name text default null, p_is_auto boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_overall numeric; v_count int; v_state jsonb;
begin
  if auth_project_role(p_project) not in ('developer', 'admin', 'manager', 'engineer') then
    raise exception 'Not allowed to save snapshots';
  end if;
  v_overall := compute_overall_progress(p_project);
  select count(*) into v_count from nodes where project_id = p_project;
  v_state := jsonb_build_object(
    'nodes',        (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) from nodes n where n.project_id = p_project),
    'dependencies', (select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) from node_dependencies d where d.project_id = p_project),
    'notes',        (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from notes x where x.project_id = p_project)
  );
  insert into snapshots (project_id, name, overall_progress, node_count, state, is_auto, created_by)
  values (p_project, coalesce(p_name, to_char(now(), 'YYYY-MM-DD HH24:MI')), v_overall, v_count, v_state, coalesce(p_is_auto, false), auth.uid())
  returning id into v_id;
  perform log_activity(p_project, 'snapshot', 'Snapshot saved (' || v_overall || '%)');
  return v_id;
end;
$$;

create or replace function clear_activity(p_project uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth_project_role(p_project) not in ('developer', 'admin') then raise exception 'Not allowed'; end if;
  delete from activity where project_id = p_project;
end;
$$;

-- ---- Grants ----------------------------------------------------------------
grant execute on function
  bootstrap_org(text, text), log_activity(uuid, activity_type, text, uuid, text),
  set_qa_gate(uuid, qa_gate), set_hse_gate(uuid, hse_gate),
  create_invitation(uuid, project_role, text, boolean, timestamptz, int),
  accept_invitation(text), assign_member_role(uuid, uuid, project_role, boolean),
  bulk_edit_nodes(uuid[], jsonb), save_snapshot(uuid, text, boolean), clear_activity(uuid),
  compute_overall_progress(uuid)
to authenticated;
