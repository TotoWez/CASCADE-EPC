import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/PublicHeader";

function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-full bg-canvas bg-engineering text-ink">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Home
        </Link>
        <div>
          <h1 className="rise-in font-brand text-3xl tracking-wide">{title}</h1>
          <p className="mt-2 font-mono text-2xs uppercase tracking-widest text-ink-mute">Last updated: {updated}</p>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-ink-dim [&_h2]:font-brand [&_h2]:text-sm [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-ink [&_h2]:mt-6">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        CASCADE-EPC (&quot;we&quot;, &quot;us&quot;) provides a hierarchical EPC execution tracker at{" "}
        <span className="text-ink">cascade-epc.com</span>. This policy explains what we collect and how it is handled.
      </p>

      <h2>What we collect</h2>
      <p>
        <span className="text-ink">Account data</span> — name, email address, and optional profile details (position,
        phone, avatar) that you provide when signing up. <span className="text-ink">Project data</span> — the
        organizations, projects, work-breakdown structures, notes, and file attachments your team creates in the app.{" "}
        <span className="text-ink">Technical data</span> — authentication logs kept by our infrastructure provider.
      </p>

      <h2>Where it is stored</h2>
      <p>
        All application data is stored with Supabase (PostgreSQL, Auth &amp; Storage) in the{" "}
        <span className="text-ink">ap-south-1 (Mumbai)</span> region. The web application is served via Cloudflare.
        Transactional email (sign-up confirmations, password resets) is delivered via Resend.
      </p>

      <h2>How it is used</h2>
      <p>
        Solely to operate the service: authentication, storing and syncing your project data, and sending
        account-related email. We do not sell personal data, run advertising, or use tracking cookies.
      </p>

      <h2>Access &amp; isolation</h2>
      <p>
        Data is isolated per organization and protected by row-level security; members only see projects they are
        invited to, according to their role. Attachments live in a private bucket accessible only to project members.
      </p>

      <h2>Retention &amp; deletion</h2>
      <p>
        Your data is retained while your account is active. You can delete projects and attachments at any time from
        the app. To delete your account and all associated data, email{" "}
        <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>{" "}
        and we will remove it within 30 days.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>.
      </p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <p>
        By creating an account or using CASCADE-EPC you agree to these terms. If you use the service on behalf of an
        organization, you represent that you are authorized to bind that organization.
      </p>

      <h2>The service</h2>
      <p>
        CASCADE-EPC is an execution-tracking tool for engineering and construction projects: WBS planning, progress
        rollup, dependencies, QAQC/HSE gates, and reporting. During the beta the service is provided free of charge;
        published prices are provisional and future paid tiers will be announced before billing starts.
      </p>

      <h2>Your content</h2>
      <p>
        You retain all rights to the data your team enters. You grant us only the rights needed to host, process, and
        display it back to you. You are responsible for the legality of the content you upload and for maintaining
        appropriate backups via the built-in JSON export.
      </p>

      <h2>Acceptable use</h2>
      <p>
        No attempts to breach other tenants&apos; data, probe or overload the infrastructure, upload malware, or use
        the service for unlawful purposes. Plan limits (projects, nodes, seats, storage) apply as published on the
        pricing page.
      </p>

      <h2>Availability &amp; warranty</h2>
      <p>
        The service is provided &quot;as is&quot; without warranty of any kind during the beta. We aim for high
        availability but do not yet offer an SLA. We may modify or discontinue features with reasonable notice.
      </p>

      <h2>Liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability arising out of the service is limited to the
        amount you paid for it in the preceding 12 months (currently zero during the free beta).
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service and request deletion at any time. We may suspend accounts that violate these
        terms. Contact:{" "}
        <a href="mailto:hello@cascade-epc.com" className="text-brand-blue hover:underline">hello@cascade-epc.com</a>.
      </p>
    </LegalPage>
  );
}
