import { describe, it, expect } from "vitest";
import type { WbsNode } from "@/lib/types";
import { emptyFilters, isMatch, matchesSearch, filtersActive, computeCounts } from "@/lib/domain/filter";

function n(p: Partial<WbsNode> & { id: string }): WbsNode {
  return {
    id: p.id, nodeCode: p.nodeCode ?? p.id, projectId: "p", parentId: p.parentId ?? null,
    title: p.title ?? p.id, category: p.category ?? "general", priority: p.priority ?? 3,
    workStatus: p.workStatus ?? "not_started", progress: p.progress ?? 0, volume: p.volume ?? 1,
    qaGate: p.qaGate ?? "na", hseGate: p.hseGate ?? "na", startDate: null, dueDate: p.dueDate ?? null,
    assignee: { name: "", email: "", phone: "" }, assignedUserId: null, clusterId: null,
    orderIndex: 0, dependencies: p.dependencies ?? [], notes: [],
  };
}

describe("filters", () => {
  const nodes = [
    n({ id: "A", title: "Foundations", progress: 100, priority: 1, qaGate: "open" }),
    n({ id: "B", title: "Switchgear", progress: 40, priority: 2 }),
    n({ id: "C", title: "Cabling", progress: 0, priority: 1, hseGate: "not_complied" }),
  ];
  const eff = { A: 100, B: 40, C: 0 };

  it("matchesSearch on title and id", () => {
    expect(matchesSearch(nodes[0]!, "found")).toBe(true);
    expect(matchesSearch(nodes[0]!, "A")).toBe(true);
    expect(matchesSearch(nodes[0]!, "zzz")).toBe(false);
  });

  it("isMatch combines status/priority/gate filters", () => {
    const f = { ...emptyFilters(), statuses: new Set(["done" as const]) };
    expect(isMatch(nodes[0]!, f, eff)).toBe(true);
    expect(isMatch(nodes[1]!, f, eff)).toBe(false);

    const fp = { ...emptyFilters(), priorities: new Set([1 as const]) };
    expect(isMatch(nodes[2]!, fp, eff)).toBe(true);
    expect(isMatch(nodes[1]!, fp, eff)).toBe(false);

    const fg = { ...emptyFilters(), hseNot: true };
    expect(isMatch(nodes[2]!, fg, eff)).toBe(true);
    expect(isMatch(nodes[0]!, fg, eff)).toBe(false);
  });

  it("filtersActive detects any active filter", () => {
    expect(filtersActive(emptyFilters())).toBe(false);
    expect(filtersActive({ ...emptyFilters(), search: "x" })).toBe(true);
  });

  it("computeCounts tallies statuses, priorities, gates", () => {
    const leaf = new Set(["A", "B", "C"]);
    const c = computeCounts(nodes, eff, leaf, 7);
    expect(c.statuses.done).toBe(1);
    expect(c.statuses.on_progress).toBe(1);
    expect(c.statuses.not_started).toBe(1);
    expect(c.qaOpen).toBe(1);
    expect(c.hseNot).toBe(1);
    // priority counts exclude done (A is done → not counted under P1)
    expect(c.priorities[1]).toBe(1); // only C
  });
});
