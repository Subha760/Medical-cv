import { verifyOwnerToken } from "./owner-auth.mjs";
import {
  editedPdf,
  validateDocx,
  sha256,
  toBase64,
  fromBase64,
  MAX_BYTES,
} from "./documents";
import { Document, Packer, Paragraph, TextRun } from "docx";
const PROJECT = "medico-choicematrix";
const enc = new TextEncoder();
const origins = new Set([
  "https://medico.choicematrix.in",
  "https://subha760.github.io",
  "https://appassets.androidplatform.net",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5173",
]);
let keys;
let keysUntil = 0;
const decode = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
export async function verifyFirebaseToken(
  token,
  fetcher = fetch,
  now = Date.now(),
) {
  if (typeof token !== "string" || token.length > 16000)
    throw new Error("Sign in required.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid sign-in.");
  const head = JSON.parse(new TextDecoder().decode(decode(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  if (
    head.alg !== "RS256" ||
    typeof head.kid !== "string" ||
    claims.aud !== PROJECT ||
    claims.iss !== `https://securetoken.google.com/${PROJECT}` ||
    typeof claims.sub !== "string" ||
    !claims.sub.length ||
    claims.sub.length > 128 ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now / 1000 ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now / 1000 + 60 ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time > now / 1000 + 60
  )
    throw new Error("Sign-in expired. Sign in again.");
  if (!keys || keysUntil <= now) {
    const r = await fetcher(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw new Error("Unable to verify sign-in. Please retry.");
    keys = (await r.json()).keys;
    keysUntil = now + 300000;
  }
  const jwk = keys.find((k) => k.kid === head.kid);
  if (!jwk) {
    keysUntil = 0;
    throw new Error("Sign-in verification needs a retry.");
  }
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(parts[2]),
      enc.encode(parts[0] + "." + parts[1]),
    ))
  )
    throw new Error("Invalid sign-in.");
  if (typeof claims.email !== "string" || !claims.email.includes("@"))
    throw new Error("Email account required.");
  return claims;
}
const hex = (b) =>
  Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, "0")).join(
    "",
  );
const hash = async (v) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(v)));
function canonicalEmail(value) {
  let [name, domain] = value.toLowerCase().split("@");
  if (["gmail.com", "googlemail.com"].includes(domain)) {
    name = name.split("+")[0].replace(/\./g, "");
    domain = "gmail.com";
  }
  return name + "@" + domain;
}
async function identityHash(email, secret) {
  if (!secret) throw new Error("Account service unavailable.");
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(
    await crypto.subtle.sign("HMAC", k, enc.encode(canonicalEmail(email))),
  );
}
export async function accountRequest(req, env) {
  const origin = req.headers.get("Origin") || "";
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Origin": origins.has(origin)
      ? origin
      : "https://medico.choicematrix.in",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "X-Content-Type-Options": "nosniff",
  };
  const reply = (v, status = 200) =>
    new Response(JSON.stringify(v), { status, headers });
  if (origin && !origins.has(origin))
    return reply({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    let user;
    try {
      user = await verifyFirebaseToken(token);
    } catch (firebaseError) {
      try {
        user = await verifyOwnerToken(token);
      } catch {
        throw firebaseError;
      }
    }
    if (!env.ACCOUNTS)
      return reply({ error: "Account service is being configured." }, 503);
    const reader = req.body?.getReader();
    let raw = "",
      size = 0;
    const decoder = new TextDecoder();
    if (reader)
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 12 * 1024 * 1024) {
          await reader.cancel();
          return reply({ error: "Request too large" }, 413);
        }
        raw += decoder.decode(part.value, { stream: true });
      }
    raw += decoder.decode();
    const { action, payload: b = {} } = JSON.parse(raw);
    const db = env.ACCOUNTS,
      uid = user.sub;
    const q = (sql, ...args) => db.prepare(sql).bind(...args);
    let p = await q("SELECT * FROM profiles WHERE user_id=?", uid).first();
    if (!p && action === "enroll") {
      let ref = null;
      if (b.code) {
        ref = await q(
          "SELECT user_id FROM profiles WHERE code=? AND frozen=0 AND deleted=0",
          String(b.code).toUpperCase(),
        ).first();
        if (!ref || ref.user_id === uid)
          throw new Error("Invalid referral code.");
      }
      const code = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 12)
        .toUpperCase();
      await q(
        "INSERT OR IGNORE INTO profiles(user_id,code,referred_by) VALUES(?,?,?)",
        uid,
        code,
        ref?.user_id || null,
      ).run();
      p = await q("SELECT * FROM profiles WHERE user_id=?", uid).first();
    }
    if (!p || p.deleted)
      throw new Error(
        "Account profile is unavailable. Contact help@choicematrix.in.",
      );
    if (["enroll", "status"].includes(action)) {
      const rows = await db.batch([
        q("SELECT template_id FROM unlocks WHERE user_id=?", uid),
        q(
          "SELECT delta,reason,created_at FROM ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
          uid,
        ),
        q(
          "SELECT id,subject,status,reply FROM tickets WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
          uid,
        ),
        q(
          "SELECT id,fingerprint,kind,state,expires_at FROM edits WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
          uid,
        ),
        q("SELECT user_id FROM receipts WHERE user_id=?", uid),
      ]);
      return reply({
        userId: uid,
        code: p.code,
        credits: p.credits,
        owner: user.owner === true,
        emailVerified: user.email_verified === true,
        qualified: rows[4].results.length > 0,
        frozen: !!p.frozen,
        unlocks: rows[0].results.map((r) => r.template_id),
        ledger: rows[1].results,
        tickets: rows[2].results,
        edits: rows[3].results,
      });
    }
    if (action.startsWith("admin_")) {
      if (user.owner !== true)
        throw new Error("Fresh owner verification required.");
      if (action === "admin_report") {
        const rows = await db.batch([
          q(
            "SELECT COUNT(*) AS n FROM profiles WHERE deleted=0 AND user_id<>'pulse-owner'",
          ),
          q("SELECT COUNT(*) AS n FROM receipts"),
          q(
            "SELECT COALESCE(SUM(delta),0) AS n FROM ledger WHERE reason='referral'",
          ),
          q("SELECT COALESCE(-SUM(delta),0) AS n FROM ledger WHERE delta<0"),
          q("SELECT COUNT(*) AS n FROM edits WHERE state='finalized'"),
          q("SELECT COUNT(*) AS n FROM unlocks"),
          q(
            "SELECT user_id,code,credits,frozen,created_at FROM profiles WHERE deleted=0 ORDER BY created_at DESC LIMIT 200",
          ),
          q("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 200"),
          q("SELECT * FROM audit ORDER BY created_at DESC LIMIT 200"),
          q("SELECT referrals_enabled,imports_enabled FROM config WHERE id=1"),
        ]);
        return reply({
          users: rows[0].results[0].n,
          qualified: rows[1].results[0].n,
          awarded: rows[2].results[0].n,
          spent: rows[3].results[0].n,
          edits: rows[4].results[0].n,
          unlocks: rows[5].results[0].n,
          profiles: rows[6].results,
          tickets: rows[7].results,
          audit: rows[8].results.map((a) => ({
            ...a,
            details: JSON.parse(a.details),
          })),
          config: rows[9].results[0],
        });
      }
      if (
        typeof b.reason !== "string" ||
        b.reason.trim().length < 5 ||
        b.reason.length > 1000
      )
        throw new Error(
          "An audit reason of 5 to 1,000 characters is required.",
        );
      const ops = [];
      if (action === "admin_credit" || action === "admin_freeze") {
        if (
          typeof b.userId !== "string" ||
          !(await q(
            "SELECT 1 AS ok FROM profiles WHERE user_id=? AND deleted=0",
            b.userId,
          ).first())
        )
          throw new Error("Unknown account.");
        if (action === "admin_credit") {
          if (!Number.isInteger(b.amount) || b.amount < 1 || b.amount > 20)
            throw new Error("Grant 1 to 20 credits.");
          ops.push(
            q(
              "INSERT INTO ledger(reference,user_id,delta,reason) VALUES(?,?,?,?)",
              "support:" + crypto.randomUUID(),
              b.userId,
              b.amount,
              "support adjustment",
            ),
          );
        } else {
          if (b.userId === "pulse-owner" || typeof b.frozen !== "boolean")
            throw new Error("Cannot pause owner.");
          ops.push(
            q(
              "UPDATE profiles SET frozen=? WHERE user_id=?",
              b.frozen ? 1 : 0,
              b.userId,
            ),
          );
        }
      } else if (action === "admin_flags") {
        if (typeof b.referrals !== "boolean" || typeof b.imports !== "boolean")
          throw new Error("Invalid settings.");
        ops.push(
          q(
            "UPDATE config SET referrals_enabled=?,imports_enabled=? WHERE id=1",
            b.referrals ? 1 : 0,
            b.imports ? 1 : 0,
          ),
        );
      } else if (action === "admin_ticket") {
        if (
          typeof b.reply !== "string" ||
          !b.reply.trim() ||
          b.reply.length > 2000
        )
          throw new Error("Enter a reply up to 2,000 characters.");
        ops.push(
          q(
            "UPDATE tickets SET status='resolved',reply=? WHERE id=?",
            b.reply,
            String(b.id),
          ),
        );
      } else if (action === "admin_refund_edit") {
        const edit = await q(
          "SELECT state FROM edits WHERE id=?",
          String(b.id),
        ).first();
        if (edit?.state !== "reserved")
          throw new Error("Only an unused reserved edit can be refunded.");
        ops.push(
          q(
            "UPDATE edits SET state='refunded' WHERE id=? AND state='reserved'",
            b.id,
          ),
        );
      } else throw new Error("Unknown administrative action.");
      ops.push(
        q(
          "INSERT INTO audit(id,actor,action,details) VALUES(?,?,?,?)",
          crypto.randomUUID(),
          uid,
          action,
          JSON.stringify(b),
        ),
      );
      await db.batch(ops);
      return reply({ ok: true });
    }
    if (action === "ticket") {
      if (
        typeof b.subject !== "string" ||
        b.subject.length < 3 ||
        b.subject.length > 120 ||
        typeof b.message !== "string" ||
        b.message.length < 5 ||
        b.message.length > 2000
      )
        throw new Error(
          "Enter a subject and a message up to 2,000 characters.",
        );
      const count = await q(
        "SELECT COUNT(*) AS n FROM tickets WHERE user_id=? AND created_at>datetime('now','-1 hour')",
        uid,
      ).first();
      if (count.n >= 3)
        throw new Error("Please wait before sending more support requests.");
      await q(
        "INSERT INTO tickets(id,user_id,subject,message) VALUES(?,?,?,?)",
        crypto.randomUUID(),
        uid,
        b.subject,
        b.message,
      ).run();
      return reply({ ok: true });
    }
    if (user.email_verified !== true)
      throw new Error(
        "Verify your email before using referrals, credits or premium templates.",
      );
    if (p.frozen) throw new Error("Account paused. Contact support.");
    if (action === "template" || action === "unlock") {
      const t = await q(
        "SELECT config FROM templates WHERE id=? AND active=1",
        String(b.templateId),
      ).first();
      if (!t) throw new Error("Unknown premium template.");
      if (action === "unlock")
        await q(
          "INSERT INTO unlocks(user_id,template_id) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM unlocks WHERE user_id=? AND template_id=?)",
          uid,
          b.templateId,
          uid,
          b.templateId,
        ).run();
      if (
        !(await q(
          "SELECT 1 AS ok FROM unlocks WHERE user_id=? AND template_id=?",
          uid,
          b.templateId,
        ).first())
      )
        throw new Error("Template locked. One referral credit is required.");
      return reply(JSON.parse(t.config));
    }
    if (action === "reserve_edit") {
      if (
        !/^[a-f0-9]{64}$/.test(b.fingerprint) ||
        !["pdf", "docx"].includes(b.kind)
      )
        throw new Error("Invalid document.");
      const flags = await q(
        "SELECT imports_enabled FROM config WHERE id=1",
      ).first();
      if (!flags.imports_enabled)
        throw new Error("Document imports temporarily paused.");
      const id = crypto.randomUUID(),
        expires = new Date(Date.now() + 86400000).toISOString();
      await q(
        "INSERT INTO edits(id,user_id,fingerprint,kind,expires_at) VALUES(?,?,?,?,?)",
        id,
        uid,
        b.fingerprint,
        b.kind,
        expires,
      ).run();
      return reply({ id, expires });
    }
    if (action === "complete") {
      if (raw.length > 300000) throw new Error("CV is too large.");
      const cv = b.cv;
      if (
        !cv ||
        typeof cv.personalInfo?.fullName !== "string" ||
        cv.personalInfo.fullName.trim().length < 3 ||
        !cv.personalInfo.professionalTitle?.trim() ||
        !cv.personalInfo.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ||
        !Array.isArray(cv.education) ||
        !Array.isArray(cv.experience) ||
        !(
          cv.education.some((e) => e.degree?.trim() && e.institution?.trim()) ||
          cv.experience.some((e) => e.position?.trim() && e.hospital?.trim())
        )
      )
        throw new Error(
          "Complete your name, professional title, email and education or experience.",
        );
      await q(
        "INSERT OR IGNORE INTO receipts(user_id,identity_hash,cv_hash) VALUES(?,?,?)",
        uid,
        await identityHash(user.email, env.PULSE_HANDOFF_KEY),
        await hash(JSON.stringify(cv)),
      ).run();
      return reply({ ok: true });
    }
    if (action === "edit") {
      if (
        typeof b.source !== "string" ||
        b.source.length > Math.ceil((MAX_BYTES * 4) / 3) + 4 ||
        !["pdf", "docx"].includes(b.kind)
      )
        throw new Error("Invalid document.");
      const bytes = fromBase64(b.source);
      if (bytes.length > MAX_BYTES) throw new Error("File exceeds 8 MB.");
      const fingerprint = await sha256(bytes),
        intent = await hash(
          JSON.stringify({
            kind: b.kind,
            text: b.kind === "docx" ? b.text : "",
            replacements: b.kind === "pdf" ? b.replacements : [],
          }),
        );
      const e = await q(
        "SELECT * FROM edits WHERE id=? AND user_id=?",
        String(b.id),
        uid,
      ).first();
      if (
        !e ||
        e.fingerprint !== fingerprint ||
        e.kind !== b.kind ||
        e.expires_at <= new Date().toISOString() ||
        e.state === "refunded" ||
        (e.state === "finalized" && e.result_hash !== intent)
      )
        throw new Error(
          "This edit is expired or was already used for another version.",
        );
      let result, mime;
      if (b.kind === "pdf") {
        if (!Array.isArray(b.replacements))
          throw new Error("Invalid replacements.");
        result = await editedPdf(bytes, b.replacements);
        mime = "application/pdf";
      } else {
        validateDocx(bytes);
        if (
          typeof b.text !== "string" ||
          !b.text.trim() ||
          b.text.length > 40000
        )
          throw new Error("Enter up to 40,000 characters of document text.");
        const doc = new Document({
          sections: [
            {
              children: b.text
                .split("\n")
                .map(
                  (line) =>
                    new Paragraph({
                      children: [
                        new TextRun({ text: line, font: "Calibri", size: 22 }),
                      ],
                      spacing: { after: 100 },
                    }),
                ),
            },
          ],
        });
        result = new Uint8Array(await Packer.toArrayBuffer(doc));
        mime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }
      const updated = await q(
        "UPDATE edits SET state='finalized',result_hash=? WHERE id=? AND user_id=? AND state IN ('reserved','finalized') AND (result_hash IS NULL OR result_hash=?) AND expires_at>?",
        intent,
        e.id,
        uid,
        intent,
        new Date().toISOString(),
      ).run();
      if (updated.meta.changes !== 1)
        throw new Error("This edit was already used or is expired.");
      return reply({ data: toBase64(result), mime });
    }
    if (action === "delete_profile") {
      await q("UPDATE profiles SET deleted=1 WHERE user_id=?", uid).run();
      return reply({ ok: true });
    }
    // Owner administration and legacy data are never authorized by a Firebase email claim alone.
    return reply(
      { error: "This account action is not available yet. Contact support." },
      409,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (
      /CHECK constraint|credits/i.test(message) &&
      /constraint/i.test(message)
    )
      return reply({ error: "One referral credit is required." }, 409);
    if (/SQLITE|D1_|database|syntax|constraint/i.test(message))
      return reply(
        {
          error:
            "Account service could not complete this request. Please retry.",
        },
        503,
      );
    return reply(
      { error: message || "Unable to process account request." },
      400,
    );
  }
}
