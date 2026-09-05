import { useEffect } from "react";

declare global {
  interface Window {
    __medcvMonetagLoaded?: boolean;
  }
}

export default function AdSlot({ placement }: { placement: "home" | "editor" | "preview" }) {
  const scriptUrl = import.meta.env.VITE_MONETAG_SCRIPT_URL as string | undefined;
  const zoneId = import.meta.env.VITE_MONETAG_ZONE_ID as string | undefined;

  useEffect(() => {
    if (!scriptUrl || window.__medcvMonetagLoaded) return;
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.referrerPolicy = "no-referrer-when-downgrade";
    script.dataset.monetagZone = zoneId || "";
    script.onerror = () => {
      window.__medcvMonetagLoaded = false;
    };
    document.head.appendChild(script);
    window.__medcvMonetagLoaded = true;
    return () => {
      script.remove();
      window.__medcvMonetagLoaded = false;
    };
  }, [scriptUrl, zoneId]);

  return (
    <aside
      className={"ad-slot ad-slot--" + placement}
      aria-label="Advertisement"
      data-zone-id={zoneId || undefined}
    >
      <span>Advertisement</span>
      {!scriptUrl && <small>Monetag placement ready</small>}
    </aside>
  );
}
