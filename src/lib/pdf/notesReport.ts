import jsPDF from "jspdf";
import type { Project, WbsNode } from "@/lib/types";
import { groupBySource } from "@/lib/domain/notes";
import { drawHeader, drawFooter, getMarkPng, reportFilename, sanitize, RGB } from "./common";

/** Every node with >=1 non-empty note or attachment, grouped by node + source. */
export async function notesReport(project: Project, nodes: WbsNode[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const markPng = await getMarkPng();
  let y = drawHeader(doc, project, "Notes & RFI Report", markPng);

  const withNotes = nodes.filter((n) => n.notes.some((nt) => nt.text.trim() || nt.attachments.length));
  if (withNotes.length === 0) {
    doc.setFontSize(10); doc.setTextColor(...RGB.steel);
    doc.text("No notes recorded.", 8, y + 6);
    drawFooter(doc, project);
    doc.save(reportFilename(project, "Notes"));
    return;
  }

  for (const node of withNotes) {
    if (y > h - 24) { doc.addPage(); y = 12; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...RGB.ink);
    doc.text(sanitize(`${node.nodeCode}  ${node.title}`), 8, y);
    y += 4;
    for (const [source, notes] of groupBySource(node.notes.filter((nt) => nt.text.trim() || nt.attachments.length))) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...RGB.steel);
      doc.text(sanitize(source.toUpperCase()), 12, y);
      y += 4;
      for (const nt of notes) {
        if (y > h - 16) { doc.addPage(); y = 12; }
        doc.setFont("helvetica", nt.checked ? "italic" : "normal"); doc.setFontSize(8);
        doc.setTextColor(...(nt.checked ? RGB.green : RGB.red));
        const lines = doc.splitTextToSize(sanitize(`${nt.checked ? "[resolved] " : "[open] "}${nt.text}`), w - 32) as string[];
        doc.text(lines, 16, y);
        y += lines.length * 4;
        if (nt.attachments.length) {
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...RGB.steel);
          doc.text(sanitize(`attachments: ${nt.attachments.map((a) => a.fileName).join(", ")}`), 16, y, { maxWidth: w - 32 });
          y += 4;
        }
      }
    }
    y += 3;
  }

  drawFooter(doc, project);
  doc.save(reportFilename(project, "Notes"));
}
