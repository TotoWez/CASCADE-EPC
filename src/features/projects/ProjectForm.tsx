import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createProject, updateProject, type ProjectInput } from "@/lib/api/projects";
import { uploadBranding } from "@/lib/api/org";
import type { OrgMemberRef } from "@/lib/api/members";
import { DEFAULT_PROJECT_SETTINGS, type Project } from "@/lib/types";
import { toast, errMessage } from "@/store/toast";

type PartyKey = "client" | "consultant" | "contractor" | "subContractor";
const PARTIES: { key: PartyKey; label: string; logo: keyof Project }[] = [
  { key: "client", label: "Client", logo: "clientLogoUrl" },
  { key: "consultant", label: "Consultant", logo: "consultantLogoUrl" },
  { key: "contractor", label: "Contractor", logo: "contractorLogoUrl" },
  { key: "subContractor", label: "Sub-Contractor", logo: "subContractorLogoUrl" },
];

export function ProjectForm({
  open,
  onClose,
  orgId,
  orgOptions,
  pmCandidates,
  project,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgOptions: { value: string; label: string }[];
  pmCandidates: OrgMemberRef[];
  project?: Project;
  onSaved: (p: Project) => void;
}) {
  const editing = Boolean(project);
  const [form, setForm] = useState<ProjectInput>({
    orgId: project?.orgId ?? orgId,
    code: project?.code ?? "",
    name: project?.name ?? "",
    client: project?.client ?? "",
    consultant: project?.consultant ?? "",
    contractor: project?.contractor ?? "",
    subContractor: project?.subContractor ?? "",
    clientLogoUrl: project?.clientLogoUrl ?? null,
    consultantLogoUrl: project?.consultantLogoUrl ?? null,
    contractorLogoUrl: project?.contractorLogoUrl ?? null,
    subContractorLogoUrl: project?.subContractorLogoUrl ?? null,
    startDate: project?.startDate ?? null,
    endDate: project?.endDate ?? null,
    revisedDate: project?.revisedDate ?? null,
    projectManagerId: project?.projectManagerId ?? null,
    settings: project?.settings ?? { ...DEFAULT_PROJECT_SETTINGS },
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = editing
        ? await updateProject(project!.id, form)
        : await createProject({ ...form, code: form.code.trim().toUpperCase() });
      toast.success(editing ? "Project updated." : "Project created.");
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Edit project" : "New project"}
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} loading={busy} disabled={!form.code.trim() || !form.name.trim()}>
            {editing ? "Save" : "Create project"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {orgOptions.length > 1 && !editing && (
          <Field label="Organization" htmlFor="org">
            <Select id="org" options={orgOptions} value={form.orgId} onChange={(e) => set("orgId", e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project code" htmlFor="code" hint="Used in report filenames.">
            <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} className="font-mono uppercase" placeholder="SS-220KV" />
          </Field>
          <Field label="Project name" htmlFor="name">
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="220kV Grid Substation" />
          </Field>
        </div>

        <div className="space-y-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Parties & logos</p>
          {PARTIES.map((p) => (
            <div key={p.key} className="flex items-center gap-3">
              <LogoUploader
                orgId={form.orgId}
                label={p.key}
                url={form[p.logo as keyof ProjectInput] as string | null}
                onUploaded={(url) => set(p.logo as keyof ProjectInput, url as never)}
              />
              <div className="flex-1">
                <label className="block font-mono text-2xs uppercase tracking-widest text-ink-dim">{p.label}</label>
                <Input value={form[p.key] as string} onChange={(e) => set(p.key, e.target.value as never)} className="mt-1" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Start date" htmlFor="sd"><Input id="sd" type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || null)} /></Field>
          <Field label="End date" htmlFor="ed"><Input id="ed" type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} /></Field>
          <Field label="Revised date" htmlFor="rd"><Input id="rd" type="date" value={form.revisedDate ?? ""} onChange={(e) => set("revisedDate", e.target.value || null)} /></Field>
        </div>

        <Field label="Project Manager" htmlFor="pm" hint="Assign a Manager to run the WBS.">
          <Select
            id="pm"
            value={form.projectManagerId ?? ""}
            onChange={(e) => set("projectManagerId", e.target.value || null)}
            options={[{ value: "", label: "— Unassigned —" }, ...pmCandidates.map((m) => ({ value: m.userId, label: `${m.name || m.email}` }))]}
          />
        </Field>

        <div className="space-y-3 rounded border border-line bg-canvas p-3">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Settings</p>
          <label className="flex items-center justify-between text-sm text-ink">
            Require HSE action (Not-Complied blocks "cleared")
            <input type="checkbox" checked={form.settings!.requireHseAction} onChange={(e) => set("settings", { ...form.settings!, requireHseAction: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between text-sm text-ink">
            Daily auto-snapshot
            <input type="checkbox" checked={form.settings!.autoSnapshot} onChange={(e) => set("settings", { ...form.settings!, autoSnapshot: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between text-sm text-ink">
            "Due in N days" window
            <input type="number" min={1} max={90} value={form.settings!.dueWindowN} onChange={(e) => set("settings", { ...form.settings!, dueWindowN: Number(e.target.value) || 7 })} className="w-20 rounded border border-line bg-surface px-2 py-1 text-right" />
          </label>
        </div>
      </form>
    </Modal>
  );
}

function LogoUploader({ orgId, label, url, onUploaded }: { orgId: string; label: string; url: string | null; onUploaded: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded border border-line bg-canvas text-ink-mute hover:border-ink-mute"
      title={`Upload ${label} logo`}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : url ? <img src={url} alt="" className="h-full w-full object-contain p-1" /> : <ImagePlus size={16} />}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onUploaded(await uploadBranding(orgId, f, label));
          } catch (err) {
            toast.error(errMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </button>
  );
}
