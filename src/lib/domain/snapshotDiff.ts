import type { SnapshotState } from "@/lib/api/snapshots";

export interface NodeChange {
  id: string;
  code: string;
  title: string;
  fromProgress: number;
  toProgress: number;
  fromStatus: string;
  toStatus: string;
}

export interface SnapshotDiff {
  changes: NodeChange[];
  added: { code: string; title: string }[];
  removed: { code: string; title: string }[];
}

/** Diff two snapshot states by node id (progress + work status). */
export function diffSnapshots(older: SnapshotState, newer: SnapshotState): SnapshotDiff {
  const a = new Map(older.nodes.map((n) => [n.id, n]));
  const b = new Map(newer.nodes.map((n) => [n.id, n]));
  const changes: NodeChange[] = [];
  const added: { code: string; title: string }[] = [];
  const removed: { code: string; title: string }[] = [];

  for (const [id, nn] of b) {
    const on = a.get(id);
    if (!on) {
      added.push({ code: nn.node_code, title: nn.title });
    } else if (on.progress !== nn.progress || on.work_status !== nn.work_status) {
      changes.push({
        id, code: nn.node_code, title: nn.title,
        fromProgress: on.progress, toProgress: nn.progress,
        fromStatus: on.work_status, toStatus: nn.work_status,
      });
    }
  }
  for (const [id, on] of a) if (!b.has(id)) removed.push({ code: on.node_code, title: on.title });

  changes.sort((x, y) => Math.abs(y.toProgress - y.fromProgress) - Math.abs(x.toProgress - x.fromProgress));
  return { changes, added, removed };
}
