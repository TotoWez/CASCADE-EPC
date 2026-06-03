import jsPDF from "jspdf";
import type { Project, WbsNode } from "@/lib/types";
import { buildChildrenIndex, toNodeMap, getChildren, getAncestorIds } from "@/lib/domain/tree";
import { computeEffectiveProgress } from "@/lib/domain/rollup";
import { displayStatus } from "@/lib/domain/status";
import { siblingAccent } from "@/lib/domain/color";
import {
  drawHeader, drawFooter, drawSummary, drawLegend, getMarkPng, reportFilename, sanitize,
  hslToRgb, STATUS_RGB, RGB, type ReportStats,
} from "./common";
import { overallProgress } from "@/lib/domain/rollup";

type Kind = "Full" | "Selected" | "Progress";

async function buildTreeReport(project: Project, nodes: WbsNode[], kind: Kind, includeSet: Set<string> | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const map = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const eff = computeEffectiveProgress(map, index);

  // Expand the include set with ancestors so hierarchy stays intact.
  let finalSet: Set<string> | null = includeSet;
  if (includeSet) {
    finalSet = new Set(includeSet);
    for (const id of includeSet) for (const a of getAncestorIds(map, id)) finalSet.add(a);
  }

  // DFS order with depth.
  const rows: { node: WbsNode; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const child of getChildren(index, parentId)) {
      if (!finalSet || finalSet.has(child.id)) rows.push({ node: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);

  const markPng = await getMarkPng();
  let y = drawHeader(doc, project, `${kind} WBS Report`, markPng);

  const stats: ReportStats = {
    total: rows.length,
    done: rows.filter((r) => displayStatus(r.node, eff) === "done").length,
    progress: rows.filter((r) => displayStatus(r.node, eff) === "on_progress").length,
    pending: rows.filter((r) => ["not_started", "blocked"].includes(displayStatus(r.node, eff))).length,
    overall: overallProgress(getChildren(index, null), eff),
  };
  y = drawSummary(doc, y, stats);
  y = drawLegend(doc, y) + 2;

  const rowH = 7;
  rows.forEach(({ node, depth }, i) => {
    if (y > h - 16) { doc.addPage(); y = 12; }
    const status = displayStatus(node, eff);
    const pct = eff[node.id] ?? 0;
    const x = 8 + depth * 4;

    if (i % 2 === 0) { doc.setFillColor(244, 246, 249); doc.rect(8, y - 4.5, w - 16, rowH, "F"); }
    // indent guide
    if (depth > 0) { doc.setDrawColor(210, 217, 226); doc.setLineWidth(0.2); doc.line(x - 2, y - 4.5, x - 2, y + 2.5); }
    // category accent
    const accent = hslToRgb(siblingAccent(node.parentId));
    doc.setFillColor(...accent); doc.rect(x, y - 3.5, 1.2, 5, "F");
    // status dot
    doc.setFillColor(...STATUS_RGB[status]); doc.circle(x + 4, y - 1, 1.2, "F");
    // id + title
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...RGB.ink);
    const idTitle = sanitize(`${node.nodeCode}  ${node.title}`);
    doc.text(idTitle, x + 7, y, { maxWidth: w - x - 70 });
    // priority + blocked flags
    let fx = x + 7 + Math.min(doc.getTextWidth(idTitle), w - x - 70) + 3;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    if (node.priority === 1) { doc.setTextColor(...RGB.red); doc.text("P1", fx, y); fx += 6; }
    if (status === "blocked") { doc.setTextColor(...RGB.red); doc.text("BLOCKED", fx, y); }
    // progress bar + percent (right aligned)
    const barW = 36, barX = w - 8 - barW - 12;
    doc.setFillColor(230, 233, 238); doc.rect(barX, y - 2.5, barW, 3, "F");
    doc.setFillColor(...STATUS_RGB[status]); doc.rect(barX, y - 2.5, (barW * pct) / 100, 3, "F");
    doc.setTextColor(...RGB.ink); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(`${pct}%`, w - 8, y, { align: "right" });
    y += rowH;
  });

  drawFooter(doc, project);
  doc.save(reportFilename(project, kind === "Full" ? "Report" : kind === "Selected" ? "Selected" : "Progress"));
}

export function fullReport(project: Project, nodes: WbsNode[]) {
  return buildTreeReport(project, nodes, "Full", null);
}

export function selectedReport(project: Project, nodes: WbsNode[], selectedIds: string[]) {
  return buildTreeReport(project, nodes, "Selected", new Set(selectedIds));
}

export function progressReport(project: Project, nodes: WbsNode[]) {
  const map = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const eff = computeEffectiveProgress(map, index);
  const include = new Set(nodes.filter((n) => (eff[n.id] ?? 0) > 0).map((n) => n.id));
  return buildTreeReport(project, nodes, "Progress", include);
}
