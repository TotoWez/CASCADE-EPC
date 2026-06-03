import { useRef, useState } from "react";
import { Pencil, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { useProject } from "@/store/project";
import { useTree } from "@/store/tree";
import { can } from "@/lib/permissions";
import { listOrgMembers, type OrgMemberRef } from "@/lib/api/members";
import { exportProjectData, downloadJson, importProjectData } from "@/lib/api/transfer";
import { toast, errMessage } from "@/store/toast";
import type { Project } from "@/lib/types";

function PartyCard({ label, name, logo }: { label: string; name: string; logo: string | null }) {
  return (
    <div className="rounded border border-line bg-canvas p-3">
      <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">{label}</p>
      <div className="mt-2 flex h-12 items-center gap-2">
        {logo ? (
          <img src={logo} alt="" className="h-full max-w-[60%] object-contain" />
        ) : null}
        <p className="text-sm text-ink">{name || "—"}</p>
      </div>
    </div>
  );
}

export function ProjectControl() {
  const project = useProject((s) => s.project)!;
  const role = useProject((s) => s.role);
  const setProject = useProject((s) => s.setProject);
  const editable = can(role, "project.manage");

  const tree = useTree();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pmCandidates, setPmCandidates] = useState<OrgMemberRef[]>([]);

  function onExport() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`${project.code}-project-${date}.json`, exportProjectData(project, tree.nodes, tree.categories));
  }

  async function onImportFile(file: File) {
    setImporting(true);
    try {
      const data = JSON.parse(await file.text());
      const count = tree.nodes.length;
      if (count > 0 && !confirm(`Import will ADD nodes to this project (currently ${count}). Continue?`)) return;
      const created = await importProjectData(project.id, data, new Set(tree.nodes.map((n) => n.nodeCode)));
      await tree.load(project.id);
      toast.success(`Imported ${created} node(s).`);
    } catch (e) {
      toast.error(`Import failed: ${errMessage(e)}`);
    } finally {
      setImporting(false);
    }
  }

  async function openEdit() {
    try {
      setPmCandidates(await listOrgMembers(project.orgId));
    } catch {
      /* non-fatal */
    }
    setEditing(true);
  }

  const settings = project.settings;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-brand text-lg tracking-wide text-ink">Project control</h2>
        {editable && (
          <Button variant="outline" onClick={openEdit}>
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PartyCard label="Client" name={project.client} logo={project.clientLogoUrl} />
        <PartyCard label="Consultant" name={project.consultant} logo={project.consultantLogoUrl} />
        <PartyCard label="Contractor" name={project.contractor} logo={project.contractorLogoUrl} />
        <PartyCard label="Sub-Contractor" name={project.subContractor} logo={project.subContractorLogoUrl} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-line bg-canvas p-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Start</p>
          <p className="mt-1 font-mono text-sm text-ink">{project.startDate ?? "—"}</p>
        </div>
        <div className="rounded border border-line bg-canvas p-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">End</p>
          <p className="mt-1 font-mono text-sm text-ink">{project.endDate ?? "—"}</p>
        </div>
        <div className="rounded border border-line bg-canvas p-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Revised</p>
          <p className="mt-1 font-mono text-sm text-ink">{project.revisedDate ?? "—"}</p>
        </div>
      </div>

      <div className="mt-4 rounded border border-line bg-canvas p-4">
        <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Settings</p>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2">
            <dt className="text-ink-dim">Require HSE action</dt>
            <dd className="text-ink">{settings.requireHseAction ? "On" : "Off"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-dim">Auto-snapshot</dt>
            <dd className="text-ink">{settings.autoSnapshot ? "Daily" : "Off"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-ink-dim">Due window</dt>
            <dd className="text-ink">{settings.dueWindowN} days</dd>
          </div>
        </dl>
      </div>

      {(can(role, "wbs.export") || can(role, "wbs.import")) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded border border-line bg-canvas p-4">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">WBS data</p>
          {can(role, "wbs.export") && (
            <Button variant="outline" onClick={onExport}><Download size={14} /> Export JSON</Button>
          )}
          {can(role, "wbs.import") && (
            <>
              <Button variant="outline" loading={importing} onClick={() => fileRef.current?.click()}><Upload size={14} /> Import JSON</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f); e.currentTarget.value = ""; }} />
            </>
          )}
        </div>
      )}

      {editing && (
        <ProjectForm
          open={editing}
          onClose={() => setEditing(false)}
          orgId={project.orgId}
          orgOptions={[{ value: project.orgId, label: "This organization" }]}
          pmCandidates={pmCandidates}
          project={project}
          onSaved={(p: Project) => setProject(p)}
        />
      )}
    </div>
  );
}
