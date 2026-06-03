import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { getChildren } from "@/lib/domain/tree";
import { displayStatus } from "@/lib/domain/status";
import { toast, errMessage } from "@/store/toast";

export function SelectedReportPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTree();
  const project = useProject((s) => s.project);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const flat = useMemo(() => {
    const rows: { id: string; code: string; title: string; depth: number }[] = [];
    const walk = (pid: string | null, depth: number) => {
      for (const c of getChildren(t.index, pid)) { rows.push({ id: c.id, code: c.nodeCode, title: c.title, depth }); walk(c.id, depth + 1); }
    };
    walk(null, 0);
    return rows;
  }, [t.index]);

  const filtered = q.trim()
    ? flat.filter((r) => `${r.code} ${r.title}`.toLowerCase().includes(q.trim().toLowerCase()))
    : flat;

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = () => setSel(new Set(flat.map((r) => r.id)));
  const none = () => setSel(new Set());
  const p1Only = () => setSel(new Set(t.nodes.filter((n) => n.priority === 1).map((n) => n.id)));
  const unfinished = () => setSel(new Set(t.nodes.filter((n) => displayStatus(n, t.effMap) !== "done").map((n) => n.id)));

  async function generate() {
    if (!project || sel.size === 0) return;
    setBusy(true);
    try {
      const { selectedReport } = await import("@/lib/pdf/treeReport");
      await selectedReport(project, t.nodes, [...sel]);
      onClose();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selected nodes report"
      size="md"
      footer={
        <>
          <span className="mr-auto font-mono text-2xs text-ink-mute">{sel.size} selected</span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={generate} loading={busy} disabled={sel.size === 0}>Generate</Button>
        </>
      }
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={all}>All</Button>
        <Button size="sm" variant="outline" onClick={none}>None</Button>
        <Button size="sm" variant="outline" onClick={p1Only}>P1 only</Button>
        <Button size="sm" variant="outline" onClick={unfinished}>Unfinished</Button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-2" />
      <div className="max-h-72 space-y-0.5 overflow-y-auto">
        {filtered.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-surface-2" style={{ paddingLeft: `${r.depth * 12 + 4}px` }}>
            <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
            <span className="font-mono text-2xs text-ink-mute">{r.code}</span>
            <span className="truncate text-ink">{r.title}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
