import { useEffect, useState } from "react";
import { UserPlus, Trash2, UserRound, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InviteModal } from "@/features/projects/InviteModal";
import { useProject } from "@/store/project";
import { can } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/types";
import { listInvitations, deleteInvitation, removeMember, type Invitation } from "@/lib/api/members";
import { useAuth } from "@/store/auth";
import { toast, errMessage } from "@/store/toast";

export function TeamPanel() {
  const project = useProject((s) => s.project)!;
  const role = useProject((s) => s.role);
  const members = useProject((s) => s.members);
  const reloadMembers = useProject((s) => s.reloadMembers);
  const myId = useAuth((s) => s.user?.id);

  const [invites, setInvites] = useState<Invitation[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const canInvite = can(role, "invite");
  const canRemove = role === "admin" || role === "developer";

  async function loadInvites() {
    try {
      setInvites(await listInvitations(project.id));
    } catch {
      /* viewers/limited roles may not see invites */
    }
  }
  useEffect(() => {
    if (canInvite) void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function onRemove(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    try {
      await removeMember(project.id, userId);
      await reloadMembers();
      toast.success("Member removed.");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function onRevoke(id: string) {
    try {
      await deleteInvitation(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-brand text-lg tracking-wide text-ink">Team</h2>
        {canInvite && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={15} /> Invite
          </Button>
        )}
      </div>

      <div className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
        {members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-dim">No members yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-2">
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={16} className="text-ink-mute" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{m.name || m.email}</p>
                <p className="truncate font-mono text-2xs text-ink-mute">{m.email}{m.position ? ` · ${m.position}` : ""}</p>
              </div>
              <span className="count-badge">{ROLE_LABEL[m.role]}</span>
              {m.role === "viewer" && m.canComment && <span className="count-badge">comments</span>}
              {canRemove && m.userId !== myId && (
                <button onClick={() => onRemove(m.userId)} className="text-ink-mute hover:text-status-blocked" title="Remove">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canInvite && invites.filter((i) => !i.acceptedAt).length > 0 && (
        <>
          <h3 className="mt-8 font-mono text-2xs uppercase tracking-widest text-ink-mute">Pending invitations</h3>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {invites.filter((i) => !i.acceptedAt).map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <Ticket size={15} className="text-brand-orange" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{i.email || "Shareable link"} · {ROLE_LABEL[i.role]}</p>
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
        <InviteModal
          open={showInvite}
          onClose={() => setShowInvite(false)}
          projectId={project.id}
          orgId={project.orgId}
          currentRole={role}
          onChanged={() => {
            void reloadMembers();
            void loadInvites();
          }}
        />
      )}
    </div>
  );
}
