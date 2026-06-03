-- ============================================================================
-- CASCADE-EPC · 0008 · Fix project creation (RLS) + org slug collisions
-- ----------------------------------------------------------------------------
-- 1) Creating a project failed with "new row violates row-level security
--    policy for table projects" even for the org Admin. Diagnosis showed the
--    Admin membership row + auth context were correct, yet is_org_admin()
--    evaluated false inside the INSERT WITH CHECK. Re-create the function with
--    the platform-staff check inlined (no nested SECURITY DEFINER call) and the
--    Supabase-recommended `(select auth.uid())` form, then rebind the policy.
--
-- 2) organizations.slug was globally UNIQUE, so two organizations with the same
--    name (e.g. two customers both "Acme") collided on signup. Slugs are not
--    used for lookups (everything is keyed by uuid) — drop the constraint.
--
-- Idempotent / no data touched.
-- ============================================================================

create or replace function is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members
    where org_id = p_org and user_id = (select auth.uid()) and org_role = 'admin'
  ) or exists (
    select 1 from profiles
    where id = (select auth.uid()) and platform_role is not null
  );
$$;

drop policy if exists projects_insert on projects;
create policy projects_insert on projects for insert with check (is_org_admin(org_id));

alter table organizations drop constraint if exists organizations_slug_key;
