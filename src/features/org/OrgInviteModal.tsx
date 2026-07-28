import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { createOrgInvitation } from "@/lib/api/members";
import { toast } from "@/store/toast";

/**
 * Invite a teammate to the ORGANISATION (not a specific project). They redeem at
 * /join, land as an org member, and can then be assigned to projects from a
 * project's Team tab.
 */
export function OrgInviteModal({
  open,
  onClose,
  orgId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(14);
  const [maxUses, setMaxUses] = useState(1);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinLink = code ? `${window.location.origin}/join?code=${encodeURIComponent(code)}` : "";

  async function generate() {
    setBusy(true);
    try {
      const c = await createOrgInvitation({
        orgId,
        email: email.trim() || null,
        expiresAt: expiryDays > 0 ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null,
        maxUses,
      });
      setCode(c);
      onChanged();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(joinLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite to organization"
      footer={
        code ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={generate} loading={busy}>Generate invite</Button>
          </>
        )
      }
    >
      {code ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">
            Share this link. Your teammate signs in, joins the organization, and you can then add
            them to any project.
          </p>
          <div className="flex items-center gap-2 rounded border border-line bg-canvas p-2">
            <code className="flex-1 truncate font-mono text-2xs text-ink">{joinLink}</code>
            <button onClick={copy} className="text-ink-mute hover:text-ink" title="Copy link">
              {copied ? <Check size={16} className="text-brand-green" /> : <Copy size={16} />}
            </button>
          </div>
          <p className="font-mono text-2xs text-ink-mute">Code: {code}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Invite a teammate to join <span className="text-ink">your organization</span>. They start
            as a member; assign them project roles later from each project's Team tab.
          </p>
          <Field label="Email (optional)" hint="Leave blank for a shareable code.">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expires in (days)">
              <Input type="number" min={0} max={365} value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} />
            </Field>
            <Field label="Max uses">
              <Input type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value) || 1)} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
