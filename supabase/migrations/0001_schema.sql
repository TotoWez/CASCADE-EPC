-- ============================================================================
-- CASCADE-EPC · 0001 · Schema (extensions, enums, tables, indexes)
-- Postgres 15 (Supabase). Multi-tenant: organizations → projects → memberships.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---- Enums -----------------------------------------------------------------
create type project_role as enum ('manager', 'engineer', 'supervisor', 'qaqc', 'hse', 'viewer');
create type org_role     as enum ('admin', 'member');
create type platform_role as enum ('owner', 'developer');
create type work_status  as enum ('not_started', 'on_progress', 'done');
create type qa_gate      as enum ('na', 'open', 'closed');
create type hse_gate     as enum ('na', 'complied', 'not_complied');
create type activity_type as enum (
  'status','progress','gate','bulk','create','delete','copy','paste','rename',
  'note','category','priority','assignee','date','dependency','link','reorder',
  'snapshot','report'
);

-- ---- Profiles (1:1 with auth.users) ----------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  position      text not null default '',
  phone         text not null default '',
  email         text not null default '',
  avatar_url    text,
  platform_role platform_role,
  created_at    timestamptz not null default now()
);

-- ---- Organizations ---------------------------------------------------------
create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique,
  logo_url          text,
  brand             jsonb not null default '{}'::jsonb,
  subscription_tier text not null default 'free',
  created_by        uuid references profiles (id),
  created_at        timestamptz not null default now()
);

create table org_members (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  org_role  org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ---- Projects --------------------------------------------------------------
create table projects (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations (id) on delete cascade,
  code                text not null,
  name                text not null,
  client              text not null default '',
  consultant          text not null default '',
  contractor          text not null default '',
  sub_contractor      text not null default '',
  client_logo_url     text,
  consultant_logo_url text,
  contractor_logo_url text,
  sub_contractor_logo_url text,
  start_date          date,
  end_date            date,
  revised_date        date,
  project_manager_id  uuid references profiles (id),
  settings            jsonb not null default
    '{"requireHseAction":true,"dueWindowN":7,"autoSnapshot":false}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (org_id, code)
);

-- ---- Memberships (per-project role — the RLS axis) -------------------------
create table memberships (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  user_id     uuid not null references profiles (id) on delete cascade,
  role        project_role not null,
  can_comment boolean not null default false,
  invited_by  uuid references profiles (id),
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ---- Nodes (WBS) -----------------------------------------------------------
create table nodes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects (id) on delete cascade,
  node_code       text not null,
  parent_id       uuid references nodes (id) on delete cascade,
  title           text not null default 'New Node',
  category        text not null default 'general',
  priority        smallint not null default 3 check (priority in (1, 2, 3)),
  work_status     work_status not null default 'not_started',
  progress        smallint not null default 0 check (progress between 0 and 100),
  volume          smallint not null default 1 check (volume between 1 and 10),
  qa_gate         qa_gate not null default 'na',
  hse_gate        hse_gate not null default 'na',
  qa_gate_by      uuid references profiles (id),
  qa_gate_at      timestamptz,
  hse_gate_by     uuid references profiles (id),
  hse_gate_at     timestamptz,
  start_date      date,
  due_date        date,
  assignee_name   text not null default '',
  assignee_email  text not null default '',
  assignee_phone  text not null default '',
  assigned_user_id uuid references profiles (id),
  cluster_id      uuid,
  order_index     int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, node_code)
);

-- ---- Dependencies (node_id is blocked until depends_on is done) ------------
create table node_dependencies (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects (id) on delete cascade,
  node_id            uuid not null references nodes (id) on delete cascade,
  depends_on_node_id uuid not null references nodes (id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (node_id, depends_on_node_id),
  check (node_id <> depends_on_node_id)
);

-- ---- Notes / RFI + attachments ---------------------------------------------
create table notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  node_id    uuid not null references nodes (id) on delete cascade,
  source     text not null default '',
  text       text not null default '',
  checked    boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table note_attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  note_id      uuid not null references notes (id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  mime         text not null default '',
  size         bigint not null default 0,
  created_at   timestamptz not null default now()
);

-- ---- Categories (root + general are protected in app/RPC) ------------------
create table categories (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name       text not null,
  color      text,
  unique (project_id, name)
);

-- ---- Snapshots -------------------------------------------------------------
create table snapshots (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects (id) on delete cascade,
  name             text not null,
  taken_at         timestamptz not null default now(),
  overall_progress numeric not null default 0,
  node_count       int not null default 0,
  state            jsonb not null default '[]'::jsonb,
  is_auto          boolean not null default false,
  created_by       uuid references profiles (id)
);

-- ---- Activity timeline (capped to 500/project via trigger) -----------------
create table activity (
  id         bigint generated always as identity primary key,
  project_id uuid not null references projects (id) on delete cascade,
  type       activity_type not null,
  role       text,
  actor_id   uuid references profiles (id),
  message    text not null default '',
  node_id    uuid,          -- no FK: survives node deletion as "deleted" link
  node_code  text,
  created_at timestamptz not null default now()
);

-- ---- Invitations (viewer = code/magic-link; staff = email+password) --------
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  project_id  uuid references projects (id) on delete cascade,
  email       text,
  role        project_role not null,
  code        text not null unique,
  can_comment boolean not null default false,
  expires_at  timestamptz,
  max_uses    int not null default 1,
  uses        int not null default 0,
  created_by  uuid references profiles (id),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

-- ---- Indexes ---------------------------------------------------------------
create index idx_org_members_org   on org_members (org_id);
create index idx_org_members_user  on org_members (user_id);
create index idx_projects_org      on projects (org_id);
create index idx_memberships_proj  on memberships (project_id);
create index idx_memberships_user  on memberships (user_id);
create index idx_nodes_project     on nodes (project_id);
create index idx_nodes_parent      on nodes (parent_id);
create index idx_nodes_cluster     on nodes (cluster_id) where cluster_id is not null;
create index idx_nodes_assigned    on nodes (assigned_user_id) where assigned_user_id is not null;
create index idx_deps_node         on node_dependencies (node_id);
create index idx_deps_dependson    on node_dependencies (depends_on_node_id);
create index idx_notes_node        on notes (node_id);
create index idx_attach_note       on note_attachments (note_id);
create index idx_categories_proj   on categories (project_id);
create index idx_snapshots_proj    on snapshots (project_id, taken_at desc);
create index idx_activity_proj     on activity (project_id, id desc);
create index idx_invitations_code  on invitations (code);
