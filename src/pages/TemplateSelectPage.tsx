import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { newCvDocument } from "../types/cv";
import { AVAILABLE_COLORS, TEMPLATE_CATALOG, templateById } from "../data/templateCatalog";
import { COLOR_HEX } from "../data/colorPalette";

const CATEGORIES = ["ALL", ...new Set(TEMPLATE_CATALOG.map((template) => template.category))];

export default function TemplateSelectPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATE_CATALOG[0]?.id || "");
  const [selectedColorId, setSelectedColorId] = useState("navy");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);

  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEMPLATE_CATALOG.filter((template) => {
      const categoryMatches = category === "ALL" || template.category === category;
      const searchMatches = !needle || template.displayName.toLowerCase().includes(needle);
      return categoryMatches && searchMatches;
    });
  }, [category, query]);

  function pickTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedColorId(templateById(templateId).defaultColorId);
  }

  function confirm() {
    if (!selectedTemplateId) return;
    const activeId = cvId || (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `cv-${Date.now()}`);
    const doc = cvStorage.getById(activeId) || newCvDocument(activeId, "NURSE");
    cvStorage.save({ ...doc, templateId: selectedTemplateId, colorId: selectedColorId }, true);
    navigate("/editor/" + activeId);
  }

  return (
    <>
      <NavBar />
      <main className="container selection-page template-page">
        <div className="template-header">
          <div>
            <p className="selection-step">Step 2 of 3 · {TEMPLATE_CATALOG.length} designs</p>
            <h1 className="selection-title">Choose a CV template</h1>
            <p className="selection-subtitle">Every design is editable, print-ready and built for healthcare applications.</p>
          </div>
          <div className="template-tools">
            <input
              aria-label="Search templates"
              placeholder="Search templates"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }}
            />
            <select
              aria-label="Template category"
              value={category}
              onChange={(event) => { setCategory(event.target.value); setVisibleCount(24); }}
            >
              {CATEGORIES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="template-grid">
          {templates.slice(0, visibleCount).map((template) => (
            <button
              key={template.id}
              data-layout={template.layout}
              className={`card template-card ${template.id === selectedTemplateId ? "is-selected" : ""}`}
              onClick={() => pickTemplate(template.id)}
            >
              <div className="template-sheet" style={{ color: COLOR_HEX[template.defaultColorId] }}>
                <span className="template-avatar">{template.supportsPhoto ? "●" : ""}</span>
                <span className="template-name-line" />
                <span className="template-copy-line" />
                <span className="template-copy-line short" />
                <span className="template-section-line" />
                <span className="template-copy-line" />
              </div>
              <strong>{template.displayName}</strong>
              <span className="mono-label">{template.layout} · {template.density}</span>
              <span className="template-badges">
                {template.isAtsFriendly && <span>ATS</span>}
                {template.supportsPhoto && <span>Photo</span>}
              </span>
            </button>
          ))}
        </div>

        {!templates.length && <div className="card" style={{ padding: 28 }}>No template matches your search.</div>}
        {visibleCount < templates.length && (
          <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setVisibleCount((count) => count + 24)}>
            Show more templates
          </button>
        )}

        {selectedTemplateId && (
          <div className="card template-confirm">
            <div>
              <p style={{ fontWeight: 700 }}>{templateById(selectedTemplateId).displayName}</p>
              <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>Choose an accent colour, then continue.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVAILABLE_COLORS.map((colorId) => (
                <button
                  key={colorId}
                  aria-label={colorId}
                  onClick={() => setSelectedColorId(colorId)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", background: COLOR_HEX[colorId], cursor: "pointer",
                    border: colorId === selectedColorId ? "3px solid var(--color-ink)" : "1px solid var(--color-line-strong)",
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary" onClick={confirm}>Use this template</button>
          </div>
        )}
      </main>
    </>
  );
}
