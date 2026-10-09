import { useEffect, useState } from "react";
import { Account, accountAction, backend } from "./client";
import { registerPremiumTemplate } from "../data/templateRegistry";
import type { CvTemplate } from "../data/templateCatalog";
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const {
        data: { session },
      } = await backend.auth.getSession();
      if (!session) {
        setAccount(null);
        return;
      }
      const code = localStorage.getItem("medico:referral") || "";
      const a = await accountAction("enroll", { code });
      setAccount(a);
      for (const id of a.unlocks) {
        const t = await accountAction<CvTemplate>("template", {
          templateId: id,
        });
        registerPremiumTemplate(t);
        try {
          localStorage.setItem("medico:premium:" + id, JSON.stringify(t));
        } catch {}
      }
      setError("");
    } catch (e) {
      setAccount(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    const {
      data: { subscription },
    } = backend.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => subscription.unsubscribe();
  }, []);
  return { account, error, busy, refresh, setError };
}
