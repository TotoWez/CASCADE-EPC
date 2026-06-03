import { supabase } from "@/lib/supabase";
import type { Note, NoteAttachment } from "@/lib/types";

export async function addNote(projectId: string, nodeId: string, source: string, text: string): Promise<Note> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("notes")
    .insert({ project_id: projectId, node_id: nodeId, source, text, created_by: auth.user?.id ?? null })
    .select("id, source, text, checked, created_by, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, source: data.source, text: data.text, checked: data.checked, createdBy: data.created_by, createdAt: data.created_at, attachments: [] };
}

export async function updateNote(id: string, patch: { source?: string; text?: string; checked?: boolean }): Promise<void> {
  const { error } = await supabase.from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

/** Upload a file to the private attachments bucket and register it. */
export async function uploadAttachment(
  projectId: string,
  noteId: string,
  file: File,
  fileName: string,
): Promise<NoteAttachment> {
  const storagePath = `${projectId}/${noteId}/${fileName}`;
  const { error: upErr } = await supabase.storage.from("attachments").upload(storagePath, file, { upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("note_attachments")
    .insert({ project_id: projectId, note_id: noteId, file_name: fileName, storage_path: storagePath, mime: file.type, size: file.size })
    .select("id, file_name, storage_path, mime, size")
    .single();
  if (error) throw error;
  return { id: data.id, fileName: data.file_name, storagePath: data.storage_path, mime: data.mime, size: data.size };
}

export async function deleteAttachment(att: NoteAttachment): Promise<void> {
  await supabase.storage.from("attachments").remove([att.storagePath]);
  const { error } = await supabase.from("note_attachments").delete().eq("id", att.id);
  if (error) throw error;
}

/** Short-lived signed URL for a private attachment (open/download). */
export async function attachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}
