import { useCallback, useEffect, useRef, useState } from "react";
import { Account, accountAction, backend } from "./client";
import {
  registerPremiumTemplate,
  unlockedPremiumById,
  setTemplateOwner,
} from "../data/templateRegistry";
import type { CvTemplate } from "../data/templateCatalog";
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const request = useRef(0);
  const current = useRef<Account | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async (quiet = false) => {
    const version = ++request.current;
    if (!quiet) setBusy(true);
    try {
      const {
        data: { session },
      } = await backend.auth.getSession();
      if (!session) {
        if (mounted.current && version === request.current) {
          current.current = null;
          setTemplateOwner(null);
          setAccount(null);
        }
        return;
      }
      const code = localStorage.getItem("medico:referral") || "";
      const a = await accountAction("enroll", { code });
      if (!mounted.current || version !== request.current) return;
      setTemplateOwner(a.userId, a.frozen ? [] : a.unlocks);
      for (const id of a.frozen ? [] : a.unlocks) {
        if (unlockedPremiumById(id)) continue;
        const t = await accountAction<CvTemplate>("template", {
          templateId: id,
        });
        if (!mounted.current || version !== request.current) return;
        if (t.id !== id) throw new Error("Invalid template response.");
        registerPremiumTemplate(t, a.userId);
      }
      if (!mounted.current || version !== request.current) return;
      current.current = a;
      setAccount(a);
      setError("");
    } catch (e) {
      if (!mounted.current || version !== request.current) return;
      // An intermittent background failure must not make a signed-in account disappear.
      if (!quiet) setError((e as Error).message);
    } finally {
      if (mounted.current && version === request.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const {
      data: { subscription },
    } = backend.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ++request.current;
        current.current = null;
        setTemplateOwner(null);
        setAccount(null);
        setBusy(false);
      } else
        setTimeout(() => {
          if (mounted.current) void refresh(true);
        }, 0);
    });
    const sync = () => {
      if (
        current.current &&
        document.visibilityState === "visible" &&
        navigator.onLine
      )
        void refresh(true);
    };
    const interval = setInterval(sync, 30000);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    window.addEventListener("medico:account-updated", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      mounted.current = false;
      ++request.current;
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("medico:account-updated", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [refresh]);
  return { account, error, busy, refresh, setError };
}
