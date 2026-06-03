import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Plus, FoldVertical, UnfoldVertical, Tags, Loader2, Spline, ClipboardPaste, History, X, Camera, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { useAuth } from "@/store/auth";
import { can } from "@/lib/permissions";
import { getChildren } from "@/lib/domain/tree";
import { displayStatus, dueState } from "@/lib/domain/status";
import { isMatch, matchesSearch, filtersActive } from "@/lib/domain/filter";
import { siblingAccent } from "@/lib/domain/color";
import { toast, errMessage } from "@/store/toast";
import { NodeCard } from "./NodeCard";
import { FilterBar } from "./FilterBar";
import { CategoryManager } from "./CategoryManager";
import { DependencyLines } from "./DependencyLines";
import { ActivityModal } from "./ActivityModal";
import { SnapshotsModal } from "./SnapshotsModal";
import { ReportMenu } from "./ReportMenu";
import type { WbsNode } from "@/lib/types";

export function TreeCanvas() {
  const t = useTree();
  const project = useProject((s) => s.project);
  const role = useProject((s) => s.role);
  const myId = useAuth((s) => s.user?.id);
  const [showCats, setShowCats] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showSnaps, setShowSnaps] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setZoom = t.setZoom;
  const zoom = t.zoom;

  // Ctrl/Cmd + wheel zooms the tree only (native listener so we can preventDefault).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom(useTree.getState().zoom + -e.deltaY * 0.0015);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  const canBuild = can(role, "wbs.build");
  const requireHse = project?.settings.requireHseAction ?? true;
  const windowN = project?.settings.dueWindowN ?? 7;

  const clusterCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of t.nodes) if (n.clusterId) m[n.clusterId] = (m[n.clusterId] ?? 0) + 1;
    return m;
  }, [t.nodes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = t.nodeMap[active.id as string];
    const b = t.nodeMap[over.id as string];
    if (!a || !b || a.parentId !== b.parentId) return; // siblings only
    const sibs = getChildren(t.index, a.parentId).map((n) => n.id);
    const from = sibs.indexOf(active.id as string);
    const to = sibs.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    void t.reorder(a.parentId, arrayMove(sibs, from, to)).catch((err) => toast.error(errMessage(err)));
  }

  function canEditNode(n: WbsNode): boolean {
    if (canBuild) return true;
    return can(role, "wbs.editAssigned") && n.assignedUserId === myId;
  }

  async function addRoot() {
    try {
      await t.addChild(null, { title: "New Root", category: "root" });
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  if (t.loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-brand-blue" size={26} /></div>;
  }

  const roots = getChildren(t.index, null);

  return (
    <div className="bg-engineering">
      <FilterBar onManageCategories={() => setShowCats(true)} />
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/60 px-4 py-2">
        {canBuild && (
          <button onClick={addRoot} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
            <Plus size={14} /> Root
          </button>
        )}
        <button onClick={t.expandAll} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
          <UnfoldVertical size={14} /> Expand all
        </button>
        <button onClick={t.collapseAll} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
          <FoldVertical size={14} /> Collapse all
        </button>
        {can(role, "category.manage") && (
          <button onClick={() => setShowCats(true)} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
            <Tags size={14} /> Categories
          </button>
        )}
        <button
          onClick={t.toggleLines}
          className={clsx(
            "inline-flex items-center gap-1 rounded border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest",
            t.linesOn ? "border-brand-blue bg-brand-blue/10 text-ink" : "border-line bg-surface text-ink-dim hover:text-ink hover:border-ink-mute",
          )}
          title="Toggle dependency/link lines for the selected node"
        >
          <Spline size={14} /> Lines
        </button>
        {canBuild && (
          <button onClick={() => void t.paste(t.selectedId)} disabled={!t.clipboard} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute disabled:opacity-40" title="Paste under selected (Ctrl/Cmd+V)">
            <ClipboardPaste size={14} /> Paste
          </button>
        )}
        {t.clipboard && (
          <span className="inline-flex items-center gap-1 count-badge">
            clip {t.clipboard.nodes.length}{t.clipboard.withKids ? " +kids" : ""}
            <button onClick={t.clearClipboard} className="hover:text-status-blocked" title="Clear clipboard"><X size={11} /></button>
          </span>
        )}
        <button onClick={() => setShowActivity(true)} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
          <History size={14} /> Activity
        </button>
        <button onClick={() => setShowSnaps(true)} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
          <Camera size={14} /> Snapshots
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded border border-line bg-surface px-1 py-0.5">
            <button onClick={() => setZoom(zoom - 0.1)} className="p-1 text-ink-mute hover:text-ink" title="Zoom out"><ZoomOut size={13} /></button>
            <button onClick={() => setZoom(1)} className="w-10 text-center font-mono text-2xs text-ink-dim hover:text-ink" title="Reset zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(zoom + 0.1)} className="p-1 text-ink-mute hover:text-ink" title="Zoom in"><ZoomIn size={13} /></button>
            <button onClick={() => setZoom(1)} className="p-1 text-ink-mute hover:text-ink" title="Reset zoom"><RotateCcw size={12} /></button>
          </div>
          <ReportMenu />
          <span className="count-badge">{t.nodes.length} nodes</span>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto">
        <div className="p-4" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
          {roots.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-surface p-12 text-center">
              <p className="text-sm text-ink-dim">No WBS yet.{canBuild ? " Add a root node to begin." : ""}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <Branch parentId={null} canEditNode={canEditNode} canBuild={canBuild} requireHse={requireHse} windowN={windowN} clusterCounts={clusterCounts} />
            </DndContext>
          )}
        </div>
      </div>

      {showCats && <CategoryManager open={showCats} onClose={() => setShowCats(false)} />}
      {showActivity && project && <ActivityModal open={showActivity} onClose={() => setShowActivity(false)} projectId={project.id} />}
      {showSnaps && project && <SnapshotsModal open={showSnaps} onClose={() => setShowSnaps(false)} projectId={project.id} />}
      <DependencyLines />
    </div>
  );
}

function Branch({
  parentId, canEditNode, canBuild, requireHse, windowN, clusterCounts,
}: {
  parentId: string | null;
  canEditNode: (n: WbsNode) => boolean;
  canBuild: boolean;
  requireHse: boolean;
  windowN: number;
  clusterCounts: Record<string, number>;
}) {
  const t = useTree();
  const children = getChildren(t.index, parentId);
  const ids = children.map((n) => n.id);
  const fActive = filtersActive(t.filters);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={parentId === null ? "space-y-1.5" : "ml-4 space-y-1.5 border-l border-line pl-3"}>
        {children.map((node) => {
          const status = displayStatus(node, t.effMap);
          const kids = getChildren(t.index, node.id);
          return (
            <div key={node.id}>
              <SortableNode
                node={node}
                disabled={!canBuild}
                accent={siblingAccent(node.parentId)}
                effProgress={t.effMap[node.id] ?? 0}
                status={status}
                due={dueState(node, status, windowN)}
                downstreamCount={t.downstream[node.id]?.length ?? 0}
                clusterSize={node.clusterId ? clusterCounts[node.clusterId] ?? 1 : 1}
                hasChildren={kids.length > 0}
                childCount={kids.length}
                expanded={t.expanded.has(node.id)}
                selected={t.selectedId === node.id}
                multiSelected={t.selectedIds.includes(node.id)}
                noteCount={node.notes.length}
                openNoteCount={node.notes.filter((n) => !n.checked).length}
                canEdit={canEditNode(node)}
                canBuild={canBuild}
                matched={!!t.filters.search.trim() && matchesSearch(node, t.filters.search)}
                dimmed={fActive && !isMatch(node, t.filters, t.effMap)}
              />
              {kids.length > 0 && t.expanded.has(node.id) && (
                <div className="mt-1.5">
                  <Branch parentId={node.id} canEditNode={canEditNode} canBuild={canBuild} requireHse={requireHse} windowN={windowN} clusterCounts={clusterCounts} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
}

type SortableNodeProps = Omit<Parameters<typeof NodeCard>[0], "onSelect" | "onToggle" | "onAddChild" | "onDelete" | "onRename" | "dragHandle"> & {
  disabled: boolean;
};

function SortableNode({ disabled, ...cardProps }: SortableNodeProps) {
  const t = useTree();
  const node = cardProps.node;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <NodeCard
        {...cardProps}
        onSelect={(e) => t.select(node.id, e.ctrlKey || e.metaKey)}
        onToggle={() => t.toggleExpand(node.id)}
        onAddChild={() => void t.addChild(node.id).catch((e) => toast.error(errMessage(e)))}
        onDelete={() => {
          if (confirm(`Delete ${node.nodeCode} and all its children?`)) void t.remove(node.id).catch((e) => toast.error(errMessage(e)));
        }}
        onRename={(title) => void t.rename(node.id, title).catch((e) => toast.error(errMessage(e)))}
        dragHandle={{ attributes, listeners }}
      />
    </div>
  );
}
