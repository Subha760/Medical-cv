import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import NavBar from "../components/NavBar";
import AppIcon from "../components/AppIcon";
import { firebaseAccount } from "../account/firebaseAdapter";
import { backend } from "../account/client";
import {
  authErrorMessage,
  authReturnUrl,
  rememberedEmail,
  rememberEmail,
} from "../account/authMessages";
import "./AuthPage.css";
type Mode = "login" | "signup" | "verify" | "forgot" | "reset";
const titles = {
  login: "Welcome back.",
  signup: "Make yourself at home.",
  verify: "Check your inbox.",
  forgot: "Let’s get you back in.",
  reset: "Choose a new password.",
};
export default function AuthPage({ mode }: { mode: Mode }) {
  const route = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(
    () => route.state?.email || rememberedEmail(),
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [referral, setReferral] = useState(
    () => localStorage.getItem("medico:referral") || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(route.state?.authError || "");
  const [message, setMessage] = useState(
    params.has("signed_out")
      ? "Signed out. Your CVs, workspace and account records are saved. Sign in again to return to your account."
      : "",
  );
  const [ready, setReady] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    setError(route.state?.authError || "");
    setPassword("");
    setConfirm("");
    setMessage(
      route.state?.authError
        ? ""
        : mode === "verify"
          ? "Open the Firebase verification email, then return and check verification. Sign in first if you opened this page on another device."
          : params.has("signed_out")
            ? "Signed out. Your saved data remains on this device."
            : "",
    );
  }, [mode, route.state?.authError]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    let mounted = true;
    const handle = (session: unknown) => {
      if (!mounted) return;
      setReady(Boolean(session));
      if (
        session &&
        !route.state?.authError &&
        (["login", "signup"].includes(mode) ||
          (mode === "verify" &&
            firebaseAccount.auth.currentUser?.emailVerified))
      )
        navigate("/account", { replace: true });
    };
    void backend.auth.getSession().then(({ data }) => handle(data.session));
    const {
      data: { subscription },
    } = backend.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setReady(false);
      else if (event === "PASSWORD_RECOVERY") {
        setReady(Boolean(session));
        navigate("/reset-password", { replace: true });
      } else handle(session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mode, navigate, route.state?.authError]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    await run(async () => {
      const normalized = email.trim().toLowerCase();
      if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
        throw new Error("Enter a valid email address.");
      if (mode === "signup" || mode === "reset") {
        if (password.length < 10)
          throw new Error("Use at least 10 characters for your new password.");
        if (password !== confirm)
          throw new Error("The two passwords do not match.");
      }
      if (mode !== "reset") rememberEmail(normalized, remember);
      if (mode === "login") {
        const r = await backend.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (r.error) throw r.error;
        navigate("/account", { replace: true });
      } else if (mode === "signup") {
        if (referral && !/^[A-F0-9]{12}$/.test(referral.trim().toUpperCase()))
          throw new Error(
            "Referral codes have 12 letters or numbers. Leave this optional field empty if you do not have one.",
          );
        if (referral)
          localStorage.setItem(
            "medico:referral",
            referral.trim().toUpperCase(),
          );
        const r = await backend.auth.signUp({
          email: normalized,
          password,
          options: { emailRedirectTo: authReturnUrl("verify") },
        });
        if (r.error) throw r.error;
        setPassword("");
        setConfirm("");
        navigate(r.data.session ? "/account" : "/verify-email", {
          replace: true,
          state: { email: normalized },
        });
      } else if (mode === "forgot") {
        const r = await backend.auth.resetPasswordForEmail(normalized, {
          redirectTo: authReturnUrl("reset"),
        });
        if (r.error) throw r.error;
        setCooldown(60);
        setMessage(
          "If an account uses this email, a password reset link has been requested. Check your inbox and spam folder. Your saved CVs and credits stay unchanged.",
        );
      } else if (mode === "reset") {
        if (!ready)
          throw new Error(
            "Open a fresh password reset link from your email first.",
          );
        const r = await backend.auth.updateUser({ password });
        if (r.error) throw r.error;
        setPassword("");
        setConfirm("");
        setMessage(
          "Password updated. Your account and saved data are unchanged.",
        );
      } else {
        if (verificationLink)
          await firebaseAccount.verifyEmailLink(verificationLink);
        const status = await firebaseAccount.verificationStatus();
        if (!status.verified)
          throw new Error(
            "Open the verification link in your email, then return and check again.",
          );
        setVerificationLink("");
        navigate("/account", { replace: true });
      }
    });
  }
  return (
    <>
      <NavBar
        compact
        onOpenTools={() => navigate("/", { state: { openTools: true } })}
      />
      <main className="auth-page container">
        <aside className="auth-story">
          <span className="eyebrow">YOUR CAREER, CONNECTED</span>
          <h1>{titles[mode]}</h1>
          <p>
            {mode === "signup"
              ? "One account for your referral credits, unlocked designs and support. Your private drafts stay on your device."
              : mode === "login"
                ? "Sign in once and return to your account. Signing out closes your session and keeps your saved work."
                : mode === "verify"
                  ? "Verify your email to finish setting up your account. You can continue using the free tools while you wait."
                  : mode === "forgot"
                    ? "Reset your password without creating another account or losing your work."
                    : "A fresh password for the same account. Your credits, templates and saved work stay with you."}
          </p>
          <div className="auth-benefits">
            <span>
              <AppIcon name="saved" /> Saved local CVs and workspace
            </span>
            <span>
              <AppIcon name="user" /> Verified referral credits and designs
            </span>
            <span>
              <AppIcon name="settings" /> You control sign-in and backups
            </span>
          </div>
          <Link to="/">
            Back to Medico <AppIcon name="arrow" />
          </Link>
        </aside>
        <section className="auth-card">
          <div className="auth-tabs">
            <Link
              to="/login"
              aria-current={mode === "login" ? "page" : undefined}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              aria-current={mode === "signup" ? "page" : undefined}
            >
              Create account
            </Link>
          </div>
          <h2>
            {mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create your account"
                : mode === "verify"
                  ? "Verify your email"
                  : mode === "forgot"
                    ? "Reset password"
                    : "Set new password"}
          </h2>
          {error && (
            <div role="alert" className="auth-notice auth-notice--error">
              <b>Let’s fix this</b>
              <p>{error}</p>
              {/Verify your email first/.test(error) && (
                <Link to="/verify-email">Open email verification</Link>
              )}
            </div>
          )}
          {message && (
            <div role="status" className="auth-notice">
              <p>{message}</p>
            </div>
          )}
          {mode === "reset" && !ready ? (
            <>
              <p>
                Open the latest reset link from your email to continue securely.
              </p>
              <Link className="btn btn-primary" to="/forgot-password">
                Request a reset link
              </Link>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {mode !== "reset" && (
                <label htmlFor="auth-email">
                  Email address
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {["login", "signup", "reset"].includes(mode) && (
                <>
                  <label htmlFor="auth-password">
                    {mode === "login"
                      ? "Password"
                      : "New password (at least 10 characters)"}
                    <div className="auth-password">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        required
                        minLength={mode === "login" ? 1 : 10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>
                  {mode !== "login" && (
                    <label htmlFor="auth-confirm">
                      Confirm password
                      <input
                        id="auth-confirm"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        minLength={10}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </label>
                  )}
                </>
              )}
              {mode === "signup" && (
                <details>
                  <summary>Have a referral code? (optional)</summary>
                  <label htmlFor="auth-referral">
                    Referral code
                    <input
                      id="auth-referral"
                      maxLength={12}
                      value={referral}
                      onChange={(e) =>
                        setReferral(e.target.value.toUpperCase())
                      }
                    />
                  </label>
                </details>
              )}
              {mode === "verify" && (
                <>
                  <p>
                    Open the verification link in your email, then return here
                    and choose Check verification. You can keep using your free
                    CV tools while verification is pending.
                  </p>
                  <details>
                    <summary>Verification link opened the wrong page?</summary>
                    <p>
                      Copy the original verification link from your email and
                      paste it here. We verify it directly without following its
                      redirect.
                    </p>
                    <label htmlFor="auth-link">
                      Original verification link
                      <input
                        id="auth-link"
                        type="url"
                        autoComplete="off"
                        value={verificationLink}
                        onChange={(e) => setVerificationLink(e.target.value)}
                      />
                    </label>
                  </details>
                </>
              )}
              {["login", "signup"].includes(mode) && (
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember my email on this device
                </label>
              )}
              <button
                className="btn btn-primary auth-submit"
                disabled={busy || (mode === "forgot" && cooldown > 0)}
              >
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "verify"
                        ? "Check verification"
                        : mode === "forgot"
                          ? cooldown
                            ? `Try again in ${cooldown}s`
                            : "Send reset link"
                          : "Save new password"}
              </button>
            </form>
          )}
          {mode === "login" && (
            <Link className="auth-secondary-link" to="/forgot-password">
              Forgot or need to set your password?
            </Link>
          )}
          {mode === "forgot" && message && (
            <Link className="auth-secondary-link" to="/verify-email">
              Reset link opened the wrong page? Verify the original email link.
            </Link>
          )}
          {mode === "verify" && (
            <>
              <button
                className="btn btn-secondary auth-submit"
                disabled={busy || cooldown > 0 || !email.trim()}
                onClick={() =>
                  void run(async () => {
                    const r = await backend.auth.resend({
                      type: "signup",
                      email: email.trim().toLowerCase(),
                      options: { emailRedirectTo: authReturnUrl("verify") },
                    });
                    if (r.error) throw r.error;
                    setCooldown(60);
                    setMessage(
                      "A new verification email was requested. Use the newest link and check your spam folder.",
                    );
                  })
                }
              >
                {cooldown
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
              </button>
              <Link className="auth-secondary-link" to="/forgot-password">
                Already have an account? Reset password
              </Link>
            </>
          )}
          {mode === "reset" && message && (
            <Link className="btn btn-secondary" to="/account">
              Return to your account
            </Link>
          )}
          <p className="auth-footnote">
            Passwords are never saved in plain text. Free drafts stay on this
            device; export a backup in Settings for another device.{" "}
            <a href="mailto:help@choicematrix.in">Need help?</a>
          </p>
        </section>
      </main>
    </>
  );
}
