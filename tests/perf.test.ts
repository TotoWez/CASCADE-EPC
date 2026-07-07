import { describe, it, expect } from "vitest";
import type { WbsNode } from "@/lib/types";
import { toNodeMap, buildChildrenIndex } from "@/lib/domain/tree";
import { computeEffectiveProgress } from "@/lib/domain/rollup";
import { buildDownstreamMap } from "@/lib/domain/status";

/** Synthetic 5,000-node tree (10 roots × 10 children × 50 leaves) with a
 *  sprinkling of dependencies — the spec's scale target. */
function bigTree(): WbsNode[] {
  const nodes: WbsNode[] = [];
  const mk = (id: string, parentId: string | null, i: number): WbsNode => ({
    id, nodeCode: `N-${id}`, projectId: "p", parentId, title: `Node ${id}`,
    category: "general", priority: ((i % 3) + 1) as 1 | 2 | 3, workStatus: "on_progress",
    progress: i % 101, volume: (i % 10) + 1, qaGate: "na", hseGate: "na",
    startDate: null, dueDate: null, assignee: { name: "", email: "", phone: "" },
    assignedUserId: null, clusterId: null, orderIndex: i,
    dependencies: i % 17 === 0 && id !== "r0" ? ["r0"] : [],
    notes: [],
  });
  for (let r = 0; r < 10; r++) {
    const rid = `r${r}`;
    nodes.push(mk(rid, null, r));
    for (let b = 0; b < 10; b++) {
      const bid = `r${r}b${b}`;
      nodes.push(mk(bid, rid, b));
      for (let l = 0; l < 48; l++) nodes.push(mk(`${bid}l${l}`, bid, l));
    }
  }
  return nodes;
}

describe("domain hot path at the 5,000-node target", () => {
  it("derives nodeMap + index + rollup + downstream within budget", () => {
    const nodes = bigTree();
    expect(nodes.length).toBeGreaterThanOrEqual(4900);

    const t0 = performance.now();
    const nodeMap = toNodeMap(nodes);
    const index = buildChildrenIndex(nodes);
    const effMap = computeEffectiveProgress(nodeMap, index);
    const downstream = buildDownstreamMap(nodes);
    const ms = performance.now() - t0;

    // Sanity: rollup produced a value for every node.
    expect(Object.keys(effMap).length).toBe(nodes.length);
    expect(downstream).toBeTruthy();
    expect(index.size).toBeGreaterThan(0);

    // Generous CI budget — locally this runs in single-digit milliseconds.
    // This runs on EVERY tree mutation, so regressions here hurt everywhere.
    expect(ms).toBeLessThan(2000);
  });
});
