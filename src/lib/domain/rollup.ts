import type { WbsNode, WorkStatus } from "@/lib/types";
import type { ChildrenIndex, NodeMap } from "./tree";
import { getChildren } from "./tree";

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const clampVolume = (v: number) => clamp(Math.round(v) || 1, 1, 10);

/**
 * Volume-weighted effective progress for every node, computed bottom-up.
 *   leaf   → its own progress (0..100)
 *   parent → round( Σ(childEff × clampVolume(childVol)) / Σ clampVolume )
 * Mirrors node_effective_progress() in the database.
 */
export function computeEffectiveProgress(nodes: NodeMap, index: ChildrenIndex): Record<string, number> {
  const memo: Record<string, number> = {};

  const eff = (id: string): number => {
    const cached = memo[id];
    if (cached !== undefined) return cached;
    const node = nodes[id];
    if (!node) return 0;

    const kids = getChildren(index, id);
    if (kids.length === 0) {
      const v = clamp(node.progress, 0, 100);
      memo[id] = v;
      return v;
    }
    let totalW = 0;
    let acc = 0;
    for (const k of kids) {
      const w = clampVolume(k.volume);
      totalW += w;
      acc += eff(k.id) * w;
    }
    const v = totalW === 0 ? 0 : Math.round(acc / totalW);
    memo[id] = v;
    return v;
  };

  for (const id of Object.keys(nodes)) eff(id);
  return memo;
}

/** Effective work status from an effective-progress value. */
export function effectiveWorkStatus(effProgress: number): WorkStatus {
  if (effProgress >= 100) return "done";
  if (effProgress > 0) return "on_progress";
  return "not_started";
}

/** Overall project progress = weighted rollup across root nodes. */
export function overallProgress(roots: WbsNode[], effMap: Record<string, number>): number {
  let totalW = 0;
  let acc = 0;
  for (const r of roots) {
    const w = clampVolume(r.volume);
    totalW += w;
    acc += (effMap[r.id] ?? 0) * w;
  }
  return totalW === 0 ? 0 : Math.round(acc / totalW);
}
