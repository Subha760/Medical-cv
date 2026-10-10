import "../utils/compat";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { backend, accountAction } from "../account/client";
import { useAccount } from "../account/useAccount";
import "../styles/global.css";
import "../styles/upgrade.css";
import "../styles/medico.css";
import Dashboard from "./Dashboard";
import type { Report } from "./report";
import "./pulse.css";
function Pulse() {
  const { account, error, refresh, setError } = useAccount();
  const ownerEmail = "subhajitsatpathi6@gmail.com";
  const domain = "https://medico.choicematrix.in";
  const exchanging = useRef(false);
  const running = useRef(false);
  const [emailSessionExpiry, setEmailSessionExpiry] = useState(
    () => sessionStorage.getItem("pulse:expires") || "",
  );
  const [otp, setOtp] = useState(""),
    [factor, setFactor] = useState(""),
    [qr, setQr] = useState(""),
    [secret, setSecret] = useState(""),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [dark, setDark] = useState(
    () => localStorage.getItem("pulse:theme") === "dark",
  );
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setError("");
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [setError],
  );
  const load = useCallback(async () => {
    const r = await accountAction<Report>("admin_report");
    setReport(r);
    setUpdatedAt(Date.now());
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("login_error")) {
      const errors: Record<string, string> = {
        owner_verification_invalid:
          "The owner verification could not be validated. Continue with Gmail again.",
        owner_identity_unavailable:
          "Your Gmail was verified, but the account service could not open your identity. Please retry.",
        owner_session_unavailable:
          "Your Gmail was verified, but the secure session could not be created. Please retry.",
        owner_grant_denied:
          "Your Gmail was verified, but owner access was denied by the database.",
      };
      setError(
        errors[params.get("login_error") || ""] ||
          "Secure sign-in could not be completed. Please retry.",
      );
      history.replaceState(null, "", location.pathname);
      return;
    }
    if (
      location.origin !== domain ||
      !new URLSearchParams(location.search).has("verified") ||
      exchanging.current
    )
      return;
    exchanging.current = true;
    void run(async () => {
      const r = await fetch("/pulse/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
      if (!r.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "Secure sign-in returned an unexpected response. Please retry.",
        );
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          data.error || "Secure sign-in could not be completed. Please retry.",
        );
      const result = await backend.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (result.error) throw result.error;
      sessionStorage.setItem("pulse:expires", data.expires_at);
      setEmailSessionExpiry(data.expires_at);
      history.replaceState(null, "", location.pathname);
      await refresh();
      await load();
      setMessage("Your Gmail is verified. Welcome to Pulse.");
    });
  }, []);
  useEffect(() => {
    const expires = emailSessionExpiry;
    if (!account || !expires) return;
    const remaining = new Date(expires).getTime() - Date.now();
    const timer = setTimeout(
      () => {
        setReport(null);
        setMessage("Your owner session expired. Verify your Gmail again.");
        sessionStorage.removeItem("pulse:expires");
        void backend.auth.signOut({ scope: "local" }).then(() => refresh());
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [account?.userId, emailSessionExpiry]);
  useEffect(() => {
    if (account?.owner)
      void run(async () => {
        const r = await backend.auth.mfa.listFactors();
        if (r.error) throw r.error;
        const f = r.data.totp[0];
        if (f) setFactor(f.id);
        try {
          await load();
        } catch {
          /* A fresh email session or previously enrolled TOTP is required. */
        }
      });
  }, [account?.owner]);
  async function action(type: string, payload: Record<string, unknown>) {
    await run(async () => {
      await accountAction(type, { ...payload, reason: reason.trim() });
      await load();
      setMessage("Action saved to the audit log.");
    });
  }
  return (
    <div className="pulse-shell" data-theme={dark ? "dark" : "light"}>
      <header className="pulse-header">
        <span className="pulse-mark">P</span>
        <div>
          <strong>Pulse</strong>
          <span>Medico owner console</span>
        </div>
        <button
          className="btn btn-secondary pulse-theme-toggle"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => {
            setDark(!dark);
            localStorage.setItem("pulse:theme", !dark ? "dark" : "light");
          }}
        >
          {dark ? "☀ Light" : "☾ Dark"}
        </button>
        {account && (
          <button
            className="btn btn-secondary"
            onClick={() =>
              void run(async () => {
                await backend.auth.signOut({ scope: "local" });
                sessionStorage.removeItem("pulse:expires");
                setEmailSessionExpiry("");
                setReport(null);
                await refresh();
                if (location.origin === domain)
                  location.assign(domain + "/cdn-cgi/access/logout");
              })
            }
          >
            Sign out
          </button>
        )}
      </header>
      <main
        className={`container studio-page ${report ? "pulse-workspace" : "pulse-entry"}`}
      >
        <p className="eyebrow">Private operations</p>
        <h1>One clear view of your app.</h1>
        <p>
          Only your verified owner Gmail can open Pulse. Reports and
          administrative actions are checked on the server, and email sessions
          expire after 30 minutes.
        </p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {busy && (
          <p role="status" className="pulse-progress">
            Working…
          </p>
        )}
        {!account ? (
          <section className="card studio-panel pulse-sign-in">
            <h2>Owner sign-in</h2>
            <p>Your owner account is locked to this Gmail address.</p>
            <label>
              Owner Gmail
              <input
                type="email"
                value={ownerEmail}
                readOnly
                autoComplete="email"
                aria-describedby="owner-email-help"
              />
            </label>
            <p id="owner-email-help">
              You cannot change this address here. No password is needed.
            </p>
            <a className="btn btn-primary" href={domain + "/pulse/login"}>
              <span className="gmail-mark" aria-hidden="true">
                G
              </span>{" "}
              Continue with Gmail
            </a>
            <p>
              Enter this Gmail on the secure verification page, then enter the
              code sent to your inbox. After verification, Pulse opens
              automatically.
            </p>
            <p className="muted">
              The code is sent by Cloudflare Access. This verifies your email;
              it does not read your Gmail or request your Google password.
            </p>
          </section>
        ) : !account.owner ? (
          <section className="card studio-panel">
            <h2>Access restricted</h2>
            <p>
              This account is not the verified owner. No reports or management
              data are available.
            </p>
          </section>
        ) : !report ? (
          <section className="card studio-panel">
            <h2>Verify owner access</h2>
            <a className="btn btn-primary" href={domain + "/pulse/login"}>
              Continue with Gmail
            </a>
            <p>
              Verify your owner Gmail to open a new 30-minute session. If you
              previously configured an authenticator, you can also use it below.
            </p>
            {!factor ? (
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const r = await backend.auth.mfa.enroll({
                      factorType: "totp",
                      friendlyName: "Pulse owner",
                      issuer: "Medico Pulse",
                    });
                    if (r.error) throw r.error;
                    setFactor(r.data.id);
                    setQr(r.data.totp.qr_code);
                    setSecret(r.data.totp.secret);
                  })
                }
              >
                Set up an authenticator
              </button>
            ) : (
              <p>Enter the current six-digit code from your authenticator.</p>
            )}
            {qr && (
              <>
                <img
                  className="mfa-qr"
                  src={
                    qr.startsWith("data:")
                      ? qr
                      : "data:image/svg+xml;charset=utf-8," +
                        encodeURIComponent(qr)
                  }
                  alt="Authenticator setup QR code"
                />
                <details>
                  <summary>Manual setup secret</summary>
                  <code>{secret}</code>
                </details>
                <p>
                  Store your authenticator backup securely. This secret is shown
                  only during setup.
                </p>
              </>
            )}
            {factor && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const r = await backend.auth.mfa.challengeAndVerify({
                      factorId: factor,
                      code: otp,
                    });
                    if (r.error) throw r.error;
                    setQr("");
                    setSecret("");
                    setOtp("");
                    await load();
                  });
                }}
              >
                <label>
                  Authenticator code
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </label>
                <button className="btn btn-primary">
                  Verify and open Pulse
                </button>
              </form>
            )}
          </section>
        ) : (
          <Dashboard
            report={report}
            userId={account.userId}
            busy={busy}
            updatedAt={updatedAt}
            expiry={emailSessionExpiry}
            refresh={load}
            action={action}
            run={run}
            reason={reason}
            setReason={setReason}
          />
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Pulse />
  </React.StrictMode>,
);
