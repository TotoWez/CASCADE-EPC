-- ============================================================================
-- CASCADE-EPC · 0010 · Lock platform_role (security hardening)
--
-- profiles_update lets a user update their OWN row (name/position/phone/avatar).
-- That policy does not restrict columns, so a signed-in user could also set
-- profiles.platform_role = 'developer' on themselves and gain platform-wide
-- access (is_platform_staff() → every org and project). RLS cannot compare the
-- OLD vs NEW value, so we enforce it with a trigger.
--
-- The SQL editor (role 'postgres') and the service_role key bypass this, so you
-- can still grant/revoke platform_role legitimately, e.g.:
--   update profiles set platform_role = 'developer' where email = '...';
-- ============================================================================

create or replace function lock_platform_role()
returns trigger language plpgsql as $$
begin
  if new.platform_role is distinct from old.platform_role
     and current_user in ('authenticated', 'anon') then
    raise exception 'platform_role is managed by the platform and cannot be changed here';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_platform_role on profiles;
create trigger trg_lock_platform_role
  before update on profiles
  for each row execute function lock_platform_role();
