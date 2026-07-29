import { useEffect, useRef, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, ImagePlus, Loader2 } from "lucide-react";
import clsx from "clsx";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useAuth } from "@/store/auth";
import { getOrg, updateOrg, uploadBranding, usageStats, type Org, type UsageStats } from "@/lib/api/org";
import { startCheckout, openPortal } from "@/lib/api/billing";
import { OrgMembers } from "@/features/org/OrgMembers";
import { PLANS, usageLevel, usageMessage, type Plan } from "@/lib/plans";
import { toast } from "@/store/toast";

type OrgTab = "general" | "members" | "billing";
const TABS: { id: OrgTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "billing", label: "Billing & usage" },
];

function planFor(tier: string | undefined): Plan {
  return PLANS.find((p) => p.id === (tier ?? "free")) ?? PLANS[0]!;
}

export function OrgAdmin() {
  const orgs = useAuth((s) => s.orgs);
  const refresh = useAuth((s) => s.refresh);
  const adminOrg = orgs.find((o) => o.orgRole === "admin");
  const fileRef = useRef<HTMLInputElement>(null);

  const [org, setOrg] = useState<Org | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [billing, setBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<OrgTab>(params.get("billing") ? "billing" : "general");

  useEffect(() => {
    if (!adminOrg) return;
    Promise.all([getOrg(adminOrg.orgId), usageStats(adminOrg.orgId)])
      .then(([o, u]) => {
        setOrg(o);
        setUsage(u);
        setName(o?.name ?? "");
      })
      .catch((e) => toast.fail(e))
      .finally(() => setLoading(false));
  }, [adminOrg]);

  // Toast the result of a returning Stripe Checkout, then clean the URL.
  useEffect(() => {
    const b = params.get("billing");
    if (b === "success") toast.success("Subscription updated — thank you!");
    else if (b === "cancelled") toast.info("Checkout cancelled.");
    if (b) {
      params.delete("billing");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  if (!adminOrg) return <Navigate to="/app" replace />;

  async function onSaveName() {
    if (!org) return;
    setBusy(true);
    try {
      await updateOrg(org.id, { name });
      await refresh();
      toast.success("Organization updated.");
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function onCheckout(tier: "pro" | "pro_max") {
    if (!adminOrg) return;
    setBilling(true);
    try {
      await startCheckout(adminOrg.orgId, tier); // redirects to Stripe on success
    } catch (e) {
      toast.fail(e);
      setBilling(false);
    }
  }

  async function onManageBilling() {
    if (!adminOrg) return;
    setBilling(true);
    try {
      await openPortal(adminOrg.orgId); // redirects to the Stripe portal on success
    } catch (e) {
      toast.fail(e);
      setBilling(false);
    }
  }

  async function onLogo(file: File) {
    if (!org) return;
    setBusy(true);
    try {
      const url = await uploadBranding(org.id, file, "org");
      await updateOrg(org.id, { logoUrl: url });
      setOrg({ ...org, logoUrl: url });
      toast.success("Logo updated.");
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  }

  const plan = planFor(org?.subscriptionTier);
  const storageUsedMb = Math.round((usage?.storageBytes ?? 0) / 1024 / 1024);
  const meters: { label: string; used: number; cap: number | null; unit?: string }[] = [
    { label: "Projects", used: usage?.projects ?? 0, cap: plan.limits.projects },
    { label: "Member seats", used: usage?.members ?? 0, cap: plan.limits.members },
    { label: "Snapshots", used: usage?.snapshots ?? 0, cap: plan.limits.snapshots },
    { label: "Attachment storage", used: storageUsedMb, cap: plan.limits.storageMb, unit: "MB" },
  ];
  const usageAlerts = meters
    .filter((m) => ["warning", "full"].includes(usageLevel(m.used, m.cap)))
    .map((m) => usageMessage(m.label, m.used, m.cap, m.unit)!);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/app" className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-widest text-ink-dim hover:text-ink">
          <ArrowLeft size={14} /> Projects
        </Link>
        <div className="mt-4">
          <PageHeader
            kicker="Organization"
            title={org?.name || adminOrg.name}
            subtitle="Manage your workspace, team, plan, and usage."
          />
        </div>

        <nav className="mt-5 flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "border-b-2 px-3 py-2 font-mono text-2xs uppercase tracking-widest transition-colors",
                tab === t.id ? "border-brand-blue text-ink" : "border-transparent text-ink-mute hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-brand-blue" size={24} /></div>
        ) : (
          <div className="mt-6">
            {tab === "general" && (
              <Section title="Branding">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded border border-line bg-canvas text-ink-mute hover:border-ink-mute"
                    title="Upload organization logo"
                  >
                    {org?.logoUrl ? <img src={org.logoUrl} alt="" className="h-full w-full object-contain p-2" /> : <ImagePlus size={20} />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLogo(f); }} />
                  <div className="flex-1">
                    <Field label="Organization name" htmlFor="on">
                      <Input id="on" value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                  </div>
                  <Button onClick={onSaveName} loading={busy} className="self-end">Save</Button>
                </div>
              </Section>
            )}

            {tab === "members" && <OrgMembers orgId={adminOrg.orgId} />}

            {tab === "billing" && (
              <div className="space-y-6">
                {usageAlerts.length > 0 && (
                  <div className="rounded-card border border-brand-orange/50 bg-brand-orange/10 p-4">
                    <p className="font-mono text-2xs uppercase tracking-widest text-brand-orange">Approaching your plan limits</p>
                    <ul className="mt-2 space-y-1 text-sm text-ink-dim">
                      {usageAlerts.map((a) => (
                        <li key={a}>· {a}</li>
                      ))}
                    </ul>
                    {org?.subscriptionTier !== "pro_max" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        loading={billing}
                        onClick={() => onCheckout(org?.subscriptionTier === "pro" ? "pro_max" : "pro")}
                      >
                        Upgrade plan
                      </Button>
                    )}
                  </div>
                )}
                <Section title={`Usage · ${plan.name} plan`} bodyClassName="p-0">
                  <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
                    {meters.map((m) => (
                      <Meter key={m.label} label={m.label} used={m.used} cap={m.cap} unit={m.unit} />
                    ))}
                  </div>
                  <p className="px-4 py-3 text-2xs text-ink-mute">
                    {usage?.nodes ?? 0} nodes across all projects (cap is per project:{" "}
                    {plan.limits.nodesPerProject ?? "unlimited"}).{" "}
                    <Link to="/pricing" className="text-brand-blue hover:underline">See plans</Link>.
                  </p>
                </Section>

                <Section title="Plan">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-ink-dim">
                      You're on the <span className="font-mono text-ink">{planFor(org?.subscriptionTier).name}</span> plan.
                    </p>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {org?.subscriptionTier === "free" ? (
                        <>
                          <Button variant="outline" size="sm" loading={billing} onClick={() => onCheckout("pro")}>
                            Upgrade to Pro
                          </Button>
                          <Button size="sm" loading={billing} onClick={() => onCheckout("pro_max")}>
                            Upgrade to Pro Max
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" loading={billing} onClick={onManageBilling}>
                          <CreditCard size={13} /> Manage billing
                        </Button>
                      )}
                    </div>
                  </div>
                </Section>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/** Usage vs plan-cap meter with 50% / 80% / 100% warnings. `cap` null = unlimited. */
function Meter({ label, used, cap, unit }: { label: string; used: number; cap: number | null; unit?: string }) {
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const level = usageLevel(used, cap);
  const barColor =
    level === "full" ? "bg-status-blocked" : level === "warning" ? "bg-brand-orange" : "bg-brand-blue";
  const caption =
    level === "full"
      ? "Limit reached — upgrade to add more"
      : level === "warning"
        ? "Almost full — consider upgrading"
        : level === "notice"
          ? "Over half used"
          : null;
  const captionColor =
    level === "full" ? "text-status-blocked" : level === "warning" ? "text-brand-orange" : "text-ink-mute";
  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="font-brand text-2xs uppercase tracking-widest text-ink-mute">{label}</p>
        <p className="font-mono text-sm text-ink">
          {used.toLocaleString()}
          <span className="text-2xs text-ink-mute"> / {cap === null ? "∞" : cap.toLocaleString()}{unit ? ` ${unit}` : ""}</span>
        </p>
      </div>
      {cap !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {caption && <p className={`mt-1 text-2xs ${captionColor}`}>{caption}</p>}
    </div>
  );
}
