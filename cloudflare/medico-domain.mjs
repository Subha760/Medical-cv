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
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.hostname !== "medico.choicematrix.in")
      return response("Unknown host", 421);
    if (u.protocol !== "https:")
      return response(null, 308, { Location: DOMAIN + u.pathname + u.search });
    if (u.pathname === "/pulse/login" || u.pathname === "/pulse/login/") {
      if (req.method !== "GET") return response("Method not allowed", 405);
      if (!req.headers.get("Cf-Access-Jwt-Assertion"))
        return response("Owner verification required", 401);
      return response(null, 303, { Location: "/pulse/?verified=1" });
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
            "Cf-Access-Jwt-Assertion": assertion,
            "Content-Type": "application/json",
          },
          body: "{}",
          redirect: "error",
        },
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
      "default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googlesyndication.com; font-src 'self' data:; connect-src 'self' https://jfweexvfnkotusyajkst.supabase.co https://*.googlesyndication.com; worker-src 'self' blob:; frame-src https://*.googlesyndication.com https://*.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
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
