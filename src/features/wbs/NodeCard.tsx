import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronRight, ChevronDown, Plus, Trash2, GripVertical, Flag, Lock,
  GitBranch, Link2, MessageSquare, ShieldCheck, ShieldAlert, BadgeCheck, Clock,
} from "lucide-react";
import type { DisplayStatus, WbsNode } from "@/lib/types";
import { PRIORITY_LABEL } from "@/lib/types";
import type { DueState } from "@/lib/domain/status";
import { progressColor } from "@/lib/domain/status";

const STATUS_DOT: Record<DisplayStatus, string> = {
  not_started: "bg-status-notstarted",
  on_progress: "bg-status-progress",
  done: "bg-status-done",
  blocked: "bg-status-blocked",
};
// Solid, high-contrast priority flags so the colour reads at a glance.
const PRIORITY_CLS: Record<number, string> = {
  1: "bg-priority-p1 text-white border-priority-p1",
  2: "bg-priority-p2 text-white border-priority-p2",
  3: "bg-priority-p3 text-white border-priority-p3",
};
const DUE_CLS: Record<DueState, string> = {
  none: "", ok: "text-ink-mute", soon: "text-brand-orange", overdue: "text-status-blocked",
};

export interface NodeCardProps {
  node: WbsNode;
  accent: string;
  effProgress: number;
  status: DisplayStatus;
  due: DueState;
  downstreamCount: number;
  clusterSize: number;
  hasChildren: boolean;
  childCount: number;
  expanded: boolean;
  selected: boolean;
  multiSelected?: boolean;
  noteCount: number;
  openNoteCount: number;
  matched?: boolean; // search match
  dimmed?: boolean; // non-match while searching
  canEdit: boolean;
  canBuild: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggle: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  dragHandle?: { attributes: any; listeners: any };
}

export function NodeCard(props: NodeCardProps) {
  const { node, status, effProgress } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const t = draft.trim();
    if (t && t !== node.title) props.onRename(t);
    else setDraft(node.title);
    setEditing(false);
  }

  const gateQa = node.qaGate !== "na";
  const gateHse = node.hseGate !== "na";

  return (
    <div
      data-node-id={node.id}
      onClick={props.onSelect}
      className={clsx(
        "group relative flex w-full max-w-[640px] flex-col overflow-hidden rounded border bg-surface transition-shadow [contain-intrinsic-size:auto_72px] [content-visibility:auto]",
        props.selected || props.multiSelected ? "border-brand-blue ring-1 ring-brand-blue/60" : "border-line hover:border-ink-mute",
        props.dimmed && "opacity-40",
      )}
    >
      {/* sibling/category accent bar */}
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: props.accent }} />

      <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 pt-1.5">
        {props.hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); props.onToggle(); }} className="text-ink-mute hover:text-ink" aria-label={props.expanded ? "Collapse" : "Expand"}>
            {props.expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <span className="w-[15px]" />
        )}

        <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[status])} title={status} />
        <span className="font-mono text-2xs text-ink-dim">{node.nodeCode}</span>

        <span className={clsx("rounded border px-1 font-mono text-2xs font-semibold", PRIORITY_CLS[node.priority])} title={`Priority ${node.priority}`}>
          <Flag size={9} className="-mt-0.5 mr-0.5 inline" />{PRIORITY_LABEL[node.priority]}
        </span>
        {node.category !== "root" && (
          <span className="hidden rounded bg-surface-2 px-1.5 font-mono text-2xs text-ink-dim sm:inline">{node.category}</span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {status === "blocked" && <span className="flex items-center gap-0.5 rounded bg-status-blocked/15 px-1 text-2xs text-status-blocked" title="Blocked by dependency"><Lock size={10} />blocked</span>}
          {props.downstreamCount > 0 && <span className="flex items-center gap-0.5 text-2xs text-ink-mute" title={`${props.downstreamCount} downstream`}><GitBranch size={11} />{props.downstreamCount}</span>}
          {props.clusterSize > 1 && <span className="flex items-center gap-0.5 text-2xs text-brand-blue-light" title="Linked cluster"><Link2 size={11} />{props.clusterSize}</span>}

          {gateQa && <span className={clsx("rounded px-1 text-2xs", node.qaGate === "closed" ? "bg-brand-green/15 text-brand-green" : "bg-brand-orange/15 text-brand-orange")} title={`QAQC: ${node.qaGate}`}><BadgeCheck size={10} className="-mt-0.5 mr-0.5 inline" />QAQC</span>}
          {gateHse && <span className={clsx("rounded px-1 text-2xs", node.hseGate === "complied" ? "bg-brand-green/15 text-brand-green" : "bg-status-blocked/15 text-status-blocked")} title={`HSE: ${node.hseGate}`}>{node.hseGate === "complied" ? <ShieldCheck size={10} className="-mt-0.5 mr-0.5 inline" /> : <ShieldAlert size={10} className="-mt-0.5 mr-0.5 inline" />}HSE</span>}

          {props.noteCount > 0 && (
            <span className={clsx("flex items-center gap-0.5 text-2xs", props.openNoteCount > 0 ? "text-status-blocked" : "text-brand-green")} title={`${props.noteCount} notes`}>
              <MessageSquare size={11} />{props.noteCount}
            </span>
          )}

          {props.canBuild && (
            <button onClick={(e) => { e.stopPropagation(); props.onAddChild(); }} className="text-ink-mute hover:text-brand-blue" title="Add child"><Plus size={14} /></button>
          )}
          {props.canBuild && node.category !== "root" && (
            <button onClick={(e) => { e.stopPropagation(); props.onDelete(); }} className="text-ink-mute hover:text-status-blocked" title="Delete"><Trash2 size={13} /></button>
          )}
          {props.canBuild && props.dragHandle && (
            <button {...props.dragHandle.attributes} {...props.dragHandle.listeners} onClick={(e) => e.stopPropagation()} className="cursor-grab text-ink-mute hover:text-ink active:cursor-grabbing" title="Drag to reorder"><GripVertical size={14} /></button>
          )}
        </div>
      </div>

      {/* title */}
      <div className="px-2.5 pb-1 pl-7">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(node.title); setEditing(false); }
            }}
            maxLength={160}
            className="w-full rounded border border-brand-blue bg-canvas px-1.5 py-0.5 text-sm text-ink"
          />
        ) : (
          <button
            onDoubleClick={() => props.canEdit && setEditing(true)}
            onClick={(e) => e.stopPropagation()}
            className={clsx("text-left text-sm font-medium text-ink", props.matched && "bg-brand-blue/20")}
            title={props.canEdit ? "Double-click to rename" : undefined}
          >
            {node.title}
          </button>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center gap-2 px-2.5 pb-1.5 pl-7 font-mono text-2xs text-ink-mute">
        {node.assignee.name && <span className="truncate">{node.assignee.name}</span>}
        {node.dueDate && <span className={clsx("flex items-center gap-0.5", DUE_CLS[props.due])}><Clock size={10} />{node.dueDate}</span>}
        {props.childCount > 0 && <span>{props.childCount} ch</span>}
        <span className="ml-auto text-ink-dim">{effProgress}%</span>
      </div>

      {/* slim progress bar */}
      <div className="h-1 w-full bg-surface-2">
        <div className="h-full transition-[width]" style={{ width: `${effProgress}%`, backgroundColor: progressColor(effProgress) }} />
      </div>
    </div>
  );
}
