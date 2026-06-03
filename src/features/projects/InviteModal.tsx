import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { assignableRoles } from "@/lib/permissions";
import { ROLE_LABEL, type ProjectRole, type Role } from "@/lib/types";
import { createInvitation, assignRole, listOrgMembers, type OrgMemberRef } from "@/lib/api/members";
import { toast, errMessage } from "@/store/toast";

export function InviteModal({
  open,
  onClose,
  projectId,
  orgId,
  currentRole,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  orgId: string;
  currentRole: Role | null;
  onChanged: () => void;
}) {
  const roles = assignableRoles(currentRole) as ProjectRole[];
  const [mode, setMode] = useState<"code" | "existing">("code");
  const [role, setRole] = useState<ProjectRole>(roles[0] ?? "viewer");
  const [email, setEmail] = useState("");
  const [canComment, setCanComment] = useState(false);
  const [expiryDays, setExpiryDays] = useState(14);
  const [maxUses, setMaxUses] = useState(1);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [orgMembers, setOrgMembers] = useState<OrgMemberRef[]>([]);
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    if (open && mode === "existing" && orgMembers.length === 0) {
      listOrgMembers(orgId).then(setOrgMembers).catch(() => {});
    }
  }, [open, mode, orgId, orgMembers.length]);

  const joinLink = code ? `${window.location.origin}/join?code=${encodeURIComponent(code)}` : "";

  async function generate() {
    setBusy(true);
    try {
      const c = await createInvitation({
        projectId,
        role,
        email: email.trim() || null,
        canComment: role === "viewer" ? canComment : false,
        expiresAt: expiryDays > 0 ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null,
        maxUses,
      });
      setCode(c);
      onChanged();
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function assignExisting() {
    if (!selectedUser) return;
    setBusy(true);
    try {
      await assignRole({ projectId, userId: selectedUser, role, canComment: role === "viewer" ? canComment : false });
      toast.success("Member assigned.");
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errMessage(err));
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
      title="Invite to project"
      footer={
        code ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {mode === "code" ? (
              <Button onClick={generate} loading={busy}>Generate invite</Button>
            ) : (
              <Button onClick={assignExisting} loading={busy} disabled={!selectedUser}>Assign</Button>
            )}
          </>
        )
      }
    >
      {code ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">
            Share this link. {role === "viewer" ? "The Viewer signs in passwordless via the link." : "The invitee accepts after signing in."}
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
          <div className="flex gap-1 rounded border border-line p-1">
            {(["code", "existing"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  "flex-1 rounded px-3 py-1.5 font-mono text-2xs uppercase tracking-widest",
                  mode === m ? "bg-brand-blue text-white" : "text-ink-dim hover:text-ink",
                )}
              >
                {m === "code" ? "Invite by link" : "Existing member"}
              </button>
            ))}
          </div>

          <Field label="Role">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole)}
              options={roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </Field>

          {role === "viewer" && (
            <label className="flex items-center justify-between text-sm text-ink">
              Allow comments
              <input type="checkbox" checked={canComment} onChange={(e) => setCanComment(e.target.checked)} />
            </label>
          )}

          {mode === "code" ? (
            <>
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
            </>
          ) : (
            <Field label="Organization member">
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                options={[{ value: "", label: "— Select —" }, ...orgMembers.map((m) => ({ value: m.userId, label: m.name || m.email }))]}
              />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
