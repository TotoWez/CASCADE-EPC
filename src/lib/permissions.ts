import type { Role } from "./types";

/**
 * UI capability matrix — the reconciled §18 table ("journeys win" resolution).
 * This mirrors the server-side RLS/RPC rules for UX (show/hide controls);
 * the database is always the source of truth for enforcement.
 *
 * Scope notes (enforced where the action happens, not by this table):
 *  - engineer "editAny" is scoped to their assigned subtree;
 *  - supervisor "editAssigned" is scoped to directly-assigned nodes;
 *  - viewer "noteAdd" additionally requires the invite's can_comment flag.
 */
export type Capability =
  | "org.manage" // branding / billing / members
  | "project.manage" // create/edit projects, parties, dates, assign PM
  | "invite" // invite users / assign roles
  | "wbs.build" // create/delete/restructure any node
  | "wbs.editAssigned" // edit nodes in own scope (assigned / subtree)
  | "deps.edit" // dependencies & links
  | "gate.qa"
  | "gate.hse"
  | "note.add"
  | "note.resolve"
  | "category.manage"
  | "snapshot.save"
  | "snapshot.delete"
  | "wbs.import"
  | "wbs.export"
  | "report.generate"
  | "report.flowchart"
  | "activity.clear"
  | "reorder";

const MATRIX: Record<Role, Capability[]> = {
  owner: ["org.manage"], // platform owner — full via developer-equivalent below
  developer: [
    "org.manage", "project.manage", "invite", "wbs.build", "wbs.editAssigned",
    "deps.edit", "gate.qa", "gate.hse", "note.add", "note.resolve",
    "category.manage", "snapshot.save", "snapshot.delete", "wbs.import",
    "wbs.export", "report.generate", "report.flowchart", "activity.clear", "reorder",
  ],
  admin: [
    "org.manage", "project.manage", "invite", "wbs.build", "wbs.editAssigned",
    "deps.edit", "gate.qa", "gate.hse", "note.add", "note.resolve",
    "category.manage", "snapshot.save", "snapshot.delete", "wbs.import",
    "wbs.export", "report.generate", "report.flowchart", "activity.clear", "reorder",
  ],
  manager: [
    "invite", "wbs.build", "wbs.editAssigned", "deps.edit", "note.add",
    "note.resolve", "category.manage", "snapshot.save", "snapshot.delete",
    "wbs.import", "wbs.export", "report.generate", "report.flowchart", "reorder",
  ],
  engineer: [
    "invite", "wbs.build", "wbs.editAssigned", "deps.edit", "note.add",
    "note.resolve", "snapshot.save", "wbs.export", "report.generate", "reorder",
  ],
  supervisor: ["wbs.editAssigned", "deps.edit", "note.add", "report.generate"],
  qaqc: ["gate.qa", "note.add", "note.resolve", "wbs.export", "report.generate"],
  hse: ["gate.hse", "note.add", "note.resolve", "wbs.export", "report.generate"],
  viewer: ["note.add"], // gated further by invite.can_comment
};

// Owner inherits the developer set (platform staff = full capability).
MATRIX.owner = MATRIX.developer;

/** Does this role have the capability at all? (Scope checked at call sites.) */
export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(capability) ?? false;
}

/** Roles a given role may create/assign (for invite UIs). */
export function assignableRoles(role: Role | null | undefined): Role[] {
  switch (role) {
    case "owner":
    case "developer":
    case "admin":
      return ["manager", "engineer", "supervisor", "qaqc", "hse", "viewer"];
    case "manager":
      return ["engineer", "supervisor", "qaqc", "hse", "viewer"];
    case "engineer":
      return ["supervisor", "viewer"];
    default:
      return [];
  }
}
