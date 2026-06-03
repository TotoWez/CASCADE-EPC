import type jsPDF from "jspdf";
import type { DisplayStatus, Project } from "@/lib/types";

/** RGB tuples mirroring the brand/status palette. */
export const RGB = {
  band: [15, 23, 35] as [number, number, number], // #0F1723
  blue: [0, 87, 255] as [number, number, number],
  orange: [224, 124, 0] as [number, number, number],
  green: [0, 179, 122] as [number, number, number],
  red: [229, 72, 77] as [number, number, number],
  steel: [121, 136, 154] as [number, number, number],
  ink: [27, 38, 54] as [number, number, number],
  light: [232, 237, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export const STATUS_RGB: Record<DisplayStatus, [number, number, number]> = {
  not_started: RGB.steel,
  on_progress: RGB.blue,
  done: RGB.green,
  blocked: RGB.red,
};

/**
 * Replace characters jsPDF's standard (WinAnsi/Helvetica) fonts can't render
 * — emoji, smart quotes, arrows — so text doesn't garble in the PDF.
 */
export function sanitize(input: string): string {
  return (input ?? "")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[→➡]/g, "->")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, ""); // drop anything outside Latin-1
}

let markCache: string | null | undefined;

/** Rasterise the brand mark to a PNG data URL (cached) for PDF headers. */
export async function getMarkPng(): Promise<string | null> {
  if (markCache !== undefined) return markCache;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = "/brand/mark.svg";
    });
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 120;
    const ctx = c.getContext("2d");
    if (!ctx) return (markCache = null);
    ctx.drawImage(img, 0, 0, 120, 120);
    markCache = c.toDataURL("image/png");
  } catch {
    markCache = null;
  }
  return markCache;
}

export interface ReportStats {
  total: number;
  done: number;
  progress: number;
  pending: number;
  overall: number;
}

/** Dark header band with mark + title + timestamp. Returns next y (mm). */
export function drawHeader(doc: jsPDF, project: Project, title: string, markPng: string | null): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...RGB.band);
  doc.rect(0, 0, w, 24, "F");
  if (markPng) {
    try { doc.addImage(markPng, "PNG", 8, 4, 16, 16); } catch { /* ignore */ }
  }
  doc.setTextColor(...RGB.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(sanitize(`${project.code} — ${project.name}`), markPng ? 28 : 8, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(154, 168, 186);
  doc.text(sanitize(title), markPng ? 28 : 8, 17);
  doc.text(`Generated ${new Date().toLocaleString()}`, w - 8, 11, { align: "right" });
  doc.text("CASCADE-EPC", w - 8, 17, { align: "right" });
  return 30;
}

/** Footer with project/app name + page number on every page. */
export function drawFooter(doc: jsPDF, project: Project): void {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(186, 197, 211);
    doc.setLineWidth(0.2);
    doc.line(8, h - 10, w - 8, h - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...RGB.steel);
    doc.text(sanitize(`CASCADE-EPC · ${project.code}`), 8, h - 6);
    doc.text(`Page ${p} of ${pages}`, w - 8, h - 6, { align: "right" });
  }
}

/** Summary KPI box: total / done / in-progress / pending / overall %. */
export function drawSummary(doc: jsPDF, y: number, stats: ReportStats): number {
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(186, 197, 211);
  doc.setLineWidth(0.3);
  doc.roundedRect(8, y, w - 16, 16, 1, 1, "S");
  const cells = [
    ["TOTAL", String(stats.total)],
    ["DONE", String(stats.done)],
    ["IN PROGRESS", String(stats.progress)],
    ["PENDING", String(stats.pending)],
    ["OVERALL", `${stats.overall}%`],
  ];
  const cw = (w - 16) / cells.length;
  cells.forEach(([label, val], i) => {
    const x = 8 + i * cw;
    if (i > 0) doc.line(x, y, x, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...RGB.steel);
    doc.text(sanitize(label!), x + cw / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...RGB.ink);
    doc.text(val!, x + cw / 2, y + 13, { align: "center" });
  });
  return y + 20;
}

/** Status color legend row. */
export function drawLegend(doc: jsPDF, y: number): number {
  const items: [string, [number, number, number]][] = [
    ["Not Started", RGB.steel], ["On Progress", RGB.blue], ["Done", RGB.green], ["Blocked", RGB.red],
  ];
  let x = 8;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  for (const [label, rgb] of items) {
    doc.setFillColor(...rgb);
    doc.circle(x + 1.5, y - 1, 1.3, "F");
    doc.setTextColor(...RGB.ink);
    doc.text(label, x + 4, y);
    x += doc.getTextWidth(label) + 12;
  }
  return y + 6;
}

export function reportFilename(project: Project, kind: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${project.code}-${kind}-${date}.pdf`;
}
