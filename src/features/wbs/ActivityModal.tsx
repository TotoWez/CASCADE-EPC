import { useEffect, useMemo, useState } from "react";
import { Trash2, CornerDownRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { can } from "@/lib/permissions";
import { relativeTime } from "@/lib/time";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { listActivity, clearActivity, type ActivityRow } from "@/lib/api/activity";
import { toast, errMessage } from "@/store/toast";

const TYPES = [
  "status", "progress", "gate", "bulk", "create", "delete", "copy", "paste", "rename",
  "note", "category", "priority", "assignee", "date", "dependency", "link", "reorder", "snapshot", "report",
];

export function ActivityModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const role = useProject((s) => s.role);
  const nodeMap = useTree((s) => s.nodeMap);
  const select = useTree((s) => s.select);

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    listActivity(projectId).then(setRows).catch((e) => toast.error(errMessage(e))).finally(() => setLoading(false));
  }, [projectId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!type || r.type === type) &&
        (!roleFilter || r.role === roleFilter) &&
        (!needle || r.message.toLowerCase().includes(needle)),
    );
  }, [rows, type, roleFilter, q]);

  function jump(r: ActivityRow) {
    if (r.nodeId && nodeMap[r.nodeId]) {
      select(r.nodeId);
      onClose();
    }
  }

  async function onClear() {
    if (!confirm("Clear the entire activity timeline? This cannot be undone.")) return;
    try {
      await clearActivity(projectId);
      setRows([]);
    } catch (e) {
      toast.error(errMessage(e));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activity Timeline"
      size="lg"
      footer={
        <>
          <span className="mr-auto font-mono text-2xs text-ink-mute">{filtered.length} of {rows.length}</span>
          {can(role, "activity.clear") && (
            <Button variant="danger" onClick={onClear}><Trash2 size={13} /> Clear all</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: "", label: "All types" }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={[{ value: "", label: "All roles" }, ...(["developer", "admin", "manager", "engineer", "supervisor", "qaqc", "hse", "viewer"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))]} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-dim">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-dim">No activity.</p>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
          {filtered.map((r) => {
            const live = r.nodeId && nodeMap[r.nodeId];
            return (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-20 shrink-0 font-mono text-2xs text-ink-mute">{relativeTime(r.createdAt)}</span>
                {r.role && <span className="count-badge shrink-0">{ROLE_LABEL[r.role as Role] ?? r.role}</span>}
                <span className="min-w-0 flex-1 truncate text-ink">{r.message}</span>
                {r.nodeCode && (
                  live ? (
                    <button onClick={() => jump(r)} className="inline-flex shrink-0 items-center gap-0.5 font-mono text-2xs text-brand-blue hover:underline">
                      <CornerDownRight size={11} />{r.nodeCode}
                    </button>
                  ) : (
                    <span className="shrink-0 font-mono text-2xs text-ink-mute line-through">{r.nodeCode}</span>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
