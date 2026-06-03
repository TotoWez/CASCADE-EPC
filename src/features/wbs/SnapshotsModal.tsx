import { useEffect, useMemo, useState } from "react";
import { Camera, Trash2, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { can } from "@/lib/permissions";
import { getChildren } from "@/lib/domain/tree";
import { overallProgress } from "@/lib/domain/rollup";
import { diffSnapshots, type SnapshotDiff } from "@/lib/domain/snapshotDiff";
import {
  saveSnapshot, listSnapshots, deleteSnapshot, deleteAllSnapshots, getSnapshotState, type SnapshotMeta,
} from "@/lib/api/snapshots";
import { ProgressChart } from "./ProgressChart";
import { toast, errMessage } from "@/store/toast";

const shortDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function SnapshotsModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const role = useProject((s) => s.role);
  const t = useTree();
  const canSave = can(role, "snapshot.save");
  const canDelete = can(role, "snapshot.delete");

  const currentOverall = overallProgress(getChildren(t.index, null), t.effMap);

  const [snaps, setSnaps] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [diff, setDiff] = useState<{ older: SnapshotMeta; newer: SnapshotMeta; data: SnapshotDiff } | null>(null);

  async function reload() {
    setSnaps(await listSnapshots(projectId));
  }
  useEffect(() => {
    reload().catch((e) => toast.error(errMessage(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const chartPoints = useMemo(
    () => [...snaps.map((s) => ({ label: shortDate(s.takenAt), pct: Math.round(s.overallProgress) })), { label: "NOW", pct: currentOverall }],
    [snaps, currentOverall],
  );

  function togglePick(id: string) {
    setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2))); // keep newest two
  }

  async function onSave() {
    setBusy(true);
    try {
      await saveSnapshot(projectId);
      await reload();
      toast.success("Snapshot saved.");
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onCompare() {
    const two = snaps.filter((s) => pick.includes(s.id)).sort((a, b) => +new Date(a.takenAt) - +new Date(b.takenAt));
    if (two.length !== 2) return;
    try {
      const [oa, ob] = await Promise.all([getSnapshotState(two[0]!.id), getSnapshotState(two[1]!.id)]);
      setDiff({ older: two[0]!, newer: two[1]!, data: diffSnapshots(oa, ob) });
    } catch (e) {
      toast.error(errMessage(e));
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this snapshot?")) return;
    try { await deleteSnapshot(id); await reload(); } catch (e) { toast.error(errMessage(e)); }
  }
  async function onClearAll() {
    if (!confirm("Delete ALL snapshots? This cannot be undone.")) return;
    try { await deleteAllSnapshots(projectId); await reload(); } catch (e) { toast.error(errMessage(e)); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Snapshots"
      size="lg"
      footer={
        diff ? (
          <Button variant="ghost" onClick={() => setDiff(null)}><ArrowLeft size={14} /> Back</Button>
        ) : (
          <>
            {canSave && <Button onClick={onSave} loading={busy}><Camera size={14} /> Save snapshot</Button>}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </>
        )
      }
    >
      {diff ? (
        <CompareView older={diff.older} newer={diff.newer} data={diff.data} />
      ) : (
        <>
          {chartPoints.length >= 3 ? (
            <ProgressChart points={chartPoints} />
          ) : (
            <div className="rounded border border-dashed border-line bg-canvas p-6 text-center text-sm text-ink-dim">
              Save at least two snapshots to chart progress. Current: <span className="text-ink">{currentOverall}%</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">{snaps.length} snapshot(s) · select two to compare</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pick.length !== 2} onClick={onCompare}>Compare</Button>
              {canDelete && snaps.length > 0 && <Button size="sm" variant="danger" onClick={onClearAll}><Trash2 size={12} /> Clear</Button>}
            </div>
          </div>

          {loading ? (
            <p className="py-6 text-center text-sm text-ink-dim">Loading…</p>
          ) : (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded border border-line">
              {snaps.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-dim">No snapshots yet.</li>}
              {[...snaps].reverse().map((s) => (
                <li key={s.id} className="flex items-center gap-2 bg-surface px-3 py-2">
                  <input type="checkbox" checked={pick.includes(s.id)} onChange={() => togglePick(s.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{s.name}{s.isAuto && <span className="ml-1 count-badge">auto</span>}</p>
                    <p className="font-mono text-2xs text-ink-mute">{s.nodeCount} nodes</p>
                  </div>
                  <span className="font-mono text-sm text-ink">{Math.round(s.overallProgress)}%</span>
                  {canDelete && <button onClick={() => onDelete(s.id)} className="text-ink-mute hover:text-status-blocked"><Trash2 size={14} /></button>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

function CompareView({ older, newer, data }: { older: SnapshotMeta; newer: SnapshotMeta; data: SnapshotDiff }) {
  const delta = Math.round(newer.overallProgress) - Math.round(older.overallProgress);
  const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[older, newer].map((s, i) => (
          <div key={s.id} className="rounded border border-line bg-canvas p-3">
            <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">{i === 0 ? "Older" : "Newer"}</p>
            <p className="mt-1 truncate text-sm text-ink">{s.name}</p>
            <p className="mt-1 font-mono text-2xl text-ink">{Math.round(s.overallProgress)}%</p>
            <p className="font-mono text-2xs text-ink-mute">{s.nodeCount} nodes</p>
          </div>
        ))}
      </div>
      <p className={`flex items-center gap-1.5 font-mono text-sm ${delta > 0 ? "text-brand-green" : delta < 0 ? "text-status-blocked" : "text-ink-mute"}`}>
        <Trend size={16} /> {delta > 0 ? "+" : ""}{delta}% overall
      </p>

      <DiffList title="Progress / status changes" items={data.changes.map((c) => `${c.code} · ${c.fromProgress}%→${c.toProgress}%`)} />
      <DiffList title="Added nodes" items={data.added.map((a) => `${a.code} · ${a.title}`)} />
      <DiffList title="Removed nodes" items={data.removed.map((r) => `${r.code} · ${r.title}`)} />
    </div>
  );
}

function DiffList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 12);
  return (
    <div>
      <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-ink-mute">{title} ({items.length})</p>
      <ul className="space-y-0.5 text-sm text-ink-dim">
        {shown.map((it, i) => <li key={i} className="truncate font-mono text-2xs">{it}</li>)}
        {items.length > shown.length && <li className="text-2xs text-ink-mute">and {items.length - shown.length} more…</li>}
      </ul>
    </div>
  );
}
