import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTree } from "@/store/tree";
import {
  addCategory, renameCategory, deleteCategory, CATEGORY_RE, PROTECTED_CATEGORIES,
} from "@/lib/api/categories";
import { categoryColor } from "@/lib/domain/color";
import { toast, errMessage } from "@/store/toast";

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { projectId, nodes, categories, setNodesLocal, reloadCategories } = useTree();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  // Union of stored categories + any category actually used by nodes.
  const rows = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const n of nodes) usage[n.category] = (usage[n.category] ?? 0) + 1;
    const names = new Set<string>([...categories.map((c) => c.name), ...Object.keys(usage)]);
    return [...names].sort().map((name) => ({
      name,
      count: usage[name] ?? 0,
      color: categoryColor(name, categories.find((c) => c.name === name)?.color),
    }));
  }, [nodes, categories]);

  async function onAdd() {
    const name = newName.trim();
    if (!CATEGORY_RE.test(name)) return toast.error("Use letters, digits, hyphen, underscore (max 40).");
    if (rows.some((r) => r.name === name)) return toast.error("Category already exists.");
    setBusy(true);
    try {
      await addCategory(projectId!, name);
      await reloadCategories();
      setNewName("");
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(oldName: string) {
    const name = editName.trim();
    if (!CATEGORY_RE.test(name)) return toast.error("Invalid category name.");
    if (name !== oldName && rows.some((r) => r.name === name)) return toast.error("Category already exists.");
    setBusy(true);
    try {
      await renameCategory(projectId!, oldName, name);
      setNodesLocal(nodes.map((n) => (n.category === oldName ? { ...n, category: name } : n)));
      await reloadCategories();
      setEditing(null);
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(name: string) {
    if (!confirm(`Delete "${name}"? Its nodes will move to "general".`)) return;
    setBusy(true);
    try {
      await deleteCategory(projectId!, name);
      setNodesLocal(nodes.map((n) => (n.category === name ? { ...n, category: "general" } : n)));
      await reloadCategories();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" size="md" footer={<Button onClick={onClose}>Done</Button>}>
      <div className="mb-4 flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="new-category" className="font-mono" onKeyDown={(e) => e.key === "Enter" && onAdd()} />
        <Button onClick={onAdd} loading={busy}><Plus size={14} /> Add</Button>
      </div>
      <div className="divide-y divide-line overflow-hidden rounded border border-line">
        {rows.map((r) => {
          const protectedCat = PROTECTED_CATEGORIES.has(r.name);
          return (
            <div key={r.name} className="flex items-center gap-2 bg-surface px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
              {editing === r.name ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 flex-1 font-mono" autoFocus onKeyDown={(e) => { if (e.key === "Enter") onRename(r.name); if (e.key === "Escape") setEditing(null); }} />
                  <button onClick={() => onRename(r.name)} className="text-brand-green hover:opacity-80"><Check size={15} /></button>
                  <button onClick={() => setEditing(null)} className="text-ink-mute hover:text-ink"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-mono text-sm text-ink">{r.name}</span>
                  <span className="count-badge">{r.count}</span>
                  {protectedCat ? (
                    <Lock size={13} className="text-ink-mute" />
                  ) : (
                    <>
                      <button onClick={() => { setEditing(r.name); setEditName(r.name); }} className="text-ink-mute hover:text-ink"><Pencil size={13} /></button>
                      <button onClick={() => onDelete(r.name)} className="text-ink-mute hover:text-status-blocked"><Trash2 size={13} /></button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
