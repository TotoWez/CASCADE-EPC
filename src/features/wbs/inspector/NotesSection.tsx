import { useRef, useState } from "react";
import clsx from "clsx";
import {
  Plus, Trash2, Paperclip, Check, RotateCcw, X, Pencil,
  Image as ImageIcon, FileText, Sheet, Presentation, FileArchive, File as FileIcon, PenTool,
} from "lucide-react";
import { useTree } from "@/store/tree";
import { useProject } from "@/store/project";
import { useAuth } from "@/store/auth";
import { can } from "@/lib/permissions";
import { attachmentKind, opensInTab, sourceColor, groupBySource, type AttachmentKind } from "@/lib/domain/notes";
import { attachmentUrl } from "@/lib/api/notes";
import { toast, errMessage } from "@/store/toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Note, NoteAttachment, WbsNode } from "@/lib/types";

const KIND_ICON: Record<AttachmentKind, typeof FileIcon> = {
  image: ImageIcon, pdf: FileText, word: FileText, excel: Sheet, ppt: Presentation,
  zip: FileArchive, text: FileText, cad: PenTool, file: FileIcon,
};

async function openAttachment(att: NoteAttachment) {
  try {
    const url = await attachmentUrl(att.storagePath);
    if (opensInTab(attachmentKind(att.fileName, att.mime))) {
      window.open(url, "_blank", "noopener");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      a.click();
    }
  } catch (e) {
    toast.error(errMessage(e));
  }
}

function AttachmentChip({ att, onRemove }: { att: NoteAttachment; onRemove?: () => void }) {
  const Icon = KIND_ICON[attachmentKind(att.fileName, att.mime)];
  return (
    <span className="inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-2xs text-ink-dim">
      <button onClick={() => openAttachment(att)} className="inline-flex items-center gap-1 hover:text-ink" title={att.fileName}>
        <Icon size={11} /> <span className="max-w-[120px] truncate">{att.fileName}</span>
      </button>
      {onRemove && <button onClick={onRemove} className="hover:text-status-blocked"><X size={11} /></button>}
    </span>
  );
}

export function NotesSection({ node }: { node: WbsNode; canEdit: boolean }) {
  const t = useTree();
  const role = useProject((s) => s.role);
  const members = useProject((s) => s.members);
  const myId = useAuth((s) => s.user?.id);

  const myComment = members.find((m) => m.userId === myId)?.canComment ?? false;
  const canNote = role === "viewer" ? myComment : can(role, "note.add");
  const canResolve = (n: Note) => role !== "viewer" && (can(role, "note.resolve") || n.createdBy === myId);
  const canEditText = (n: Note) => role !== "viewer" && (can(role, "note.resolve") || n.createdBy === myId);
  const canDelete = (n: Note) => role !== "viewer" && (n.createdBy === myId || role === "admin" || role === "developer" || role === "manager");

  const [editId, setEditId] = useState<string | null>(null);
  const [src, setSrc] = useState("");
  const [text, setText] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function add() {
    if (!text.trim()) return;
    try {
      await t.addNote(node.id, src.trim(), text.trim());
      setText("");
      setSrc("");
    } catch (e) {
      toast.error(errMessage(e));
    }
  }

  const groups = groupBySource(node.notes);

  return (
    <div className="space-y-3">
      {node.notes.length === 0 && <p className="text-sm text-ink-dim">No notes yet.</p>}

      {groups.map(([source, notes]) => (
        <div key={source}>
          <p className="mb-1 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest" style={{ color: sourceColor(source) }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sourceColor(source) }} />
            {source}
          </p>
          <ul className="space-y-1.5">
            {notes.map((n) => (
              <li key={n.id} className="rounded border border-line bg-canvas px-2 py-1.5">
                {editId === n.id ? (
                  <Input
                    defaultValue={n.text}
                    autoFocus
                    className="mb-1 h-7 text-sm"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== n.text) t.updateNote(node.id, n.id, { text: v }).catch((err) => toast.error(errMessage(err)));
                      setEditId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditId(null);
                    }}
                  />
                ) : (
                  // Open notes read red; resolved notes read green (struck through).
                  <p className={clsx("text-sm", n.checked ? "text-brand-green line-through" : "text-status-blocked")}>{n.text}</p>
                )}

                {n.attachments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {n.attachments.map((a) => (
                      <AttachmentChip key={a.id} att={a} onRemove={canEditText(n) ? () => t.removeAttachment(node.id, n.id, a).catch((e) => toast.error(errMessage(e))) : undefined} />
                    ))}
                  </div>
                )}

                <div className="mt-1 flex items-center gap-2">
                  {canResolve(n) && (
                    <button onClick={() => t.updateNote(node.id, n.id, { checked: !n.checked }).catch((e) => toast.error(errMessage(e)))} className={clsx("inline-flex items-center gap-0.5 text-2xs", n.checked ? "text-ink-mute hover:text-ink" : "text-brand-green hover:opacity-80")}>
                      {n.checked ? <><RotateCcw size={11} />reopen</> : <><Check size={11} />resolve</>}
                    </button>
                  )}
                  {canEditText(n) && editId !== n.id && (
                    <button onClick={() => setEditId(n.id)} className="inline-flex items-center gap-0.5 text-2xs text-ink-mute hover:text-ink"><Pencil size={11} />edit</button>
                  )}
                  {canNote && (
                    <>
                      <button onClick={() => fileRefs.current[n.id]?.click()} className="inline-flex items-center gap-0.5 text-2xs text-ink-mute hover:text-ink"><Paperclip size={11} />attach</button>
                      <input ref={(el) => { fileRefs.current[n.id] = el; }} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) t.addAttachment(node.id, n.id, f).catch((err) => toast.error(errMessage(err))); e.currentTarget.value = ""; }} />
                    </>
                  )}
                  {canDelete(n) && <button onClick={() => t.deleteNote(node.id, n.id).catch((e) => toast.error(errMessage(e)))} className="inline-flex items-center gap-0.5 text-2xs text-ink-mute hover:text-status-blocked"><Trash2 size={11} />delete</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {canNote && (
        <div className="space-y-1.5 rounded border border-line bg-canvas p-2">
          <Input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Source (e.g. contractor, site, QAQC)" className="h-7 text-sm" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note or RFI…"
            rows={2}
            className="w-full rounded border border-line bg-surface px-2 py-1 text-sm text-ink placeholder:text-ink-mute focus:border-brand-blue"
          />
          <Button size="sm" onClick={add} disabled={!text.trim()} className="w-full"><Plus size={13} /> Add note</Button>
        </div>
      )}
    </div>
  );
}
