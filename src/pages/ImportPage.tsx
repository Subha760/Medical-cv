import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import NavBar from "../components/NavBar";
import PdfPages from "../components/PdfPages";
import {
  MAX_BYTES,
  Replacement,
  sha256,
  toBase64,
  fromBase64,
  validateDocx,
  editedPdf,
} from "../imports/documents";
import { accountAction, gateway } from "../account/client";
import { useAccount } from "../account/useAccount";
import { downloadFile } from "../utils/download";
import { Link } from "react-router-dom";
export default function ImportPage() {
  const { account, refresh } = useAccount();
  const [bytes, setBytes] = useState<Uint8Array | null>(null),
    [name, setName] = useState(""),
    [kind, setKind] = useState<"pdf" | "docx">("pdf"),
    [hash, setHash] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [session, setSession] = useState(""),
    [final, setFinal] = useState(false),
    [text, setText] = useState(""),
    [originalText, setOriginalText] = useState(""),
    [preview, setPreview] = useState<Blob | null>(null),
    [pages, setPages] = useState(0),
    [replacements, setReplacements] = useState<Replacement[]>([]);
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function load(file: File) {
    await run(async () => {
      setBytes(null);
      setSession("");
      setFinal(false);
      setPreview(null);
      setReplacements([]);
      if (file.size > MAX_BYTES) throw new Error("Maximum file size is 8 MB.");
      const b = new Uint8Array(await file.arrayBuffer());
      let k: "pdf" | "docx";
      if (/\.pdf$/i.test(file.name)) {
        k = "pdf";
        const p = await PDFDocument.load(b);
        if (p.getPageCount() > 20) throw new Error("Maximum 20 PDF pages.");
        setPages(p.getPageCount());
        setPreview(
          new Blob([b as unknown as BlobPart], { type: "application/pdf" }),
        );
      } else if (/\.docx$/i.test(file.name)) {
        k = "docx";
        validateDocx(b);
        const mammoth = await import("mammoth");
        const r = await mammoth.extractRawText({
          arrayBuffer: b.buffer as ArrayBuffer,
        });
        if (r.value.length > 40000)
          throw new Error("Word text exceeds 40,000 characters.");
        setText(r.value);
        setOriginalText(r.value);
      } else
        throw new Error(
          "Choose PDF or Word DOCX. Convert old .doc files to DOCX first.",
        );
      const h = await sha256(b);
      setBytes(b);
      setName(file.name);
      setKind(k);
      setHash(h);
      const existing = account?.edits.find(
        (e) =>
          e.fingerprint === h &&
          e.state !== "refunded" &&
          new Date(e.expires_at) > new Date(),
      );
      if (existing) {
        setSession(existing.id);
        setFinal(existing.state === "finalized");
        const draft = localStorage.getItem("medico:edit:" + existing.id);
        if (draft) {
          const d = JSON.parse(draft);
          setText(d.text || "");
          setReplacements(d.replacements || []);
        }
      }
    });
  }
  async function reserve() {
    await run(async () => {
      const r = await accountAction<{ id: string }>("reserve_edit", {
        fingerprint: hash,
        kind,
      });
      setSession(r.id);
      await refresh();
    });
  }
  async function exportDocument() {
    if (!bytes) return;
    await run(async () => {
      const edit = {
        text: kind === "docx" ? text : "",
        replacements: kind === "pdf" ? replacements : [],
      };
      localStorage.setItem("medico:edit:" + session, JSON.stringify(edit));
      const r = (await gateway("edit", {
        id: session,
        source: toBase64(bytes),
        kind,
        ...edit,
      })) as { data: string; mime: string };
      await downloadFile(
        new Blob([fromBase64(r.data) as unknown as BlobPart], { type: r.mime }),
        name.replace(/\.(pdf|docx)$/i, "") + "-edited." + kind,
      );
      setFinal(true);
      await refresh();
    });
  }
  return (
    <>
      <NavBar />
      <main className="container studio-page">
        <p className="eyebrow">Document studio</p>
        <h1>Your document. A precise new edition.</h1>
        <p>
          Upload a PDF or Word DOCX as your reference. Preview for free. One
          referral credit reserves one edit for 24 hours and one final version.
          Exact retries of that version are free during the session.
        </p>
        <div className="card studio-panel">
          <label>
            Reference document
            <input
              type="file"
              accept=".pdf,.docx"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void load(f);
              }}
            />
          </label>
          <p>
            Up to 8 MB / 20 PDF pages. Password-protected files are unsupported.
            Scanned PDFs can receive text overlays; automatic OCR is not
            included. Word imports preserve text, with a clean rebuilt layout
            rather than exact original formatting.
          </p>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {busy && <p role="status">Processing document…</p>}
        {bytes && (
          <>
            {!session ? (
              <section className="card studio-panel">
                <h2>Ready to edit {name}</h2>
                {account ? (
                  <>
                    <p>
                      {account.credits} credits available. Reserving costs one
                      credit immediately. Check the reference first. Only export
                      sends the file securely to our service; it is processed in
                      memory and not retained.
                    </p>
                    <button
                      className="btn btn-primary"
                      disabled={busy || account.credits < 1}
                      onClick={() => void reserve()}
                    >
                      Use 1 credit to start editing
                    </button>
                  </>
                ) : (
                  <Link className="btn btn-primary" to="/account">
                    Sign in to use a referral credit
                  </Link>
                )}
              </section>
            ) : (
              <section className="card studio-panel">
                <h2>
                  {final ? "Final version locked" : "Edit session active"}
                </h2>
                <p>
                  {final
                    ? "You can download the exact final version again. A different version needs another credit."
                    : "Review carefully before export. The first successful export locks this version."}
                </p>
                {kind === "docx" ? (
                  <label>
                    Editable document text
                    <textarea
                      rows={18}
                      maxLength={40000}
                      value={text}
                      disabled={final}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <p>
                      Coordinates are measured in PDF points from the top left.
                      Cover a text area in white and add its replacement. Use
                      the preview to check alignment.
                    </p>
                    {replacements.map((r, i) => (
                      <fieldset key={i} disabled={final}>
                        <legend>Replacement {i + 1}</legend>
                        <div className="form-grid">
                          {(
                            [
                              "page",
                              "x",
                              "y",
                              "width",
                              "height",
                              "fontSize",
                            ] as const
                          ).map((k) => (
                            <label key={k}>
                              {k}
                              <input
                                type="number"
                                min={k === "page" ? 1 : 0}
                                max={k === "page" ? pages : undefined}
                                value={r[k]}
                                onChange={(e) =>
                                  setReplacements(
                                    replacements.map((v, j) =>
                                      j === i
                                        ? { ...v, [k]: Number(e.target.value) }
                                        : v,
                                    ),
                                  )
                                }
                              />
                            </label>
                          ))}
                          <label>
                            Colour
                            <input
                              type="color"
                              value={r.color}
                              onChange={(e) =>
                                setReplacements(
                                  replacements.map((v, j) =>
                                    j === i
                                      ? { ...v, color: e.target.value }
                                      : v,
                                  ),
                                )
                              }
                            />
                          </label>
                        </div>
                        <label>
                          Replacement text
                          <textarea
                            maxLength={1500}
                            value={r.text}
                            onChange={(e) =>
                              setReplacements(
                                replacements.map((v, j) =>
                                  j === i ? { ...v, text: e.target.value } : v,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={r.cover}
                            onChange={(e) =>
                              setReplacements(
                                replacements.map((v, j) =>
                                  j === i
                                    ? { ...v, cover: e.target.checked }
                                    : v,
                                ),
                              )
                            }
                          />
                          Cover existing text
                        </label>
                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            setReplacements(
                              replacements.filter((_, j) => j !== i),
                            )
                          }
                        >
                          Remove replacement
                        </button>
                      </fieldset>
                    ))}
                    <button
                      className="btn btn-secondary"
                      disabled={final || replacements.length >= 80}
                      onClick={() =>
                        setReplacements([
                          ...replacements,
                          {
                            page: 1,
                            x: 40,
                            y: 40,
                            width: 400,
                            height: 65,
                            fontSize: 12,
                            text: "",
                            cover: true,
                            color: "#142b41",
                          },
                        ])
                      }
                    >
                      Add text replacement
                    </button>{" "}
                    <button
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          setPreview(
                            new Blob(
                              [
                                (await editedPdf(
                                  bytes,
                                  replacements,
                                )) as unknown as BlobPart,
                              ],
                              { type: "application/pdf" },
                            ),
                          );
                        })
                      }
                    >
                      Update preview
                    </button>
                  </>
                )}
                <div className="action-row">
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void exportDocument()}
                  >
                    {final
                      ? "Download final version again"
                      : "Finalize and download"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setSession("");
                      setFinal(false);
                    }}
                  >
                    Start another edit (1 credit)
                  </button>
                </div>
              </section>
            )}
            {kind === "pdf" && preview ? (
              <section className="document-reference">
                <h2>PDF reference / preview</h2>
                <PdfPages blob={preview} />
              </section>
            ) : (
              <section className="card studio-panel">
                <h2>Original Word reference</h2>
                <pre className="word-reference">{originalText}</pre>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
