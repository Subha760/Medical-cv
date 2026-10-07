import { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import { createId } from "../utils/id";
import { downloadPdf } from "../utils/download";
import { coverLetterStorage } from "../storage/coverLetterStorage";
import {
  generateCoverLetterPdf,
  suggestedCoverLetterFileName,
} from "../pdf/coverLetterPdfGenerator";
import {
  COVER_LETTER_TEMPLATES,
  CoverLetter,
  newCoverLetter,
} from "../types/coverLetter";

export default function CoverLetterPage() {
  const idRef = useRef(createId());
  const [letter, setLetter] = useState<CoverLetter>(
    () => coverLetterStorage.latestDraft() || newCoverLetter(idRef.current),
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(() => coverLetterStorage.listSaved());
  const pending = useRef<CoverLetter | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (pending.current) {
        try {
          coverLetterStorage.save(pending.current, true);
          pending.current = null;
        } catch {
          /* Preserve current records if storage is unavailable. */
        }
      }
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  function persist(next: CoverLetter, draft: boolean) {
    try {
      coverLetterStorage.save(next, draft);
      setError("");
      return true;
    } catch {
      setError(
        "Unable to save. Download a backup in Settings and check device storage.",
      );
      return false;
    }
  }
  function update(patch: Partial<CoverLetter>) {
    setLetter((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      pending.current = next;
      saveTimer.current = window.setTimeout(() => {
        if (persist(next, true)) pending.current = null;
      }, 500);
      return next;
    });
  }

  function generate() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (!persist(letter, false)) return;
    pending.current = null;
    setSaved(coverLetterStorage.listSaved());
    const blob = generateCoverLetterPdf(letter);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(blob));
  }

  return (
    <>
      <NavBar />
      <main
        className="container"
        style={{ padding: "32px 24px", maxWidth: 760 }}
      >
        <h1
          style={{
            font: "var(--text-display)",
            fontSize: "1.6rem",
            marginBottom: 20,
          }}
        >
          Cover Letter
        </h1>

        {error && <p role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="saved-letter">Open saved letter</label>
          <select
            id="saved-letter"
            value=""
            onChange={(e) => {
              const selected = coverLetterStorage.getById(e.target.value);
              if (selected) {
                if (saveTimer.current) window.clearTimeout(saveTimer.current);
                pending.current = null;
                setLetter(selected);
                setPdfUrl(null);
              }
            }}
          >
            <option value="">Choose a saved letter</option>
            {saved.map((l) => (
              <option key={l.id} value={l.id}>
                {l.applicantName} · {l.position || "Application"}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
            if (pending.current && !persist(pending.current, true)) return;
            pending.current = null;
            setLetter(newCoverLetter(createId()));
            setPdfUrl(null);
          }}
        >
          New letter
        </button>
        <p style={{ color: "var(--color-muted)", marginBottom: 8 }}>Template</p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {COVER_LETTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="chip"
              style={{
                borderColor:
                  letter.templateId === t.id ? "var(--color-teal)" : undefined,
                color:
                  letter.templateId === t.id
                    ? "var(--color-teal-dark)"
                    : undefined,
              }}
              onClick={() => update({ templateId: t.id })}
            >
              {t.displayName}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="letter-applicant-name">Applicant Name</label>
          <input
            id="letter-applicant-name"
            value={letter.applicantName}
            onChange={(e) => update({ applicantName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-position">Position</label>
          <input
            id="letter-position"
            value={letter.position}
            onChange={(e) => update({ position: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-hospital-company">Hospital / Company</label>
          <input
            id="letter-hospital-company"
            value={letter.hospitalOrCompany}
            onChange={(e) => update({ hospitalOrCompany: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-hiring-manager-optional">
            Hiring Manager (optional)
          </label>
          <input
            id="letter-hiring-manager-optional"
            value={letter.hiringManager}
            onChange={(e) => update({ hiringManager: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-opening">Opening</label>
          <textarea
            id="letter-opening"
            rows={3}
            value={letter.opening}
            onChange={(e) => update({ opening: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-experience-highlights">
            Experience Highlights
          </label>
          <textarea
            id="letter-experience-highlights"
            rows={3}
            value={letter.experienceHighlights}
            onChange={(e) => update({ experienceHighlights: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-skills-highlights">Skills Highlights</label>
          <textarea
            id="letter-skills-highlights"
            rows={3}
            value={letter.skillsHighlights}
            onChange={(e) => update({ skillsHighlights: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="letter-closing">Closing</label>
          <textarea
            id="letter-closing"
            rows={3}
            value={letter.closing}
            onChange={(e) => update({ closing: e.target.value })}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <button className="btn btn-primary" onClick={generate}>
            Generate PDF
          </button>
          {pdfUrl && (
            <button
              className="btn btn-secondary"
              onClick={() =>
                void downloadPdf(
                  generateCoverLetterPdf(letter),
                  suggestedCoverLetterFileName(letter),
                ).catch(() =>
                  setError("Unable to export. Check device storage."),
                )
              }
            >
              Download
            </button>
          )}
        </div>
      </main>
    </>
  );
}
