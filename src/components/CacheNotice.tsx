import { useState } from "react";
export default function CacheNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("medico:cache-notice") === "yes";
    } catch {
      return false;
    }
  });
  return (
    <>
      {!dismissed && (
        <aside className="cache-notice" aria-label="Storage and cache notice">
          <p>
            We cache app files for offline use and save CV drafts and workspace
            data on this device. Optional sign-in stores a session. Clearing
            browser storage removes local drafts.{" "}
            <a href={import.meta.env.BASE_URL + "privacy.html"}>
              Privacy & storage details
            </a>
          </p>
          <button
            onClick={() => {
              try {
                localStorage.setItem("medico:cache-notice", "yes");
              } catch {}
              setDismissed(true);
            }}
          >
            Got it
          </button>
        </aside>
      )}
      <footer className="legal-footer">
        {[
          "about",
          "privacy",
          "terms",
          "contact",
          "account-deletion",
          "guides",
        ].map((page) => (
          <a href={import.meta.env.BASE_URL + page + ".html"} key={page}>
            {page.replace(/-/g, " ")}
          </a>
        ))}
        <span>© {new Date().getFullYear()} ChoiceMatrix · MedCV</span>
      </footer>
    </>
  );
}
