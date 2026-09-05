import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { generateCvPdf, suggestedFileName } from "../pdf/pdfGenerator";
import { CvDocument } from "../types/cv";
import { templateById } from "../data/templateCatalog";
import { checkAtsCompatibility, validateCv } from "../validation/cvChecks";

export default function PreviewPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<CvDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("cv.pdf");

  useEffect(() => {
    if (!cvId) return;
    const found = cvStorage.getById(cvId);
    setDoc(found);
    if (found) {
      const blob = generateCvPdf(found);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setFileName(suggestedFileName(found));
      return () => URL.revokeObjectURL(url);
    }
  }, [cvId]);

  function markFinal() {
    if (!doc) return;
    cvStorage.save(doc, false);
  }

  if (!doc || !pdfUrl) {
    return (
      <>
        <NavBar />
        <main className="container" style={{ padding: "48px 24px" }}>
          <p>{doc ? "Generating your CV…" : "CV not found."}</p>
        </main>
      </>
    );
  }

  const issues = validateCv(doc);
  const template = templateById(doc.templateId);
  const ats = checkAtsCompatibility(doc, template);

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "32px 24px" }}>
        <h1 style={{ font: "var(--text-display)", fontSize: "1.6rem", marginBottom: 16 }}>Preview</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
          <div className="card" style={{ height: "70vh", overflow: "hidden" }}>
            <iframe src={pdfUrl} title="CV preview" width="100%" height="100%" style={{ border: "none" }} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <p className="mono-label" style={{ marginBottom: 4 }}>Estimated ATS compatibility</p>
            <p style={{ font: "var(--text-display)", fontSize: "2.2rem", marginBottom: 12, color: scoreColor(ats.score) }}>
              {ats.score}<span style={{ fontSize: "1rem", color: "var(--color-muted)" }}>/100</span>
            </p>
            {ats.notes.length === 0 ? (
              <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Looks solid for automated parsing.</p>
            ) : (
              <ul style={{ paddingLeft: 18, margin: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>
                {ats.notes.map((note, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>{note}</li>
                ))}
              </ul>
            )}

            {issues.length > 0 && (
              <>
                <div style={{ height: 1, background: "var(--color-line)", margin: "16px 0" }} />
                <p className="mono-label" style={{ marginBottom: 8 }}>
                  {issues.length} item{issues.length > 1 ? "s" : ""} may improve your CV
                </p>
                <ul style={{ paddingLeft: 18, margin: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  {issues.map((issue, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>{issue.message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
          <a className="btn btn-primary" href={pdfUrl} download={fileName} onClick={markFinal}>
            Download PDF
          </a>
          <button className="btn btn-secondary" onClick={() => navigate(`/editor/${cvId}`)}>
            Edit Again
          </button>
          <button className="btn btn-ghost" onClick={() => navigate("/saved")}>
            Done — Go to Saved CVs
          </button>
        </div>
      </main>
    </>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-teal-dark)";
  if (score >= 50) return "var(--color-amber)";
  return "var(--color-error)";
}
