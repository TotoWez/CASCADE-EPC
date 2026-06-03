import { useEffect, useRef, useState } from "react";
import { useTree } from "@/store/tree";
import { TreeCanvas } from "./TreeCanvas";
import { Inspector } from "./Inspector";
import { BulkEditPanel } from "./BulkEditPanel";

const MIN_W = 320;
const MAX_W = 760;
const WIDTH_KEY = "cascade.inspectorW";

function readPanelWidth(): number {
  if (typeof localStorage === "undefined") return 384;
  const v = Number(localStorage.getItem(WIDTH_KEY));
  return v >= MIN_W && v <= MAX_W ? v : 384;
}

function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

/**
 * WBS workspace layout: tree canvas + right pane (inspector for 0–1 selected,
 * bulk-edit panel for 2+). Desktop = sticky side-pane; mobile = overlay drawer.
 * Also wires the copy/paste keyboard map.
 */
export function WbsView() {
  const selectedIds = useTree((s) => s.selectedIds);
  const clearSelection = useTree((s) => s.clearSelection);
  const copy = useTree((s) => s.copy);
  const paste = useTree((s) => s.paste);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "c") {
        if (!window.getSelection()?.isCollapsed) return; // let real text copy through
        e.preventDefault();
        copy(!e.shiftKey); // Ctrl/Cmd+C = with descendants; +Shift = without
      } else if (k === "v") {
        e.preventDefault();
        void paste(useTree.getState().selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy, paste]);

  // Resizable inspector pane (desktop). Width persists across sessions.
  const [panelW, setPanelW] = useState(readPanelWidth);
  const widthRef = useRef(panelW);
  const draggingRef = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const w = Math.min(MAX_W, Math.max(MIN_W, window.innerWidth - e.clientX));
      widthRef.current = w;
      setPanelW(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        localStorage.setItem(WIDTH_KEY, String(Math.round(widthRef.current)));
      } catch {
        /* ignore storage failures */
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const multi = selectedIds.length >= 2;
  const anySel = selectedIds.length >= 1;
  const Pane = multi ? <BulkEditPanel /> : <Inspector />;

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">
        <TreeCanvas />
      </div>

      <aside
        style={{ width: panelW }}
        className="sticky top-[116px] hidden h-[calc(100vh-116px)] shrink-0 self-start overflow-hidden border-l border-line bg-surface lg:block"
      >
        <div
          onPointerDown={startResize}
          title="Drag to resize"
          className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-brand-blue/40"
        />
        {Pane}
      </aside>

      {anySel && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={clearSelection} />
          <div className="absolute inset-y-0 right-0 w-[92%] max-w-sm overflow-hidden border-l border-line bg-surface shadow-panel">
            {Pane}
          </div>
        </div>
      )}
    </div>
  );
}
