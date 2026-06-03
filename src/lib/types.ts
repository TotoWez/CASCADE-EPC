/**
 * Canonical domain vocabulary for CASCADE-EPC.
 * One set of role keys (UI shows the friendly label) per the reconciled spec.
 */

// ---- Roles -----------------------------------------------------------------

/** Per-project role — the axis Supabase RLS keys on (memberships.role). */
export type ProjectRole =
  | "manager" // Project Manager
  | "engineer" // Team Leader
  | "supervisor" // Team Member (site)
  | "qaqc"
  | "hse"
  | "viewer";

/** Org-level role (org_members.org_role). Admin = customer IT. */
export type OrgRole = "admin" | "member";

/** Platform-level role (profiles.platform_role). */
export type PlatformRole = "owner" | "developer";

/** Effective role used for capability checks across the app. */
export type Role = PlatformRole | "admin" | ProjectRole;

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  developer: "Developer",
  admin: "Admin",
  manager: "Manager",
  engineer: "Engineer",
  supervisor: "Supervisor",
  qaqc: "QA/QC",
  hse: "HSE",
  viewer: "Viewer",
};

/** Friendly second name shown in onboarding / tooltips. */
export const ROLE_ALIAS: Partial<Record<Role, string>> = {
  manager: "Project Manager",
  engineer: "Team Leader",
  supervisor: "Team Member",
};

/**
 * Work-status hierarchy (Owner/Developer → Admin → Manager → Engineer →
 * Supervisor). QAQC and HSE are cross-cutting and sit outside the ladder.
 * Higher number = more authority. Used for "can manage" comparisons.
 */
export const ROLE_RANK: Record<Role, number> = {
  owner: 100,
  developer: 90,
  admin: 80,
  manager: 60,
  engineer: 40,
  supervisor: 20,
  qaqc: 50, // cross-cutting; ranked for tie-breaks only
  hse: 50,
  viewer: 0,
};

// ---- Work status & gates ---------------------------------------------------

/** Stored leaf work status. Parents derive theirs from rollup. */
export type WorkStatus = "not_started" | "on_progress" | "done";

/** Display status adds the computed `blocked` axis. Used for all counts/filters. */
export type DisplayStatus = WorkStatus | "blocked";

export type QaGate = "na" | "open" | "closed";
export type HseGate = "na" | "complied" | "not_complied";

export type Priority = 1 | 2 | 3;

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  not_started: "Not Started",
  on_progress: "On Progress",
  done: "Done",
};

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  not_started: "Not Started",
  on_progress: "On Progress",
  done: "Done",
  blocked: "Blocked",
};

/** Tailwind text/utility token name per status (see tailwind.config.ts). */
export const DISPLAY_STATUS_COLOR: Record<DisplayStatus, string> = {
  not_started: "status-notstarted",
  on_progress: "status-progress",
  done: "status-done",
  blocked: "status-blocked",
};

export const QA_GATE_LABEL: Record<QaGate, string> = {
  na: "N/A",
  open: "Open",
  closed: "Closed",
};

export const HSE_GATE_LABEL: Record<HseGate, string> = {
  na: "N/A",
  complied: "Complied",
  not_complied: "Not Complied",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  1: "P1",
  2: "P2",
  3: "P3",
};

// ---- Core entities (front-end shape) ---------------------------------------

export interface Assignee {
  name: string;
  email: string;
  phone: string;
}

export interface NoteAttachment {
  id: string;
  fileName: string;
  storagePath: string;
  mime: string;
  size: number;
}

export interface Note {
  id: string;
  source: string;
  text: string;
  checked: boolean;
  attachments: NoteAttachment[];
  createdBy?: string;
  createdAt?: string;
}

export interface WbsNode {
  id: string; // internal uuid
  nodeCode: string; // human ID e.g. NODE-3001
  projectId: string;
  parentId: string | null;
  title: string;
  category: string;
  priority: Priority;
  workStatus: WorkStatus; // leaf-authoritative; parents roll up
  progress: number; // 0..100 (leaf manual)
  volume: number; // 1..10
  qaGate: QaGate;
  hseGate: HseGate;
  qaGateBy?: string | null;
  qaGateAt?: string | null;
  hseGateBy?: string | null;
  hseGateAt?: string | null;
  startDate: string | null;
  dueDate: string | null;
  assignee: Assignee;
  assignedUserId: string | null;
  clusterId: string | null; // linked-node transitive cluster
  orderIndex: number;
  dependencies: string[]; // node ids this node depends on
  notes: Note[];
}

export interface Project {
  id: string;
  orgId: string;
  code: string;
  name: string;
  client: string;
  consultant: string;
  contractor: string;
  subContractor: string;
  clientLogoUrl: string | null;
  consultantLogoUrl: string | null;
  contractorLogoUrl: string | null;
  subContractorLogoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  revisedDate: string | null;
  projectManagerId: string | null;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  requireHseAction: boolean;
  dueWindowN: number; // "Due in N days"
  autoSnapshot: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  requireHseAction: true,
  dueWindowN: 7,
  autoSnapshot: false,
};
