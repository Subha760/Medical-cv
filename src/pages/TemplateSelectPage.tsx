import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { AVAILABLE_COLORS, TEMPLATE_CATALOG, templateById } from "../data/templateCatalog";
import { COLOR_HEX } from "../data/colorPalette";

export default function TemplateSelectPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<string>("navy");

  function pickTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedColorId(templateById(templateId).defaultColorId);
  }

  function confirm() {
    if (!cvId || !selectedTemplateId) return;
    const doc = cvStorage.getById(cvId);
    if (!doc) return;
    cvStorage.save({ ...doc, templateId: selectedTemplateId, colorId: selectedColorId }, true);
    navigate(`/editor/${cvId}`);
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "48px 24px" }}>
        <h1 style={{ font: "var(--text-display)", marginBottom: "24px" }}>Choose a template</h1>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {TEMPLATE_CATALOG.map((t) => (
            <button
              key={t.id}
              className="card"
              style={{
                padding: "20px",
                textAlign: "left",
                cursor: "pointer",
                border: t.id === selectedTemplateId ? "1px solid var(--color-teal)" : undefined,
              }}
              onClick={() => pickTemplate(t.id)}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>{t.displayName}</div>
              <div className="mono-label">
                {t.category.replace("_", " ")}
                {t.isAtsFriendly ? " · ATS-friendly" : ""}
              </div>
            </button>
          ))}
        </div>

        {selectedTemplateId && (
          <div className="card" style={{ padding: 20, marginTop: 24, maxWidth: 480 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Accent color</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {AVAILABLE_COLORS.map((colorId) => (
                <button
                  key={colorId}
                  aria-label={colorId}
                  onClick={() => setSelectedColorId(colorId)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: COLOR_HEX[colorId],
                    border:
                      colorId === selectedColorId
                        ? "3px solid var(--color-ink)"
                        : "1px solid var(--color-line-strong)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary" onClick={confirm}>
              Continue
            </button>
          </div>
        )}
      </main>
    </>
  );
}
