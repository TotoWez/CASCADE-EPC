-- ============================================================================
-- CASCADE-EPC · 0009 · Fix project creation round-trip (INSERT ... RETURNING)
-- ----------------------------------------------------------------------------
-- The INSERT WITH CHECK (is_org_admin) was fine — the failure was the read-back.
-- projects_select used auth_project_role(id), which self-queries the `projects`
-- table. During `INSERT ... RETURNING` (PostgREST's .insert().select()), the
-- just-inserted row is NOT visible to that self-query, so the SELECT policy
-- denied the new row and Postgres rejected the whole statement with
-- "new row violates row-level security policy for table projects".
--
-- Fix: evaluate project visibility from org-admin / membership only — never by
-- querying the projects table itself.
-- ============================================================================

create or replace function is_project_member(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships where project_id = p_project and user_id = (select auth.uid())
  );
$$;

drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  is_platform_staff() or is_org_admin(org_id) or is_project_member(id)
);

grant execute on function is_project_member(uuid) to authenticated;
