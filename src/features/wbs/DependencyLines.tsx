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

    const compute = () => {
      raf = 0;
      const sel = rectOf(selectedId);
      const node = nodeMap[selectedId];
      if (!sel || !node) return setLines([]);
      const out: Line[] = [];
      const selL = { x: sel.left, y: sel.top + sel.height / 2 };
      const selR = { x: sel.right, y: sel.top + sel.height / 2 };

      // blockers (this node depends on them): blocker.right → selected.left
      for (const depId of node.dependencies) {
        const r = rectOf(depId);
        if (r) out.push({ key: `b-${depId}`, x1: r.right, y1: r.top + r.height / 2, x2: selL.x, y2: selL.y, kind: "blocker" });
      }
      // linked peers: selected.right → peer.left
      if (node.clusterId) {
        for (const peer of nodes) {
          if (peer.clusterId === node.clusterId && peer.id !== node.id) {
            const r = rectOf(peer.id);
            if (r) out.push({ key: `l-${peer.id}`, x1: selR.x, y1: selR.y, x2: r.left, y2: r.top + r.height / 2, kind: "link" });
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
        const mx = (l.x1 + l.x2) / 2;
        return (
          <path
            key={l.key}
            d={`M ${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`}
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
