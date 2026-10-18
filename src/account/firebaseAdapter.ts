import type { SupabaseClient } from "@supabase/supabase-js";
import { updatePassword, type User } from "firebase/auth";
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
    const unsub = firebaseAccount.subscribe((user) => {
      void session(user)
        .then((value) => {
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
        .catch(() => callback("SIGNED_OUT", null));
    });
    return { data: { subscription: { unsubscribe: unsub } } };
  },
  signUp: ({ email, password }: { email: string; password: string }) =>
    guarded(async () => {
      await firebaseAccount.createAccount(email, password);
      return { session: await session(firebaseAccount.auth.currentUser) };
    }),
  signInWithPassword: ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) =>
    guarded(async () => {
      await firebaseAccount.signIn(email, password);
      return { session: await session(firebaseAccount.auth.currentUser) };
    }),
  signOut: () => guarded(() => firebaseAccount.signOut()),
  resetPasswordForEmail: (email: string) =>
    guarded(() => firebaseAccount.requestPasswordReset(email)),
  updateUser: ({ password }: { password: string }) =>
    guarded(async () => {
      const user = firebaseAccount.auth.currentUser;
      if (!user) throw new Error("Sign in first.");
      await updatePassword(user, password);
      return { user };
    }),
  resend: () => guarded(() => firebaseAccount.resendVerification()),
  verifyOtp: () =>
    guarded(async () => {
      throw new Error(
        "Open the Firebase verification link from your email, then check verification here.",
      );
    }),
} as unknown as SupabaseClient["auth"];
