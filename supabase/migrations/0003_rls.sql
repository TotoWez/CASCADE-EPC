-- ============================================================================
-- CASCADE-EPC · 0003 · Row-Level Security
-- Coarse role gates live here; column-sensitive ops (gates) and cross-role
-- writes (invites, bulk) go through SECURITY DEFINER RPCs in 0004.
-- ============================================================================

-- Helper: may the caller add a note to this project? (viewer needs can_comment)
create or replace function can_add_note(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth_project_role(p_project) is null then false
    when auth_project_role(p_project) = 'viewer' then exists (
      select 1 from memberships
      where project_id = p_project and user_id = auth.uid() and can_comment
    )
    else true
  end;
$$;

alter table profiles          enable row level security;
alter table organizations     enable row level security;
alter table org_members       enable row level security;
alter table projects          enable row level security;
alter table memberships       enable row level security;
alter table nodes             enable row level security;
alter table node_dependencies enable row level security;
alter table notes             enable row level security;
alter table note_attachments  enable row level security;
alter table categories        enable row level security;
alter table snapshots         enable row level security;
alter table activity          enable row level security;
alter table invitations       enable row level security;

-- ---- profiles --------------------------------------------------------------
-- NOTE: membership checks route through SECURITY DEFINER helpers (is_org_member /
-- shares_org_with) to avoid RLS recursion (42P17) — never query org_members
-- inline from policies on profiles / organizations / org_members.
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_platform_staff() or shares_org_with(profiles.id)
);
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---- organizations ---------------------------------------------------------
create policy orgs_select on organizations for select using (
  is_platform_staff() or is_org_member(organizations.id)
);
create policy orgs_insert on organizations for insert with check (created_by = auth.uid());
create policy orgs_update on organizations for update using (is_org_admin(id)) with check (is_org_admin(id));
create policy orgs_delete on organizations for delete using (is_platform_staff());

-- ---- org_members -----------------------------------------------------------
create policy orgmem_select on org_members for select using (
  is_platform_staff() or is_org_member(org_members.org_id)
);
create policy orgmem_write on org_members for all using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- ---- projects --------------------------------------------------------------
-- SELECT must NOT query the projects table (auth_project_role self-references it),
-- or INSERT ... RETURNING can't read back a just-created row. Use org-admin /
-- membership checks instead.
create policy projects_select on projects for select using (
  is_platform_staff() or is_org_admin(org_id) or is_project_member(id)
);
create policy projects_insert on projects for insert with check (is_org_admin(org_id));
create policy projects_update on projects for update
  using (auth_project_role(id) in ('admin', 'developer'))
  with check (auth_project_role(id) in ('admin', 'developer'));
create policy projects_delete on projects for delete using (auth_project_role(id) in ('admin', 'developer'));

-- ---- memberships (manual admin management; invites use RPC) ----------------
create policy memberships_select on memberships for select using (auth_project_role(project_id) is not null);
create policy memberships_write on memberships for all
  using (auth_project_role(project_id) in ('admin', 'developer'))
  with check (auth_project_role(project_id) in ('admin', 'developer'));

-- ---- nodes -----------------------------------------------------------------
create policy nodes_select on nodes for select using (auth_project_role(project_id) is not null);
create policy nodes_insert on nodes for insert with check (can_add_child(parent_id, project_id));
create policy nodes_update on nodes for update using (can_edit_node(id)) with check (can_edit_node(id));
create policy nodes_delete on nodes for delete using (can_edit_node(id));

-- ---- node_dependencies -----------------------------------------------------
create policy deps_select on node_dependencies for select using (auth_project_role(project_id) is not null);
create policy deps_insert on node_dependencies for insert with check (can_edit_node(node_id));
create policy deps_delete on node_dependencies for delete using (can_edit_node(node_id));

-- ---- notes -----------------------------------------------------------------
create policy notes_select on notes for select using (auth_project_role(project_id) is not null);
create policy notes_insert on notes for insert with check (can_add_note(project_id) and created_by = auth.uid());
create policy notes_update on notes for update using (
  created_by = auth.uid()
  or auth_project_role(project_id) in ('developer', 'admin', 'manager', 'engineer', 'qaqc', 'hse')
);
create policy notes_delete on notes for delete using (
  created_by = auth.uid()
  or auth_project_role(project_id) in ('developer', 'admin', 'manager')
);

-- ---- note_attachments ------------------------------------------------------
create policy attach_select on note_attachments for select using (auth_project_role(project_id) is not null);
create policy attach_insert on note_attachments for insert with check (can_add_note(project_id));
create policy attach_delete on note_attachments for delete using (
  auth_project_role(project_id) in ('developer', 'admin', 'manager', 'engineer')
  or exists (select 1 from notes n where n.id = note_id and n.created_by = auth.uid())
);

-- ---- categories ------------------------------------------------------------
create policy categories_select on categories for select using (auth_project_role(project_id) is not null);
create policy categories_write on categories for all
  using (auth_project_role(project_id) in ('developer', 'admin', 'manager'))
  with check (auth_project_role(project_id) in ('developer', 'admin', 'manager'));

-- ---- snapshots -------------------------------------------------------------
create policy snapshots_select on snapshots for select using (auth_project_role(project_id) is not null);
create policy snapshots_insert on snapshots for insert with check (
  auth_project_role(project_id) in ('developer', 'admin', 'manager', 'engineer')
);
create policy snapshots_delete on snapshots for delete using (
  auth_project_role(project_id) in ('developer', 'admin', 'manager')
);

-- ---- activity --------------------------------------------------------------
create policy activity_select on activity for select using (auth_project_role(project_id) is not null);
create policy activity_insert on activity for insert with check (
  actor_id = auth.uid() and auth_project_role(project_id) is not null
);
create policy activity_delete on activity for delete using (auth_project_role(project_id) in ('developer', 'admin'));

-- ---- invitations -----------------------------------------------------------
create policy invitations_select on invitations for select using (
  is_org_admin(org_id)
  or created_by = auth.uid()
  or (email is not null and lower(email) = lower(auth.email()))
);
create policy invitations_insert on invitations for insert with check (
  is_org_admin(org_id) or auth_project_role(project_id) in ('manager', 'engineer')
);
create policy invitations_delete on invitations for delete using (
  is_org_admin(org_id) or created_by = auth.uid()
);
