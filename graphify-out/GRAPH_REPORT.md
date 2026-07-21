# Graph Report - .  (2026-07-21)

## Corpus Check
- 147 files · ~96,096 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 769 nodes · 1896 edges · 54 communities (50 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.77)
- Token cost: 33,000 input · 8,000 output

## Community Hubs (Navigation)
- UI Primitives & App Shell
- PDF Reports & Rollup
- Filtering & Dependencies UI
- Lint & Dev Tooling
- Nodes & Categories API
- Runtime Dependencies
- TypeScript & Build Config
- Buttons & Auth Cards
- Project Form & Skeletons
- Public Site & Branding
- Org API & Plans
- Supabase Client & Realtime
- Demo Seed Script
- SECURITY DEFINER RPCs
- Row-Level Security Policies
- App Bootstrap & Theme
- Database Schema
- Notes & Attachments UI
- Plan Limits & Hardening
- Deployment & Infrastructure
- PWA Manifest
- App Layout & Shortcuts
- Supabase Backend Docs
- Auth Routing & Guards
- Bulk-Edit Classification
- Security Model & Tooling Note
- Backend E2E Tests
- CI Pipeline & Tests
- Front-end Entry & Stack
- Gate Authority
- Product Overview
- Toast Notifications
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
- **CI Pipeline Stages** — github_workflows_ci_build_test_job, github_workflows_ci_vitest, github_workflows_ci_playwright, github_workflows_ci_public_e2e [EXTRACTED 0.85]
- **Free-tier Deployment Stack** — deploy_cloudflare_pages, deploy_supabase, deploy_env_vars, deploy_spa_redirects, deploy_custom_domain [EXTRACTED 0.85]
- **RLS authorization call chain keyed on auth_project_role** — supabase_readme_rls, supabase_readme_can_edit_node, supabase_readme_auth_project_role, supabase_readme_enforce_gate_authority [EXTRACTED 1.00]
- **QA/HSE gate authority enforcement and RPC interface** — supabase_readme_gate_authority, supabase_readme_enforce_gate_authority, supabase_readme_set_qa_gate, supabase_readme_set_hse_gate [EXTRACTED 1.00]

## Communities (54 total, 4 thin omitted)

### Community 0 - "UI Primitives & App Shell"
Cohesion: 0.05
Nodes (79): confirmDialog(), ConfirmHost(), ConfirmOptions, ConfirmState, Pending, useConfirm, focusables(), Modal() (+71 more)

### Community 1 - "PDF Reports & Rollup"
Cohesion: 0.12
Nodes (51): jspdf, jspdf, loadModule(), ReportMenu(), normalizeNodes(), siblingAccent(), clamp(), clampVolume() (+43 more)

### Community 2 - "Filtering & Dependencies UI"
Cohesion: 0.08
Nodes (37): FilterBar(), DependenciesSection(), LinkedSection(), NodePickerModal(), ProgressRing(), DUE_CLS, NodeCard(), NodeCardProps (+29 more)

### Community 3 - "Lint & Dev Tooling"
Cohesion: 0.05
Nodes (43): autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies (+35 more)

### Community 4 - "Nodes & Categories API"
Cohesion: 0.08
Nodes (29): addCategory(), Category, deleteCategory(), renameCategory(), addDependency(), BulkPatch, clampInt(), createNode() (+21 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (41): clsx, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, jspdf-autotable, lucide-react, dependencies (+33 more)

### Community 6 - "TypeScript & Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2021, node, src, tailwind.config.ts, tests, vite.config.ts (+23 more)

### Community 7 - "Buttons & Auth Cards"
Cohesion: 0.21
Nodes (17): AuthCard(), Button, ButtonProps, Size, SIZES, Variant, VARIANTS, Field() (+9 more)

### Community 8 - "Project Form & Skeletons"
Cohesion: 0.14
Nodes (19): CardSkeleton(), LogoUploader(), PARTIES, PartyKey, ProjectForm(), uploadBranding(), createProject(), getProject() (+11 more)

### Community 9 - "Public Site & Branding"
Cohesion: 0.13
Nodes (16): Brand(), NAV, PublicFooter(), PublicHeader(), About(), ROLES, STATUSES, ForgotPassword() (+8 more)

### Community 10 - "Org API & Plans"
Cohesion: 0.19
Nodes (14): getOrg(), Org, updateOrg(), usageStats, COMPARISON, fmtLimit(), Plan, PlanId (+6 more)

### Community 11 - "Supabase Client & Realtime"
Cohesion: 0.19
Nodes (11): ProfilePatch, updateProfile(), uploadAvatar(), env, supabase, OrgRole, Profile(), AuthState (+3 more)

### Community 12 - "Demo Seed Script"
Cohesion: 0.21
Nodes (16): addDep(), addNote(), addOrgMember(), assignRole(), buildTree(), ensureOrg(), ensureProject(), ensureUser() (+8 more)

### Community 13 - "SECURITY DEFINER RPCs"
Cohesion: 0.12
Nodes (4): trg_activity_prune, trg_new_user, trg_nodes_gate, trg_notes_updated

### Community 15 - "Row-Level Security Policies"
Cohesion: 0.14
Nodes (14): activity, can_add_note(), categories, invitations, memberships, node_dependencies, nodes, note_attachments (+6 more)

### Community 16 - "App Bootstrap & Theme"
Cohesion: 0.20
Nodes (9): App(), ThemeToggle(), sentryDsn, router, applyTheme(), initTheme(), Theme, UiState (+1 more)

### Community 17 - "Database Schema"
Cohesion: 0.42
Nodes (13): activity, categories, invitations, memberships, node_dependencies, nodes, note_attachments, notes (+5 more)

### Community 18 - "Notes & Attachments UI"
Cohesion: 0.32
Nodes (10): AttachmentChip(), KIND_ICON, openAttachment(), attachmentUrl(), attachmentKind, groupBySource(), opensInTab(), SOURCE_COLORS (+2 more)

### Community 19 - "Plan Limits & Hardening"
Cohesion: 0.21
Nodes (6): enforce_node_limit(), enforce_project_limit(), enforce_snapshot_limit(), trg_node_limit, trg_project_limit, trg_snapshot_limit

### Community 20 - "Deployment & Infrastructure"
Cohesion: 0.22
Nodes (11): Cloudflare Pages (front-end hosting), Custom Domain cascade-epc.com, VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, Deployment Guide (free tier), cascade-keepalive Cron Ping, pg_cron scheduled jobs, Plan Limits Enforcement (migration 0011), Sentry Error Monitoring (VITE_SENTRY_DSN) (+3 more)

### Community 21 - "PWA Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 22 - "App Layout & Shortcuts"
Cohesion: 0.31
Nodes (6): AboutModal(), STATUSES, AppLayout(), isEditableTarget(), KEYS, ShortcutsModal()

### Community 23 - "Supabase Backend Docs"
Cohesion: 0.25
Nodes (9): CASCADE-EPC Supabase backend, is_org_admin(), 0001_schema.sql, 0005_storage_cron.sql, 0006_realtime.sql, 0007_fix_rls_recursion.sql, 0008_fix_project_insert_and_slug.sql, 0009_fix_projects_select.sql (+1 more)

### Community 24 - "Auth Routing & Guards"
Cohesion: 0.39
Nodes (6): RequireAuth(), AppHome(), Auth(), Onboarding(), ProjectsList(), useAuth

### Community 25 - "Bulk-Edit Classification"
Cohesion: 0.36
Nodes (6): Pending, Classification, classifyValues(), coupleStatusProgress(), FieldClass, isEmpty()

### Community 26 - "Security Model & Tooling Note"
Cohesion: 0.36
Nodes (8): auth_project_role(), can_edit_node(), Edit scope (Manager/Engineer/Supervisor), 0002_functions.sql, 0003_rls.sql, Row-Level Security (RLS), Role hierarchy (developer > admin > membership role), Tooling note — SQL call-chain blind spot

### Community 27 - "Backend E2E Tests"
Cohesion: 0.48
Nodes (5): NOTE: deeper per-role / rollup / gate assertions can be layered here once, ensureOrg(), hasBackend, login(), uniqueCode()

### Community 28 - "CI Pipeline & Tests"
Cohesion: 0.29
Nodes (7): Backend E2E (e2e/app) — skipped in CI, build-test Job, Playwright E2E Tests, Backend-free Public E2E (e2e/public), Vitest Unit Tests, CI Workflow (GitHub Actions), Permission Matrix (unit-tested)

### Community 29 - "Front-end Entry & Stack"
Cohesion: 0.29
Nodes (7): index.html SPA Entry, src/main.tsx Module Entry, Open Graph / Social Cards Metadata, PWA Web Manifest, dnd-kit Tree Drag-and-Drop, Front-end Stack (React + Vite + TS + Tailwind), Zustand State Management

### Community 30 - "Gate Authority"
Cohesion: 0.38
Nodes (7): enforce_gate_authority(), Gate authority (column-sensitive QA/HSE gates), 0004_rpcs.sql, 0010_lock_platform_role.sql, SECURITY DEFINER RPCs, set_hse_gate RPC, set_qa_gate RPC

### Community 31 - "Product Overview"
Cohesion: 0.33
Nodes (6): CASCADE-EPC Application, jsPDF Client-ready PDF Reports, Dependency-ordered Phases P0-P14, SCADA/HMI-grade UI, WBS Hierarchical Planning, Volume-weighted Progress Rollup

### Community 32 - "Toast Notifications"
Cohesion: 0.40
Nodes (5): ACCENT, ICON, Toaster(), ToastKind, useToasts

### Community 33 - "Node TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, skipLibCheck, files, include

### Community 34 - "Realtime Publication"
Cohesion: 0.50
Nodes (3): node_dependencies, nodes, notes

## Knowledge Gaps
- **182 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `PDF Reports & Rollup`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `jspdf` connect `PDF Reports & Rollup` to `Runtime Dependencies`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint & Dev Tooling` to `Runtime Dependencies`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Primitives & App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.05064836003051106 - nodes in this community are weakly interconnected._
- **Should `PDF Reports & Rollup` be split into smaller, more focused modules?**
  _Cohesion score 0.11668928086838534 - nodes in this community are weakly interconnected._
- **Should `Filtering & Dependencies UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08470588235294117 - nodes in this community are weakly interconnected._