-- ============================================================================
-- CASCADE-EPC · 0013 · Organization-level membership
--
-- Before this, the only non-admin way into an org was a PER-PROJECT invite
-- (create_invitation requires a project). Admins therefore had no way to build
-- their team before creating a project, and no org-wide member management.
--
-- accept_invitation (0011) already handles org-only invites: for an invitation
-- with project_id IS NULL it adds the redeemer as an org 'member' and skips the
-- project membership. So we only need a CREATE path plus admin management RPCs.
-- All are SECURITY DEFINER and gated by is_org_admin (which also passes platform
-- staff). The last remaining admin is protected from demotion / removal.
-- ============================================================================

-- ---- Invite someone to the ORGANIZATION (no project) ------------------------
create or replace function create_org_invitation(
  p_org uuid,
  p_email text default null,
  p_expires_at timestamptz default null,
  p_max_uses int default 1
)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not is_org_admin(p_org) then raise exception 'Only an admin can invite members'; end if;
  v_code := translate(encode(gen_random_bytes(9), 'base64'), '/+=', '_-');
  -- role is a NOT-NULL project_role; 'viewer' is an inert placeholder for
  -- org-only invites (accept_invitation only reads role when project_id is set).
  insert into invitations (org_id, project_id, email, role, code, can_comment, expires_at, max_uses, created_by)
  values (p_org, null, p_email, 'viewer', v_code, false, p_expires_at, coalesce(p_max_uses, 1), auth.uid());
  return v_code;
end;
$$;
grant execute on function create_org_invitation(uuid, text, timestamptz, int) to authenticated;

-- ---- Change an org member's role (member <-> admin) -------------------------
create or replace function set_org_member_role(p_org uuid, p_user uuid, p_role org_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_admin(p_org) then raise exception 'Only an admin can change roles'; end if;
  -- Never leave an org without an admin.
  if p_role <> 'admin'
     and exists (select 1 from org_members where org_id = p_org and user_id = p_user and org_role = 'admin')
     and (select count(*) from org_members where org_id = p_org and org_role = 'admin') <= 1 then
    raise exception 'The organization must keep at least one admin';
  end if;
  update org_members set org_role = p_role where org_id = p_org and user_id = p_user;
end;
$$;
grant execute on function set_org_member_role(uuid, uuid, org_role) to authenticated;

-- ---- Remove a member from the org (and all its projects) --------------------
create or replace function remove_org_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_admin(p_org) then raise exception 'Only an admin can remove members'; end if;
  if p_user = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  if exists (select 1 from org_members where org_id = p_org and user_id = p_user and org_role = 'admin')
     and (select count(*) from org_members where org_id = p_org and org_role = 'admin') <= 1 then
    raise exception 'The organization must keep at least one admin';
  end if;
  delete from memberships m
    using projects p
    where m.project_id = p.id and p.org_id = p_org and m.user_id = p_user;
  delete from org_members where org_id = p_org and user_id = p_user;
end;
$$;
grant execute on function remove_org_member(uuid, uuid) to authenticated;
