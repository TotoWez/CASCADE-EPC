import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Building2, Loader2, CalendarRange } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { listProjects } from "@/lib/api/projects";
import { listOrgMembers, type OrgMemberRef } from "@/lib/api/members";
import { useAuth } from "@/store/auth";
import { toast, errMessage } from "@/store/toast";
import type { Project } from "@/lib/types";

export function ProjectsList() {
  const navigate = useNavigate();
  const orgs = useAuth((s) => s.orgs);
  const adminOrgs = orgs.filter((o) => o.orgRole === "admin");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pmCandidates, setPmCandidates] = useState<OrgMemberRef[]>([]);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((e) => toast.error(errMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function openCreate() {
    if (adminOrgs[0]) {
      try {
        setPmCandidates(await listOrgMembers(adminOrgs[0].orgId));
      } catch {
        /* non-fatal */
      }
    }
    setShowForm(true);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-brand text-2xl tracking-wide text-ink">Projects</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-dim">
              <Building2 size={14} /> {orgs.map((o) => o.name).join(", ") || "No organization"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {adminOrgs.length > 0 && (
              <Link
                to="/app/org"
                className="rounded border border-line bg-surface px-3 py-2 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute"
              >
                Org settings
              </Link>
            )}
            {adminOrgs.length > 0 && (
              <Button onClick={openCreate}>
                <Plus size={15} /> New project
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="animate-spin text-brand-blue" size={26} />
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-10 rounded-card border border-dashed border-line bg-surface p-12 text-center">
            <FolderOpen className="mx-auto text-ink-mute" size={28} />
            <p className="mt-3 text-sm text-ink-dim">
              {adminOrgs.length > 0
                ? "No projects yet. Create your first project to build its WBS."
                : "You have no projects yet. Ask your Admin or Manager to add you."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/app/projects/${p.id}`)}
                className="group flex flex-col rounded-card border border-line bg-surface p-5 text-left transition-colors hover:border-brand-blue"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xs uppercase tracking-widest text-brand-blue-light">{p.code}</span>
                  <FolderOpen size={16} className="text-ink-mute group-hover:text-brand-blue" />
                </div>
                <h3 className="mt-2 font-brand text-base tracking-wide text-ink">{p.name}</h3>
                {p.client && <p className="mt-1 text-sm text-ink-dim">{p.client}</p>}
                {(p.startDate || p.endDate) && (
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-2xs text-ink-mute">
                    <CalendarRange size={12} /> {p.startDate ?? "—"} → {p.endDate ?? "—"}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && adminOrgs[0] && (
        <ProjectForm
          open={showForm}
          onClose={() => setShowForm(false)}
          orgId={adminOrgs[0].orgId}
          orgOptions={adminOrgs.map((o) => ({ value: o.orgId, label: o.name }))}
          pmCandidates={pmCandidates}
          onSaved={(p) => setProjects((prev) => [p, ...prev])}
        />
      )}
    </AppLayout>
  );
}
