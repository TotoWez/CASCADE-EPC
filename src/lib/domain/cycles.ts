import type { WbsNode } from "@/lib/types";
import type { NodeMap } from "./tree";

/**
 * Would adding "nodeId depends on targetId" create a dependency cycle?
 * A cycle exists if target can already reach node through existing
 * dependency edges (target → … → node), or if target === node.
 */
export function dependencyWouldCreateCycle(nodes: NodeMap, nodeId: string, targetId: string): boolean {
  if (nodeId === targetId) return true;
  const seen = new Set<string>();
  const stack = [targetId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === nodeId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const n = nodes[cur];
    if (n) stack.push(...n.dependencies);
  }
  return false;
}

/**
 * Valid dependency candidates for a node: every other node, excluding self,
 * existing dependencies, and any node that would create a cycle.
 */
export function validDependencyTargets(nodes: NodeMap, nodeId: string): WbsNode[] {
  const node = nodes[nodeId];
  if (!node) return [];
  const existing = new Set(node.dependencies);
  return Object.values(nodes).filter(
    (cand) =>
      cand.id !== nodeId &&
      cand.category !== "root" &&
      !existing.has(cand.id) &&
      !dependencyWouldCreateCycle(nodes, nodeId, cand.id),
  );
}

/** All members of a linked cluster (including the given node). */
export function clusterMembers(nodes: WbsNode[], clusterId: string | null): WbsNode[] {
  if (!clusterId) return [];
  return nodes.filter((n) => n.clusterId === clusterId);
}

/** Valid link candidates: other nodes not already in this node's cluster. */
export function validLinkTargets(nodes: WbsNode[], node: WbsNode): WbsNode[] {
  return nodes.filter(
    (cand) =>
      cand.id !== node.id &&
      cand.category !== "root" &&
      (!node.clusterId || cand.clusterId !== node.clusterId),
  );
}
