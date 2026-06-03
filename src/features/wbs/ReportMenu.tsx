import { useEffect, useRef, useState } from "react";
import { FileText, ChevronDown, Loader2 } from "lucide-react";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { can } from "@/lib/permissions";
import { toast, errMessage } from "@/store/toast";
import { SelectedReportPicker } from "./SelectedReportPicker";
import type { GateScope } from "@/lib/pdf/gatesReport";

/**
 * Load a report module with one retry. Vite dev can abort the first dynamic
 * import while it re-optimizes a newly-seen dep, and production can momentarily
 * miss a chunk right after a deploy — both throw "Failed to fetch dynamically
 * imported module". A single retry recovers cleanly.
 */
async function loadModule<M>(importer: () => Promise<M>): Promise<M> {
  try {
    return await importer();
  } catch {
    return await importer();
  }
}

export function ReportMenu() {
  const project = useProject((s) => s.project);
  const role = useProject((s) => s.role);
  const nodes = useTree((s) => s.nodes);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  if (!project || !can(role, "report.generate")) return null;
  // QAQC sees only the QAQC gate report, HSE only the HSE one; everyone else
  // (admin / manager / developer) gets both as separate entries.
  const showQa = role !== "hse";
  const showHse = role !== "qaqc";

  async function run(fn: () => Promise<void>) {
    setOpen(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const gate = (scope: GateScope) =>
    run(async () => (await loadModule(() => import("@/lib/pdf/gatesReport"))).gatesReport(project!, nodes, scope));

  const items: { label: string; onClick: () => void; show: boolean }[] = [
    { label: "Full WBS", show: true, onClick: () => run(async () => (await loadModule(() => import("@/lib/pdf/treeReport"))).fullReport(project!, nodes)) },
    { label: "Selected nodes…", show: true, onClick: () => { setOpen(false); setPicker(true); } },
    { label: "Progress", show: true, onClick: () => run(async () => (await loadModule(() => import("@/lib/pdf/treeReport"))).progressReport(project!, nodes)) },
    { label: "Notes & RFI", show: true, onClick: () => run(async () => (await loadModule(() => import("@/lib/pdf/notesReport"))).notesReport(project!, nodes)) },
    { label: "Gantt", show: true, onClick: () => run(async () => (await loadModule(() => import("@/lib/pdf/ganttReport"))).ganttReport(project!, nodes)) },
    { label: "QAQC Gate", show: showQa, onClick: () => gate("qa") },
    { label: "HSE Gate", show: showHse, onClick: () => gate("hse") },
    { label: "Flowchart", show: can(role, "report.flowchart"), onClick: () => run(async () => (await loadModule(() => import("@/lib/pdf/flowchartReport"))).flowchartReport(project!, nodes)) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} disabled={busy} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink hover:border-ink-mute">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Reports <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded border border-line bg-surface shadow-panel">
          {items.filter((i) => i.show).map((i) => (
            <button key={i.label} onClick={i.onClick} className="block w-full px-3 py-2 text-left text-sm text-ink-dim hover:bg-surface-2 hover:text-ink">
              {i.label}
            </button>
          ))}
        </div>
      )}
      {picker && <SelectedReportPicker open={picker} onClose={() => setPicker(false)} />}
    </div>
  );
}
