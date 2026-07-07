import { Modal } from "@/components/ui/Modal";

/** Keyboard & interaction map — single source, also rendered on the About page. */
export const KEYS: [string, string][] = [
  ["Single-select node", "Click"],
  ["Toggle multi-select", "Ctrl / Cmd + Click"],
  ["Copy with descendants", "Ctrl / Cmd + C"],
  ["Copy without descendants", "Ctrl / Cmd + Shift + C"],
  ["Paste under selected", "Ctrl / Cmd + V"],
  ["Zoom tree in / out", "Ctrl / Cmd + Mouse wheel"],
  ["Close modal / cancel edit", "Escape"],
  ["Save inline title edit", "Enter / blur"],
  ["Show this help", "?"],
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <table className="w-full text-sm">
        <tbody>
          {KEYS.map(([action, key]) => (
            <tr key={action} className="border-b border-line/60 last:border-0">
              <td className="py-1.5 text-ink-dim">{action}</td>
              <td className="py-1.5 text-right font-mono text-2xs text-ink">{key}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
