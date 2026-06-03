import jsPDF from "jspdf";
import type { Project, WbsNode } from "@/lib/types";
import { buildChildrenIndex, toNodeMap, getChildren } from "@/lib/domain/tree";
import { computeEffectiveProgress } from "@/lib/domain/rollup";
import { displayStatus } from "@/lib/domain/status";
import { drawHeader, drawFooter, getMarkPng, reportFilename, sanitize, STATUS_RGB, RGB } from "./common";

const parse = (s: string | null): number | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
};

export async function ganttReport(project: Project, nodes: WbsNode[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const map = toNodeMap(nodes);
  const index = buildChildrenIndex(nodes);
  const eff = computeEffectiveProgress(map, index);
  const markPng = await getMarkPng();
  let y = drawHeader(doc, project, "Gantt Report", markPng);

  // DFS order
  const flat: WbsNode[] = [];
  const walk = (pid: string | null) => { for (const c of getChildren(index, pid)) { flat.push(c); walk(c.id); } };
  walk(null);

  // Date bounds
  const times: number[] = [];
  for (const n of nodes) { const s = parse(n.startDate); const d = parse(n.dueDate); if (s) times.push(s); if (d) times.push(d); }
  const ps = parse(project.startDate), pe = parse(project.endDate);
  if (ps) times.push(ps); if (pe) times.push(pe);
  const now = Date.now();
  let min = times.length ? Math.min(...times) : now;
  let max = times.length ? Math.max(...times) : now + 30 * 86400000;
  if (min === max) max = min + 30 * 86400000;

  const labelW = 70, chartX = labelW, chartW = w - labelW - 8;
  const x = (t: number) => chartX + ((t - min) / (max - min)) * chartW;
  const rowH = 6;

  // axis: month ticks
  doc.setFontSize(6); doc.setTextColor(...RGB.steel); doc.setDrawColor(220, 225, 232);
  const start = new Date(min); start.setDate(1);
  for (let d = new Date(start); d.getTime() <= max; d.setMonth(d.getMonth() + 1)) {
    const tx = x(d.getTime());
    if (tx >= chartX && tx <= w - 8) {
      doc.line(tx, y, tx, h - 12);
      doc.text(d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), tx + 0.5, y - 1);
    }
  }
  // today marker
  if (now >= min && now <= max) { doc.setDrawColor(...RGB.red); doc.setLineWidth(0.4); doc.line(x(now), y, x(now), h - 12); }
  doc.setLineWidth(0.2);

  y += 2;
  for (const n of flat) {
    if (y > h - 14) { doc.addPage(); y = 14; }
    const status = displayStatus(n, eff);
    const pct = eff[n.id] ?? 0;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...RGB.ink);
    doc.text(sanitize(`${n.nodeCode} ${n.title}`), 8, y + 3, { maxWidth: labelW - 10 });

    const s = parse(n.startDate) ?? ps ?? min;
    const d = parse(n.dueDate) ?? pe ?? max;
    const bx = x(Math.min(s, d)), bw = Math.max(2, x(Math.max(s, d)) - x(Math.min(s, d)));
    doc.setFillColor(225, 230, 236); doc.rect(bx, y, bw, 3.4, "F");
    doc.setFillColor(...STATUS_RGB[status]); doc.rect(bx, y, (bw * pct) / 100, 3.4, "F");
    y += rowH;
  }

  drawFooter(doc, project);
  doc.save(reportFilename(project, "Gantt"));
}
