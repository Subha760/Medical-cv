import assert from "node:assert/strict";
import { Pool } from "pg";
import { readFileSync, readdirSync } from "node:fs";
const pool = new Pool({
  host: process.env.MEDCV_TEST_DB_HOST || "172.17.0.2",
  user: "postgres",
  password: process.env.MEDCV_TEST_DB_PASSWORD,
  database: "postgres",
  max: 12,
});
const owner = "00000000-0000-4000-8000-000000000001",
  ref = "00000000-0000-4000-8000-000000000002",
  friend = "00000000-0000-4000-8000-000000000003";
const sid = (u: string) => u.replace("00000000-", "10000000-");
async function call(
  u: string,
  action: string,
  payload: unknown = {},
  aal: string | null = "aal1",
  role = "authenticated",
) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${role}`);
    await c.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: u, session_id: sid(u), aal }),
    ]);
    const r = await c.query("select public.medcv_account($1,$2) as result", [
      action,
      JSON.stringify(payload),
    ]);
    await c.query("commit");
    return r.rows[0].result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
async function service(fn: string, args: unknown[]) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role service_role");
    const r = await c.query(
      `select public.${fn}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    );
    await c.query("commit");
    return r.rows[0].result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
try {
  await pool.query(
    "drop schema if exists medcv_private cascade;drop function if exists public.medcv_account(text,jsonb);drop function if exists public.medcv_complete_cv(uuid,uuid,text);drop function if exists public.medcv_finalize_edit(uuid,uuid,uuid,text,text);drop function if exists public.medcv_check_edit(uuid,uuid,uuid,text,text);drop function if exists public.medcv_issue_pulse_session(uuid,uuid,timestamptz);",
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await pool.query(readFileSync("supabase/migrations/" + file, "utf8"));
  await pool.query(readFileSync("supabase/premium-seeds.sql", "utf8"));
  assert.equal(
    (
      await pool.query(
        "select count(*)::int n from medcv_private.templates where active",
      )
    ).rows[0].n,
    86,
  );
  await pool.query(
    "delete from auth.sessions;delete from auth.mfa_factors;delete from auth.users;",
  );
  for (const [u, email] of [
    [owner, "subhajitsatpathi6@gmail.com"],
    [ref, "ref@example.test"],
    [friend, "friend@example.test"],
  ]) {
    await pool.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [u, email],
    );
    await pool.query("insert into auth.sessions(id,user_id) values($1,$2)", [
      sid(u),
      u,
    ]);
  }
  const o = await call(owner, "enroll"),
    r = await call(ref, "enroll");
  await call(friend, "enroll", { code: r.code });
  assert.equal(o.owner, true);
  assert.equal(r.owner, false);
  await assert.rejects(call(ref, "admin_report", {}, "aal2"), /Owner MFA/);
  await assert.rejects(call(owner, "admin_report"), /Owner MFA/);
  await assert.rejects(call(owner, "admin_report", {}, "aal2"), /Owner MFA/);
  await pool.query(
    "insert into auth.mfa_factors(id,user_id,status) values(gen_random_uuid(),$1,'verified')",
    [owner],
  );
  assert.equal((await call(owner, "admin_report", {}, "aal2")).users, 3);
  const emailExpiry = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  await assert.rejects(
    service("medcv_issue_pulse_session", [ref, sid(ref), emailExpiry]),
    /Invalid verified owner/,
  );
  await assert.rejects(
    service("medcv_issue_pulse_session", [
      owner,
      sid(owner),
      new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ]),
    /Invalid verified owner/,
  );
  await assert.rejects(
    service("medcv_issue_pulse_session", [owner, sid(ref), emailExpiry]),
    /Invalid verified owner/,
  );
  await service("medcv_issue_pulse_session", [owner, sid(owner), emailExpiry]);
  assert.equal((await call(owner, "admin_report")).users, 3);
  await assert.rejects(call(ref, "admin_report"), /Owner MFA/);
  await pool.query(
    "update medcv_private.pulse_sessions set expires_at=now()-interval '1 second'",
  );
  await assert.rejects(call(owner, "admin_report"), /Owner MFA/);
  await assert.rejects(call(owner, "admin_report", {}, null), /Owner MFA/);
  await pool.query("delete from medcv_private.pulse_sessions");
  assert.equal(
    (await pool.query("select owner_user_id from medcv_private.config")).rows[0]
      .owner_user_id,
    owner,
  );
  const grantedReport = await call(owner, "admin_report", {}, "aal2");
  assert.equal("owner_user_id" in grantedReport.config, false);
  assert.equal("owner_email" in grantedReport.config, false);
  assert.equal("identity_pepper" in grantedReport.config, false);

  await Promise.all(
    Array.from({ length: 8 }, () =>
      service("medcv_complete_cv", [friend, sid(friend), "a".repeat(64)]),
    ),
  );
  assert.equal((await call(ref, "status")).credits, 1);
  assert.equal(
    (
      await pool.query(
        "select count(*)::int n from medcv_private.ledger where reason='referral'",
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    call(ref, "template", { templateId: "clinical_essential_v3" }),
    /locked/,
  );
  const templates = (
    await pool.query(
      "select id from medcv_private.templates order by id limit 2",
    )
  ).rows.map((x) => x.id);
  const race = await Promise.allSettled(
    templates.map((templateId) => call(ref, "unlock", { templateId })),
  );
  assert.equal(race.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal((await call(ref, "status")).credits, 0);
  const unlocked = (await call(ref, "status")).unlocks[0];
  await call(ref, "unlock", { templateId: unlocked });
  assert.equal((await call(ref, "status")).credits, 0);
  await assert.rejects(
    call(friend, "template", { templateId: unlocked }),
    /locked/,
  );
  await assert.rejects(
    call(ref, "reserve_edit", { fingerprint: "b".repeat(64), kind: "pdf" }),
    /credit/,
  );
  await call(
    owner,
    "admin_credit",
    { userId: ref, amount: 1, reason: "Verified support correction" },
    "aal2",
  );
  const edit = await call(ref, "reserve_edit", {
    fingerprint: "b".repeat(64),
    kind: "pdf",
  });
  const check = await service("medcv_check_edit", [
    ref,
    sid(ref),
    edit.id,
    "b".repeat(64),
    "c".repeat(64),
  ]);
  assert.equal(check.kind, "pdf");
  await assert.rejects(
    service("medcv_check_edit", [
      ref,
      sid(ref),
      edit.id,
      "b".repeat(64),
      "c".repeat(64),
    ]),
    /wait before retrying/,
  );
  await assert.rejects(
    service("medcv_check_edit", [
      friend,
      sid(friend),
      edit.id,
      "b".repeat(64),
      "c".repeat(64),
    ]),
    /Invalid or expired/,
  );
  await service("medcv_finalize_edit", [
    ref,
    sid(ref),
    edit.id,
    "b".repeat(64),
    "c".repeat(64),
  ]);
  await service("medcv_finalize_edit", [
    ref,
    sid(ref),
    edit.id,
    "b".repeat(64),
    "c".repeat(64),
  ]);
  await assert.rejects(
    service("medcv_finalize_edit", [
      ref,
      sid(ref),
      edit.id,
      "b".repeat(64),
      "d".repeat(64),
    ]),
    /another version/,
  );
  await assert.rejects(
    call(
      owner,
      "admin_refund_edit",
      { id: edit.id, reason: "Test refund prevention" },
      "aal2",
    ),
    /unused/,
  );
  // Only the owner can grant bounded support credits or refund an unused edit.
  await assert.rejects(
    call(
      ref,
      "admin_credit",
      { userId: ref, amount: 20, reason: "Client attempted credit grant" },
      "aal2",
    ),
    /Owner MFA/,
  );
  for (const amount of [0, 21, -1]) {
    await assert.rejects(
      call(
        owner,
        "admin_credit",
        { userId: ref, amount, reason: "Out of range support grant" },
        "aal2",
      ),
      /1 to 20/,
    );
  }
  await call(
    owner,
    "admin_credit",
    { userId: ref, amount: 1, reason: "Test unused edit refund" },
    "aal2",
  );
  const unused = await call(ref, "reserve_edit", {
    fingerprint: "d".repeat(64),
    kind: "pdf",
  });
  await assert.rejects(
    call(
      ref,
      "admin_refund_edit",
      { id: unused.id, reason: "Unauthorized refund request" },
      "aal2",
    ),
    /Owner MFA/,
  );
  await call(
    owner,
    "admin_refund_edit",
    { id: unused.id, reason: "Verified unused reservation" },
    "aal2",
  );
  await assert.rejects(
    call(
      owner,
      "admin_refund_edit",
      { id: unused.id, reason: "Duplicate refund request" },
      "aal2",
    ),
    /unused/,
  );
  assert.equal((await call(ref, "status")).credits, 1);
  await call(ref, "unlock", {
    templateId: templates.find((t: string) => t !== unlocked),
  });
  assert.equal((await call(ref, "status")).credits, 0);

  // Profile deletion/recreation cannot manufacture another referral completion reward.
  await call(friend, "delete_profile");
  await call(friend, "enroll", { code: r.code });
  await service("medcv_complete_cv", [friend, sid(friend), "e".repeat(64)]);
  assert.equal((await call(ref, "status")).credits, 0);
  await pool.query(
    "update auth.sessions set not_after=now()-interval '1 second' where user_id=$1",
    [friend],
  );
  await assert.rejects(call(friend, "status"), /sign-in/);
  // Gmail dots, plus aliases and googlemail domains cannot manufacture rewards.
  const alias1 = "00000000-0000-4000-8000-000000000004";
  const alias2 = "00000000-0000-4000-8000-000000000005";
  const unverified = "00000000-0000-4000-8000-000000000006";
  for (const [user, email] of [
    [alias1, "test.nurse+one@gmail.com"],
    [alias2, "testnurse+two@googlemail.com"],
    [unverified, "unverified@example.test"],
  ]) {
    await pool.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)",
      [user, email, user === unverified ? null : new Date()],
    );
    await pool.query("insert into auth.sessions(id,user_id) values($1,$2)", [
      sid(user),
      user,
    ]);
  }
  await assert.rejects(
    call(unverified, "enroll", { code: r.code }),
    /Verify your email/,
  );
  await assert.rejects(
    service("medcv_complete_cv", [unverified, sid(unverified), "a".repeat(64)]),
    /Invalid session/,
  );
  await call(alias1, "enroll", { code: r.code });
  await call(alias2, "enroll", { code: r.code });
  await service("medcv_complete_cv", [alias1, sid(alias1), "a".repeat(64)]);
  assert.equal((await call(ref, "status")).credits, 1);
  await service("medcv_complete_cv", [alias2, sid(alias2), "b".repeat(64)]);
  assert.equal((await call(ref, "status")).credits, 1);
  await call(
    owner,
    "admin_freeze",
    { userId: alias1, frozen: true, reason: "Test paused referral account" },
    "aal2",
  );
  await assert.rejects(
    service("medcv_complete_cv", [alias1, sid(alias1), "c".repeat(64)]),
    /Account unavailable/,
  );
  await assert.rejects(
    call(alias1, "reserve_edit", { fingerprint: "a".repeat(64), kind: "pdf" }),
    /paused/,
  );
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await assert.rejects(
      c.query("select * from medcv_private.profiles"),
      /permission denied/,
    );
    await c.query("rollback");
    await c.query("begin");
    await c.query("set local role anon");
    await assert.rejects(
      c.query("select public.medcv_account('status','{}')"),
      /permission denied/,
    );
    await c.query("rollback");
    await c.query("begin");
    await c.query("set local role authenticated");
    await assert.rejects(
      c.query("select public.medcv_complete_cv($1,$2,$3)", [
        ref,
        sid(ref),
        "f".repeat(64),
      ]),
      /permission denied/,
    );
    await c.query("rollback");
    await c.query("begin");
    await c.query("set local role authenticated");
    await assert.rejects(
      c.query(
        "select public.medcv_issue_pulse_session($1,$2,now()+interval '10 minutes')",
        [owner, sid(owner)],
      ),
      /permission denied/,
    );
    await c.query("rollback");
  } finally {
    c.release();
  }
  console.log(
    "PASS: private tables, verified sessions, owner MFA, concurrent referral deduplication, concurrent spending, idempotent unlocks, strict final-version edits, deletion abuse prevention.",
  );
} finally {
  await pool.end();
}
