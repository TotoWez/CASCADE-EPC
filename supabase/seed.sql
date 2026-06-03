-- ============================================================================
-- CASCADE-EPC · dev seed
-- Attaches a demo organization, project, and WBS tree to the FIRST profile.
-- Sign up once in the app, then run this (SQL editor or `supabase db reset`).
-- ============================================================================
do $$
declare
  v_uid uuid;
  v_org uuid;
  v_proj uuid;
  v_root uuid;
  v_civil uuid;
  v_elec uuid;
  v_found uuid;
  v_excav uuid;
begin
  select id into v_uid from profiles order by created_at limit 1;
  if v_uid is null then
    raise notice 'No profile found — sign up in the app first, then re-run seed.sql';
    return;
  end if;

  insert into organizations (name, slug, created_by)
  values ('Demo Power Co', 'demo-power', v_uid)
  returning id into v_org;
  insert into org_members (org_id, user_id, org_role) values (v_org, v_uid, 'admin')
    on conflict (org_id, user_id) do nothing;

  insert into projects (org_id, code, name, client, consultant, contractor, project_manager_id,
                        start_date, end_date)
  values (v_org, 'SS-220KV', '220kV Grid Substation', 'TRANSCO', 'Consultant X', 'EPC Contractor',
          v_uid, current_date - 30, current_date + 120)
  returning id into v_proj;
  insert into memberships (project_id, user_id, role) values (v_proj, v_uid, 'manager')
    on conflict (project_id, user_id) do nothing;

  insert into categories (project_id, name, color) values
    (v_proj, 'general', null), (v_proj, 'civil', '#E07C00'), (v_proj, 'electrical', '#0057FF')
    on conflict (project_id, name) do nothing;

  -- Root
  insert into nodes (project_id, node_code, parent_id, title, category, volume, order_index)
  values (v_proj, 'NODE-1000', null, '220kV Grid Substation', 'root', 5, 0)
  returning id into v_root;

  -- Civil branch
  insert into nodes (project_id, node_code, parent_id, title, category, volume, priority, order_index)
  values (v_proj, 'NODE-1100', v_root, 'Civil Works', 'civil', 6, 1, 0)
  returning id into v_civil;

  insert into nodes (project_id, node_code, parent_id, title, category, volume, priority,
                     work_status, progress, start_date, due_date, order_index)
  values (v_proj, 'NODE-1110', v_civil, 'Site Excavation', 'civil', 4, 1,
          'done', 100, current_date - 25, current_date - 10, 0)
  returning id into v_excav;

  insert into nodes (project_id, node_code, parent_id, title, category, volume, priority,
                     work_status, progress, start_date, due_date, order_index)
  values (v_proj, 'NODE-1120', v_civil, 'Foundations', 'civil', 6, 1,
          'on_progress', 45, current_date - 8, current_date + 6, 1)
  returning id into v_found;

  -- Electrical branch
  insert into nodes (project_id, node_code, parent_id, title, category, volume, priority, order_index)
  values (v_proj, 'NODE-1200', v_root, 'Electrical Works', 'electrical', 8, 2, 1)
  returning id into v_elec;

  insert into nodes (project_id, node_code, parent_id, title, category, volume, priority,
                     work_status, progress, due_date, order_index)
  values
    (v_proj, 'NODE-1210', v_elec, 'Transformer Installation', 'electrical', 7, 1,
     'not_started', 0, current_date + 30, 0),
    (v_proj, 'NODE-1220', v_elec, 'Switchgear & Busbars', 'electrical', 5, 2,
     'not_started', 0, current_date + 45, 1),
    (v_proj, 'NODE-1230', v_elec, 'Control & Protection', 'electrical', 4, 3,
     'not_started', 0, current_date + 60, 2);

  -- Transformer install depends on Foundations being done → starts blocked.
  insert into node_dependencies (project_id, node_id, depends_on_node_id)
  select v_proj, n.id, v_found from nodes n where n.node_code = 'NODE-1210' and n.project_id = v_proj;

  insert into notes (project_id, node_id, source, text, checked, created_by)
  values (v_proj, v_found, 'site', 'Rebar inspection pending before pour.', false, v_uid);

  raise notice 'Seed complete for project SS-220KV.';
end
$$;
