import { useState } from "react";
import NavBar from "../components/NavBar";
import { backend, accountAction, gateway } from "../account/client";
import { useAccount } from "../account/useAccount";
import { cvStorage } from "../storage/cvStorage";
import { Link } from "react-router-dom";
export default function AccountPage() {
  const { account, error, busy, refresh, setError } = useAccount();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [code, setCode] = useState(
      () => localStorage.getItem("medico:referral") || "",
    ),
    [subject, setSubject] = useState(""),
    [ticket, setTicket] = useState("");
  async function run(fn: () => Promise<unknown>) {
    setMessage("");
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function auth(signup: boolean) {
    await run(async () => {
      if (code)
        localStorage.setItem("medico:referral", code.trim().toUpperCase());
      const r = signup
        ? await backend.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin + location.pathname },
          })
        : await backend.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
      setMessage(
        signup
          ? "Check your email for the verification link, then sign in."
          : "Signed in.",
      );
    });
  }
  return (
    <>
      <NavBar />
      <main className="container studio-page">
        <p className="eyebrow">Your career, connected</p>
        <h1>Account & referral credits</h1>
        <p>
          Free templates and your daily workspace work without an account.
          Verified referrals unlock premium designs and document edits.
        </p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {busy && <p role="status">Connecting securely…</p>}
        {!account ? (
          <form
            className="card studio-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void auth(false);
            }}
          >
            <h2>Sign in</h2>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password (at least 10 characters)
              <input
                type="password"
                minLength={10}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Referral code (optional; applied only at first enrollment)
              <input
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <div className="action-row">
              <button className="btn btn-primary" disabled={busy}>
                Sign in
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !email || password.length < 10}
                onClick={() => void auth(true)}
              >
                Create account
              </button>
            </div>
            <p>
              Your email must be verified. Do not reuse a workplace password.
            </p>
          </form>
        ) : (
          <>
            <div className="metric-grid">
              <article className="card">
                <strong>{account.credits}</strong>
                <span>Available credits</span>
              </article>
              <article className="card">
                <strong>{account.unlocks.length}</strong>
                <span>Unlocked templates</span>
              </article>
              <article className="card">
                <strong>{account.qualified ? "Complete" : "Pending"}</strong>
                <span>First CV qualification</span>
              </article>
            </div>
            <section className="card studio-panel">
              <h2>Invite a colleague</h2>
              <p>
                Your code:{" "}
                <strong className="mono-label">{account.code}</strong>
              </p>
              <p>
                One new colleague verifies their email and creates their first
                complete CV = one credit. One credit unlocks one premium
                template permanently, or reserves one document edit for 24
                hours. A document edit produces one final version; changing it
                after export requires another credit. Installs alone are not
                counted.
              </p>
              <button
                className="btn btn-primary"
                onClick={() =>
                  void run(async () => {
                    const link =
                      location.origin +
                      location.pathname +
                      "#/account?ref=" +
                      account.code;
                    await navigator.clipboard.writeText(link);
                    setMessage("Referral link copied.");
                  })
                }
              >
                Copy invite link
              </button>
              <p>
                No reward is tied to advertising views or clicks. Duplicate
                accounts and repeated CV completions do not earn extra credits.
              </p>
              <Link className="btn btn-secondary" to="/new">
                Browse premium designs
              </Link>{" "}
              <Link className="btn btn-secondary" to="/import">
                Edit a PDF or Word document
              </Link>
            </section>
            {!account.qualified && (
              <section className="card studio-panel">
                <h2>Complete your first CV</h2>
                <p>
                  Pick a saved CV below. With your consent, its text is sent
                  securely for completion validation. Photos and signatures are
                  excluded. Only a completion hash and referral receipt are
                  retained.
                </p>
                {cvStorage.listSaved().map((d) => (
                  <button
                    className="btn btn-secondary"
                    key={d.id}
                    onClick={() =>
                      void run(async () => {
                        await gateway("complete", {
                          cv: {
                            ...d,
                            personalInfo: {
                              ...d.personalInfo,
                              profilePhotoDataUrl: null,
                            },
                            signatureDataUrl: null,
                          },
                        });
                        setMessage("CV completion verified. Thank you!");
                      })
                    }
                  >
                    Verify {d.label || d.personalInfo.fullName || "Saved CV"}
                  </button>
                ))}
                <p>
                  <Link to="/new">Create a CV</Link> if you have no saved CV
                  yet.
                </p>
              </section>
            )}
            <section className="card studio-panel">
              <h2>Credit history</h2>
              {account.ledger.length ? (
                account.ledger.map((l, i) => (
                  <div className="ledger-row" key={i}>
                    <span>{l.reason}</span>
                    <strong>
                      {l.delta > 0 ? "+" : ""}
                      {l.delta}
                    </strong>
                    <time>{new Date(l.created_at).toLocaleDateString()}</time>
                  </div>
                ))
              ) : (
                <p>No credit activity yet.</p>
              )}
            </section>
            <form
              className="card studio-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await accountAction("ticket", { subject, message: ticket });
                  setTicket("");
                  setSubject("");
                  setMessage("Support request sent to Pulse.");
                });
              }}
            >
              <h2>Support</h2>
              <label>
                Subject
                <input
                  value={subject}
                  required
                  minLength={3}
                  maxLength={120}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label>
                Message (no patient details)
                <textarea
                  value={ticket}
                  required
                  minLength={5}
                  maxLength={2000}
                  onChange={(e) => setTicket(e.target.value)}
                />
              </label>
              <button className="btn btn-primary">Send request</button>
              {account.tickets.map((t) => (
                <article key={t.id}>
                  <h3>{t.subject}</h3>
                  <p>
                    {t.status}: {t.reply || "Awaiting owner response"}
                  </p>
                </article>
              ))}
            </form>
            <section className="card studio-panel">
              <h2>Account controls</h2>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  void run(async () => {
                    await backend.auth.signOut();
                    setMessage(
                      "Signed out. Your local CVs remain on this device.",
                    );
                  })
                }
              >
                Sign out
              </button>{" "}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (
                    confirm(
                      "Delete your Medico referral profile, credits, unlocks and support tickets? Local CVs and your shared ChoiceMatrix sign-in identity will remain.",
                    )
                  )
                    void run(async () => {
                      await accountAction("delete_profile");
                      await backend.auth.signOut();
                      setMessage("Medico profile deleted.");
                    });
                }}
              >
                Delete Medico profile
              </button>
              <p>
                A salted completion fingerprint remains to prevent repeat
                referral rewards. For deletion of the shared ChoiceMatrix
                sign-in identity, use the account deletion contact below.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
