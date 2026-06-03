import type { DisplayStatus, Priority, WbsNode } from "@/lib/types";
import { displayStatus, dueState } from "./status";

export interface Filters {
  search: string;
  statuses: Set<DisplayStatus>;
  priorities: Set<Priority>;
  qaOpen: boolean;
  qaClosed: boolean;
  hseNot: boolean;
  dueOn: boolean;
  dueN: number;
  category: string | null;
}

export const emptyFilters = (): Filters => ({
  search: "",
  statuses: new Set(),
  priorities: new Set(),
  qaOpen: false,
  qaClosed: false,
  hseNot: false,
  dueOn: false,
  dueN: 7,
  category: null,
});

export function filtersActive(f: Filters): boolean {
  return (
    f.search.trim() !== "" ||
    f.statuses.size > 0 ||
    f.priorities.size > 0 ||
    f.qaOpen || f.qaClosed || f.hseNot ||
    f.dueOn ||
    f.category !== null
  );
}

/** True if the search term matches a node's title or ID. */
export function matchesSearch(node: WbsNode, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return false;
  return node.title.toLowerCase().includes(q) || node.nodeCode.toLowerCase().includes(q);
}

/** Does a node satisfy all active filter groups? (gate group is OR within itself) */
export function isMatch(node: WbsNode, f: Filters, effMap: Record<string, number>): boolean {
  if (f.search.trim() && !matchesSearch(node, f.search)) return false;
  const status = displayStatus(node, effMap);
  if (f.statuses.size > 0 && !f.statuses.has(status)) return false;
  if (f.priorities.size > 0 && !f.priorities.has(node.priority)) return false;
  if (f.qaOpen || f.qaClosed || f.hseNot) {
    const ok = (f.qaOpen && node.qaGate === "open") || (f.qaClosed && node.qaGate === "closed") || (f.hseNot && node.hseGate === "not_complied");
    if (!ok) return false;
  }
  if (f.dueOn) {
    const d = dueState(node, status, f.dueN);
    if (d !== "soon" && d !== "overdue") return false;
  }
  if (f.category !== null && node.category !== f.category) return false;
  return true;
}

export interface FilterCounts {
  statuses: Record<DisplayStatus, number>;
  priorities: Record<Priority, number>;
  qaOpen: number;
  qaClosed: number;
  hseNot: number;
  due: number;
  categories: Record<string, number>;
}

/** Live counts. Status/priority/due use leaf nodes; gates/categories use all. */
export function computeCounts(nodes: WbsNode[], effMap: Record<string, number>, leafIds: Set<string>, dueN: number): FilterCounts {
  const counts: FilterCounts = {
    statuses: { not_started: 0, on_progress: 0, done: 0, blocked: 0 },
    priorities: { 1: 0, 2: 0, 3: 0 },
    qaOpen: 0, qaClosed: 0, hseNot: 0, due: 0, categories: {},
  };
  for (const n of nodes) {
    const status = displayStatus(n, effMap);
    if (leafIds.has(n.id)) {
      counts.statuses[status]++;
      if (status !== "done") counts.priorities[n.priority]++;
      const d = dueState(n, status, dueN);
      if (d === "soon" || d === "overdue") counts.due++;
    }
    if (n.qaGate === "open") counts.qaOpen++;
    if (n.qaGate === "closed") counts.qaClosed++;
    if (n.hseGate === "not_complied") counts.hseNot++;
    counts.categories[n.category] = (counts.categories[n.category] ?? 0) + 1;
  }
  return counts;
}
