import { describe, it, expect } from "vitest";
import { can, assignableRoles } from "@/lib/permissions";

describe("permissions — reconciled matrix (journeys win)", () => {
  it("gates QA/HSE to their owning roles only (plus admin/developer)", () => {
    expect(can("qaqc", "gate.qa")).toBe(true);
    expect(can("qaqc", "gate.hse")).toBe(false);
    expect(can("hse", "gate.hse")).toBe(true);
    expect(can("hse", "gate.qa")).toBe(false);
    expect(can("manager", "gate.qa")).toBe(false);
    expect(can("admin", "gate.qa")).toBe(true);
    expect(can("admin", "gate.hse")).toBe(true);
  });

  it("lets engineers invite and supervisors edit/report (the journeys-win decision)", () => {
    expect(can("engineer", "invite")).toBe(true);
    expect(can("supervisor", "wbs.editAssigned")).toBe(true);
    expect(can("supervisor", "deps.edit")).toBe(true);
    expect(can("supervisor", "report.generate")).toBe(true);
    // but supervisors still cannot build the tree or invite
    expect(can("supervisor", "wbs.build")).toBe(false);
    expect(can("supervisor", "invite")).toBe(false);
  });

  it("flowchart report = admin + manager + developer only", () => {
    expect(can("developer", "report.flowchart")).toBe(true);
    expect(can("admin", "report.flowchart")).toBe(true);
    expect(can("manager", "report.flowchart")).toBe(true);
    expect(can("engineer", "report.flowchart")).toBe(false);
  });

  it("only admin/developer can clear activity and manage the org", () => {
    expect(can("admin", "activity.clear")).toBe(true);
    expect(can("manager", "activity.clear")).toBe(false);
    expect(can("manager", "org.manage")).toBe(false);
    expect(can("developer", "org.manage")).toBe(true);
  });

  it("viewer has no capabilities beyond commenting", () => {
    expect(can("viewer", "wbs.editAssigned")).toBe(false);
    expect(can("viewer", "report.generate")).toBe(false);
    expect(can("viewer", "note.add")).toBe(true);
  });

  it("assignableRoles follows the creation hierarchy", () => {
    expect(assignableRoles("admin")).toContain("manager");
    expect(assignableRoles("manager")).not.toContain("manager");
    expect(assignableRoles("manager")).toContain("engineer");
    expect(assignableRoles("engineer")).toEqual(["supervisor", "viewer"]);
    expect(assignableRoles("supervisor")).toEqual([]);
  });
});
