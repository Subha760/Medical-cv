import {
  validateOwnerClaims,
  ACCESS_ISSUER,
  ACCESS_AUDIENCE,
} from "../supabase/functions/medcv-pulse-access/access";
const decode = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
let cached,
  until = 0;
export async function verifyOwnerToken(token, now = Date.now()) {
  if (typeof token !== "string" || token.length > 16000)
    throw new Error("Owner verification required.");
  const [h, b, s, extra] = token.split(".");
  if (!s || extra) throw new Error("Owner verification required.");
  const header = JSON.parse(new TextDecoder().decode(decode(h))),
    claims = JSON.parse(new TextDecoder().decode(decode(b)));
  if (
    header.alg !== "RS256" ||
    !header.kid ||
    claims.iss !== ACCESS_ISSUER ||
    !Array.isArray(claims.aud) ||
    !claims.aud.includes(ACCESS_AUDIENCE)
  )
    throw new Error("Owner verification required.");
  const expires = validateOwnerClaims(claims, Math.floor(now / 1000));
  if (!cached || until < now) {
    const r = await fetch(ACCESS_ISSUER + "/cdn-cgi/access/certs", {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error("Owner verification unavailable.");
    cached = (await r.json()).keys;
    until = now + 300000;
  }
  const jwk = cached.find((k) => k.kid === header.kid);
  if (!jwk) {
    until = 0;
    throw new Error("Verify owner access again.");
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
      decode(s),
      new TextEncoder().encode(h + "." + b),
    ))
  )
    throw new Error("Owner verification required.");
  return {
    sub: "pulse-owner",
    email: claims.email,
    email_verified: true,
    owner: true,
    expires_at: expires,
  };
}
export async function ownerSession(assertion) {
  const user = await verifyOwnerToken(assertion);
  return {
    provider: "cloudflare",
    access_token: assertion,
    expires_at: user.expires_at,
  };
}
