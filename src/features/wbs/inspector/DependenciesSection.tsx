import { useState } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { useTree } from "@/store/tree";
import { validDependencyTargets } from "@/lib/domain/cycles";
import { toast, errMessage } from "@/store/toast";
import type { WbsNode } from "@/lib/types";
import { NodePickerModal } from "./NodePickerModal";

export function DependenciesSection({ node, canEdit }: { node: WbsNode; canEdit: boolean }) {
  const t = useTree();
  const [picking, setPicking] = useState(false);
  const downstream = t.downstream[node.id] ?? [];

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Depends on (blocks until done)</p>
          {canEdit && (
            <button onClick={() => setPicking(true)} className="inline-flex items-center gap-1 text-2xs text-brand-blue hover:underline">
              <Plus size={12} /> Add
            </button>
          )}
        </div>
        {node.dependencies.length === 0 ? (
          <p className="text-sm text-ink-dim">No dependencies.</p>
        ) : (
          <ul className="space-y-1">
            {node.dependencies.map((id) => {
              const dep = t.nodeMap[id];
              const done = (t.effMap[id] ?? 0) >= 100;
              return (
                <li key={id} className="flex items-center justify-between gap-2 rounded border border-line bg-canvas px-2 py-1 text-sm">
                  <button onClick={() => t.select(id)} className="min-w-0 flex-1 truncate text-left text-ink hover:text-brand-blue">
                    {dep ? `${dep.nodeCode} · ${dep.title}` : id}
                  </button>
                  <span className={done ? "text-2xs text-brand-green" : "text-2xs text-status-blocked"}>{done ? "done" : "pending"}</span>
                  {canEdit && (
                    <button onClick={() => void t.removeDependency(node.id, id).catch((e) => toast.error(errMessage(e)))} className="text-ink-mute hover:text-status-blocked">
                      <X size={13} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {downstream.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-2xs uppercase tracking-widest text-ink-mute">Downstream impact</p>
          <ul className="space-y-1">
            {downstream.map((id) => {
              const d = t.nodeMap[id];
              return (
                <li key={id} className="flex items-center gap-1.5 text-sm text-ink-dim">
                  <ArrowRight size={12} className="text-ink-mute" />
                  <button onClick={() => t.select(id)} className="truncate hover:text-brand-blue">{d ? `${d.nodeCode} · ${d.title}` : id}</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {picking && (
        <NodePickerModal
          open={picking}
          onClose={() => setPicking(false)}
          title="Add dependency"
          candidates={validDependencyTargets(t.nodeMap, node.id)}
          onPick={(id) => void t.addDependency(node.id, id).catch((e) => toast.error(errMessage(e)))}
        />
      )}
    </div>
  );
}
