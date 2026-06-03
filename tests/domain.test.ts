import { describe, it, expect } from "vitest";
import type { WbsNode } from "@/lib/types";
import { buildChildrenIndex, toNodeMap, wouldCreateTreeCycle } from "@/lib/domain/tree";
import { computeEffectiveProgress, effectiveWorkStatus, overallProgress, clampVolume } from "@/lib/domain/rollup";
import { displayStatus, isBlocked, isDoneCleared, dueState } from "@/lib/domain/status";

function node(p: Partial<WbsNode> & { id: string }): WbsNode {
  return {
    id: p.id,
    nodeCode: p.nodeCode ?? p.id,
    projectId: "proj",
    parentId: p.parentId ?? null,
    title: p.title ?? p.id,
    category: p.category ?? "general",
    priority: p.priority ?? 3,
    workStatus: p.workStatus ?? "not_started",
    progress: p.progress ?? 0,
    volume: p.volume ?? 1,
    qaGate: p.qaGate ?? "na",
    hseGate: p.hseGate ?? "na",
    startDate: p.startDate ?? null,
    dueDate: p.dueDate ?? null,
    assignee: p.assignee ?? { name: "", email: "", phone: "" },
    assignedUserId: p.assignedUserId ?? null,
    clusterId: p.clusterId ?? null,
    orderIndex: p.orderIndex ?? 0,
    dependencies: p.dependencies ?? [],
    notes: p.notes ?? [],
  };
}

describe("weighted rollup", () => {
  const nodes = [
    node({ id: "R", volume: 5 }),
    node({ id: "P", parentId: "R", volume: 3 }),
    node({ id: "L1", parentId: "P", volume: 4, progress: 100 }),
    node({ id: "L2", parentId: "P", volume: 6, progress: 50 }),
  ];
  const map = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const eff = computeEffectiveProgress(map, index);

  it("computes leaves as their own progress", () => {
    expect(eff.L1).toBe(100);
    expect(eff.L2).toBe(50);
  });

  it("computes parent as volume-weighted average of children", () => {
    // (100*4 + 50*6) / (4+6) = 700/10 = 70
    expect(eff.P).toBe(70);
    expect(eff.R).toBe(70);
  });

  it("clamps volume to 1..10", () => {
    expect(clampVolume(0)).toBe(1);
    expect(clampVolume(99)).toBe(10);
    expect(clampVolume(5)).toBe(5);
  });

  it("derives work status and overall progress", () => {
    expect(effectiveWorkStatus(0)).toBe("not_started");
    expect(effectiveWorkStatus(55)).toBe("on_progress");
    expect(effectiveWorkStatus(100)).toBe("done");
    expect(overallProgress([map.R!], eff)).toBe(70);
  });
});

describe("blocked + display status", () => {
  const nodes = [
    node({ id: "A", progress: 100 }),
    node({ id: "B", progress: 40 }),
    node({ id: "X", dependencies: ["A"] }), // dep done → not blocked
    node({ id: "Y", dependencies: ["B"] }), // dep not done → blocked
  ];
  const eff = computeEffectiveProgress(toNodeMap(nodes), buildChildrenIndex(nodes));

  it("is blocked when any dependency is not Done", () => {
    expect(isBlocked(nodes[2]!, eff)).toBe(false);
    expect(isBlocked(nodes[3]!, eff)).toBe(true);
    expect(displayStatus(nodes[3]!, eff)).toBe("blocked");
    expect(displayStatus(nodes[0]!, eff)).toBe("done");
  });
});

describe("done-cleared gate logic", () => {
  it("treats QA open / HSE not-complied as not cleared", () => {
    const done = node({ id: "D", progress: 100 });
    expect(isDoneCleared({ ...done, qaGate: "closed", hseGate: "complied" }, "done", true)).toBe(true);
    expect(isDoneCleared({ ...done, qaGate: "open" }, "done", true)).toBe(false);
    expect(isDoneCleared({ ...done, hseGate: "not_complied" }, "done", true)).toBe(false);
    // when project does not require HSE action, not-complied does not block clearing
    expect(isDoneCleared({ ...done, hseGate: "not_complied" }, "done", false)).toBe(true);
    expect(isDoneCleared(done, "on_progress", true)).toBe(false);
  });
});

describe("due-state (local end-of-day)", () => {
  const now = new Date(2026, 5, 2, 12, 0, 0).getTime(); // 2026-06-02 noon local
  it("flags overdue, soon, ok, none", () => {
    expect(dueState(node({ id: "n", dueDate: "2026-05-30" }), "on_progress", 7, now)).toBe("overdue");
    expect(dueState(node({ id: "n", dueDate: "2026-06-02" }), "on_progress", 7, now)).toBe("soon");
    expect(dueState(node({ id: "n", dueDate: "2026-06-30" }), "on_progress", 7, now)).toBe("ok");
    expect(dueState(node({ id: "n" }), "on_progress", 7, now)).toBe("none");
    // a done node is never overdue
    expect(dueState(node({ id: "n", dueDate: "2026-05-30" }), "done", 7, now)).toBe("ok");
  });
});

describe("tree cycle guard", () => {
  const nodes = [node({ id: "R" }), node({ id: "C", parentId: "R" }), node({ id: "G", parentId: "C" })];
  const index = buildChildrenIndex(nodes);
  it("blocks attaching a node under its own descendant", () => {
    expect(wouldCreateTreeCycle(index, "R", "G")).toBe(true);
    expect(wouldCreateTreeCycle(index, "C", "R")).toBe(false);
    expect(wouldCreateTreeCycle(index, "R", "R")).toBe(true);
  });
});
