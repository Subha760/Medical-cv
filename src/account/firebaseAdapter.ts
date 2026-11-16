import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "firebase/auth";
import { createFirebaseAccountAuth } from "./firebaseAuth";
import { firebaseConfig } from "./firebaseConfig";
export const firebaseAccount = createFirebaseAccountAuth(firebaseConfig);
async function session(user: User | null) {
  if (!user) return null;
  const token = await user.getIdTokenResult();
  return {
    access_token: token.token,
    token_type: "bearer",
    expires_at: Math.floor(Date.parse(token.expirationTime) / 1000),
    user: {
      id: user.uid,
      email: user.email,
      email_confirmed_at: user.emailVerified ? "verified" : undefined,
    },
  };
}
const guarded = async <T>(fn: () => Promise<T>) => {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    return { data: null, error };
  }
};
export const firebaseAuthAdapter = {
  getSession: () =>
    guarded(async () => {
      await firebaseAccount.auth.authStateReady();
      return { session: await session(firebaseAccount.auth.currentUser) };
    }),
  onAuthStateChange: (callback: (event: string, value: unknown) => void) => {
    let first = true,
      previous: string | null = null;
    let revision = 0;
    const unsub = firebaseAccount.subscribe((user) => {
      const current = ++revision;
      void session(user)
        .then((value) => {
          if (current !== revision) return;
          const event = first
            ? "INITIAL_SESSION"
            : !user
              ? "SIGNED_OUT"
              : previous === user.uid
                ? "TOKEN_REFRESHED"
                : "SIGNED_IN";
          first = false;
          previous = user?.uid || null;
          callback(event, value);
        })
        .catch(() => {
          if (current === revision) callback("TOKEN_REFRESHED", null);
        });
    });
    return {
      data: {
        subscription: {
          unsubscribe() {
            ++revision;
            unsub();
          },
        },
      },
    };
  },
  signOut: () => guarded(() => firebaseAccount.signOut()),
} as unknown as SupabaseClient["auth"];
