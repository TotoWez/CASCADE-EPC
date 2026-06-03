import { supabase } from "@/lib/supabase";

export interface Category {
  name: string;
  color: string | null;
}

export const PROTECTED_CATEGORIES = new Set(["root", "general"]);

/** Valid category names: letters, digits, hyphen, underscore; 1..40 chars. */
export const CATEGORY_RE = /^[A-Za-z0-9_-]{1,40}$/;

export async function listCategories(projectId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name, color")
    .eq("project_id", projectId)
    .order("name");
  if (error) throw error;
  return (data as Category[]) ?? [];
}

export async function addCategory(projectId: string, name: string, color?: string | null): Promise<void> {
  const { error } = await supabase.from("categories").insert({ project_id: projectId, name, color: color ?? null });
  if (error) throw error;
}

/** Rename a category and propagate to every node using the old name. */
export async function renameCategory(projectId: string, oldName: string, newName: string): Promise<void> {
  const { error: catErr } = await supabase
    .from("categories")
    .update({ name: newName })
    .eq("project_id", projectId)
    .eq("name", oldName);
  if (catErr) throw catErr;
  const { error: nodeErr } = await supabase
    .from("nodes")
    .update({ category: newName })
    .eq("project_id", projectId)
    .eq("category", oldName);
  if (nodeErr) throw nodeErr;
}

/** Delete a category and reassign its nodes to `general`. */
export async function deleteCategory(projectId: string, name: string): Promise<void> {
  const { error: nodeErr } = await supabase
    .from("nodes")
    .update({ category: "general" })
    .eq("project_id", projectId)
    .eq("category", name);
  if (nodeErr) throw nodeErr;
  const { error } = await supabase.from("categories").delete().eq("project_id", projectId).eq("name", name);
  if (error) throw error;
}
