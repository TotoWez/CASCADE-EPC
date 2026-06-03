import type { DisplayStatus, WbsNode } from "@/lib/types";
import { effectiveWorkStatus } from "./rollup";

/** A dependency is satisfied only when its effective progress is 100 (Done). */
export function isBlocked(node: WbsNode, effMap: Record<string, number>): boolean {
  for (const depId of node.dependencies) {
    if ((effMap[depId] ?? 0) < 100) return true;
  }
  return false;
}

/**
 * Display status drives all cards, counts, filters, and reports:
 *   blocked (any dependency not done) takes precedence, else rollup status.
 */
export function displayStatus(node: WbsNode, effMap: Record<string, number>): DisplayStatus {
  if (isBlocked(node, effMap)) return "blocked";
  return effectiveWorkStatus(effMap[node.id] ?? 0);
}

/**
 * Whether a Done node reads as "cleared": QA not pending and (when the project
 * requires HSE action) HSE not in a Not-Complied state.
 */
export function isDoneCleared(node: WbsNode, status: DisplayStatus, requireHseAction: boolean): boolean {
  if (status !== "done") return false;
  if (node.qaGate === "open") return false;
  if (requireHseAction && node.hseGate === "not_complied") return false;
  return true;
}

export type DueState = "none" | "ok" | "soon" | "overdue";

/** Parse a YYYY-MM-DD due date as local end-of-day so "due today" isn't late yet. */
function endOfDay(dateStr: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  return d.getTime();
}

export function dueState(node: WbsNode, status: DisplayStatus, windowDays: number, now = Date.now()): DueState {
  if (!node.dueDate) return "none";
  const due = endOfDay(node.dueDate);
  if (due === null) return "none";
  if (status === "done") return "ok";
  if (due < now) return "overdue";
  if (due <= now + windowDays * 86400000) return "soon";
  return "ok";
}

/** Build reverse dependency map: nodeId → ids of nodes that depend on it. */
export function buildDownstreamMap(nodes: WbsNode[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      (map[dep] ??= []).push(n.id);
    }
  }
  return map;
}

/**
 * Warm→cold progress-bar color: low % warm (orange/red), high % cold (blue).
 * Linear hue interpolation, fixed saturation/lightness.
 */
export function progressColor(pct: number): string {
  const p = Math.min(Math.max(pct, 0), 100) / 100;
  const hue = Math.round(10 + p * 195); // 10 (red-orange) → 205 (blue)
  return `hsl(${hue} 72% 48%)`;
}
