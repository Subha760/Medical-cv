import { acceptPulseSession } from "../account/pulseAuth";
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
    () => localStorage.getItem("pulse:expires") || "",
  );
  const [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(
      new URLSearchParams(location.search).has("signed_out")
        ? "Signed out. Reports, credits and support records are saved. Verify your owner Gmail to return."
        : "",
    );
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
      acceptPulseSession(data);
      localStorage.setItem("pulse:expires", data.expires_at);
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
        localStorage.removeItem("pulse:expires");
        void backend.auth.signOut({ scope: "local" }).then(() => refresh());
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timer);
  }, [account?.userId, emailSessionExpiry]);
  useEffect(() => {
    if (account?.owner)
      void run(async () => {
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
                const signedOut = await backend.auth.signOut({
                  scope: "local",
                });
                if (signedOut.error) throw signedOut.error;
                localStorage.removeItem("pulse:expires");
                setEmailSessionExpiry("");
                setReport(null);
                await refresh();
                if (location.origin === domain) {
                  const accessLogout = await fetch("/cdn-cgi/access/logout", {
                    credentials: "same-origin",
                    redirect: "manual",
                    cache: "no-store",
                    signal: AbortSignal.timeout(10000),
                  });
                  if (
                    !accessLogout.ok &&
                    accessLogout.type !== "opaqueredirect"
                  )
                    throw new Error(
                      "Pulse signed out, but the verification session could not be closed. Close this tab and retry.",
                    );
                  location.assign(domain + "/pulse/?signed_out=1");
                }
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
              Step 1: Continue with Gmail. Step 2: Enter this Gmail on the
              secure verification page, then enter the code sent to your inbox.
              After verification, Pulse opens automatically.
            </p>
            <p className="muted">
              Your session is remembered on this device until its 30-minute
              expiry. Signing out keeps all reports, credits and settings. The
              code is sent by Cloudflare Access. This verifies your email; it
              does not read your Gmail or request your Google password.
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
              Verify your owner Gmail to open a new 30-minute session. Reports
              and actions require the signed email-verification session on the
              server.
            </p>
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
