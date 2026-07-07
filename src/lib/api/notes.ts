import { supabase } from "@/lib/supabase";
import type { Note, NoteAttachment } from "@/lib/types";

/** Upload rules — mirrored by the DB trigger in migration 0011 (source of truth). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME =
  /^(image\/(png|jpe?g|gif|webp|svg\+xml)|application\/pdf|application\/(zip|x-zip-compressed)|application\/vnd\.(openxmlformats-officedocument|ms-excel|ms-powerpoint|ms-word)[a-z0-9.-]*|application\/msword|text\/(plain|csv))$/i;

/** Throws a friendly error when the file breaks the upload rules. Checked
 *  client-side BEFORE the storage upload so oversized/forbidden files never
 *  reach the bucket (the DB insert would reject them and orphan the object). */
export function assertUploadAllowed(file: File): void {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — attachments are limited to 10 MB.`);
  }
  if (!ALLOWED_MIME.test(file.type)) {
    throw new Error(`"${file.name}" (${file.type || "unknown type"}) is not allowed. Use images, PDF, Office documents, text/CSV or ZIP.`);
  }
}

export async function addNote(projectId: string, nodeId: string, source: string, text: string): Promise<Note> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("notes")
    // Length caps keep pathological payloads out of the DB and the PDF reports.
    .insert({ project_id: projectId, node_id: nodeId, source: source.slice(0, 80), text: text.slice(0, 4000), created_by: auth.user?.id ?? null })
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
  assertUploadAllowed(file);
  const storagePath = `${projectId}/${noteId}/${fileName}`;
  const { error: upErr } = await supabase.storage.from("attachments").upload(storagePath, file, { upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("note_attachments")
    .insert({ project_id: projectId, note_id: noteId, file_name: fileName, storage_path: storagePath, mime: file.type, size: file.size })
    .select("id, file_name, storage_path, mime, size")
    .single();
  if (error) {
    // The DB validated (size/MIME/quota trigger) and refused — don't leave an
    // orphaned object in the bucket.
    await supabase.storage.from("attachments").remove([storagePath]).catch(() => undefined);
    throw error;
  }
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
