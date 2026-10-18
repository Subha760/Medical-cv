import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { backend, accountAction, gateway } from "../account/client";
import { useAccount } from "../account/useAccount";
import { cvStorage } from "../storage/cvStorage";
import { preserveProfileData } from "../account/profileData";
import { rememberedEmail } from "../account/authMessages";
import { Link, useNavigate } from "react-router-dom";
import {
  autoVerificationEnabled,
  completionPayload,
  setAutoVerification,
} from "../account/referrals";
export default function AccountPage() {
  const navigate = useNavigate();
  const { account, error, busy, refresh, setError } = useAccount();
  const [message, setMessage] = useState(""),
    [subject, setSubject] = useState(""),
    [ticket, setTicket] = useState("");
  const [autoVerify, setAutoVerify] = useState(false);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    setAutoVerify(account ? autoVerificationEnabled(account.userId) : false);
  }, [account?.userId]);
  async function run(fn: () => Promise<unknown>) {
    setWorking(true);
    setMessage("");
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
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
          <section className="card studio-panel auth-invite">
            <h2>Your account, ready when you are</h2>
            <p>
              Sign in to return to your credits, unlocked designs and support.
              New here? Create an account on the dedicated signup page.
            </p>
            {rememberedEmail() && (
              <p>
                Last email on this device: <strong>{rememberedEmail()}</strong>
              </p>
            )}
            <div className="action-row">
              <Link className="btn btn-primary" to="/login">
                Sign in
              </Link>
              <Link className="btn btn-secondary" to="/signup">
                Create account
              </Link>
            </div>
            <p>
              <Link to="/forgot-password">
                Forgot or need to set your password?
              </Link>
            </p>
            <p>
              Signing out keeps your local drafts and your server account
              records. To return on another device, export and restore a backup
              from Settings.
            </p>
          </section>
        ) : (
          <>
            {account.emailVerified === false && (
              <p className="notice">
                You’re signed in. Verify your email to use referrals and premium
                credits. <Link to="/verify-email">Verify email</Link>
              </p>
            )}
            <p className="notice">
              Credits are checked with the server every 30 seconds while this
              page is visible, and when you return online. One qualifying
              referral earns one credit automatically.
            </p>
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
                      "#/signup?ref=" +
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
            <section className="card studio-panel">
              <h2>Automatic referral verification</h2>
              <label className="referral-consent">
                <input
                  type="checkbox"
                  checked={autoVerify}
                  onChange={(e) => {
                    try {
                      setAutoVerification(account.userId, e.target.checked);
                      setAutoVerify(e.target.checked);
                    } catch {
                      setError("This device could not save your preference.");
                    }
                  }}
                />
                Verify my first qualifying CV automatically when I download it
              </label>
              <p>
                With this optional consent, your name, title, email and
                education or employment institution are sent securely for
                completion validation. Photos, signatures and the rest of your
                CV stay on your device. Only a completion hash and referral
                receipt are retained. You can turn this off anytime.
              </p>
              <p>
                A verified account and complete CV are required. Repeated
                completions, self-referrals and duplicate Gmail aliases do not
                earn additional rewards. Installs alone do not earn credits. You
                choose where to spend each earned credit.
              </p>
              <button
                className="btn btn-secondary"
                disabled={busy || working}
                onClick={() =>
                  void run(async () => {
                    setMessage("Credit balance updated from the server.");
                  })
                }
              >
                Refresh credit balance
              </button>
            </section>
            {!account.qualified && (
              <section className="card studio-panel">
                <h2>Complete your first CV</h2>
                <p>
                  Pick a saved CV below. With your consent, only your name,
                  title, email and education or employment institution are sent
                  securely for completion validation. Photos and signatures are
                  excluded. Only a completion hash and referral receipt are
                  retained.
                </p>
                {cvStorage.listSaved().map((d) => (
                  <button
                    className="btn btn-secondary"
                    key={d.id}
                    disabled={busy || working}
                    onClick={() =>
                      void run(async () => {
                        await gateway("complete", {
                          cv: completionPayload(d),
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
              <button className="btn btn-primary" disabled={busy || working}>
                Send request
              </button>
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
                    try {
                      preserveProfileData();
                    } catch {
                      /* Original local records remain intact even if the optional snapshot is full. */
                    }
                    const result = await backend.auth.signOut({
                      scope: "local",
                    });
                    if (result.error) throw result.error;
                    navigate("/login?signed_out=1", { replace: true });
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
                      await backend.auth.signOut({ scope: "local" });
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
