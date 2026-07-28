import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Keyboard, Users, Activity } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";
import { Section } from "@/components/ui/Section";
import { KEYS } from "@/components/ShortcutsModal";

const ROLES: [string, string][] = [
  ["Admin", "Runs the company workspace — branding, projects, parties, dates, plan, and the team. Assigns a Project Manager to each project."],
  ["Manager", "Project Manager. Builds the WBS, brings in leaders, sets dependencies and categories, and generates reports."],
  ["Engineer", "Team Leader. Full control of their own branch; assigns members and can invite Supervisors and Viewers."],
  ["Supervisor", "Team member on site. Updates status, progress, dependencies, and notes on their assigned work, and pulls reports."],
  ["QAQC", "Owns the quality gate (Closed / Pending) across the project, and can note on any node."],
  ["HSE", "Owns the safety gate (Complied / Not-Complied), and can note on any node."],
  ["Viewer", "Client or consultant, invited by link. Read-only dashboard and reports — with comments if you allow it."],
  ["Developer", "Platform support. Technical access across organizations when you need a hand."],
];

const STATUSES: [string, string][] = [
  ["Not Started", "bg-status-notstarted"],
  ["On Progress", "bg-status-progress"],
  ["Done", "bg-status-done"],
  ["Blocked", "bg-status-blocked"],
];

export function About() {
  return (
    <div className="min-h-full bg-canvas bg-engineering text-ink">
      <PublicHeader />

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Home
        </Link>
        <div>
          <p className="rise-in font-mono text-2xs uppercase tracking-[0.25em] text-brand-blue-light">About</p>
          <h1 className="rise-in rise-in-1 mt-1.5 font-brand text-3xl tracking-wide">CASCADE-EPC</h1>
          <p className="rise-in rise-in-2 mt-3 max-w-2xl text-ink-dim">
            CASCADE-EPC helps EPC teams run substation, transmission, and industrial projects from
            one place. Plan the work breakdown, track real progress as it rolls up from the field,
            keep dependencies and blockers visible, mirror linked work, hold QAQC and HSE sign-off
            beside the work, and export client-ready reports — in a fast, SCADA-grade interface.
          </p>
        </div>

        <Section icon={Users} title="Who does what">
          <dl className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(([r, d]) => (
              <div key={r} className="rounded border border-line bg-canvas p-3">
                <dt className="font-brand text-2xs uppercase tracking-widest text-brand-blue-light">{r}</dt>
                <dd className="mt-1 text-sm text-ink-dim">{d}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section icon={Keyboard} title="Keyboard & interaction">
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
          </Section>

          <Section icon={Activity} title="Status model">
            <ul className="space-y-2">
              {STATUSES.map(([label, cls]) => (
                <li key={label} className="flex items-center gap-2 text-sm text-ink-dim">
                  <span className={`h-2.5 w-2.5 rounded-full ${cls}`} /> {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-2xs text-ink-mute">
              A node turns Blocked automatically while any of its dependencies isn't Done. The QAQC
              and HSE gates are owned exclusively by those roles.
            </p>
          </Section>
        </div>

        <Section icon={Mail} title="Talk to us">
          <p className="text-sm text-ink-dim">
            Questions, a demo, or a hand getting set up? We'd love to hear from you at{" "}
            <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>.
          </p>
          <a href="mailto:hello@cascade-epc.com" className="mt-4 inline-flex items-center gap-2 rounded bg-brand-blue px-4 py-2 font-mono text-2xs uppercase tracking-widest text-white hover:bg-brand-blue-dark">
            <Mail size={14} /> Email us
          </a>
        </Section>
      </main>

      <PublicFooter />
    </div>
  );
}
