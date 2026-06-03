import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Keyboard, Users, Activity } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const ROLES: [string, string][] = [
  ["Admin", "Customer IT. Manages org, branding, projects, parties & dates, assigns a Project Manager."],
  ["Manager", "Project Manager. Builds the WBS, assigns leaders, dependencies, categories, reports."],
  ["Engineer", "Team Leader. Full control of their subtree; assigns members; can invite Supervisors/Viewers."],
  ["Supervisor", "Team Member (site). Updates status/progress, dependencies & notes on assigned nodes; reports."],
  ["QAQC", "Owns the QAQC gate (Closed / Pending) project-wide. Notes on any node."],
  ["HSE", "Owns the HSE gate (Complied / Not-Complied). Notes on any node."],
  ["Viewer", "Client / consultant, invite-by-link. Read-only dashboard + reports, optional comments."],
  ["Developer", "Platform support. Full technical access across organizations."],
];

const KEYS: [string, string][] = [
  ["Single-select node", "Click"],
  ["Toggle multi-select", "Ctrl / Cmd + Click"],
  ["Copy with descendants", "Ctrl / Cmd + C"],
  ["Copy without descendants", "Ctrl / Cmd + Shift + C"],
  ["Paste under selected", "Ctrl / Cmd + V"],
  ["Zoom tree in / out", "Ctrl / Cmd + Mouse wheel"],
  ["Close modal / cancel edit", "Escape"],
  ["Save inline title edit", "Enter / blur"],
];

const STATUSES: [string, string][] = [
  ["Not Started", "bg-status-notstarted"],
  ["On Progress", "bg-status-progress"],
  ["Done", "bg-status-done"],
  ["Blocked", "bg-status-blocked"],
];

function Card({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-brand text-sm uppercase tracking-widest text-ink">
        <Icon size={16} className="text-brand-blue" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function About() {
  return (
    <div className="min-h-full bg-canvas bg-engineering text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/"><Brand size={28} /></Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/signin" className="rounded border border-line px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Home
        </Link>
        <div>
          <h1 className="font-brand text-3xl tracking-wide">About CASCADE-EPC</h1>
          <p className="mt-3 max-w-2xl text-ink-dim">
            CASCADE-EPC is a hierarchical EPC execution tracker for substation, transmission, and
            industrial projects. Teams plan the WBS, track real progress with volume-weighted rollup,
            manage physical dependencies and blockers, mirror linked work, enforce QAQC/HSE gates, and
            export client-ready reports — all in a fast, SCADA-grade interface.
          </p>
        </div>

        <Card icon={Users} title="Roles">
          <dl className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(([r, d]) => (
              <div key={r} className="rounded border border-line bg-canvas p-3">
                <dt className="font-brand text-2xs uppercase tracking-widest text-brand-blue-light">{r}</dt>
                <dd className="mt-1 text-sm text-ink-dim">{d}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card icon={Keyboard} title="Keyboard & interaction">
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
          </Card>

          <Card icon={Activity} title="Status model">
            <ul className="space-y-2">
              {STATUSES.map(([label, cls]) => (
                <li key={label} className="flex items-center gap-2 text-sm text-ink-dim">
                  <span className={`h-2.5 w-2.5 rounded-full ${cls}`} /> {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-2xs text-ink-mute">A node is Blocked automatically while any dependency is not Done. QAQC & HSE gates are owned exclusively by their roles.</p>
          </Card>
        </div>

        <Card icon={Mail} title="Contact">
          <p className="text-sm text-ink-dim">
            Questions, demos, or onboarding support? Reach the team at{" "}
            <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>.
          </p>
          <a href="mailto:hello@cascade-epc.com" className="mt-4 inline-flex items-center gap-2 rounded bg-brand-blue px-4 py-2 font-mono text-2xs uppercase tracking-widest text-white hover:bg-brand-blue-dark">
            <Mail size={14} /> Email us
          </a>
        </Card>

        <footer className="border-t border-line pt-6 text-center font-mono text-2xs uppercase tracking-widest text-ink-mute">
          © {new Date().getFullYear()} CASCADE-EPC · Plan it. Track it. CASCADE it.
        </footer>
      </main>
    </div>
  );
}
