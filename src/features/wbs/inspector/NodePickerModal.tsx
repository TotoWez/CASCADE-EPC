import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WbsNode } from "@/lib/types";

/** Searchable single-pick list of candidate nodes (deps / links). */
export function NodePickerModal({
  open, onClose, title, candidates, onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  candidates: WbsNode[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? candidates.filter((c) => `${c.nodeCode} ${c.title} ${c.category}`.toLowerCase().includes(needle))
      : candidates;
    return list.slice(0, 200);
  }, [q, candidates]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nodes…" className="pl-8" autoFocus />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-dim">No eligible nodes.</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { onPick(c.id); onClose(); }}
              className="flex w-full items-center gap-2 rounded border border-line bg-canvas px-2 py-1.5 text-left text-sm hover:border-brand-blue"
            >
              <span className="font-mono text-2xs text-ink-mute">{c.nodeCode}</span>
              <span className="truncate text-ink">{c.title}</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
