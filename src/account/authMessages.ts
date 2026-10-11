export function authErrorMessage(
  error: { code?: string; message?: string } | unknown,
) {
  const e = error as { code?: string; message?: string };
  const messages: Record<string, string> = {
    invalid_credentials:
      "Email or password does not match. If you already have an account, try Reset password.",
    email_not_confirmed:
      "Verify your email first. Open the verification email or request another link below.",
    user_already_exists:
      "An account may already use this email. Sign in or reset your password.",
    email_exists:
      "An account may already use this email. Sign in or reset your password.",
    email_address_invalid: "Enter a valid email address.",
    email_address_not_authorized:
      "Email delivery is not available for this address. Contact help@choicematrix.in; your local drafts are safe.",
    over_email_send_rate_limit:
      "Too many emails were requested. Wait a few minutes, then try again.",
    over_request_rate_limit:
      "Too many attempts. Wait a few minutes, then try again.",
    otp_expired:
      "This verification link or code has expired or was already used. Request a new one.",
    weak_password: "Choose a stronger password with at least 10 characters.",
  };
  if (e?.code && messages[e.code]) return messages[e.code];
  if (/invalid login credentials/i.test(e?.message || ""))
    return messages.invalid_credentials;
  if (/email not confirmed/i.test(e?.message || ""))
    return messages.email_not_confirmed;
  if (/fetch|network|offline/i.test(e?.message || ""))
    return "Could not connect. Check your internet connection and try again. Your saved data is unchanged.";
  return e?.message || "Could not complete this request. Please try again.";
}
export function rememberedEmail() {
  try {
    return localStorage.getItem("medico:last-email") || "";
  } catch {
    return "";
  }
}
export function rememberEmail(email: string, remember = true) {
  if (remember)
    localStorage.setItem("medico:last-email", email.trim().toLowerCase());
  else localStorage.removeItem("medico:last-email");
}
export function authReturnUrl(kind: "verify" | "reset") {
  const native = location.hostname === "appassets.androidplatform.net";
  return (
    (native
      ? "https://medico.choicematrix.in/"
      : location.origin + location.pathname) +
    "?auth=" +
    kind
  );
}
