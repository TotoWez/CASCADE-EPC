import { supabase } from "@/lib/supabase";
import { DEFAULT_PROJECT_SETTINGS, type Project, type ProjectSettings } from "@/lib/types";

/** Raw DB row shape (snake_case). */
interface ProjectRow {
  id: string;
  org_id: string;
  code: string;
  name: string;
  client: string;
  consultant: string;
  contractor: string;
  sub_contractor: string;
  client_logo_url: string | null;
  consultant_logo_url: string | null;
  contractor_logo_url: string | null;
  sub_contractor_logo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  revised_date: string | null;
  project_manager_id: string | null;
  settings: Partial<ProjectSettings> | null;
}

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    orgId: r.org_id,
    code: r.code,
    name: r.name,
    client: r.client,
    consultant: r.consultant,
    contractor: r.contractor,
    subContractor: r.sub_contractor,
    clientLogoUrl: r.client_logo_url,
    consultantLogoUrl: r.consultant_logo_url,
    contractorLogoUrl: r.contractor_logo_url,
    subContractorLogoUrl: r.sub_contractor_logo_url,
    startDate: r.start_date,
    endDate: r.end_date,
    revisedDate: r.revised_date,
    projectManagerId: r.project_manager_id,
    settings: { ...DEFAULT_PROJECT_SETTINGS, ...(r.settings ?? {}) },
  };
}

export interface ProjectInput {
  orgId: string;
  code: string;
  name: string;
  client?: string;
  consultant?: string;
  contractor?: string;
  subContractor?: string;
  clientLogoUrl?: string | null;
  consultantLogoUrl?: string | null;
  contractorLogoUrl?: string | null;
  subContractorLogoUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  revisedDate?: string | null;
  projectManagerId?: string | null;
  settings?: ProjectSettings;
}

function inputToRow(input: Partial<ProjectInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => v !== undefined && (row[k] = v);
  set("org_id", input.orgId);
  set("code", input.code);
  set("name", input.name);
  set("client", input.client);
  set("consultant", input.consultant);
  set("contractor", input.contractor);
  set("sub_contractor", input.subContractor);
  set("client_logo_url", input.clientLogoUrl);
  set("consultant_logo_url", input.consultantLogoUrl);
  set("contractor_logo_url", input.contractorLogoUrl);
  set("sub_contractor_logo_url", input.subContractorLogoUrl);
  set("start_date", input.startDate);
  set("end_date", input.endDate);
  set("revised_date", input.revisedDate);
  set("project_manager_id", input.projectManagerId);
  set("settings", input.settings);
  return row;
}

export async function listProjects(orgId?: string): Promise<Project[]> {
  let q = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ProjectRow[]).map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToProject(data as ProjectRow) : null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase.from("projects").insert(inputToRow(input)).select("*").single();
  if (error) throw error;
  return rowToProject(data as ProjectRow);
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const { data, error } = await supabase.from("projects").update(inputToRow(patch)).eq("id", id).select("*").single();
  if (error) throw error;
  return rowToProject(data as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
