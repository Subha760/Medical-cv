import { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import { coverLetterStorage } from "../storage/coverLetterStorage";
import { generateCoverLetterPdf, suggestedCoverLetterFileName } from "../pdf/coverLetterPdfGenerator";
import { COVER_LETTER_TEMPLATES, CoverLetter, newCoverLetter } from "../types/coverLetter";

export default function CoverLetterPage() {
  const idRef = useRef(crypto.randomUUID());
  const [letter, setLetter] = useState<CoverLetter>(() => newCoverLetter(idRef.current));
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function update(patch: Partial<CoverLetter>) {
    setLetter((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => coverLetterStorage.save(next, true), 500);
      return next;
    });
  }

  function generate() {
    coverLetterStorage.save(letter, false);
    const blob = generateCoverLetterPdf(letter);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(blob));
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "32px 24px", maxWidth: 760 }}>
        <h1 style={{ font: "var(--text-display)", fontSize: "1.6rem", marginBottom: 20 }}>Cover Letter</h1>

        <p style={{ color: "var(--color-muted)", marginBottom: 8 }}>Template</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {COVER_LETTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="chip"
              style={{
                borderColor: letter.templateId === t.id ? "var(--color-teal)" : undefined,
                color: letter.templateId === t.id ? "var(--color-teal-dark)" : undefined,
              }}
              onClick={() => update({ templateId: t.id })}
            >
              {t.displayName}
            </button>
          ))}
        </div>

        <div className="field">
          <label>Applicant Name</label>
          <input value={letter.applicantName} onChange={(e) => update({ applicantName: e.target.value })} />
        </div>
        <div className="field">
          <label>Position</label>
          <input value={letter.position} onChange={(e) => update({ position: e.target.value })} />
        </div>
        <div className="field">
          <label>Hospital / Company</label>
          <input value={letter.hospitalOrCompany} onChange={(e) => update({ hospitalOrCompany: e.target.value })} />
        </div>
        <div className="field">
          <label>Hiring Manager (optional)</label>
          <input value={letter.hiringManager} onChange={(e) => update({ hiringManager: e.target.value })} />
        </div>
        <div className="field">
          <label>Opening</label>
          <textarea rows={3} value={letter.opening} onChange={(e) => update({ opening: e.target.value })} />
        </div>
        <div className="field">
          <label>Experience Highlights</label>
          <textarea
            rows={3}
            value={letter.experienceHighlights}
            onChange={(e) => update({ experienceHighlights: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Skills Highlights</label>
          <textarea
            rows={3}
            value={letter.skillsHighlights}
            onChange={(e) => update({ skillsHighlights: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Closing</label>
          <textarea rows={3} value={letter.closing} onChange={(e) => update({ closing: e.target.value })} />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
          <button className="btn btn-primary" onClick={generate}>
            Generate PDF
          </button>
          {pdfUrl && (
            <a className="btn btn-secondary" href={pdfUrl} download={suggestedCoverLetterFileName(letter)}>
              Download
            </a>
          )}
        </div>
      </main>
    </>
  );
}
