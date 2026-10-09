import assert from "node:assert/strict";
import {
  validateOwnerClaims,
  OWNER_EMAIL,
} from "../supabase/functions/medcv-pulse-access/access.ts";
import worker from "../cloudflare/medico-domain.mjs";
const now = Math.floor(Date.now() / 1000);
const good = {
  email: OWNER_EMAIL,
  sub: "verified-owner",
  type: "app",
  iat: now,
  exp: now + 1800,
};
assert.equal(
  validateOwnerClaims(good, now),
  new Date((now + 1800) * 1000).toISOString(),
);
for (const change of [
  { email: "someone@gmail.com" },
  { email: "SUBHAJITSATPATHI6@gmail.com" },
  { type: "service_token" },
  { sub: "" },
  { iat: now + 60 },
  { exp: now - 1 },
  { iat: now - 1801 },
  { exp: now + 3600 },
  { exp: null },
])
  assert.throws(
    () => validateOwnerClaims({ ...good, ...change }, now),
    /verification/,
  );
assert.equal(
  (await worker.fetch(new Request("https://other.example/"))).status,
  421,
);
assert.equal(
  (
    await worker.fetch(
      new Request("https://medico.choicematrix.in/", { method: "POST" }),
    )
  ).status,
  405,
);
assert.equal(
  (
    await worker.fetch(
      new Request("https://medico.choicematrix.in/pulse/login"),
    )
  ).status,
  401,
);
assert.equal(
  (
    await worker.fetch(
      new Request("https://medico.choicematrix.in/pulse/login/session", {
        method: "POST",
      }),
    )
  ).status,
  403,
);
const original = globalThis.fetch;
try {
  globalThis.fetch = async (input, options) => {
    assert.equal(
      String(input),
      "https://jfweexvfnkotusyajkst.supabase.co/functions/v1/medcv-pulse-access",
    );
    assert.equal(
      new Headers(options?.headers).get("Cf-Access-Jwt-Assertion"),
      "forged",
    );
    return new Response('{"error":"verification denied"}', { status: 401 });
  };
  const denied = await worker.fetch(
    new Request("https://medico.choicematrix.in/pulse/login/session", {
      method: "POST",
      headers: {
        Origin: "https://medico.choicematrix.in",
        "Content-Type": "application/json",
        "Cf-Access-Jwt-Assertion": "forged",
      },
      body: "{}",
    }),
  );
  assert.equal(denied.status, 401);
  globalThis.fetch = async (input, options) => {
    assert.equal(String(input), "https://subha760.github.io/Medical-cv/pulse/");
    const h = new Headers(options?.headers);
    assert.equal(h.get("Cookie"), null);
    assert.equal(h.get("Authorization"), null);
    assert.equal(h.get("Cf-Access-Jwt-Assertion"), null);
    return new Response("<html>Pulse</html>", {
      headers: { "Content-Type": "text/html" },
    });
  };
  const page = await worker.fetch(
    new Request("https://medico.choicematrix.in/pulse/", {
      headers: {
        Cookie: "private",
        Authorization: "Bearer private",
        "Cf-Access-Jwt-Assertion": "private",
      },
    }),
  );
  assert.equal(page.headers.get("Cache-Control"), "no-store");
  assert.equal(page.headers.get("X-Frame-Options"), "DENY");
  assert.match(
    page.headers.get("Content-Security-Policy")!,
    /frame-ancestors 'none'/,
  );
} finally {
  globalThis.fetch = original;
}
console.log(
  "Pulse owner claims, expiry, forged verification, origin boundaries and secure proxy: passed",
);
