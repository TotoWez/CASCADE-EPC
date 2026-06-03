import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, WbsNode } from "@/lib/types";
import { QA_GATE_LABEL, HSE_GATE_LABEL } from "@/lib/types";
import { drawHeader, drawFooter, getMarkPng, reportFilename, sanitize, RGB } from "./common";

export type GateScope = "qa" | "hse" | "both";

/** Punch/inspection list by gate state. Scoped for QAQC / HSE roles. */
export async function gatesReport(project: Project, nodes: WbsNode[], scope: GateScope = "both") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const markPng = await getMarkPng();
  const title = scope === "qa" ? "QA Gate Report" : scope === "hse" ? "HSE Gate Report" : "QA / HSE Gate Report";
  const startY = drawHeader(doc, project, title, markPng);

  const rel = nodes.filter((n) =>
    scope === "qa" ? n.qaGate !== "na" : scope === "hse" ? n.hseGate !== "na" : n.qaGate !== "na" || n.hseGate !== "na",
  );
  // Concerns first: QA open / HSE not-complied.
  rel.sort((a, b) => Number(b.qaGate === "open" || b.hseGate === "not_complied") - Number(a.qaGate === "open" || a.hseGate === "not_complied"));

  const head =
    scope === "qa" ? [["Node", "Title", "QA Gate"]]
      : scope === "hse" ? [["Node", "Title", "HSE Gate"]]
        : [["Node", "Title", "QA Gate", "HSE Gate"]];

  const body = rel.map((n) => {
    const base = [n.nodeCode, sanitize(n.title)];
    if (scope === "qa") return [...base, QA_GATE_LABEL[n.qaGate]];
    if (scope === "hse") return [...base, HSE_GATE_LABEL[n.hseGate]];
    return [...base, QA_GATE_LABEL[n.qaGate], HSE_GATE_LABEL[n.hseGate]];
  });

  if (body.length === 0) {
    doc.setFontSize(10); doc.setTextColor(...RGB.steel);
    doc.text("No gate items recorded.", 8, startY + 6);
  } else {
    autoTable(doc, {
      head, body, startY,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: RGB.band, textColor: RGB.white, fontSize: 8 },
      alternateRowStyles: { fillColor: [244, 246, 249] },
      didParseCell: (data) => {
        const txt = String(data.cell.raw ?? "");
        if (data.section === "body") {
          if (txt === "Open" || txt === "Not Complied") data.cell.styles.textColor = RGB.red;
          else if (txt === "Closed" || txt === "Complied") data.cell.styles.textColor = RGB.green;
        }
      },
    });
  }

  drawFooter(doc, project);
  doc.save(reportFilename(project, scope === "qa" ? "QA-Gate" : scope === "hse" ? "HSE-Gate" : "Gate"));
}
