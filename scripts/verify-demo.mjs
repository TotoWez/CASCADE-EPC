import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

await c.auth.signInWithPassword({ email: "demo.dev@cascade-epc.com", password: env.DEMO_PASSWORD });
const me = (await c.auth.getUser()).data.user;
const prof = (await c.from("profiles").select("full_name, platform_role").eq("id", me.id).single()).data;
console.log("Signed in as developer:", prof);

const projects = (await c.from("projects").select("id, code, name, org_id")).data;
for (const p of projects) {
  const nodes = (await c.from("nodes").select("id, work_status, progress, qa_gate, hse_gate, cluster_id, assigned_user_id").eq("project_id", p.id)).data ?? [];
  const deps = (await c.from("node_dependencies").select("id", { count: "exact", head: true }).eq("project_id", p.id)).count ?? 0;
  const notes = (await c.from("notes").select("id, checked").eq("project_id", p.id)).data ?? [];
  const members = (await c.from("memberships").select("role").eq("project_id", p.id)).data ?? [];
  console.log(`\n${p.code} — ${p.name}`);
  console.log(`  nodes=${nodes.length}  deps=${deps}  notes=${notes.length} (open ${notes.filter((n) => !n.checked).length}/closed ${notes.filter((n) => n.checked).length})  members=${members.length} [${members.map((m) => m.role).join(",")}]`);
  console.log(`  gates: qa=${nodes.filter((n) => n.qa_gate !== "na").map((n) => n.qa_gate).join("/") || "none"}  hse=${nodes.filter((n) => n.hse_gate !== "na").map((n) => n.hse_gate).join("/") || "none"}`);
  console.log(`  linked nodes=${nodes.filter((n) => n.cluster_id).length}  assigned nodes=${nodes.filter((n) => n.assigned_user_id).length}`);
}
