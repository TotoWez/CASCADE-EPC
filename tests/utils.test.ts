import { describe, it, expect } from "vitest";
import { uniqueFilename, groupBySource, attachmentKind, opensInTab } from "@/lib/domain/notes";
import { diffSnapshots } from "@/lib/domain/snapshotDiff";
import { relativeTime } from "@/lib/time";
import { siblingAccent, categoryColor } from "@/lib/domain/color";

describe("notes utilities", () => {
  it("de-duplicates filenames with numeric suffixes", () => {
    expect(uniqueFilename("a.pdf", new Set())).toBe("a.pdf");
    expect(uniqueFilename("a.pdf", new Set(["a.pdf"]))).toBe("a (1).pdf");
    expect(uniqueFilename("a.pdf", new Set(["a.pdf", "a (1).pdf"]))).toBe("a (2).pdf");
    expect(uniqueFilename("noext", new Set(["noext"]))).toBe("noext (1)");
  });

  it("groups notes by source with empty under '—' sorted last", () => {
    const groups = groupBySource([
      { source: "site" }, { source: "" }, { source: "client" }, { source: "site" },
    ]);
    expect(groups.map((g) => g[0])).toEqual(["client", "site", "—"]);
    expect(groups.find((g) => g[0] === "site")![1]).toHaveLength(2);
  });

  it("maps filenames to attachment kinds", () => {
    expect(attachmentKind("x.png")).toBe("image");
    expect(attachmentKind("x.pdf")).toBe("pdf");
    expect(attachmentKind("x.dwg")).toBe("cad");
    expect(attachmentKind("x.xlsx")).toBe("excel");
    expect(attachmentKind("x.bin")).toBe("file");
    expect(opensInTab("image")).toBe(true);
    expect(opensInTab("zip")).toBe(false);
  });
});

describe("snapshot diff", () => {
  it("reports changed / added / removed nodes", () => {
    const older = { nodes: [
      { id: "A", node_code: "A", title: "A", progress: 0, work_status: "not_started" },
      { id: "B", node_code: "B", title: "B", progress: 50, work_status: "on_progress" },
    ] };
    const newer = { nodes: [
      { id: "A", node_code: "A", title: "A", progress: 100, work_status: "done" }, // changed
      { id: "C", node_code: "C", title: "C", progress: 0, work_status: "not_started" }, // added
    ] };
    const d = diffSnapshots(older, newer);
    expect(d.changes.map((c) => c.id)).toEqual(["A"]);
    expect(d.changes[0]).toMatchObject({ fromProgress: 0, toProgress: 100 });
    expect(d.added.map((a) => a.code)).toEqual(["C"]);
    expect(d.removed.map((r) => r.code)).toEqual(["B"]);
  });
});

describe("relative time", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0).getTime();
  it("buckets into just now / minutes / hours / days", () => {
    expect(relativeTime(new Date(now - 30_000), now)).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000), now)).toBe("5m ago");
    expect(relativeTime(new Date(now - 3 * 3600_000), now)).toBe("3h ago");
    expect(relativeTime(new Date(now - 2 * 86400_000), now)).toBe("2d ago");
    expect(relativeTime(null, now)).toBe("");
  });
});

describe("deterministic colors", () => {
  it("is stable per key and neutral for the root group", () => {
    expect(siblingAccent("parent-x")).toBe(siblingAccent("parent-x"));
    expect(siblingAccent(null)).toBe("#79889A");
    expect(categoryColor("general")).toBe("#9AA8BA");
    expect(categoryColor("civil", "#E07C00")).toBe("#E07C00"); // stored wins
  });
});
