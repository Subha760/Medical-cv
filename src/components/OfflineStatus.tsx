import { useEffect, useState } from "react";
export default function OfflineStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    let active = true;
    if (
      import.meta.env.PROD &&
      "serviceWorker" in navigator &&
      !window.MedCVAndroid
    ) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then((reg) => {
          const ready = () => {
            if (active && reg.waiting) setWorker(reg.waiting);
          };
          ready();
          reg.addEventListener("updatefound", () =>
            reg.installing?.addEventListener("statechange", ready),
          );
        })
        .catch(() => {
          /* app remains usable if installation is unavailable */
        });
    }
    const hadController = Boolean(navigator.serviceWorker?.controller);
    const change = () => {
      if (hadController) window.location.reload();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", change);
    return () => {
      active = false;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      navigator.serviceWorker?.removeEventListener("controllerchange", change);
    };
  }, []);
  return (
    <>
      {offline && (
        <div className="offline-banner" role="status">
          Offline · Your saved work and local tools remain available.
        </div>
      )}
      {worker && (
        <div className="offline-banner" role="status">
          An app update is ready. Finish editing first.{" "}
          <button
            className="btn btn-secondary"
            onClick={() => worker.postMessage("SKIP_WAITING")}
          >
            Update app
          </button>
        </div>
      )}
    </>
  );
}
