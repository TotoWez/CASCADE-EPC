import { supabase } from "@/lib/supabase";

export interface ProfilePatch {
  full_name?: string;
  position?: string;
  phone?: string;
}

export async function updateProfile(userId: string, patch: ProfilePatch) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/** Upload an avatar to the public `avatars` bucket and store its URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = data.publicUrl;
  const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (updErr) throw updErr;
  return url;
}
