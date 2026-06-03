-- ============================================================================
-- CASCADE-EPC · 0007 · Fix RLS infinite recursion (Postgres 42P17)
-- ----------------------------------------------------------------------------
-- The original SELECT policies on profiles / organizations / org_members
-- queried org_members *inline*. Because org_members itself has RLS, that
-- re-triggered its own policy → infinite recursion (500 on those tables).
--
-- Fix: route the membership checks through SECURITY DEFINER helpers (which run
-- with the function owner's rights and therefore bypass RLS) — exactly how the
-- rest of the schema uses auth_project_role() / is_org_admin().
--
-- Safe to run on an already-migrated database (idempotent: create-or-replace +
-- drop-if-exists). No data is touched.
-- ============================================================================

create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = p_org and user_id = auth.uid());
$$;

create or replace function shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members a
    join org_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- profiles: own row, platform staff, or someone who shares an org with you.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_platform_staff() or shares_org_with(profiles.id)
);

-- organizations: orgs you are a member of (or platform staff).
drop policy if exists orgs_select on organizations;
create policy orgs_select on organizations for select using (
  is_platform_staff() or is_org_member(organizations.id)
);

-- org_members: rows for any org you belong to (or platform staff).
drop policy if exists orgmem_select on org_members;
create policy orgmem_select on org_members for select using (
  is_platform_staff() or is_org_member(org_members.org_id)
);

grant execute on function is_org_member(uuid), shares_org_with(uuid) to authenticated;
