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

import { accountAction } from "../account/client";
import { isFreeTemplate, type CvTemplate } from "../data/templateCatalog";
import { validCustom } from "../data/customTemplates";
import { registerPremiumTemplate } from "../data/templateRegistry";
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
  const { account, refresh, busy } = useAccount();
  const [referralMessage, setReferralMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [doc, setDoc] = useState<CvDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("cv.pdf");
  const [exportError, setExportError] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  function requiresUnlock(value: CvDocument) {
    return (
      !isFreeTemplate(value.templateId) &&
      !(
        value.customTemplate?.id === value.templateId &&
        validCustom(value.customTemplate)
      )
    );
  }
  async function verifyDesign(value: CvDocument) {
    if (!requiresUnlock(value)) return;
    if (
      !account ||
      account.frozen ||
      !account.unlocks.includes(value.templateId)
    )
      throw new Error(
        "This design is locked. Choose one of the ten free templates or unlock this design in Templates.",
      );
    const config = await accountAction<CvTemplate>("template", {
      templateId: value.templateId,
    });
    if (config?.id !== value.templateId)
      throw new Error("Invalid template response.");
    registerPremiumTemplate(config, account.userId);
  }
  const unlockKey = account?.unlocks.join(",") || "";
  useEffect(() => {
    if (!cvId) return;
    let cancelled = false;
    let url: string | null = null;
    const found = cvStorage.getById(cvId);
    setDoc(found);
    setPdfUrl(null);
    setPdfBlob(null);
    setExportError("");
    if (found && !(busy && requiresUnlock(found))) {
      void (async () => {
        try {
          await verifyDesign(found);
          if (cancelled) return;
          const blob = generateCvPdf(found);
          url = URL.createObjectURL(blob);
          setPdfBlob(blob);
          setPdfUrl(url);
          setFileName(suggestedFileName(found));
        } catch (e) {
          if (!cancelled) setExportError((e as Error).message);
        }
      })();
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [cvId, account?.userId, account?.frozen, unlockKey, busy]);

  async function exportPdf() {
    if (!doc || !pdfBlob || exporting) return;
    setExporting(true);
    try {
      await verifyDesign(doc);
      const finalBlob = requiresUnlock(doc) ? generateCvPdf(doc) : pdfBlob;
      cvStorage.save(doc, false);
      await downloadPdf(finalBlob, fileName);
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
    } catch (e) {
      setExportError(
        (e as Error).message ||
          "Unable to save or export. Check device storage.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (
    !doc ||
    !pdfUrl ||
    (requiresUnlock(doc) &&
      (!account || account.frozen || !account.unlocks.includes(doc.templateId)))
  ) {
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
              onClick={() => navigate(`/template/${cvId}`)}
            >
              Choose a free or unlocked design
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
