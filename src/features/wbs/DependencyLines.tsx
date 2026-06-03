import { useEffect, useState } from "react";
import { useTree } from "@/store/tree";

interface Line {
  key: string;
  x1: number; y1: number; x2: number; y2: number;
  kind: "blocker" | "link";
}

/**
 * Fixed SVG overlay drawing dependency/link relationships for the single
 * selected node. Red dashed = blocker → selected; blue solid = linked peer.
 * Redraws on scroll, resize, selection, expand/collapse, and node changes.
 */
export function DependencyLines() {
  const linesOn = useTree((s) => s.linesOn);
  const selectedId = useTree((s) => s.selectedId);
  const nodes = useTree((s) => s.nodes);
  const expanded = useTree((s) => s.expanded);
  const nodeMap = useTree((s) => s.nodeMap);

  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!linesOn || !selectedId) {
      setLines([]);
      return;
    }

    let raf = 0;
    const rectOf = (id: string) =>
      document.querySelector(`[data-node-id="${id}"]`)?.getBoundingClientRect() ?? null;

    // Connect from the horizontal centre of one card to the other, leaving from
    // the vertical edge that faces the target so the line runs vertically.
    const edge = (from: DOMRect, to: DOMRect) => {
      const x1 = from.left + from.width / 2;
      const x2 = to.left + to.width / 2;
      const fromAbove = from.top + from.height / 2 <= to.top + to.height / 2;
      const y1 = fromAbove ? from.bottom : from.top;
      const y2 = fromAbove ? to.top : to.bottom;
      return { x1, y1, x2, y2 };
    };

    const compute = () => {
      raf = 0;
      const sel = rectOf(selectedId);
      const node = nodeMap[selectedId];
      if (!sel || !node) return setLines([]);
      const out: Line[] = [];

      // blockers (this node depends on them): blocker.center → selected.center
      for (const depId of node.dependencies) {
        const r = rectOf(depId);
        if (r) out.push({ key: `b-${depId}`, ...edge(r, sel), kind: "blocker" });
      }
      // linked peers: selected.center → peer.center
      if (node.clusterId) {
        for (const peer of nodes) {
          if (peer.clusterId === node.clusterId && peer.id !== node.id) {
            const r = rectOf(peer.id);
            if (r) out.push({ key: `l-${peer.id}`, ...edge(sel, r), kind: "link" });
          }
        }
      }
      setLines(out);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [linesOn, selectedId, nodes, expanded, nodeMap]);

  if (!linesOn || lines.length === 0) return null;

  return (
    <svg className="pointer-events-none fixed inset-0 z-20 h-full w-full" width="100%" height="100%">
      <defs>
        <marker id="dep-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#E5484D" />
        </marker>
        <marker id="link-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <circle cx="4" cy="4" r="3" fill="#0057FF" />
        </marker>
      </defs>
      {lines.map((l) => {
        const my = (l.y1 + l.y2) / 2;
        return (
          <path
            key={l.key}
            d={`M ${l.x1} ${l.y1} C ${l.x1} ${my}, ${l.x2} ${my}, ${l.x2} ${l.y2}`}
            fill="none"
            stroke={l.kind === "blocker" ? "#E5484D" : "#0057FF"}
            strokeWidth={1.6}
            strokeDasharray={l.kind === "blocker" ? "5 4" : undefined}
            markerEnd={l.kind === "blocker" ? "url(#dep-arrow)" : "url(#link-arrow)"}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
