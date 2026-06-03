/**
 * CASCADE-EPC — demo / test data seeder.
 *
 * Creates a full multi-tenant demo graph against your LIVE Supabase project so
 * every role and view can be exercised. Uses the public anon key + the normal
 * signUp flow (email confirmation must be OFF), so no service-role key is needed.
 *
 *   node scripts/seed-demo.mjs
 *
 * Re-runnable: existing users are signed in, the org/projects are reused, and a
 * project's WBS is only built the first time (delete the project to rebuild).
 *
 * Set DEMO_PASSWORD in .env.local (kept out of git). The account list lives in
 * DEMO_CREDENTIALS.md, which is gitignored.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ---- config ----------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const PASSWORD = env.DEMO_PASSWORD; // kept in .env.local, never committed
if (!SUPABASE_URL || !ANON || !PASSWORD) { console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / DEMO_PASSWORD in .env.local"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newClient = () => createClient(SUPABASE_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- people ----------------------------------------------------------------
const USERS = {
  dev:    { email: "demo.dev@cascade-epc.com",        name: "Dana Developer",   position: "Platform Engineer",     phone: "+1-555-0100" },
  admin1: { email: "demo.admin1@cascade-epc.com",     name: "Alice Admin",      position: "IT Director",           phone: "+1-555-0101" },
  pm1:    { email: "demo.manager1@cascade-epc.com",   name: "Marco Manager",    position: "Project Manager",       phone: "+1-555-0102" },
  eng1:   { email: "demo.engineer1@cascade-epc.com",  name: "Erin Engineer",    position: "Lead Engineer",         phone: "+1-555-0103" },
  sup1:   { email: "demo.supervisor1@cascade-epc.com",name: "Sam Supervisor",   position: "Site Supervisor",       phone: "+1-555-0104" },
  qa1:    { email: "demo.qaqc1@cascade-epc.com",      name: "Quinn QAQC",       position: "QA/QC Lead",            phone: "+1-555-0105" },
  hse1:   { email: "demo.hse1@cascade-epc.com",       name: "Habib HSE",        position: "HSE Officer",           phone: "+1-555-0106" },
  view1:  { email: "demo.viewer1@cascade-epc.com",    name: "Vera Viewer",      position: "Client Representative", phone: "+1-555-0107" },
  admin2: { email: "demo.admin2@cascade-epc.com",     name: "Adam Admin",       position: "IT Manager",            phone: "+1-555-0201" },
  pm2:    { email: "demo.manager2@cascade-epc.com",   name: "Mia Manager",      position: "Project Manager",       phone: "+1-555-0202" },
  eng2:   { email: "demo.engineer2@cascade-epc.com",  name: "Evan Engineer",    position: "Lead Engineer",         phone: "+1-555-0203" },
  sup2:   { email: "demo.supervisor2@cascade-epc.com",name: "Stella Supervisor",position: "Site Supervisor",       phone: "+1-555-0204" },
};

async function ensureUser(u) {
  const client = newClient();
  let { data, error } = await client.auth.signUp({ email: u.email, password: PASSWORD, options: { data: { full_name: u.name } } });
  if (error || !data?.session) {
    const r = await client.auth.signInWithPassword({ email: u.email, password: PASSWORD });
    if (r.error) throw new Error(`auth ${u.email}: ${error?.message || r.error.message}`);
    data = r.data;
  }
  const userId = data.user.id;
  await client.from("profiles").update({ full_name: u.name, position: u.position, phone: u.phone }).eq("id", userId);
  return { ...u, client, userId };
}

// ---- helpers ---------------------------------------------------------------
async function ensureOrg(admin, name) {
  const { data: mine } = await admin.client.from("org_members").select("org_id, organizations(name)").eq("user_id", admin.userId);
  const found = (mine ?? []).find((m) => m.organizations?.name === name);
  if (found) return found.org_id;
  const { data, error } = await admin.client.rpc("bootstrap_org", { p_name: name });
  if (error) throw new Error(`bootstrap_org ${name}: ${error.message}`);
  return data;
}

async function addOrgMember(admin, orgId, user, role = "member") {
  const { error } = await admin.client.from("org_members").upsert({ org_id: orgId, user_id: user.userId, org_role: role }, { onConflict: "org_id,user_id" });
  if (error) throw new Error(`org_member ${user.email}: ${error.message}`);
}

async function ensureProject(admin, orgId, p) {
  const { data: ex } = await admin.client.from("projects").select("id").eq("org_id", orgId).eq("code", p.code).maybeSingle();
  if (ex) return { id: ex.id, built: true };
  const { data, error } = await admin.client.from("projects").insert({
    org_id: orgId, code: p.code, name: p.name, client: p.client ?? "", consultant: p.consultant ?? "",
    contractor: p.contractor ?? "", sub_contractor: p.sub ?? "", start_date: p.start ?? null, end_date: p.end ?? null,
    project_manager_id: p.pm.userId, settings: { requireHseAction: true, dueWindowN: 7, autoSnapshot: false },
  }).select("id").single();
  if (error) throw new Error(`project ${p.code}: ${error.message}`);
  await admin.client.from("nodes").insert({ project_id: data.id, node_code: "NODE-1000", parent_id: null, title: p.name, category: "root", priority: 3, volume: 1, order_index: 0, work_status: "not_started", progress: 0 });
  return { id: data.id, built: false };
}

async function assignRole(admin, projectId, user, role, canComment = false) {
  const { error } = await admin.client.rpc("assign_member_role", { p_project: projectId, p_user: user.userId, p_role: role, p_can_comment: canComment });
  if (error) throw new Error(`assign ${role} ${user.email}: ${error.message}`);
}

async function rootId(admin, projectId) {
  const { data } = await admin.client.from("nodes").select("id").eq("project_id", projectId).is("parent_id", null).maybeSingle();
  return data?.id ?? null;
}

/** Insert a WBS subtree; returns a ref->id map. `seq` is a mutable counter box. */
async function buildTree(admin, projectId, parentId, specs, seq, refs, U) {
  let order = 0;
  for (const s of specs) {
    const code = `NODE-${seq.n++}`;
    const a = s.assignee ? U[s.assignee] : null;
    const { data, error } = await admin.client.from("nodes").insert({
      project_id: projectId, node_code: code, parent_id: parentId, title: s.title,
      category: s.category ?? "general", priority: s.priority ?? 3, volume: s.volume ?? 1,
      work_status: s.status ?? "not_started", progress: s.progress ?? 0, order_index: order++,
      start_date: s.start ?? null, due_date: s.due ?? null,
      assigned_user_id: a?.userId ?? null, assignee_name: a?.name ?? "", assignee_email: a?.email ?? "", assignee_phone: a?.phone ?? "",
    }).select("id").single();
    if (error) throw new Error(`node ${s.title}: ${error.message}`);
    if (s.ref) refs[s.ref] = data.id;
    if (s.children) await buildTree(admin, projectId, data.id, s.children, seq, refs, U);
  }
}

async function setGate(user, nodeId, kind, value) {
  const fn = kind === "qa" ? "set_qa_gate" : "set_hse_gate";
  const { error } = await user.client.rpc(fn, { p_node: nodeId, p_value: value });
  if (error) throw new Error(`${fn} ${nodeId}: ${error.message}`);
}

async function addNote(user, projectId, nodeId, source, text, checked = false) {
  const { data, error } = await user.client.from("notes").insert({ project_id: projectId, node_id: nodeId, source, text, created_by: user.userId }).select("id").single();
  if (error) throw new Error(`note: ${error.message}`);
  if (checked) await user.client.from("notes").update({ checked: true }).eq("id", data.id);
}

async function addDep(admin, projectId, nodeId, dependsOnId) {
  const { error } = await admin.client.from("node_dependencies").insert({ project_id: projectId, node_id: nodeId, depends_on_node_id: dependsOnId });
  if (error && !/duplicate/i.test(error.message)) throw new Error(`dep: ${error.message}`);
}

async function linkCluster(admin, ids) {
  const cluster = randomUUID();
  const { error } = await admin.client.from("nodes").update({ cluster_id: cluster }).in("id", ids);
  if (error) throw new Error(`link: ${error.message}`);
}

// ---- run -------------------------------------------------------------------
async function main() {
  console.log("Creating users…");
  const U = {};
  for (const [key, u] of Object.entries(USERS)) { U[key] = await ensureUser(u); console.log(`  ✓ ${u.email}`); await sleep(350); }

  // Platform developer (exploits the current self-update policy — see security note).
  const devRole = await U.dev.client.from("profiles").update({ platform_role: "developer" }).eq("id", U.dev.userId);
  console.log(devRole.error ? `  ! could not set developer role: ${devRole.error.message} (set via SQL: update profiles set platform_role='developer' where email='demo.dev@cascade-epc.com';)` : "  ✓ demo.dev promoted to platform developer");

  // ===== Org 1 =====
  console.log("Org 1: Meridian Substation EPC…");
  const org1 = await ensureOrg(U.admin1, "Meridian Substation EPC");
  for (const k of ["pm1", "eng1", "sup1", "qa1", "hse1", "view1"]) await addOrgMember(U.admin1, org1, U[k]);
  await addOrgMember(U.admin1, org1, U.dev); // so the developer sees the org in-app

  const p1 = await ensureProject(U.admin1, org1, { code: "MER-220", name: "220kV Meridian Substation", client: "Gulf Power Authority", consultant: "Sigma Consult", contractor: "Meridian Substation EPC", sub: "Delta Civil Works", start: "2026-01-05", end: "2026-09-30", pm: U.pm1 });
  await assignRole(U.admin1, p1.id, U.pm1, "manager");
  await assignRole(U.admin1, p1.id, U.eng1, "engineer");
  await assignRole(U.admin1, p1.id, U.sup1, "supervisor");
  await assignRole(U.admin1, p1.id, U.qa1, "qaqc");
  await assignRole(U.admin1, p1.id, U.hse1, "hse");
  await assignRole(U.admin1, p1.id, U.view1, "viewer", true);

  if (!p1.built) {
    const seq = { n: 1001 }, refs = {};
    const parent = await rootId(U.admin1, p1.id);
    await buildTree(U.admin1, p1.id, parent, [
      { title: "Civil Works", category: "Civil", children: [
        { title: "Foundations", category: "Civil", ref: "found", volume: 8, status: "done", progress: 100, priority: 2, assignee: "sup1", start: "2026-01-10", due: "2026-02-10" },
        { title: "Earthing Grid", category: "Civil", ref: "earth", volume: 6, status: "on_progress", progress: 60, assignee: "sup1", start: "2026-05-05", due: "2026-06-07" },
        { title: "Cable Trench", category: "Civil", ref: "trench", volume: 5, status: "on_progress", progress: 35, assignee: "sup1", start: "2026-06-01", due: "2026-07-30" },
      ] },
      { title: "Electrical Works", category: "Electrical", children: [
        { title: "Power Transformers", category: "Electrical", ref: "tx", volume: 10, priority: 1, status: "on_progress", progress: 40, assignee: "eng1", start: "2026-04-01", due: "2026-05-25" },
        { title: "GIS Switchgear", category: "Electrical", ref: "swgr", volume: 9, status: "on_progress", progress: 70, assignee: "eng1", start: "2026-04-15", due: "2026-07-15" },
        { title: "HV Cabling", category: "Electrical", ref: "cab", volume: 5, status: "on_progress", progress: 35, assignee: "eng1", start: "2026-06-01", due: "2026-07-30" },
      ] },
      { title: "Mechanical Works", category: "Mechanical", children: [
        { title: "HVAC & Aux Systems", category: "Mechanical", ref: "hvac", volume: 4, status: "on_progress", progress: 30, assignee: "eng1", start: "2026-05-01", due: "2026-08-01" },
      ] },
      { title: "Testing & Commissioning", category: "Testing", children: [
        { title: "Site Acceptance Test", category: "Testing", ref: "sat", volume: 7, priority: 1, status: "not_started", progress: 0, assignee: "eng1", start: "2026-08-01", due: "2026-08-20" },
        { title: "Commissioning", category: "Testing", ref: "comm", volume: 8, status: "not_started", progress: 0, start: "2026-08-21", due: "2026-09-10" },
      ] },
    ], seq, refs, U);

    // links: the cable trench (Civil) and HV cabling (Electrical) are the same activity
    await linkCluster(U.admin1, [refs.trench, refs.cab]);
    // blockers
    await addDep(U.admin1, p1.id, refs.sat, refs.tx);
    await addDep(U.admin1, p1.id, refs.sat, refs.swgr);
    await addDep(U.admin1, p1.id, refs.comm, refs.sat);
    // gates (set by the owning roles)
    await setGate(U.qa1, refs.found, "qa", "closed");
    await setGate(U.qa1, refs.tx, "qa", "open");
    await setGate(U.qa1, refs.swgr, "qa", "open");
    await setGate(U.hse1, refs.found, "hse", "complied");
    await setGate(U.hse1, refs.earth, "hse", "complied");
    await setGate(U.hse1, refs.hvac, "hse", "not_complied");
    // notes from different sources / authors, open (red) + resolved (green)
    await addNote(U.sup1, p1.id, refs.found, "Site", "Concrete pour completed and cured.", true);
    await addNote(U.eng1, p1.id, refs.tx, "RFI", "Awaiting vendor GA drawings for the transformers.", false);
    await addNote(U.qa1, p1.id, refs.swgr, "QAQC", "Inspection test plan under review for switchgear.", false);
    await addNote(U.view1, p1.id, refs.sat, "Client", "Please confirm the revised SAT date.", false);
    await addNote(U.sup1, p1.id, refs.earth, "Site", "Earthing grid 60% — trench backfill pending.", false);
    console.log(`  ✓ built WBS for ${p1.id}`);
  } else console.log("  • MER-220 already built — skipped");

  const p2 = await ensureProject(U.admin1, org1, { code: "MER-OHL", name: "Overhead Line Route 7", client: "Gulf Power Authority", consultant: "Sigma Consult", contractor: "Meridian Substation EPC", pm: U.pm1, start: "2026-02-01", end: "2026-08-01" });
  await assignRole(U.admin1, p2.id, U.pm1, "manager");
  await assignRole(U.admin1, p2.id, U.eng1, "engineer");
  await assignRole(U.admin1, p2.id, U.sup1, "supervisor");
  if (!p2.built) {
    const seq = { n: 1001 }, refs = {};
    const parent = await rootId(U.admin1, p2.id);
    await buildTree(U.admin1, p2.id, parent, [
      { title: "Survey & Route", category: "Civil", ref: "survey", volume: 5, status: "done", progress: 100, assignee: "sup1", start: "2026-02-05", due: "2026-03-01" },
      { title: "Tower Foundations", category: "Civil", ref: "towers", volume: 8, status: "on_progress", progress: 50, assignee: "sup1", start: "2026-03-05", due: "2026-06-20" },
      { title: "Stringing", category: "Electrical", ref: "string", volume: 7, status: "not_started", progress: 0, assignee: "eng1", start: "2026-06-25", due: "2026-08-01" },
    ], seq, refs, U);
    await addDep(U.admin1, p2.id, refs.string, refs.towers);
    await addNote(U.sup1, p2.id, refs.survey, "Site", "Access road to towers 4–9 complete.", true);
    console.log(`  ✓ built WBS for ${p2.id}`);
  } else console.log("  • MER-OHL already built — skipped");

  // ===== Org 2 =====
  console.log("Org 2: Volta Transmission…");
  const org2 = await ensureOrg(U.admin2, "Volta Transmission");
  for (const k of ["pm2", "eng2", "sup2"]) await addOrgMember(U.admin2, org2, U[k]);
  await addOrgMember(U.admin2, org2, U.dev);

  const p3 = await ensureProject(U.admin2, org2, { code: "VLT-GIS", name: "Volta GIS Extension", client: "Volta River Authority", consultant: "Helios Engineering", contractor: "Volta Transmission", pm: U.pm2, start: "2026-03-01", end: "2026-10-15" });
  await assignRole(U.admin2, p3.id, U.pm2, "manager");
  await assignRole(U.admin2, p3.id, U.eng2, "engineer");
  await assignRole(U.admin2, p3.id, U.sup2, "supervisor");
  if (!p3.built) {
    const seq = { n: 1001 }, refs = {};
    const parent = await rootId(U.admin2, p3.id);
    await buildTree(U.admin2, p3.id, parent, [
      { title: "Civil", category: "Civil", children: [
        { title: "GIS Building Foundation", category: "Civil", ref: "found2", volume: 7, status: "done", progress: 100, assignee: "sup2", start: "2026-03-05", due: "2026-04-30" },
      ] },
      { title: "Electrical", category: "Electrical", children: [
        { title: "GIS Bays", category: "Electrical", ref: "bays", volume: 9, priority: 1, status: "on_progress", progress: 45, assignee: "eng2", start: "2026-05-01", due: "2026-08-15" },
        { title: "Control Building", category: "Electrical", ref: "ctrl", volume: 6, status: "on_progress", progress: 20, assignee: "eng2", start: "2026-05-15", due: "2026-09-01" },
      ] },
      { title: "Testing", category: "Testing", children: [
        { title: "Energisation Tests", category: "Testing", ref: "energ", volume: 8, status: "not_started", progress: 0, assignee: "eng2", start: "2026-09-05", due: "2026-10-10" },
      ] },
    ], seq, refs, U);
    await addDep(U.admin2, p3.id, refs.energ, refs.bays);
    await setGate(U.admin2, refs.found2, "hse", "complied");
    await setGate(U.admin2, refs.bays, "qa", "open");
    await addNote(U.pm2, p3.id, refs.bays, "RFI", "Confirm busbar rating with vendor.", false);
    console.log(`  ✓ built WBS for ${p3.id}`);
  } else console.log("  • VLT-GIS already built — skipped");

  console.log("\nDone. Sign in with any account below (password for all): " + PASSWORD);
}

main().catch((e) => { console.error("\nSEED FAILED:", e.message); process.exit(1); });
