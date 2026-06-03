import { useMemo } from "react";
import clsx from "clsx";
import { Search, Tags, X, Flag } from "lucide-react";
import { useTree } from "@/store/tree";
import { getChildren } from "@/lib/domain/tree";
import { computeCounts, filtersActive } from "@/lib/domain/filter";
import { DISPLAY_STATUS_LABEL, type DisplayStatus, type Priority } from "@/lib/types";
import { Input } from "@/components/ui/Input";

const STATUS_DOT: Record<DisplayStatus, string> = {
  not_started: "bg-status-notstarted", on_progress: "bg-status-progress", done: "bg-status-done", blocked: "bg-status-blocked",
};

function Chip({ active, dim, onClick, children }: { active: boolean; dim?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={clsx(
      "inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-2xs uppercase tracking-widest transition-colors",
      active ? "border-brand-blue bg-brand-blue/10 text-ink" : "border-line bg-surface text-ink-dim hover:text-ink hover:border-ink-mute",
      dim && !active && "opacity-50",
    )}>
      {children}
    </button>
  );
}

export function FilterBar({ onManageCategories }: { onManageCategories: () => void }) {
  const { nodes, effMap, index, filters, setFilter, resetFilters } = useTree();

  const leafIds = useMemo(() => new Set(nodes.filter((n) => getChildren(index, n.id).length === 0).map((n) => n.id)), [nodes, index]);
  const counts = useMemo(() => computeCounts(nodes, effMap, leafIds, filters.dueN), [nodes, effMap, leafIds, filters.dueN]);
  const active = filtersActive(filters);

  const toggleStatus = (s: DisplayStatus) => {
    const next = new Set(filters.statuses);
    next.has(s) ? next.delete(s) : next.add(s);
    setFilter({ statuses: next });
  };
  const togglePriority = (p: Priority) => {
    const next = new Set(filters.priorities);
    next.has(p) ? next.delete(p) : next.add(p);
    setFilter({ priorities: next });
  };

  const categoryNames = Object.keys(counts.categories).sort();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas px-4 py-2">
      <div className="relative">
        <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-mute" />
        <Input value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} placeholder="Search title / ID" className="h-8 w-44 pl-7 text-sm" />
      </div>

      {(["not_started", "on_progress", "done", "blocked"] as DisplayStatus[]).map((s) => (
        <Chip key={s} active={filters.statuses.has(s)} dim={counts.statuses[s] === 0} onClick={() => toggleStatus(s)}>
          <span className={clsx("h-2 w-2 rounded-full", STATUS_DOT[s])} />
          {DISPLAY_STATUS_LABEL[s]} <span className="text-ink-mute">{counts.statuses[s]}</span>
        </Chip>
      ))}

      <span className="mx-1 h-5 w-px bg-line" />

      <Chip active={filters.qaOpen} dim={counts.qaOpen === 0} onClick={() => setFilter({ qaOpen: !filters.qaOpen })}>QA Open <span className="text-ink-mute">{counts.qaOpen}</span></Chip>
      <Chip active={filters.qaClosed} dim={counts.qaClosed === 0} onClick={() => setFilter({ qaClosed: !filters.qaClosed })}>QA Closed <span className="text-ink-mute">{counts.qaClosed}</span></Chip>
      <Chip active={filters.hseNot} dim={counts.hseNot === 0} onClick={() => setFilter({ hseNot: !filters.hseNot })}>HSE !Complied <span className="text-ink-mute">{counts.hseNot}</span></Chip>

      <span className="mx-1 h-5 w-px bg-line" />

      {([1, 2, 3] as Priority[]).map((p) => (
        <Chip key={p} active={filters.priorities.has(p)} dim={counts.priorities[p] === 0} onClick={() => togglePriority(p)}>
          <Flag size={9} />P{p} <span className="text-ink-mute">{counts.priorities[p]}</span>
        </Chip>
      ))}

      <span className="mx-1 h-5 w-px bg-line" />

      <Chip active={filters.dueOn} dim={counts.due === 0} onClick={() => setFilter({ dueOn: !filters.dueOn })}>
        Due ≤ <input type="number" min={1} max={90} value={filters.dueN} onClick={(e) => e.stopPropagation()} onChange={(e) => setFilter({ dueN: Number(e.target.value) || 7 })} className="w-9 bg-transparent text-center text-ink outline-none" />d <span className="text-ink-mute">{counts.due}</span>
      </Chip>

      <select
        value={filters.category ?? ""}
        onChange={(e) => setFilter({ category: e.target.value || null })}
        className="h-8 rounded border border-line bg-surface px-2 font-mono text-2xs text-ink-dim"
      >
        <option value="">All categories</option>
        {categoryNames.map((c) => <option key={c} value={c}>{c} ({counts.categories[c]})</option>)}
      </select>
      <button onClick={onManageCategories} className="text-ink-mute hover:text-ink" title="Manage categories"><Tags size={15} /></button>

      {active && (
        <button onClick={resetFilters} className="ml-auto inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-mute hover:text-ink">
          <X size={12} /> Clear filters
        </button>
      )}
    </div>
  );
}
