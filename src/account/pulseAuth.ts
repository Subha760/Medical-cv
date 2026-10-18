import type { SupabaseClient } from "@supabase/supabase-js";
type OwnerSession = {
  provider: "cloudflare";
  access_token: string;
  expires_at: string;
};
const key = "pulse:owner-session";
const listeners = new Set<(event: string, session: unknown) => void>();
function read() {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "null",
    ) as OwnerSession | null;
    return value?.provider === "cloudflare" &&
      Date.parse(value.expires_at) > Date.now()
      ? value
      : null;
  } catch {
    return null;
  }
}
function emit(event: string) {
  for (const listener of listeners) listener(event, read());
}
export function acceptPulseSession(value: OwnerSession) {
  if (
    value.provider !== "cloudflare" ||
    typeof value.access_token !== "string" ||
    !Number.isFinite(Date.parse(value.expires_at)) ||
    Date.parse(value.expires_at) <= Date.now()
  )
    throw new Error("Fresh owner verification required.");
  localStorage.setItem(key, JSON.stringify(value));
  emit("SIGNED_IN");
}
export const pulseAuthAdapter = {
  getSession: async () => ({ data: { session: read() }, error: null }),
  onAuthStateChange: (fn: (event: string, session: unknown) => void) => {
    listeners.add(fn);
    queueMicrotask(() => fn("INITIAL_SESSION", read()));
    return {
      data: { subscription: { unsubscribe: () => listeners.delete(fn) } },
    };
  },
  signOut: async () => {
    localStorage.removeItem(key);
    emit("SIGNED_OUT");
    return { error: null };
  },
} as unknown as SupabaseClient["auth"];
