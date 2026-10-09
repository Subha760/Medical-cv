import { createClient } from "@supabase/supabase-js";
export const backendUrl = "https://jfweexvfnkotusyajkst.supabase.co";
// A publishable key identifies the project. All authority is enforced by verified sessions and database roles.
const isPulse = location.pathname.includes("/pulse");
export const backend = createClient(
  backendUrl,
  "sb_publishable_bqCwiBot6gKENGqoIkMDgw_kvyqiu3l",
  {
    auth: {
      storageKey: isPulse ? "pulse:auth" : "medico:auth",
      storage: isPulse ? sessionStorage : localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isPulse,
    },
  },
);
export type Account = {
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
  const { data, error } = await backend.rpc("medcv_account", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data as T;
}
export async function gateway(
  action: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const {
    data: { session },
  } = await backend.auth.getSession();
  if (!session) throw new Error("Sign in first.");
  const res = await fetch(`${backendUrl}/functions/v1/medcv-gateway`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await res.json();
  if (!res.ok)
    throw new Error(result.error || "Request could not be completed");
  return result;
}
