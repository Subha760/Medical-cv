// Private drafts stay on this device. Account switches restore their own saved workspace.
const keys = [
  "medcv:documents",
  "medcv:coverLetters",
  "medcv:workspace",
  "medcv:interview-position",
];
const allKeys = keys.flatMap((k) => [k, k + ":previous"]);
const activeKey = "medico:data-owner";
function snapshot() {
  return Object.fromEntries(allKeys.map((k) => [k, localStorage.getItem(k)]));
}
export function preserveProfileData() {
  const owner = localStorage.getItem(activeKey);
  if (owner)
    localStorage.setItem(
      "medico:profile-data:" + owner,
      JSON.stringify(snapshot()),
    );
}
export function activateProfileData(userId: string) {
  const owner = localStorage.getItem(activeKey);
  if (owner === userId) return;
  const before = snapshot();
  if (owner) preserveProfileData();
  const raw = localStorage.getItem("medico:profile-data:" + userId);
  let incoming: Record<string, string | null> | null = null;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      allKeys.some((k) => parsed[k] !== null && typeof parsed[k] !== "string")
    )
      throw new Error(
        "Saved account data could not be restored. Export a backup in Settings before continuing.",
      );
    incoming = parsed;
  }
  try {
    // The first account adopts existing offline drafts. A different account gets its own workspace.
    if (incoming || owner)
      for (const k of allKeys) {
        const v = incoming?.[k] ?? null;
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      }
    localStorage.setItem(activeKey, userId);
  } catch (e) {
    for (const [k, v] of Object.entries(before)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
    throw e;
  }
  window.dispatchEvent(new Event("medico:data-restored"));
}
