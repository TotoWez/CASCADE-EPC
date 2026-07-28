import { useEffect, useState } from "react";
import { UserPlus, UserRound, Trash2, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { OrgInviteModal } from "@/features/org/OrgInviteModal";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/store/auth";
import {
  listOrgMembers,
  listOrgInvitations,
  setOrgMemberRole,
  removeOrgMember,
  deleteInvitation,
  type OrgMemberRef,
  type Invitation,
} from "@/lib/api/members";
import { toast } from "@/store/toast";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

/** Org-wide member management for admins: list, invite, change role, remove. */
export function OrgMembers({ orgId }: { orgId: string }) {
  const myId = useAuth((s) => s.user?.id);
  const [members, setMembers] = useState<OrgMemberRef[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [m, i] = await Promise.all([listOrgMembers(orgId), listOrgInvitations(orgId)]);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      toast.fail(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const adminCount = members.filter((m) => m.orgRole === "admin").length;
  const pending = invites.filter((i) => !i.acceptedAt);

  async function onRole(m: OrgMemberRef, role: "admin" | "member") {
    if (role === m.orgRole) return;
    setBusyId(m.userId);
    try {
      await setOrgMemberRole(orgId, m.userId, role);
      setMembers((prev) => prev.map((x) => (x.userId === m.userId ? { ...x, orgRole: role } : x)));
      toast.success(`${m.name || m.email} is now ${role === "admin" ? "an Admin" : "a Member"}.`);
    } catch (e) {
      toast.fail(e);
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(m: OrgMemberRef) {
    if (
      !(await confirmDialog({
        title: "Remove member",
        message: `Remove ${m.name || m.email} from the organization? They lose access to all its projects.`,
        confirmLabel: "Remove",
        danger: true,
      }))
    )
      return;
    setBusyId(m.userId);
    try {
      await removeOrgMember(orgId, m.userId);
      setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
      toast.success("Member removed.");
    } catch (e) {
      toast.fail(e);
    } finally {
      setBusyId(null);
    }
  }

  async function onRevoke(id: string) {
    try {
      await deleteInvitation(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      toast.fail(e);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-2xs uppercase tracking-widest text-ink-mute">Members</h2>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <UserPlus size={14} /> Invite
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-brand-blue" size={22} /></div>
      ) : (
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {members.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-dim">No members yet.</p>
          ) : (
            members.map((m) => {
              const isSelf = m.userId === myId;
              const lastAdmin = m.orgRole === "admin" && adminCount <= 1;
              return (
                <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-ink-mute">
                    <UserRound size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{m.name || m.email}{isSelf ? " · you" : ""}</p>
                    <p className="truncate font-mono text-2xs text-ink-mute">{m.email}</p>
                  </div>
                  {busyId === m.userId && <Loader2 size={14} className="animate-spin text-brand-blue" />}
                  <Select
                    className="w-28"
                    aria-label={`Role for ${m.name || m.email}`}
                    options={ROLE_OPTIONS}
                    value={m.orgRole}
                    disabled={busyId === m.userId || lastAdmin}
                    onChange={(e) => onRole(m, e.target.value as "admin" | "member")}
                  />
                  {!isSelf && !lastAdmin && (
                    <button
                      onClick={() => onRemove(m)}
                      className="text-ink-mute hover:text-status-blocked"
                      title="Remove from organization"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {pending.length > 0 && (
        <>
          <h3 className="mt-8 font-mono text-2xs uppercase tracking-widest text-ink-mute">Pending invitations</h3>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {pending.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <Ticket size={15} className="text-brand-orange" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{i.email || "Shareable link"}</p>
                  <p className="truncate font-mono text-2xs text-ink-mute">
                    {i.uses}/{i.maxUses} used{i.expiresAt ? ` · expires ${new Date(i.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <button onClick={() => onRevoke(i.id)} className="text-ink-mute hover:text-status-blocked" title="Revoke">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showInvite && (
        <OrgInviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          orgId={orgId}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
