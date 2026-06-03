import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ticket } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { acceptInvitation, sendMagicLink } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { toast, errMessage } from "@/store/toast";

const PENDING_KEY = "cascade.pendingInvite";

/**
 * Invitation entry. Viewers (and any invitee) redeem a code here.
 * - Authenticated → redeem immediately.
 * - Anonymous → passwordless magic link; the code is kept across the round trip.
 */
export function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const refresh = useAuth((s) => s.refresh);

  const [code, setCode] = useState(params.get("code") ?? localStorage.getItem(PENDING_KEY) ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  async function redeem(theCode: string) {
    setBusy(true);
    try {
      const projectId = await acceptInvitation(theCode.trim());
      localStorage.removeItem(PENDING_KEY);
      await refresh();
      toast.success("Invitation accepted.");
      navigate(projectId ? `/app/projects/${projectId}` : "/app");
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Auto-redeem after a magic-link round trip.
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (status === "authed" && pending) {
      void redeem(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onAuthedSubmit(e: FormEvent) {
    e.preventDefault();
    void redeem(code);
  }

  async function onAnonSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      localStorage.setItem(PENDING_KEY, code.trim());
      await sendMagicLink(email, `/join?code=${encodeURIComponent(code.trim())}`);
      setLinkSent(true);
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (linkSent) {
    return (
      <AuthCard title="Check your email" subtitle="We sent you a secure sign-in link.">
        <p className="py-4 text-center text-sm text-ink-dim">
          Open the link on this device to join the project. No password needed.
        </p>
      </AuthCard>
    );
  }

  const authed = status === "authed";
  return (
    <AuthCard
      title="Join a project"
      subtitle={authed ? "Enter your invitation code to join." : "Invited as a Viewer? Enter your code and email."}
    >
      <div className="mb-5 flex items-start gap-2 rounded border border-line bg-canvas px-3 py-2">
        <Ticket size={16} className="mt-0.5 shrink-0 text-brand-orange" />
        <p className="text-2xs text-ink-dim">
          Viewer access is read-only (plus comments if your inviter allowed it).
        </p>
      </div>
      <form onSubmit={authed ? onAuthedSubmit : onAnonSubmit} className="space-y-4">
        <Field label="Invitation code" htmlFor="code">
          <Input
            id="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
          />
        </Field>
        {!authed && (
          <Field label="Your email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" loading={busy} disabled={!code.trim()} className="w-full">
          {authed ? "Join project" : "Send sign-in link"}
        </Button>
      </form>
    </AuthCard>
  );
}
