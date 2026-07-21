# Graph Report - .  (2026-07-21)

## Corpus Check
- 1 files · ~96,182 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 771 nodes · 1901 edges · 47 communities (43 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.76)
- Token cost: 34,000 input · 8,500 output

## Community Hubs (Navigation)
- App Shell & Layout
- Dependencies & Filtering UI
- Project & Team Admin UI
- PDF Reports & Color
- App Bootstrap & Public Site
- Lint & Dev Tooling
- Runtime Dependencies
- Confirm Dialog & Primitives
- Nodes API Layer
- TypeScript & Build Config
- Notes, Charts & Snapshots
- Demo Seed Script
- SECURITY DEFINER RPCs
- Row-Level Security Policies
- Database Schema
- Plan Limits & Hardening
- Supabase Backend Docs
- Deployment & Infrastructure
- PWA Manifest
- Backend E2E Tests
- CI Pipeline & Tests
- Front-end Entry & Stack
- Security Model & Tooling Note
- Gate Authority
- Product Overview
- Node TS Config
- Realtime Publication
- Demo Verify Script
- Vite Env Types
- Project Insert Fix
- Platform Role Lock

## God Nodes (most connected - your core abstractions)
1. `useTree` - 35 edges
2. `useAuth` - 31 edges
3. `WbsNode` - 27 edges
4. `Toast` - 26 edges
5. `getChildren()` - 24 edges
6. `useProject` - 23 edges
7. `Button` - 22 edges
8. `buildTreeReport()` - 21 edges
9. `compilerOptions` - 21 edges
10. `can()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Backend E2E (e2e/app) — skipped in CI` --conceptually_related_to--> `Supabase Backend`  [INFERRED]
  .github/workflows/ci.yml → DEPLOY.md
- `Permission Matrix (unit-tested)` --conceptually_related_to--> `Row-Level Security (RLS)`  [INFERRED]
  README.md → supabase/README.md
- `CASCADE-EPC Application` --cites--> `CI Workflow (GitHub Actions)`  [EXTRACTED]
  README.md → .github/workflows/ci.yml
- `index.html SPA Entry` --references--> `Custom Domain cascade-epc.com`  [INFERRED]
  index.html → DEPLOY.md
- `Vitest Unit Tests` --references--> `Permission Matrix (unit-tested)`  [INFERRED]
  .github/workflows/ci.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authorization call chain (RLS -> can_edit_node -> auth_project_role)** — supabase_readme_rls, supabase_readme_can_edit_node, supabase_readme_auth_project_role [EXTRACTED 0.85]
- **Gate authority enforcement (enforce_gate_authority, set_qa_gate, set_hse_gate)** — supabase_readme_enforce_gate_authority, supabase_readme_set_qa_gate, supabase_readme_set_hse_gate [EXTRACTED 0.85]
- **Doc-mirror blind-spot nuance (note, reading-aid caveat, keystone helper)** — supabase_readme_call_chain_blind_spot, supabase_readme_doc_mirror_reading_aid, supabase_readme_auth_project_role [INFERRED 0.75]
- **CI Pipeline Stages** — github_workflows_ci_build_test_job, github_workflows_ci_vitest, github_workflows_ci_playwright, github_workflows_ci_public_e2e [EXTRACTED 0.85]
- **Free-tier Deployment Stack** — deploy_cloudflare_pages, deploy_supabase, deploy_env_vars, deploy_spa_redirects, deploy_custom_domain [EXTRACTED 0.85]

## Communities (47 total, 4 thin omitted)

### Community 0 - "App Shell & Layout"
Cohesion: 0.05
Nodes (71): AboutModal(), STATUSES, AppLayout(), isEditableTarget(), AuthCard(), Brand(), RequireAuth(), Button (+63 more)

### Community 1 - "Dependencies & Filtering UI"
Cohesion: 0.07
Nodes (49): DependencyLines(), Line, FilterBar(), DependenciesSection(), Inspector(), LinkedSection(), NodePickerModal(), ProgressRing() (+41 more)

### Community 2 - "Project & Team Admin UI"
Cohesion: 0.08
Nodes (46): InviteModal(), ProjectControl(), TeamPanel(), ActivityModal(), TYPES, BulkEditPanel(), loadModule(), SelectedReportPicker() (+38 more)

### Community 3 - "PDF Reports & Color"
Cohesion: 0.14
Nodes (42): jspdf, jspdf, ReportMenu(), siblingAccent(), clamp(), clampVolume(), computeEffectiveProgress(), overallProgress() (+34 more)

### Community 4 - "App Bootstrap & Public Site"
Cohesion: 0.06
Nodes (34): App(), NAV, PublicFooter(), PublicHeader(), KEYS, ShortcutsModal(), ThemeToggle(), ACCENT (+26 more)

### Community 5 - "Lint & Dev Tooling"
Cohesion: 0.05
Nodes (43): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies (+35 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (41): clsx, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, jspdf-autotable, lucide-react, dependencies (+33 more)

### Community 7 - "Confirm Dialog & Primitives"
Cohesion: 0.09
Nodes (28): confirmDialog(), ConfirmHost(), ConfirmOptions, ConfirmState, Pending, useConfirm, focusables(), Modal() (+20 more)

### Community 8 - "Nodes API Layer"
Cohesion: 0.11
Nodes (22): addDependency(), clampInt(), createNode(), CreateNodeInput, deleteNode(), listProjectNodes(), NodePatch, NodeRow (+14 more)

### Community 9 - "TypeScript & Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2021, node, src, tailwind.config.ts, tests, vite.config.ts (+23 more)

### Community 10 - "Notes, Charts & Snapshots"
Cohesion: 0.12
Nodes (23): AttachmentChip(), KIND_ICON, NotesSection(), openAttachment(), ChartPoint, ProgressChart(), attachmentUrl(), deleteAllSnapshots() (+15 more)

### Community 11 - "Demo Seed Script"
Cohesion: 0.21
Nodes (16): addDep(), addNote(), addOrgMember(), assignRole(), buildTree(), ensureOrg(), ensureProject(), ensureUser() (+8 more)

### Community 12 - "SECURITY DEFINER RPCs"
Cohesion: 0.12
Nodes (4): trg_activity_prune, trg_new_user, trg_nodes_gate, trg_notes_updated

### Community 14 - "Row-Level Security Policies"
Cohesion: 0.14
Nodes (14): activity, can_add_note(), categories, invitations, memberships, node_dependencies, nodes, note_attachments (+6 more)

### Community 15 - "Database Schema"
Cohesion: 0.42
Nodes (13): activity, categories, invitations, memberships, node_dependencies, nodes, note_attachments, notes (+5 more)

### Community 16 - "Plan Limits & Hardening"
Cohesion: 0.21
Nodes (6): enforce_node_limit(), enforce_project_limit(), enforce_snapshot_limit(), trg_node_limit, trg_project_limit, trg_snapshot_limit

### Community 17 - "Supabase Backend Docs"
Cohesion: 0.18
Nodes (12): CASCADE-EPC Supabase Backend README, is_org_admin(), 0001_schema.sql (Extensions, enums, tables, indexes), 0003_rls.sql (Enable RLS + all policies), 0005_storage_cron.sql (Storage buckets, snapshots, keep-alive), 0006_realtime.sql (Realtime publication), 0008_fix_project_insert_and_slug.sql, 0009_fix_projects_select.sql (+4 more)

### Community 18 - "Deployment & Infrastructure"
Cohesion: 0.22
Nodes (11): Cloudflare Pages (front-end hosting), Custom Domain cascade-epc.com, VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, Deployment Guide (free tier), cascade-keepalive Cron Ping, pg_cron scheduled jobs, Plan Limits Enforcement (migration 0011), Sentry Error Monitoring (VITE_SENTRY_DSN) (+3 more)

### Community 19 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 20 - "Backend E2E Tests"
Cohesion: 0.48
Nodes (5): NOTE: deeper per-role / rollup / gate assertions can be layered here once, ensureOrg(), hasBackend, login(), uniqueCode()

### Community 21 - "CI Pipeline & Tests"
Cohesion: 0.29
Nodes (7): Backend E2E (e2e/app) — skipped in CI, build-test Job, Playwright E2E Tests, Backend-free Public E2E (e2e/public), Vitest Unit Tests, CI Workflow (GitHub Actions), Permission Matrix (unit-tested)

### Community 22 - "Front-end Entry & Stack"
Cohesion: 0.29
Nodes (7): index.html SPA Entry, src/main.tsx Module Entry, Open Graph / Social Cards Metadata, PWA Web Manifest, dnd-kit Tree Drag-and-Drop, Front-end Stack (React + Vite + TS + Tailwind), Zustand State Management

### Community 23 - "Security Model & Tooling Note"
Cohesion: 0.48
Nodes (7): auth_project_role(), SQL call-chain blind spot (tooling note), can_edit_node(), Doc-mirror is a reading aid, not AST call resolution, Edit scope (Manager/Engineer/Supervisor node access), 0002_functions.sql (Role resolution, edit-scope, rollup, triggers), Row-Level Security (RLS)

### Community 24 - "Gate Authority"
Cohesion: 0.43
Nodes (7): enforce_gate_authority(), Gate authority (column-sensitive QA/HSE gates), 0004_rpcs.sql (Triggers + RPCs), 0007_fix_rls_recursion.sql (Fix RLS recursion 42P17), SECURITY DEFINER RPCs, set_hse_gate RPC, set_qa_gate RPC

### Community 25 - "Product Overview"
Cohesion: 0.33
Nodes (6): CASCADE-EPC Application, jsPDF Client-ready PDF Reports, Dependency-ordered Phases P0-P14, SCADA/HMI-grade UI, WBS Hierarchical Planning, Volume-weighted Progress Rollup

### Community 26 - "Node TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, skipLibCheck, files, include

### Community 27 - "Realtime Publication"
Cohesion: 0.50
Nodes (3): node_dependencies, nodes, notes

## Knowledge Gaps
- **181 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `PDF Reports & Color`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `jspdf` connect `PDF Reports & Color` to `Runtime Dependencies`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint & Dev Tooling` to `Runtime Dependencies`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.052094150224991344 - nodes in this community are weakly interconnected._
- **Should `Dependencies & Filtering UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07243460764587525 - nodes in this community are weakly interconnected._
- **Should `Project & Team Admin UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0814207650273224 - nodes in this community are weakly interconnected._