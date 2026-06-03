import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown, X, Mail, Phone, ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { useAuth } from "@/store/auth";
import { can } from "@/lib/permissions";
import { getChildren } from "@/lib/domain/tree";
import { displayStatus, isDoneCleared, progressColor, volumeColor } from "@/lib/domain/status";
import { relativeTime } from "@/lib/time";
import {
  DISPLAY_STATUS_LABEL, WORK_STATUS_LABEL, QA_GATE_LABEL, HSE_GATE_LABEL,
  type WorkStatus, type QaGate, type HseGate, type Priority,
} from "@/lib/types";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { toast, errMessage } from "@/store/toast";
import { CategoryManager } from "./CategoryManager";
import { DependenciesSection } from "./inspector/DependenciesSection";
import { LinkedSection } from "./inspector/LinkedSection";
import { NotesSection } from "./inspector/NotesSection";

function Section({ title, defaultOpen = true, right, children }: { title: string; defaultOpen?: boolean; right?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-2.5 text-left">
        <span className="font-brand text-2xs uppercase tracking-widest text-ink-dim">{title}</span>
        <span className="flex items-center gap-2">{right}<ChevronDown size={15} className={clsx("text-ink-mute transition-transform", !open && "-rotate-90")} /></span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={progressColor(pct)} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" className="fill-ink font-mono" fontSize="11">{pct}</text>
    </svg>
  );
}

const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-3">
    <label className="mb-1 block font-mono text-2xs uppercase tracking-widest text-ink-mute">{label}</label>
    {children}
  </div>
);

export function Inspector() {
  const t = useTree();
  const role = useProject((s) => s.role);
  const members = useProject((s) => s.members);
  const orgMembers = useProject((s) => s.orgMembers);
  const requireHse = useProject((s) => s.project?.settings.requireHseAction ?? true);
  const myId = useAuth((s) => s.user?.id);
  const [catOpen, setCatOpen] = useState(false);

  // Assignee picker source: project members first (they carry edit scope), then
  // anyone else in the organization. De-duplicated by user id.
  const people = useMemo(() => {
    const byId = new Map<string, { userId: string; label: string; name: string; email: string; phone: string }>();
    for (const m of members) byId.set(m.userId, { userId: m.userId, label: m.name || m.email, name: m.name, email: m.email, phone: m.phone });
    for (const o of orgMembers)
      if (!byId.has(o.userId)) byId.set(o.userId, { userId: o.userId, label: `${o.name || o.email} · org`, name: o.name, email: o.email, phone: o.phone });
    return [...byId.values()];
  }, [members, orgMembers]);

  const node = t.selectedId ? t.nodeMap[t.selectedId] : undefined;

  if (!node) {
    return (
      <div className="hidden h-full flex-col items-center justify-center p-8 text-center lg:flex">
        <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">No node selected</p>
        <p className="mt-2 text-sm text-ink-dim">Select a node to inspect and edit its details.</p>
      </div>
    );
  }

  const isLeaf = getChildren(t.index, node.id).length === 0;
  const eff = t.effMap[node.id] ?? 0;
  const status = displayStatus(node, t.effMap);
  const canEdit = can(role, "wbs.build") || (can(role, "wbs.editAssigned") && node.assignedUserId === myId);
  const canQa = can(role, "gate.qa");
  const canHse = can(role, "gate.hse");
  const memberName = (id?: string | null) => (id ? members.find((m) => m.userId === id)?.name ?? "someone" : "");

  const patch = (p: Parameters<typeof t.patch>[1], activity?: Parameters<typeof t.patch>[2]) =>
    t.patch(node.id, p, activity).catch((e) => toast.error(errMessage(e)));

  // Highest progress among linked peers — used for the downward-regression warning.
  function peerMax(): number {
    if (!node!.clusterId) return -1;
    return Math.max(
      ...t.nodes.filter((n) => n.clusterId === node!.clusterId && n.id !== node!.id).map((n) => t.effMap[n.id] ?? 0),
      0,
    );
  }
  function confirmRegression(target: number): boolean {
    const pm = peerMax();
    if (pm > target) return confirm(`A linked peer is at ${pm}%. Lower the whole cluster to ${target}%?`);
    return true;
  }

  function changeStatus(ws: WorkStatus) {
    const target = ws === "done" ? 100 : ws === "not_started" ? 0 : eff <= 0 || eff >= 100 ? 50 : node!.progress;
    if (!confirmRegression(target)) return;
    void t.setStatus(node!.id, ws).catch((e) => toast.error(errMessage(e)));
  }
  function changeProgress(p: number) {
    if (!confirmRegression(p)) return;
    void t.setProgress(node!.id, p).catch((e) => toast.error(errMessage(e)));
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-start gap-3 border-b border-line px-4 py-3">
        <ProgressRing pct={eff} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-2xs text-ink-mute">
            <span>{node.nodeCode}</span>
            {node.category !== "root" && <span className="rounded bg-surface-2 px-1.5">{node.category}</span>}
            <span className="rounded px-1.5" style={{ color: progressColor(eff) }}>{DISPLAY_STATUS_LABEL[status]}</span>
          </div>
          <h2 className="mt-0.5 truncate text-sm font-medium text-ink" title={node.title}>{node.title}</h2>
        </div>
        <button onClick={() => t.select(null)} className="text-ink-mute hover:text-ink" aria-label="Close inspector"><X size={18} /></button>
      </div>

      {/* Keyed by node id so the sections reset to their defaults (only Status &
          Progress expanded) every time a different node is selected. */}
      <div key={node.id} className="min-h-0 flex-1 overflow-y-auto">
        {/* 1. Status & Progress */}
        <Section title="Status & Progress">
          {isLeaf ? (
            <>
              <FieldRow label="Work status">
                <Select value={node.workStatus} disabled={!canEdit} onChange={(e) => changeStatus(e.target.value as WorkStatus)}
                  options={Object.entries(WORK_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
              </FieldRow>
              <FieldRow label={`Progress · ${node.progress}%`}>
                <input type="range" min={0} max={100} value={node.progress} disabled={!canEdit}
                  onChange={(e) => changeProgress(Number(e.target.value))} className="w-full" style={{ accentColor: progressColor(node.progress) }} />
              </FieldRow>
            </>
          ) : (
            <div className="mb-3 rounded border border-line bg-canvas px-3 py-2 text-sm text-ink-dim">
              Auto-rolled up from children · <span className="text-ink">{DISPLAY_STATUS_LABEL[status]}</span> · {eff}%
            </div>
          )}
          {status === "done" && (
            <p className={clsx("mb-3 text-2xs", isDoneCleared(node, status, requireHse) ? "text-brand-green" : "text-brand-orange")}>
              {isDoneCleared(node, status, requireHse) ? "Done & cleared" : "Done — pending gate clearance"}
            </p>
          )}
          <FieldRow label={`Volume (weight) · ${node.volume}`}>
            <input type="range" min={1} max={10} value={node.volume} disabled={!canEdit}
              onChange={(e) => patch({ volume: Number(e.target.value) })} className="w-full" style={{ accentColor: volumeColor(node.volume) }} />
          </FieldRow>
        </Section>

        {/* 2. Notes, RFI & Gates — the gate control shown depends on the
            caller's role (QAQC owns the QAQC gate, HSE owns HSE); everyone else
            sees a read-only chip. Gate state still drives the node cards. */}
        <Section title="Notes, RFI & Gates" defaultOpen={false} right={<span className="count-badge">{node.notes.length}</span>}>
          <div className="mb-4 space-y-3 border-b border-line pb-4">
            <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">QAQC / HSE gates</p>
            <FieldRow label="QAQC gate">
              {canQa ? (
                <Select value={node.qaGate} onChange={(e) => t.setQaGate(node.id, e.target.value as QaGate, myId).catch((err) => toast.error(errMessage(err)))}
                  options={Object.entries(QA_GATE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
              ) : (
                <div className="flex items-center gap-1.5 rounded border border-line bg-canvas px-3 py-2 text-sm text-ink"><BadgeCheck size={14} className="text-brand-orange" />{QA_GATE_LABEL[node.qaGate]}</div>
              )}
              {node.qaGateAt && <p className="mt-1 text-2xs text-ink-mute">by {memberName(node.qaGateBy)} · {relativeTime(node.qaGateAt)}</p>}
            </FieldRow>
            <FieldRow label="HSE gate">
              {canHse ? (
                <Select value={node.hseGate} onChange={(e) => t.setHseGate(node.id, e.target.value as HseGate, myId).catch((err) => toast.error(errMessage(err)))}
                  options={Object.entries(HSE_GATE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
              ) : (
                <div className="flex items-center gap-1.5 rounded border border-line bg-canvas px-3 py-2 text-sm text-ink">{node.hseGate === "complied" ? <ShieldCheck size={14} className="text-brand-green" /> : <ShieldAlert size={14} className="text-status-blocked" />}{HSE_GATE_LABEL[node.hseGate]}</div>
              )}
              {node.hseGateAt && <p className="mt-1 text-2xs text-ink-mute">by {memberName(node.hseGateBy)} · {relativeTime(node.hseGateAt)}</p>}
            </FieldRow>
          </div>
          <NotesSection node={node} canEdit={canEdit} />
        </Section>

        {/* 4. Dependencies */}
        <Section title="Dependencies" defaultOpen={false} right={<span className="count-badge">{node.dependencies.length}</span>}>
          <DependenciesSection node={node} canEdit={canEdit} />
        </Section>

        {/* 5. Linked nodes */}
        <Section title="Linked nodes" defaultOpen={false}>
          <LinkedSection node={node} canEdit={canEdit} />
        </Section>

        {/* 6. Info */}
        <Section title="Info" defaultOpen={false}>
          <FieldRow label="Priority">
            <Select value={String(node.priority)} disabled={!canEdit}
              onChange={(e) => patch({ priority: Number(e.target.value) as Priority }, { type: "priority", message: `${node.nodeCode} priority P${e.target.value}` })}
              options={[{ value: "1", label: "P1 — High" }, { value: "2", label: "P2 — Medium" }, { value: "3", label: "P3 — Default" }]} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Start"><Input type="date" value={node.startDate ?? ""} disabled={!canEdit} onChange={(e) => patch({ startDate: e.target.value || null }, { type: "date", message: `${node.nodeCode} start date` })} /></FieldRow>
            <FieldRow label="Due"><Input type="date" value={node.dueDate ?? ""} disabled={!canEdit} onChange={(e) => patch({ dueDate: e.target.value || null }, { type: "date", message: `${node.nodeCode} due date` })} /></FieldRow>
          </div>
          {node.startDate && node.dueDate && (
            <div className="mb-3 -mt-1 h-1.5 w-full overflow-hidden rounded bg-surface-2" title={`${node.startDate} → ${node.dueDate}`}>
              <div className="h-full" style={{ width: `${eff}%`, backgroundColor: progressColor(eff) }} />
            </div>
          )}
          <FieldRow label="Node ID">
            <Input defaultValue={node.nodeCode} disabled={!canEdit}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== node.nodeCode) patch({ nodeCode: v }, { type: "rename", message: `Renamed ID → ${v}` }); }} className="font-mono" />
          </FieldRow>
          <FieldRow label="Category">
            <Select value={node.category} disabled={!canEdit}
              onChange={(e) => { if (e.target.value === "__add__") { setCatOpen(true); return; } patch({ category: e.target.value }, { type: "category", message: `${node.nodeCode} → ${e.target.value}` }); }}
              options={[
                ...[...new Set([node.category, ...t.categories.map((c) => c.name)])].map((c) => ({ value: c, label: c })),
                ...(can(role, "category.manage") ? [{ value: "__add__", label: "＋ Add category…" }] : []),
              ]} />
          </FieldRow>
          <FieldRow label="Title">
            <Input defaultValue={node.title} disabled={!canEdit} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== node.title) void t.rename(node.id, v); }} />
          </FieldRow>
        </Section>

        {/* 7. Assignee */}
        <Section title="Assignee" defaultOpen={false}>
          {people.length > 0 && (
            <FieldRow label="Assign to a member">
              <Select value={node.assignedUserId ?? ""} disabled={!canEdit}
                onChange={(e) => {
                  const id = e.target.value;
                  const m = people.find((x) => x.userId === id);
                  void patch(
                    { assignedUserId: id || null, ...(m ? { assignee: { name: m.name, email: m.email, phone: m.phone } } : {}) },
                    { type: "assignee", message: `${node.nodeCode} assigned${m ? ` → ${m.name || m.email}` : " (cleared)"}` },
                  );
                }}
                options={[{ value: "", label: "— None / external —" }, ...people.map((m) => ({ value: m.userId, label: m.label }))]} />
            </FieldRow>
          )}
          <p className="mb-2 mt-1 font-mono text-2xs uppercase tracking-widest text-ink-mute">
            {people.length > 0 ? "Or add manually (external)" : "Add manually (external)"}
          </p>
          <FieldRow label="Name"><Input defaultValue={node.assignee.name} disabled={!canEdit} onBlur={(e) => e.target.value !== node.assignee.name && patch({ assignee: { name: e.target.value } })} /></FieldRow>
          <FieldRow label="Email"><Input type="email" defaultValue={node.assignee.email} disabled={!canEdit} onBlur={(e) => e.target.value !== node.assignee.email && patch({ assignee: { email: e.target.value } })} /></FieldRow>
          <FieldRow label="Phone"><Input type="tel" defaultValue={node.assignee.phone} disabled={!canEdit} onBlur={(e) => e.target.value !== node.assignee.phone && patch({ assignee: { phone: e.target.value } })} /></FieldRow>
          {(node.assignee.email || node.assignee.phone) && (
            <div className="flex flex-wrap gap-2">
              {node.assignee.email && <a href={`mailto:${node.assignee.email}`} className="inline-flex max-w-full items-center gap-1 rounded border border-line px-2 py-1 text-2xs text-ink-dim hover:text-ink" title={`Email ${node.assignee.email}`}><Mail size={12} className="shrink-0" /><span className="truncate">{node.assignee.email}</span></a>}
              {node.assignee.phone && <a href={`tel:${node.assignee.phone}`} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-2xs text-ink-dim hover:text-ink" title={`Call ${node.assignee.phone}`}><Phone size={12} className="shrink-0" /><span className="truncate">{node.assignee.phone}</span></a>}
            </div>
          )}
        </Section>
      </div>
      {catOpen && <CategoryManager open={catOpen} onClose={() => setCatOpen(false)} />}
    </div>
  );
}
