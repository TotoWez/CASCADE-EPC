import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { bootstrapOrg } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { toast, errMessage } from "@/store/toast";

/** Shown to a confirmed user who has no organization yet. */
export function Onboarding() {
  const navigate = useNavigate();
  const refresh = useAuth((s) => s.refresh);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrapOrg(name.trim());
      await refresh();
      toast.success("Organization created — you are its Admin.");
      navigate("/app");
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your organization"
      subtitle="You'll be the Admin: manage projects, branding, and team."
    >
      <div className="mb-5 flex items-start gap-2 rounded border border-line bg-canvas px-3 py-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-blue" />
        <p className="text-2xs text-ink-dim">
          As Admin you can create projects and invite Managers, Engineers, Supervisors, QA/QC, HSE,
          and Viewers.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Organization name" htmlFor="org" hint="e.g. your company or business unit.">
          <Input
            id="org"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Power Engineering"
          />
        </Field>
        <Button type="submit" loading={busy} disabled={!name.trim()} className="w-full">
          Create organization
        </Button>
      </form>
    </AuthCard>
  );
}
