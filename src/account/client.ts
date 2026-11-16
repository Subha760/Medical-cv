import { pulseAuthAdapter } from "./pulseAuth";
import { firebaseAuthAdapter, firebaseAccount } from "./firebaseAdapter";
import { accountFetch } from "./request";
const isPulse = location.pathname.includes("/pulse");
export const authReturnKind =
  new URLSearchParams(location.search).get("auth") ||
  new URLSearchParams(location.hash.slice(1)).get("type");
const callback = new URLSearchParams(location.hash.slice(1));
export const authReturnError =
  callback.has("error") || callback.has("error_code")
    ? {
        code: callback.get("error_code") || "email_callback_invalid",
        message:
          "Email verification did not complete. Request a fresh verification link.",
      }
    : null;
export const backend = {
  auth: isPulse ? pulseAuthAdapter : firebaseAuthAdapter,
};
export type Account = {
  emailVerified?: boolean;
  userId: string;
  code: string;
  credits: number;
  owner: boolean;
  qualified: boolean;
  frozen: boolean;
  unlocks: string[];
  ledger: { delta: number; reason: string; created_at: string }[];
  tickets: { id: string; subject: string; reply: string; status: string }[];
  edits: {
    id: string;
    fingerprint: string;
    kind: string;
    state: string;
    expires_at: string;
  }[];
};
export async function accountAction<T = Account>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  return firebaseAction<T>(action, payload);
}
export async function gateway(
  action: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return firebaseAction(action, payload);
}

async function firebaseAction<T>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  let token: string;
  if (isPulse) {
    const {
      data: { session },
    } = await pulseAuthAdapter.getSession();
    if (!session) throw new Error("Verify your owner Gmail first.");
    token = session.access_token;
  } else {
    await firebaseAccount.auth.authStateReady();
    const user = firebaseAccount.auth.currentUser;
    if (!user) throw new Error("Sign in first.");
    token = await user.getIdToken();
  }
  const res = await accountFetch("https://medico.choicematrix.in/api/account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = await res.json().catch(() => {
    throw new Error(
      "Couldn’t load your account details. Try again in a moment.",
    );
  });
  if (!res.ok)
    throw new Error(result.error || "Unable to complete account request.");
  return result as T;
}
