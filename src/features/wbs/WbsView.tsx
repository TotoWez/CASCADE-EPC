import { useEffect } from "react";
import { useTree } from "@/store/tree";
import { TreeCanvas } from "./TreeCanvas";
import { Inspector } from "./Inspector";
import { BulkEditPanel } from "./BulkEditPanel";

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

  const multi = selectedIds.length >= 2;
  const anySel = selectedIds.length >= 1;
  const Pane = multi ? <BulkEditPanel /> : <Inspector />;

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">
        <TreeCanvas />
      </div>

      <aside className="sticky top-[116px] hidden h-[calc(100vh-116px)] w-[384px] shrink-0 self-start overflow-hidden border-l border-line bg-surface lg:block">
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
