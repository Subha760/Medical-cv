import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  ActionCodeOperation,
  applyActionCode,
  browserLocalPersistence,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  initializeAuth,
  onIdTokenChanged,
  parseActionCodeURL,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  verifyPasswordResetCode,
} from "firebase/auth";

// Project identifiers are public configuration. Never put Admin credentials here.
export function createFirebaseAccountAuth(
  config: FirebaseOptions,
  ownerConsole = false,
) {
  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  )
    throw new Error(
      "The Firebase project must be configured before account access is enabled.",
    );
  const name = ownerConsole ? "medico-pulse" : "medico";
  const existing = getApps().find((app) => app.name === name);
  if (existing && existing.options.projectId !== config.projectId)
    throw new Error(
      "The Firebase account connection does not match this project.",
    );
  const app = existing || initializeApp(config, name);
  // Each app gets its own persistent session. Signing out preserves local CV data.
  const auth = existing
    ? getAuth(app)
    : initializeAuth(app, { persistence: browserLocalPersistence });
  const continueUrl = (mode: "verify" | "reset") =>
    `https://medico.choicematrix.in/#/${mode === "verify" ? "verify-email" : "login"}?email_return=${mode}`;
  const email = (value: string) => value.trim().toLowerCase();
  function actionLink(
    value: string,
    operation:
      | typeof ActionCodeOperation.VERIFY_EMAIL
      | typeof ActionCodeOperation.PASSWORD_RESET,
  ) {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== config.authDomain ||
      url.pathname !== "/__/auth/action"
    )
      throw new Error("Use the original Firebase email link for this app.");
    const action = parseActionCodeURL(value);
    if (
      !action ||
      action.apiKey !== config.apiKey ||
      action.operation !== operation
    )
      throw new Error(
        "This email link does not match the requested account action.",
      );
    return action.code;
  }
  return {
    auth,
    async createAccount(address: string, password: string) {
      if (password.length < 10)
        throw new Error("Use at least 10 characters for your password.");
      await auth.authStateReady();
      const result = await createUserWithEmailAndPassword(
        auth,
        email(address),
        password,
      );
      // The user stays unverified if delivery fails. Never grant credits or owner access here.
      await sendEmailVerification(result.user, { url: continueUrl("verify") });
      return {
        userId: result.user.uid,
        email: result.user.email,
        verified: result.user.emailVerified,
      };
    },
    async signIn(address: string, password: string) {
      await auth.authStateReady();
      const { user } = await signInWithEmailAndPassword(
        auth,
        email(address),
        password,
      );
      return {
        userId: user.uid,
        email: user.email,
        verified: user.emailVerified,
      };
    },
    async verificationStatus() {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) return { signedIn: false, verified: false };
      await reload(user);
      await user.getIdToken(true);
      return {
        signedIn: true,
        userId: user.uid,
        email: user.email,
        verified: user.emailVerified,
      };
    },
    async resendVerification() {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user)
        throw new Error(
          "Sign in with your email and password before requesting another verification email.",
        );
      if (user.emailVerified) return;
      await sendEmailVerification(user, { url: continueUrl("verify") });
    },
    async verifyEmailLink(value: string) {
      const code = actionLink(value, ActionCodeOperation.VERIFY_EMAIL);
      const info = await checkActionCode(auth, code);
      if (
        auth.currentUser &&
        email(info.data.email || "") !== email(auth.currentUser.email || "")
      )
        throw new Error(
          "This link belongs to a different account. Sign out before verifying it.",
        );
      await applyActionCode(auth, code);
      if (auth.currentUser) {
        await reload(auth.currentUser);
        await auth.currentUser.getIdToken(true);
      }
      return {
        email: info.data.email,
        signedIn: Boolean(auth.currentUser?.emailVerified),
      };
    },
    async requestPasswordReset(address: string) {
      await sendPasswordResetEmail(auth, email(address), {
        url: continueUrl("reset"),
      });
    },
    async resetPassword(value: string, password: string) {
      if (password.length < 10)
        throw new Error("Use at least 10 characters for your new password.");
      const code = actionLink(value, ActionCodeOperation.PASSWORD_RESET);
      const address = await verifyPasswordResetCode(auth, code);
      await confirmPasswordReset(auth, code, password);
      return { email: address };
    },
    async verifiedIdToken() {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user?.emailVerified)
        throw new Error("Verify your email before using account services.");
      // API handlers must verify the real Firebase ID token and email_verified claim themselves.
      return user.getIdToken();
    },
    subscribe: (listener: Parameters<typeof onIdTokenChanged>[1]) =>
      onIdTokenChanged(auth, listener),
    signOut: () => signOut(auth),
  };
}
