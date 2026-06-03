import { useState } from "react";
import { Link2, Unlink, Plus } from "lucide-react";
import { useTree } from "@/store/tree";
import { validLinkTargets } from "@/lib/domain/cycles";
import { toast, errMessage } from "@/store/toast";
import type { WbsNode } from "@/lib/types";
import { NodePickerModal } from "./NodePickerModal";

export function LinkedSection({ node, canEdit }: { node: WbsNode; canEdit: boolean }) {
  const t = useTree();
  const [picking, setPicking] = useState(false);
  const peers = node.clusterId ? t.nodes.filter((n) => n.clusterId === node.clusterId && n.id !== node.id) : [];

  return (
    <div className="space-y-3">
      <p className="text-2xs text-ink-mute">
        Linked nodes mirror the same physical work — updating progress/status on one syncs the whole cluster.
      </p>

      {peers.length === 0 ? (
        <p className="text-sm text-ink-dim">Not linked to other nodes.</p>
      ) : (
        <ul className="space-y-1">
          {peers.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded border border-line bg-canvas px-2 py-1 text-sm">
              <Link2 size={12} className="text-brand-blue-light" />
              <button onClick={() => t.select(p.id)} className="min-w-0 flex-1 truncate text-left text-ink hover:text-brand-blue">
                {p.nodeCode} · {p.title}
              </button>
              <span className="font-mono text-2xs text-ink-mute">{t.effMap[p.id] ?? 0}%</span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <button onClick={() => setPicking(true)} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-2xs text-ink-dim hover:text-ink">
            <Plus size={12} /> Link node
          </button>
          {node.clusterId && (
            <button onClick={() => void t.unlink(node.id).catch((e) => toast.error(errMessage(e)))} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-2xs text-status-blocked hover:opacity-80">
              <Unlink size={12} /> Unlink this
            </button>
          )}
        </div>
      )}

      {picking && (
        <NodePickerModal
          open={picking}
          onClose={() => setPicking(false)}
          title="Link to node"
          candidates={validLinkTargets(t.nodes, node)}
          onPick={(id) => void t.link(node.id, id).catch((e) => toast.error(errMessage(e)))}
        />
      )}
    </div>
  );
}
