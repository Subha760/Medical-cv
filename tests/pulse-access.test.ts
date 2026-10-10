import assert from "node:assert/strict";
import {
  validateOwnerClaims,
  OWNER_EMAIL,
} from "../supabase/functions/medcv-pulse-access/access.ts";
import worker, {
  sealSession,
  openSession,
} from "../cloudflare/medico-domain.mjs";
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
  const env = { PULSE_HANDOFF_KEY: Buffer.alloc(32, 7).toString("base64") };
  const session = {
    access_token: "test-owner-token",
    refresh_token: "test-refresh-token",
    expires_at: new Date(Date.now() + 1800000).toISOString(),
  };
  const sealed = await sealSession(session, env);
  assert.deepEqual(await openSession(sealed, env), session);
  assert(!sealed.includes(session.access_token));
  await assert.rejects(() => openSession(sealed, env, Date.now() + 120001));
  await assert.rejects(() =>
    openSession(sealed, {
      PULSE_HANDOFF_KEY: Buffer.alloc(32, 8).toString("base64"),
    }),
  );
  await assert.rejects(() => openSession(sealed.slice(0, -3) + "AAAA", env));
  globalThis.fetch = async (input, options) => {
    assert.equal(
      String(input),
      "https://jfweexvfnkotusyajkst.supabase.co/functions/v1/medcv-pulse-access",
    );
    const h = new Headers(options?.headers);
    assert.equal(h.get("X-Medcv-Access-Assertion"), "signed-callback-proof");
    assert.equal(h.get("Cf-Access-Jwt-Assertion"), null);
    // Platform regression: Workers rejects redirect:"error" before any HTTP request.
    assert.equal(options?.redirect, "manual");
    return Response.json(session);
  };
  // Regression: use the assertion on the already verified top-level callback;
  // the following browser POST must not depend on a second Access assertion.
  const callback = await worker.fetch(
    new Request("https://medico.choicematrix.in/pulse/login", {
      headers: { "Cf-Access-Jwt-Assertion": "signed-callback-proof" },
    }),
    env,
  );
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("Location"), "/pulse/?verified=1");
  assert(!callback.headers.get("Location")!.includes(session.access_token));
  const setCookie = callback.headers.get("Set-Cookie")!;
  assert.match(setCookie, /Secure; HttpOnly; SameSite=Strict/);
  assert.match(setCookie, /Max-Age=120/);
  const exchange = await worker.fetch(
    new Request("https://medico.choicematrix.in/pulse/session", {
      method: "POST",
      headers: {
        Origin: "https://medico.choicematrix.in",
        "Content-Type": "application/json",
        Cookie: setCookie.split(";")[0],
      },
      body: "{}",
    }),
    env,
  );
  assert.equal(exchange.status, 200);
  assert.deepEqual(await exchange.json(), session);
  assert.match(exchange.headers.get("Set-Cookie")!, /Max-Age=0/);
  assert.equal(exchange.headers.get("Cache-Control"), "no-store");
  globalThis.fetch = async (_input, options) => {
    assert.equal(options?.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: { Location: "https://untrusted.example/" },
    });
  };
  const redirected = await worker.fetch(
    new Request("https://medico.choicematrix.in/pulse/login", {
      headers: { "Cf-Access-Jwt-Assertion": "signed-callback-proof" },
    }),
    env,
  );
  assert.equal(
    redirected.headers.get("Location"),
    "/pulse/?login_error=owner_session_unavailable",
  );
  assert.match(redirected.headers.get("Set-Cookie")!, /Max-Age=0/);
  for (const [headers, expected] of [
    [
      {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
        Cookie: setCookie.split(";")[0],
      },
      403,
    ],
    [
      {
        Origin: "https://medico.choicematrix.in",
        "Content-Type": "application/json",
      },
      401,
    ],
    [
      {
        Origin: "https://medico.choicematrix.in",
        "Content-Type": "application/json",
        Cookie: "__Secure-PulseHandoff=forged",
      },
      401,
    ],
  ] as const) {
    assert.equal(
      (
        await worker.fetch(
          new Request("https://medico.choicematrix.in/pulse/session", {
            method: "POST",
            headers,
            body: "{}",
          }),
          env,
        )
      ).status,
      expected,
    );
  }
  globalThis.fetch = async (input, options) => {
    assert.equal(
      String(input),
      "https://jfweexvfnkotusyajkst.supabase.co/functions/v1/medcv-pulse-access",
    );
    assert.equal(
      new Headers(options?.headers).get("X-Medcv-Access-Assertion"),
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
