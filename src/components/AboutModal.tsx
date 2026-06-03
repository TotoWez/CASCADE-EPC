import { Link } from "react-router-dom";
import { Mail, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/Brand";

const STATUSES: [string, string][] = [
  ["Not Started", "bg-status-notstarted"],
  ["On Progress", "bg-status-progress"],
  ["Done", "bg-status-done"],
  ["Blocked", "bg-status-blocked"],
];

/** Compact "about" surface opened from the top-left brand mark. */
export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="About"
      size="md"
      footer={
        <>
          <Link
            to="/about"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded border border-line px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink"
          >
            <ExternalLink size={13} /> Full about
          </Link>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Brand size={34} showSlogan />
        <p className="text-sm text-ink-dim">
          CASCADE-EPC is a hierarchical EPC execution tracker for substation, transmission, and
          industrial projects — plan the WBS, track real progress with volume-weighted rollup,
          manage dependencies and blockers, mirror linked work, enforce QAQC/HSE gates, and export
          client-ready reports.
        </p>
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-widest text-ink-mute">Status model</p>
          <ul className="grid grid-cols-2 gap-1.5">
            {STATUSES.map(([label, cls]) => (
              <li key={label} className="flex items-center gap-2 text-sm text-ink-dim">
                <span className={`h-2.5 w-2.5 rounded-full ${cls}`} /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3 font-mono text-2xs uppercase tracking-widest text-ink-mute">
          <span>Version 0.1.0</span>
          <a href="mailto:hello@cascade-epc.com" className="inline-flex items-center gap-1 hover:text-ink">
            <Mail size={12} /> hello@cascade-epc.com
          </a>
        </div>
      </div>
    </Modal>
  );
}
