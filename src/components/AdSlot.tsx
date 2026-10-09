import { useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    __tcfapi?: (
      command: string,
      version: number,
      callback: (data: any, success: boolean) => void,
    ) => void;
  }
}
export default function AdSlot({
  placement,
}: {
  placement: "home" | "editor" | "preview";
}) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT_ID || "";
  const slot = import.meta.env.VITE_ADSENSE_SLOT_ID || "";
  const [allowed, setAllowed] = useState(false);
  const pushed = useRef(false);
  const configured =
    import.meta.env.VITE_ADSENSE_APPROVED === "true" &&
    import.meta.env.VITE_GOOGLE_CERTIFIED_CMP === "true" &&
    !localStorage.getItem("medico:referral") &&
    /^ca-pub-\d{16}$/.test(client) &&
    /^\d+$/.test(slot) &&
    !window.MedCVAndroid &&
    placement === "home";
  useEffect(() => {
    if (!configured || !window.__tcfapi) return;
    window.__tcfapi("addEventListener", 2, (data, success) => {
      if (
        success &&
        ["tcloaded", "useractioncomplete"].includes(data.eventStatus)
      ) {
        setAllowed(
          data.gdprApplies === false ||
            Boolean(
              data.purpose?.consents?.[1] && data.vendor?.consents?.[755],
            ),
        );
      }
    });
  }, [configured]);
  useEffect(() => {
    if (!configured || !allowed || pushed.current) return;
    const push = () => {
      if (!pushed.current) {
        try {
          (window.adsbygoogle ||= []).push({});
          pushed.current = true;
        } catch {
          /* ad blockers must not interrupt the app */
        }
      }
    };
    let script = document.querySelector<HTMLScriptElement>("#medcv-adsense");
    if (!script) {
      script = document.createElement("script");
      script.id = "medcv-adsense";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      document.head.appendChild(script);
    }
    script.addEventListener("load", push);
    if (window.adsbygoogle) push();
    return () => script?.removeEventListener("load", push);
  }, [configured, allowed, client]);
  if (!configured || !allowed) return null;
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <small>Advertisement</small>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
