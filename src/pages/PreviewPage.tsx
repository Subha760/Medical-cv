import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import AdSlot from "../components/AdSlot";
import PdfPages from "../components/PdfPages";
import { downloadPdf } from "../utils/download";
import { cvStorage } from "../storage/cvStorage";
import { generateCvPdf, suggestedFileName } from "../pdf/pdfGenerator";
import { CvDocument } from "../types/cv";
import { resolveCvTemplate } from "../data/customTemplates";
import { checkAtsCompatibility, validateCv } from "../validation/cvChecks";

import { useAccount } from "../account/useAccount";
import { gateway } from "../account/client";
import {
  autoVerificationEnabled,
  completionPayload,
  qualifyingCv,
} from "../account/referrals";
export default function PreviewPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const { account, refresh } = useAccount();
  const [referralMessage, setReferralMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [doc, setDoc] = useState<CvDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("cv.pdf");
  const [exportError, setExportError] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!cvId) return;
    const found = cvStorage.getById(cvId);
    setDoc(found);
    if (found) {
      let blob: Blob;
      try {
        blob = generateCvPdf(found);
      } catch (e) {
        setExportError((e as Error).message);
        return;
      }
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setFileName(suggestedFileName(found));
      return () => URL.revokeObjectURL(url);
    }
  }, [cvId]);

  async function exportPdf() {
    if (!doc || !pdfBlob || exporting) return;
    setExporting(true);
    try {
      cvStorage.save(doc, false);
      await downloadPdf(pdfBlob, fileName);
      setExportError("");
      if (
        account &&
        !account.qualified &&
        !account.frozen &&
        autoVerificationEnabled(account.userId) &&
        qualifyingCv(doc)
      ) {
        try {
          if (!navigator.onLine)
            throw new Error("Offline verification is pending.");
          await gateway("complete", { cv: completionPayload(doc) });
          await refresh();
          window.dispatchEvent(new Event("medico:account-updated"));
          setReferralMessage(
            "Your first CV is verified. Any eligible referral reward was issued automatically.",
          );
        } catch {
          setReferralMessage(
            "Your PDF was downloaded. Referral verification could not finish; retry from Account when online.",
          );
        }
      }
    } catch {
      setExportError(
        "Unable to save or export. Download a backup in Settings and check device storage.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (!doc || !pdfUrl) {
    return (
      <>
        <NavBar />
        <main className="container" style={{ padding: "48px 24px" }}>
          <p>
            {exportError || (doc ? "Generating your CV…" : "CV not found.")}
          </p>
          {exportError && (
            <button
              className="btn btn-primary"
              onClick={() => navigate("/account")}
            >
              Sign in to reload unlocked designs
            </button>
          )}
        </main>
      </>
    );
  }

  const issues = validateCv(doc);
  const template = resolveCvTemplate(doc);
  const ats = checkAtsCompatibility(doc, template);

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "32px 24px" }}>
        <h1
          style={{
            font: "var(--text-display)",
            fontSize: "1.6rem",
            marginBottom: 16,
          }}
        >
          Preview
        </h1>

        {exportError && <p role="alert">{exportError}</p>}
        {referralMessage && (
          <p role="status" className="notice">
            {referralMessage}
          </p>
        )}
        <div className="preview-actions">
          <button
            className="btn btn-primary"
            disabled={exporting}
            onClick={() => void exportPdf()}
          >
            Download PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/template/${cvId}`)}
          >
            Change template
          </button>
        </div>
        <div className="preview-grid">
          <div>{pdfBlob && <PdfPages blob={pdfBlob} />}</div>

          <div className="card" style={{ padding: 20 }}>
            <p className="mono-label" style={{ marginBottom: 4 }}>
              CV structure checklist
            </p>
            <p
              style={{
                font: "var(--text-display)",
                fontSize: "2.2rem",
                marginBottom: 12,
                color: scoreColor(ats.score),
              }}
            >
              {ats.score}
              <span style={{ fontSize: "1rem", color: "var(--color-muted)" }}>
                /100
              </span>
            </p>
            {ats.notes.length === 0 ? (
              <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                The basic structure checks pass. Parsing varies between
                employers.
              </p>
            ) : (
              <ul
                style={{
                  paddingLeft: 18,
                  margin: 0,
                  color: "var(--color-muted)",
                  fontSize: "0.9rem",
                }}
              >
                {ats.notes.map((note, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {note}
                  </li>
                ))}
              </ul>
            )}

            {issues.length > 0 && (
              <>
                <div
                  style={{
                    height: 1,
                    background: "var(--color-line)",
                    margin: "16px 0",
                  }}
                />
                <p className="mono-label" style={{ marginBottom: 8 }}>
                  {issues.length} item{issues.length > 1 ? "s" : ""} may improve
                  your CV
                </p>
                <ul
                  style={{
                    paddingLeft: 18,
                    margin: 0,
                    color: "var(--color-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  {issues.map((issue, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <AdSlot placement="preview" />

        <div
          style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}
        >
          <button
            className="btn btn-primary"
            disabled={exporting}
            onClick={() => void exportPdf()}
          >
            Download PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/editor/${cvId}`)}
          >
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
