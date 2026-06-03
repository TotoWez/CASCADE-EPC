import { useState, type ReactNode } from "react";
import { X, AlertTriangle } from "lucide-react";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { can } from "@/lib/permissions";
import { classifyValues, type Classification } from "@/lib/domain/bulk";
import { WORK_STATUS_LABEL } from "@/lib/types";
import type { BulkPatch } from "@/lib/api/nodes";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast, errMessage } from "@/store/toast";

type FieldKey = "workStatus" | "progress" | "priority" | "category" | "assigneeName" | "startDate" | "dueDate";

interface Pending {
  field: FieldKey;
  label: string;
  display: string;
  classification: Classification;
  buildPatch: () => BulkPatch;
  emptyIds: string[]; // nodes currently empty for this field (for "apply to empty")
}

export function BulkEditPanel() {
  const t = useTree();
  const role = useProject((s) => s.role);
  const categories = t.categories;
  const ids = t.selectedIds;
  const nodes = ids.map((id) => t.nodeMap[id]).filter(Boolean) as NonNullable<(typeof t.nodeMap)[string]>[];
  const canEdit = can(role, "wbs.build") || can(role, "wbs.editAssigned");

  const [vals, setVals] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const v = (k: FieldKey) => vals[k] ?? "";
  const setV = (k: FieldKey, val: string) => setVals((s) => ({ ...s, [k]: val }));

  function bulkCouple(field: FieldKey, value: string): BulkPatch {
    if (field === "workStatus") {
      if (value === "done") return { workStatus: "done", progress: 100 };
      if (value === "not_started") return { workStatus: "not_started", progress: 0 };
      return { workStatus: "on_progress" };
    }
    if (field === "progress") {
      const p = Math.max(0, Math.min(100, Number(value)));
      return { progress: p, workStatus: p >= 100 ? "done" : p <= 0 ? "not_started" : "on_progress" };
    }
    if (field === "priority") return { priority: Number(value) as 1 | 2 | 3 };
    if (field === "category") return { category: value };
    if (field === "assigneeName") return { assigneeName: value };
    if (field === "startDate") return { startDate: value || null };
    return { dueDate: value || null };
  }

  function getCurrent(field: FieldKey, n: (typeof nodes)[number]): unknown {
    switch (field) {
      case "workStatus": return n.workStatus;
      case "progress": return n.progress;
      case "priority": return n.priority;
      case "category": return n.category;
      case "assigneeName": return n.assignee.name;
      case "startDate": return n.startDate;
      case "dueDate": return n.dueDate;
    }
  }

  function startApply(field: FieldKey, label: string, display: string) {
    const value = v(field);
    if (field !== "assigneeName" && field !== "startDate" && field !== "dueDate" && value === "") {
      return toast.error("Choose a value first.");
    }
    const classification = classifyValues(nodes.map((n) => getCurrent(field, n)));
    const emptyIds = nodes.filter((n) => { const c = getCurrent(field, n); return c === null || c === undefined || c === ""; }).map((n) => n.id);
    setPending({ field, label, display, classification, buildPatch: () => bulkCouple(field, value), emptyIds });
  }

  async function apply(targetIds: string[]) {
    if (!pending) return;
    setBusy(true);
    try {
      const n = await t.bulkApply(targetIds, pending.buildPatch());
      toast.success(`Updated ${n} node(s).`);
      setPending(null);
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const Row = ({ field, label, children }: { field: FieldKey; label: string; children: ReactNode }) => (
    <div className="mb-3">
      <label className="mb-1 block font-mono text-2xs uppercase tracking-widest text-ink-mute">{label}</label>
      <div className="flex gap-2">
        {children}
        <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => startApply(field, label, v(field))}>Apply</Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-brand text-sm uppercase tracking-widest text-ink">{ids.length} selected</h2>
        <button onClick={t.clearSelection} className="font-mono text-2xs uppercase tracking-widest text-ink-mute hover:text-ink">Clear</button>
      </div>

      <div className="max-h-40 overflow-y-auto border-b border-line px-3 py-2">
        {nodes.map((n) => (
          <div key={n.id} className="flex items-center gap-2 py-0.5 text-sm">
            <span className="font-mono text-2xs text-ink-mute">{n.nodeCode}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{n.title}</span>
            <button onClick={() => t.select(n.id, true)} className="text-ink-mute hover:text-status-blocked"><X size={13} /></button>
          </div>
        ))}
      </div>

      {!canEdit ? (
        <div className="m-4 rounded border border-line bg-canvas px-3 py-2 text-sm text-ink-dim">Read-only — your role cannot bulk-edit.</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <Row field="workStatus" label="Status">
            <Select className="flex-1" value={v("workStatus")} onChange={(e) => setV("workStatus", e.target.value)}
              options={[{ value: "", label: "—" }, ...Object.entries(WORK_STATUS_LABEL).map(([val, l]) => ({ value: val, label: l }))]} />
          </Row>
          <Row field="progress" label="Progress %">
            <Input className="flex-1" type="number" min={0} max={100} value={v("progress")} onChange={(e) => setV("progress", e.target.value)} />
          </Row>
          <Row field="priority" label="Priority">
            <Select className="flex-1" value={v("priority")} onChange={(e) => setV("priority", e.target.value)}
              options={[{ value: "", label: "—" }, { value: "1", label: "P1" }, { value: "2", label: "P2" }, { value: "3", label: "P3" }]} />
          </Row>
          <Row field="category" label="Category">
            <Select className="flex-1" value={v("category")} onChange={(e) => setV("category", e.target.value)}
              options={[{ value: "", label: "—" }, ...categories.map((c) => ({ value: c.name, label: c.name }))]} />
          </Row>
          <Row field="assigneeName" label="Assignee name">
            <Input className="flex-1" value={v("assigneeName")} onChange={(e) => setV("assigneeName", e.target.value)} />
          </Row>
          <Row field="startDate" label="Start date">
            <Input className="flex-1" type="date" value={v("startDate")} onChange={(e) => setV("startDate", e.target.value)} />
          </Row>
          <Row field="dueDate" label="Due date">
            <Input className="flex-1" type="date" value={v("dueDate")} onChange={(e) => setV("dueDate", e.target.value)} />
          </Row>
        </div>
      )}

      {pending && (
        <Modal
          open
          onClose={() => setPending(null)}
          title={`Apply ${pending.label}`}
          size="sm"
          closeOnBackdrop={false}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
              {pending.emptyIds.length > 0 && pending.emptyIds.length < ids.length && (
                <Button variant="outline" loading={busy} onClick={() => apply(pending.emptyIds)}>Only empty ({pending.emptyIds.length})</Button>
              )}
              <Button loading={busy} onClick={() => apply(ids)}>Apply to all ({ids.length})</Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="rounded border border-line bg-canvas px-3 py-2">
              <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">New value</p>
              <p className="mt-0.5 text-ink">{pending.display || "(cleared)"}</p>
            </div>
            <div>
              <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Current selection</p>
              <p className="mt-0.5 text-ink-dim">
                {pending.classification.kind === "uniform" && "All share one value."}
                {pending.classification.kind === "empty" && "All currently empty."}
                {pending.classification.kind === "partial" && `${pending.classification.emptyCount} empty, the rest share a value.`}
                {pending.classification.kind === "mixed" && `Mixed values across ${pending.classification.total} nodes.`}
              </p>
              {pending.classification.distinct.length > 0 && (
                <p className="mt-1 text-2xs text-ink-mute">Existing: {pending.classification.distinct.slice(0, 6).join(", ")}{pending.classification.distinct.length > 6 ? "…" : ""}</p>
              )}
            </div>
            {(pending.classification.kind === "mixed" || pending.classification.kind === "partial") && (
              <p className="flex items-start gap-1.5 text-2xs text-brand-orange"><AlertTriangle size={13} className="mt-0.5 shrink-0" />This overwrites differing values. Choose carefully.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
