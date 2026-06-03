/** Note source color hints + attachment typing + filename de-duplication. */

export type AttachmentKind =
  | "image" | "pdf" | "word" | "excel" | "ppt" | "zip" | "text" | "cad" | "file";

/** Map a filename/mime to an attachment kind (for the chip icon). */
export function attachmentKind(fileName: string, mime = ""): AttachmentKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["txt", "md", "log"].includes(ext)) return "text";
  if (["dwg", "dxf"].includes(ext)) return "cad";
  return "file";
}

/** Images/PDFs open in a new tab; everything else downloads. */
export function opensInTab(kind: AttachmentKind): boolean {
  return kind === "image" || kind === "pdf";
}

const SOURCE_COLORS: Record<string, string> = {
  contractor: "#0057FF",
  consultant: "#00B37A",
  client: "#E07C00",
  qa: "#8B5CF6",
  qaqc: "#8B5CF6",
  site: "#E5484D",
  comm: "#0EA5E9",
  communications: "#0EA5E9",
  internal: "#79889A",
};

export function sourceColor(source: string): string {
  return SOURCE_COLORS[source.trim().toLowerCase()] ?? "#9AA8BA";
}

/** Append a numeric suffix on collision: file.pdf → file (1).pdf. */
export function uniqueFilename(name: string, existing: Set<string>): string {
  if (!existing.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  let candidate = `${base} (${i})${ext}`;
  while (existing.has(candidate)) candidate = `${base} (${++i})${ext}`;
  return candidate;
}

/** Group notes by source; empty source under "—"; "—" sorts last. */
export function groupBySource<T extends { source: string }>(notes: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const note of notes) {
    const key = note.source.trim() || "—";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(note);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "—") return 1;
    if (b[0] === "—") return -1;
    return a[0].localeCompare(b[0]);
  });
}
