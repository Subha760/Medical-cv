import { useState } from "react";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { coverLetterStorage } from "../storage/coverLetterStorage";

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  function deleteAll() {
    cvStorage.removeAll();
    coverLetterStorage.removeAll();
    setConfirming(false);
    setCleared(true);
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "48px 24px", maxWidth: 640 }}>
        <h1 style={{ font: "var(--text-display)", fontSize: "1.8rem", marginBottom: 24 }}>Settings</h1>

        <section className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ font: "var(--text-heading)", marginBottom: 12 }}>Your Privacy</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
            <dt className="mono-label">Storage</dt>
            <dd style={{ margin: 0 }}>This browser's local storage only</dd>
            <dt className="mono-label">Cloud upload</dt>
            <dd style={{ margin: 0 }}>None</dd>
            <dt className="mono-label">Server database</dt>
            <dd style={{ margin: 0 }}>None</dd>
            <dt className="mono-label">PDF generation</dt>
            <dd style={{ margin: 0 }}>Entirely in your browser</dd>
          </dl>
        </section>

        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ font: "var(--text-heading)", marginBottom: 12 }}>Delete All Saved Data</h2>
          <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>
            This permanently deletes every CV and cover letter stored in this browser. This can't be undone.
          </p>
          {!confirming ? (
            <button className="btn btn-secondary" onClick={() => setConfirming(true)}>
              Delete All Saved Data
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={deleteAll} style={{ background: "var(--color-error)" }}>
                Confirm Delete
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          )}
          {cleared && <p style={{ marginTop: 12, color: "var(--color-teal-dark)" }}>All saved CVs and cover letters deleted.</p>}
        </section>
      </main>
    </>
  );
}
