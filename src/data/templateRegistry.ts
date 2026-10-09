import type { CvTemplate } from "./templateCatalog";
const registry = new Map<string, CvTemplate>();
export const registerPremiumTemplate = (t: CvTemplate) => {
  if (!/^premium_[a-z_]+_[1-4]$/.test(t.id))
    throw new Error("Unknown premium design");
  registry.set(t.id, t);
};
export const unlockedPremiumById = (id: string) => registry.get(id);

try {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("medico:premium:")) {
      try {
        registerPremiumTemplate(JSON.parse(localStorage.getItem(k) || ""));
      } catch {}
    }
  }
} catch {}
