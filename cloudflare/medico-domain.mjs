const ORIGIN = "https://subha760.github.io";
const PREFIX = "/Medical-cv";
const DOMAIN = "https://medico.choicematrix.in";
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000",
};
function response(body, status, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...SECURITY, "Cache-Control": "no-store", ...extra },
  });
}
const HANDOFF_COOKIE = "__Secure-PulseHandoff";
const HANDOFF_TTL = 120000;
const encoder = new TextEncoder();
const handoffAAD = encoder.encode(DOMAIN + ":pulse-handoff-v1");
function cookie(value, age = 120) {
  return `${HANDOFF_COOKIE}=${value}; Path=/pulse; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
}
function base64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
async function handoffKey(env) {
  if (!env?.PULSE_HANDOFF_KEY) throw new Error("Login unavailable");
  const bytes = Uint8Array.from(atob(env.PULSE_HANDOFF_KEY), (c) =>
    c.charCodeAt(0),
  );
  if (bytes.length !== 32) throw new Error("Login unavailable");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function sealSession(session, env, now = Date.now()) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = encoder.encode(
    JSON.stringify({
      session,
      deadline: Math.min(now + HANDOFF_TTL, Date.parse(session.expires_at)),
    }),
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: handoffAAD },
      await handoffKey(env),
      payload,
    ),
  );
  const value = base64(iv) + "." + base64(encrypted);
  // Stay below browser cookie limits. Never redirect with tokens in a URL.
  if (value.length > 3700) throw new Error("Login unavailable");
  return value;
}
export async function openSession(value, env, now = Date.now()) {
  if (!value || value.length > 3700) throw new Error("Login required");
  const [ivText, encryptedText, extra] = value.split(".");
  if (!ivText || !encryptedText || extra) throw new Error("Login required");
  const decode = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(ivText), additionalData: handoffAAD },
    await handoffKey(env),
    decode(encryptedText),
  );
  const { session, deadline } = JSON.parse(new TextDecoder().decode(decrypted));
  if (
    !Number.isFinite(deadline) ||
    deadline <= now ||
    deadline > now + HANDOFF_TTL ||
    typeof session?.access_token !== "string" ||
    typeof session?.refresh_token !== "string" ||
    !Number.isFinite(Date.parse(session.expires_at)) ||
    Date.parse(session.expires_at) <= now
  )
    throw new Error("Login required");
  return session;
}
async function verifiedSession(assertion) {
  // This is a signed assertion, not an email claim. The Edge verifies its signature and owner identity.
  // Use an application header rather than forwarding Cloudflare's reserved proxy header across zones.
  const result = await fetch(
    "https://jfweexvfnkotusyajkst.supabase.co/functions/v1/medcv-pulse-access",
    {
      method: "POST",
      headers: {
        "X-Medcv-Access-Assertion": assertion,
        "Content-Type": "application/json",
      },
      body: "{}",
      redirect: "manual",
    },
  );
  // Cloudflare's runtime rejects redirect:"error" before sending the request.
  // Manual mode is supported; never follow a redirect carrying the assertion.
  if (result.status >= 300 && result.status < 400)
    throw new Error("owner_session_unavailable");
  const data = await result.json();
  if (!result.ok) throw new Error(data.code || "owner_session_unavailable");
  return data;
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.hostname !== "medico.choicematrix.in")
      return response("Unknown host", 421);
    if (u.protocol !== "https:")
      return response(null, 308, { Location: DOMAIN + u.pathname + u.search });
    if (u.pathname === "/pulse/login" || u.pathname === "/pulse/login/") {
      if (req.method !== "GET") return response("Method not allowed", 405);
      if (!req.headers.get("Cf-Access-Jwt-Assertion"))
        return response("Owner verification required", 401);
      try {
        const session = await verifiedSession(
          req.headers.get("Cf-Access-Jwt-Assertion"),
        );
        return response(null, 303, {
          Location: "/pulse/?verified=1",
          "Set-Cookie": cookie(await sealSession(session, env)),
        });
      } catch (error) {
        const allowed = [
          "owner_verification_invalid",
          "owner_identity_unavailable",
          "owner_session_unavailable",
          "owner_grant_denied",
        ];
        const code = allowed.includes(error.message)
          ? error.message
          : "owner_session_unavailable";
        return response(null, 303, {
          Location: "/pulse/?login_error=" + code,
          "Set-Cookie": cookie("", 0),
        });
      }
    }
    if (u.pathname === "/pulse/session") {
      if (req.method !== "POST") return response("Method not allowed", 405);
      if (
        req.headers.get("Origin") !== DOMAIN ||
        req.headers.get("Content-Type") !== "application/json"
      )
        return response("Forbidden", 403);
      try {
        const value = (req.headers.get("Cookie") || "")
          .split(";")
          .map((p) => p.trim())
          .find((p) => p.startsWith(HANDOFF_COOKIE + "="))
          ?.slice(HANDOFF_COOKIE.length + 1);
        const session = await openSession(value, env);
        return response(JSON.stringify(session), 200, {
          "Content-Type": "application/json",
          "Set-Cookie": cookie("", 0),
        });
      } catch {
        return response(
          JSON.stringify({
            error:
              "The secure login handoff is missing or expired. Continue with Gmail again.",
          }),
          401,
          { "Content-Type": "application/json", "Set-Cookie": cookie("", 0) },
        );
      }
    }
    if (u.pathname === "/pulse/login/session") {
      if (req.method !== "POST") return response("Method not allowed", 405);
      if (
        req.headers.get("Origin") !== DOMAIN ||
        req.headers.get("Content-Type") !== "application/json"
      )
        return response("Forbidden", 403);
      const assertion = req.headers.get("Cf-Access-Jwt-Assertion");
      if (!assertion || assertion.length > 16000)
        return response("Owner verification required", 401);
      // Never trust an asserted email/header alone. The Edge Function checks RS256, issuer, audience and expiry.
      const result = await fetch(
        "https://jfweexvfnkotusyajkst.supabase.co/functions/v1/medcv-pulse-access",
        {
          method: "POST",
          headers: {
            "X-Medcv-Access-Assertion": assertion,
            "Content-Type": "application/json",
          },
          body: "{}",
          redirect: "manual",
        },
      );
      if (result.status >= 300 && result.status < 400)
        return response(
          JSON.stringify({
            error: "The owner account service could not be reached.",
          }),
          503,
          { "Content-Type": "application/json" },
        );
      return response(result.body, result.status, {
        "Content-Type": "application/json",
      });
    }
    if (!["GET", "HEAD"].includes(req.method))
      return response("Method not allowed", 405);
    // Only static site requests are forwarded. Never forward cookies, Authorization or Access tokens to GitHub.
    const upstream = new URL(PREFIX + u.pathname, ORIGIN);
    const r = await fetch(upstream, {
      method: req.method,
      headers: { Accept: req.headers.get("Accept") || "*/*" },
      redirect: "manual",
    });
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(SECURITY)) h.set(k, v);
    h.delete("Set-Cookie");
    h.delete("Access-Control-Allow-Origin");
    h.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://*.googlesyndication.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googlesyndication.com; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com https://jfweexvfnkotusyajkst.supabase.co https://*.googlesyndication.com; worker-src 'self' blob:; frame-src https://*.googlesyndication.com https://*.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    if (u.pathname.startsWith("/pulse")) {
      h.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      h.set("Cache-Control", "no-store");
    }
    if (u.pathname.endsWith("/sw.js") || u.pathname === "/sw.js")
      h.set("Cache-Control", "no-cache");
    const loc = h.get("Location");
    if (loc) {
      const target = new URL(loc, upstream);
      if (target.origin !== ORIGIN || !target.pathname.startsWith(PREFIX))
        return response("Unexpected upstream redirect", 502);
      h.set("Location", target.pathname.slice(PREFIX.length) || "/");
    }
    return new Response(r.body, { status: r.status, headers: h });
  },
};
