import assert from "node:assert/strict";
import {
  activateProfileData,
  preserveProfileData,
} from "../src/account/profileData";
const values = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  },
  window: { dispatchEvent: () => true },
});
values.set("medcv:documents", "CV A");
values.set("medcv:workspace", "shifts A");
activateProfileData("A");
preserveProfileData();
activateProfileData("B");
assert.equal(values.get("medcv:documents"), undefined);
values.set("medcv:documents", "CV B");
values.set("medcv:workspace", "shifts B");
activateProfileData("A");
assert.equal(values.get("medcv:documents"), "CV A");
assert.equal(values.get("medcv:workspace"), "shifts A");
activateProfileData("B");
assert.equal(values.get("medcv:documents"), "CV B");
values.set("medico:profile-data:C", "{}");
assert.throws(() => activateProfileData("C"));
assert.equal(values.get("medico:data-owner"), "B");
assert.equal(values.get("medcv:documents"), "CV B");
preserveProfileData();
activateProfileData("B");
assert.equal(values.get("medcv:documents"), "CV B");
console.log(
  "Account draft adoption, account switching, logout preservation and corrupt-backup protection passed.",
);
import { authErrorMessage, rememberEmail } from "../src/account/authMessages";
assert.match(
  authErrorMessage({ message: "Invalid login credentials" }),
  /Reset password/,
);
assert.match(authErrorMessage({ code: "otp_expired" }), /Request a new one/);
assert.match(
  authErrorMessage({ message: "Failed to fetch" }),
  /saved data is unchanged/,
);
rememberEmail(" Nurse@Example.test ");
assert.equal(values.get("medico:last-email"), "nurse@example.test");
rememberEmail("ignored", false);
assert.equal(values.get("medico:last-email"), undefined);
console.log(
  "Provider error fallback, verification expiry and remembered-email controls passed.",
);
assert.match(
  authErrorMessage({
    code: "unexpected_failure",
    message: "database connection refused",
  }),
  /temporarily unavailable/,
);
assert.match(
  authErrorMessage({ status: 503, message: "sensitive database detail" }),
  /temporarily unavailable/,
);
assert.match(
  authErrorMessage({
    name: "TimeoutError",
    message: "Account request timed out",
  }),
  /did not respond in time/,
);
console.log(
  "Auth outages and request timeouts produce actionable, non-sensitive errors.",
);
