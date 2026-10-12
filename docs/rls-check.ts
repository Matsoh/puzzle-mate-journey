// Run: cd /tmp/x && bun add @electric-sql/pglite && bun /dev-server/docs/rls-check.ts (from a folder with pglite installed)
// Isolated in-memory Postgres (PGlite) with the project's real migration files applied verbatim.
// Synthetic users exist only in this throwaway database.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";

const db = new PGlite();
await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
`);
const dir = "/dev-server/drizzle/migrations/";
for (const f of ["0000_closed_login_and_user_state.sql", "0001_revoke_anon_user_tables.sql", "0002_save_user_state_bound_to_user.sql"]) {
  await db.exec(readFileSync(dir + f, "utf8").replaceAll("--> statement-breakpoint", ""));
}
const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", C = "33333333-3333-3333-3333-333333333333";
await db.exec(`INSERT INTO auth.users VALUES ('${A}'),('${B}'),('${C}'); INSERT INTO public.approved_players(user_id) VALUES ('${A}'),('${C}');`);

let pass = 0, fail = 0;
async function as(role: string, sub: string | null, sql: string) {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '${sub ? JSON.stringify({ sub, role }) : JSON.stringify({ role })}', false); SET ROLE ${role};`);
  try { const r = await db.query(sql); return { rows: r.rows as Record<string, unknown>[], err: null as string | null }; }
  catch (e) { return { rows: [], err: (e as Error).message }; }
}
function check(name: string, ok: boolean, detail = "") { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); }

// Approved A writes and reads own data
let r = await as("authenticated", A, `SELECT public.save_user_state_for('${A}','progress','{"xp":10}',0) v`);
check("approved A: create own progress", r.rows[0]?.v === 1, r.err ?? "");
r = await as("authenticated", A, `SELECT public.save_user_state_for('${A}','progress','{"xp":20}',1) v`);
check("approved A: update with right revision", r.rows[0]?.v === 2, r.err ?? "");
r = await as("authenticated", A, `SELECT public.save_user_state_for('${A}','progress','{"xp":5}',1) v`);
check("approved A: stale revision is refused (conflict)", r.rows[0]?.v === null, r.err ?? "");
r = await as("authenticated", A, `SELECT public.save_user_state_for('${A}','progress','{"xp":0}',0) v`);
check("approved A: repeat import does not overwrite", r.rows[0]?.v === null, r.err ?? "");
r = await as("authenticated", A, `SELECT data->>'xp' xp, revision FROM public.user_state`);
check("approved A: reads own data back", r.rows.length === 1 && r.rows[0]?.xp === "20");

// Signed in but not approved (B)
r = await as("authenticated", B, `SELECT public.is_approved_player() v`);
check("not approved B: is_approved_player = false", r.rows[0]?.v === false);
r = await as("authenticated", B, `SELECT count(*)::int n FROM public.user_state`);
check("not approved B: sees no rows", r.rows[0]?.n === 0);
r = await as("authenticated", B, `SELECT public.save_user_state_for('${B}','progress','{}',0)`);
check("not approved B: cannot save", !!r.err, r.err ?? "");
r = await as("authenticated", B, `INSERT INTO public.user_state(user_id,store_key,data) VALUES ('${B}','progress','{}')`);
check("not approved B: direct insert refused", !!r.err, r.err ?? "");
r = await as("authenticated", B, `INSERT INTO public.approved_players(user_id) VALUES ('${B}')`);
check("not approved B: cannot approve self", !!r.err, r.err ?? "");

// Another approved user (C) vs A's data
r = await as("authenticated", C, `SELECT count(*)::int n FROM public.user_state`);
check("other approved C: cannot read A", r.rows[0]?.n === 0);
r = await as("authenticated", C, `UPDATE public.user_state SET data='{"xp":0}' RETURNING 1`);
check("other approved C: update touches nothing", r.rows.length === 0, r.err ?? "");
r = await as("authenticated", C, `DELETE FROM public.user_state RETURNING 1`);
check("other approved C: delete touches nothing", r.rows.length === 0, r.err ?? "");
r = await as("authenticated", C, `INSERT INTO public.user_state(user_id,store_key,data) VALUES ('${A}','x','{}')`);
check("other approved C: cannot insert as A", !!r.err, r.err ?? "");
r = await as("authenticated", C, `SELECT public.save_user_state_for('${A}','progress','{}',2)`);
check("other approved C: user-bound save as A refused", !!r.err, r.err ?? "");
r = await as("authenticated", C, `INSERT INTO public.approved_players(user_id) VALUES ('${B}')`);
check("approved C: cannot approve others", !!r.err, r.err ?? "");
r = await as("authenticated", A, `SELECT data->>'xp' xp FROM public.user_state`);
check("A's data intact after attacks", r.rows[0]?.xp === "20");

// Anonymous
r = await as("anon", null, `SELECT count(*) FROM public.user_state`);
check("anon: cannot read user_state", !!r.err, r.err ?? "");
r = await as("anon", null, `SELECT count(*) FROM public.approved_players`);
check("anon: cannot read allowlist", !!r.err, r.err ?? "");
r = await as("anon", null, `SELECT public.save_user_state('progress','{}',0)`);
check("anon: cannot call save", !!r.err, r.err ?? "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
