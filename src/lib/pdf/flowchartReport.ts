import jsPDF from "jspdf";
import type { Project, WbsNode } from "@/lib/types";
import { buildChildrenIndex, toNodeMap, getChildren } from "@/lib/domain/tree";
import { computeEffectiveProgress } from "@/lib/domain/rollup";
import { displayStatus } from "@/lib/domain/status";
import { siblingAccent } from "@/lib/domain/color";
import { drawFooter, getMarkPng, hslToRgb, reportFilename, sanitize, STATUS_RGB, RGB } from "./common";

const NODE_W = 46, NODE_H = 17, H_GAP = 8, V_GAP = 20, MARGIN = 12, HEADER = 22;
const MAX_DIM = 2200; // cap page size; scale down beyond this

export async function flowchartReport(project: Project, nodes: WbsNode[]) {
  const map = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const eff = computeEffectiveProgress(map, index);

  // 1. Subtree widths (bottom-up).
  const widthMemo = new Map<string, number>();
  const subtreeWidth = (id: string): number => {
    const cached = widthMemo.get(id);
    if (cached !== undefined) return cached;
    const kids = getChildren(index, id);
    let wd = NODE_W;
    if (kids.length) wd = Math.max(NODE_W, kids.reduce((s, k) => s + subtreeWidth(k.id), 0) + H_GAP * (kids.length - 1));
    widthMemo.set(id, wd);
    return wd;
  };

  // 2. Assign positions (top-down).
  const pos = new Map<string, { x: number; y: number }>();
  let maxDepth = 0;
  const place = (id: string, left: number, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    const wd = subtreeWidth(id);
    pos.set(id, { x: left + wd / 2, y: HEADER + MARGIN + depth * (NODE_H + V_GAP) });
    let cx = left;
    for (const k of getChildren(index, id)) { place(k.id, cx, depth + 1); cx += subtreeWidth(k.id) + H_GAP; }
  };
  let cursor = MARGIN;
  for (const root of getChildren(index, null)) { place(root.id, cursor, 0); cursor += subtreeWidth(root.id) + H_GAP; }

  const naturalW = cursor + MARGIN;
  const naturalH = HEADER + MARGIN * 2 + (maxDepth + 1) * (NODE_H + V_GAP);
  const scale = Math.min(1, MAX_DIM / Math.max(naturalW, naturalH));
  const S = (v: number) => v * scale;
  const pageW = Math.max(120, naturalW * scale);
  const pageH = Math.max(120, naturalH * scale);

  const doc = new jsPDF({ orientation: pageW >= pageH ? "landscape" : "portrait", unit: "mm", format: [pageW, pageH] });
  const markPng = await getMarkPng();

  // header band
  doc.setFillColor(...RGB.band); doc.rect(0, 0, pageW, S(HEADER), "F");
  if (markPng) try { doc.addImage(markPng, "PNG", 4, 3, 12, 12); } catch { /* ignore */ }
  doc.setTextColor(...RGB.white); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(sanitize(`${project.code} — Flowchart`), 18, S(HEADER) / 2 + 1);

  // connectors (parent bottom-center → child top-center, smooth bezier)
  doc.setDrawColor(...RGB.steel); doc.setLineWidth(0.3);
  for (const n of nodes) {
    const p = pos.get(n.id); if (!p) continue;
    for (const k of getChildren(index, n.id)) {
      const c = pos.get(k.id); if (!c) continue;
      const x1 = S(p.x), y1 = S(p.y + NODE_H), x2 = S(c.x), y2 = S(c.y);
      const my = (y1 + y2) / 2;
      // cubic bezier relative to (x1,y1): control pts (x1,my) and (x2,my), end (x2,y2)
      doc.lines([[0, my - y1, x2 - x1, my - y1, x2 - x1, y2 - y1]], x1, y1, [1, 1], "S");
    }
  }

  // nodes
  for (const n of nodes) {
    const p = pos.get(n.id); if (!p) continue;
    const x = S(p.x - NODE_W / 2), y = S(p.y), bw = S(NODE_W), bh = S(NODE_H);
    const status = displayStatus(n, eff); const pct = eff[n.id] ?? 0;
    doc.setFillColor(...RGB.white); doc.setDrawColor(...RGB.steel); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, bw, bh, 1.5, 1.5, "FD");
    // accent band
    doc.setFillColor(...hslToRgb(siblingAccent(n.parentId))); doc.rect(x, y, bw, S(2.4), "F");
    // status dot + id
    doc.setFillColor(...STATUS_RGB[status]); doc.circle(x + S(3), y + S(6), S(1.2), "F");
    doc.setTextColor(...RGB.steel); doc.setFont("helvetica", "normal"); doc.setFontSize(Math.max(5, S(6)));
    doc.text(sanitize(n.nodeCode), x + S(6), y + S(6.5));
    doc.setTextColor(...RGB.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(Math.max(5, S(7)));
    doc.text(sanitize(n.title), x + S(3), y + S(11), { maxWidth: bw - S(6) });
    // progress bar
    doc.setFillColor(230, 233, 238); doc.rect(x + S(3), y + bh - S(3.5), bw - S(6), S(1.6), "F");
    doc.setFillColor(...STATUS_RGB[status]); doc.rect(x + S(3), y + bh - S(3.5), (bw - S(6)) * pct / 100, S(1.6), "F");
  }

  drawFooter(doc, project);
  doc.save(reportFilename(project, "Flowchart"));
}
