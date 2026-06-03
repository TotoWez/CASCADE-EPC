import { describe, it, expect } from "vitest";
import type { WbsNode } from "@/lib/types";
import { toNodeMap } from "@/lib/domain/tree";
import { dependencyWouldCreateCycle, validDependencyTargets, validLinkTargets } from "@/lib/domain/cycles";

function n(id: string, deps: string[] = [], clusterId: string | null = null): WbsNode {
  return {
    id, nodeCode: id, projectId: "p", parentId: null, title: id, category: "general",
    priority: 3, workStatus: "not_started", progress: 0, volume: 1, qaGate: "na", hseGate: "na",
    startDate: null, dueDate: null, assignee: { name: "", email: "", phone: "" },
    assignedUserId: null, clusterId, orderIndex: 0, dependencies: deps, notes: [],
  };
}

describe("dependency cycle guard", () => {
  // A depends on B; B depends on C
  const nodes = [n("A", ["B"]), n("B", ["C"]), n("C")];
  const map = toNodeMap(nodes);

  it("detects direct and transitive cycles", () => {
    expect(dependencyWouldCreateCycle(map, "C", "A")).toBe(true); // C→A closes A→B→C→A
    expect(dependencyWouldCreateCycle(map, "C", "B")).toBe(true); // C→B closes B→C→B
    expect(dependencyWouldCreateCycle(map, "A", "A")).toBe(true); // self
    expect(dependencyWouldCreateCycle(map, "A", "C")).toBe(false); // already via B, but no cycle
  });

  it("excludes self, existing deps, and cycle-formers from candidates", () => {
    const candidates = validDependencyTargets(map, "B").map((c) => c.id);
    expect(candidates).not.toContain("B"); // self
    expect(candidates).not.toContain("C"); // existing dep
    expect(candidates).not.toContain("A"); // A→B exists, so B→A would cycle
    expect(candidates).toEqual([]); // nothing valid here
  });
});

describe("link candidates", () => {
  const nodes = [n("A", [], "c1"), n("B", [], "c1"), n("C")];
  it("excludes self and same-cluster peers", () => {
    const ids = validLinkTargets(nodes, nodes[0]!).map((c) => c.id);
    expect(ids).not.toContain("A"); // self
    expect(ids).not.toContain("B"); // same cluster
    expect(ids).toContain("C");
  });
});
