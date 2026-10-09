import "../utils/compat";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { backend, accountAction } from "../account/client";
import { useAccount } from "../account/useAccount";
import "../styles/global.css";
import "../styles/upgrade.css";
import "../styles/medico.css";
import { downloadFile } from "../utils/download";
type Report = {
  users: number;
  qualified: number;
  awarded: number;
  spent: number;
  edits: number;
  unlocks: number;
  profiles: {
    user_id: string;
    code: string;
    credits: number;
    frozen: boolean;
  }[];
  tickets: {
    id: string;
    subject: string;
    message: string;
    status: string;
    reply: string;
  }[];
  audit: {
    actor: string;
    action: string;
    created_at: string;
    details: unknown;
  }[];
  config: { referrals_enabled: boolean; imports_enabled: boolean };
};
function Pulse() {
  const { account, error, refresh, setError } = useAccount();
  const ownerEmail = "subhajitsatpathi6@gmail.com";
  const domain = "https://medico.choicematrix.in";
  const exchanging = useRef(false);
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
    [reply, setReply] = useState(""),
    [editId, setEditId] = useState(""),
    [message, setMessage] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    const r = await accountAction<Report>("admin_report");
    setReport(r);
  }
  useEffect(() => {
    if (
      location.origin !== domain ||
      !new URLSearchParams(location.search).has("verified") ||
      exchanging.current
    )
      return;
    exchanging.current = true;
    void run(async () => {
      const r = await fetch("/pulse/login/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
      if (!r.ok || !r.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "Email verification expired. Continue with Gmail again.",
        );
      const data = await r.json();
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
      await accountAction(type, { ...payload, reason });
      await load();
      setMessage("Action saved to the audit log.");
    });
  }
  return (
    <div className="pulse-shell">
      <header className="pulse-header">
        <span className="pulse-mark">P</span>
        <div>
          <strong>Pulse</strong>
          <span>Medico owner console</span>
        </div>
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
      <main className="container studio-page">
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
        {busy && <p role="status">Working…</p>}
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
          <>
            <div className="metric-grid">
              {[
                ["Accounts", report.users],
                ["Completed CVs", report.qualified],
                ["Credits earned", report.awarded],
                ["Credits spent", report.spent],
                ["Edited documents", report.edits],
                ["Template unlocks", report.unlocks],
              ].map(([label, value]) => (
                <article className="card" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </article>
              ))}
            </div>
            <section className="card studio-panel">
              <h2>Report tools</h2>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void run(load)}
              >
                Refresh report
              </button>{" "}
              <button
                className="btn btn-secondary"
                onClick={() =>
                  void downloadFile(
                    new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    }),
                    "pulse-report.json",
                  )
                }
              >
                Export JSON report
              </button>
              <p>
                Reports contain account and entitlement metadata. Original CVs
                and uploaded documents are not retained.
              </p>
              <label>
                Reason for administrative changes (required)
                <input
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            </section>
            <section className="card studio-panel">
              <h2>Feature controls</h2>
              <p>
                Referral rewards:{" "}
                {report.config.referrals_enabled ? "enabled" : "paused"} ·
                Document imports:{" "}
                {report.config.imports_enabled ? "enabled" : "paused"}
              </p>
              <button
                className="btn btn-secondary"
                disabled={busy || reason.length < 5}
                onClick={() =>
                  void action("admin_flags", {
                    referrals: !report.config.referrals_enabled,
                    imports: report.config.imports_enabled,
                  })
                }
              >
                Toggle referral rewards
              </button>{" "}
              <button
                className="btn btn-secondary"
                disabled={busy || reason.length < 5}
                onClick={() =>
                  void action("admin_flags", {
                    referrals: report.config.referrals_enabled,
                    imports: !report.config.imports_enabled,
                  })
                }
              >
                Toggle document editing
              </button>
            </section>
            <section className="card studio-panel">
              <h2>Accounts · newest 200</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Referral code</th>
                      <th>Credits</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.profiles.map((p) => (
                      <tr key={p.user_id}>
                        <td>
                          <strong>{p.code}</strong>
                          <small>{p.user_id}</small>
                        </td>
                        <td>{p.credits}</td>
                        <td>{p.frozen ? "Paused" : "Active"}</td>
                        <td>
                          <button
                            disabled={
                              busy ||
                              reason.length < 5 ||
                              p.user_id === account.userId
                            }
                            onClick={() =>
                              void action("admin_freeze", {
                                userId: p.user_id,
                                frozen: !p.frozen,
                              })
                            }
                          >
                            {p.frozen ? "Resume" : "Pause"}
                          </button>{" "}
                          <button
                            disabled={busy || reason.length < 5}
                            onClick={() =>
                              void action("admin_credit", {
                                userId: p.user_id,
                                amount: 1,
                              })
                            }
                          >
                            Grant 1 support credit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="card studio-panel">
              <h2>Unused edit refund</h2>
              <p>
                Refunds are limited to reserved, unfinalized edits. Each refund
                is recorded once.
              </p>
              <label>
                Edit session ID
                <input
                  value={editId}
                  onChange={(e) => setEditId(e.target.value)}
                />
              </label>
              <button
                className="btn btn-secondary"
                disabled={busy || reason.length < 5 || !editId}
                onClick={() => void action("admin_refund_edit", { id: editId })}
              >
                Refund unused reservation
              </button>
            </section>
            <section className="card studio-panel">
              <h2>Support inbox</h2>
              <label>
                Response
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={2000}
                />
              </label>
              {report.tickets.map((t) => (
                <article className="support-ticket" key={t.id}>
                  <h3>{t.subject}</h3>
                  <p>{t.message}</p>
                  <p>
                    {t.status}: {t.reply}
                  </p>
                  <button
                    className="btn btn-secondary"
                    disabled={busy || reason.length < 5 || reply.length < 5}
                    onClick={() =>
                      void action("admin_ticket", { id: t.id, reply })
                    }
                  >
                    Reply and resolve
                  </button>
                </article>
              ))}
            </section>
            <section className="card studio-panel">
              <h2>Audit trail · newest 200</h2>
              {report.audit.map((a, i) => (
                <div className="ledger-row" key={i}>
                  <strong>{a.action}</strong>
                  <time>{new Date(a.created_at).toLocaleString()}</time>
                  <details>
                    <summary>Details</summary>
                    <pre>{JSON.stringify(a.details, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </section>
            <section className="card studio-panel">
              <h2>Release & advertising readiness</h2>
              <p>
                Web AdSense: disabled until publisher and slot IDs, approval and
                a certified consent platform are configured. Mobile advertising
                requires AdMob setup; it is currently disabled. Referral and
                admin screens carry no ads.
              </p>
              <p>
                Privacy, terms, cache disclosure and account deletion pages are
                published with the app. Play and Indus submissions require your
                developer account, release key and store review.
              </p>
              <a href="../privacy.html">Privacy policy</a> ·{" "}
              <a href="../account-deletion.html">Deletion instructions</a>
            </section>
          </>
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
