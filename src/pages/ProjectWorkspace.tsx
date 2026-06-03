import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Network, SlidersHorizontal, Users } from "lucide-react";
import clsx from "clsx";
import { AppLayout } from "@/components/AppLayout";
import { useProject } from "@/store/project";
import { useTree } from "@/store/tree";
import { ROLE_LABEL } from "@/lib/types";
import { ProjectControl } from "@/features/projects/ProjectControl";
import { TeamPanel } from "@/features/projects/TeamPanel";
import { WbsView } from "@/features/wbs/WbsView";
import { useRealtime } from "@/features/wbs/useRealtime";
import { toast, errMessage } from "@/store/toast";

type Tab = "wbs" | "control" | "team";

const TABS: { id: Tab; label: string; icon: typeof Network }[] = [
  { id: "wbs", label: "WBS", icon: Network },
  { id: "control", label: "Control", icon: SlidersHorizontal },
  { id: "team", label: "Team", icon: Users },
];

export function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { load, clear, loading, project, role, error } = useProject();
  const loadTree = useTree((s) => s.load);
  const [tab, setTab] = useState<Tab>("wbs");

  useRealtime(id ?? null);

  useEffect(() => {
    if (id) {
      void load(id);
      void loadTree(id).catch((e) => toast.error(errMessage(e)));
    }
    return () => clear();
  }, [id, load, clear, loadTree]);

  if (loading) {
    return (
      <AppLayout>
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-brand-blue" size={26} />
        </div>
      </AppLayout>
    );
  }
  if (error || !project) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-sm text-status-blocked">{error ?? "Project unavailable."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Project sub-header */}
      <div className="border-b border-line bg-surface/60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-blue-light">{project.code}</span>
            <h1 className="font-brand text-lg tracking-wide text-ink">{project.name}</h1>
            {project.client && <span className="text-sm text-ink-dim">· {project.client}</span>}
          </div>
          {role && (
            <span className="count-badge">{ROLE_LABEL[role]}</span>
          )}
        </div>
        <nav className="flex gap-1 px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 font-mono text-2xs uppercase tracking-widest transition-colors",
                tab === t.id
                  ? "border-brand-blue text-ink"
                  : "border-transparent text-ink-mute hover:text-ink",
              )}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "wbs" && <WbsView />}
      {tab === "control" && <ProjectControl />}
      {tab === "team" && <TeamPanel />}
    </AppLayout>
  );
}
