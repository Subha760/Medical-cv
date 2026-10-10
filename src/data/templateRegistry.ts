import type { CvTemplate } from "./templateCatalog";
const registry = new Map<string, CvTemplate>();
let owner: string | null = null;
export function setTemplateOwner(userId: string | null, allowed?: string[]) {
  if (owner !== userId) registry.clear();
  owner = userId;
  if (allowed)
    for (const id of registry.keys())
      if (!allowed.includes(id)) registry.delete(id);
}
export const registerPremiumTemplate = (t: CvTemplate, userId?: string) => {
  if (!/^(premium_[a-z_]+_[1-4]|[a-z0-9_-]+_v3)$/.test(t.id))
    throw new Error("Unknown premium design");
  // Only server responses associated with the current account enter the browser registry.
  // Node scripts register design fixtures for PDF validation and preview generation.
  if (typeof window !== "undefined" && (!userId || owner !== userId))
    throw new Error("Sign in to verify this design.");
  registry.set(t.id, t);
};
export const unlockedPremiumById = (id: string) => registry.get(id);
// LocalStorage configuration is never used as proof of an unlock.
