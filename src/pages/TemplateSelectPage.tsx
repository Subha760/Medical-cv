import { useMemo, useState } from "react";
import TemplatePreview from '../components/TemplatePreview';
import { createId } from '../utils/id';
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedColorId, setSelectedColorId] = useState("navy");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEMPLATE_CATALOG.filter((template) => {
      const categoryMatches = category === "ALL" || template.category === category;
      const searchMatches = !needle || template.displayName.toLowerCase().includes(needle);
      return categoryMatches && searchMatches && (!photoOnly || template.supportsPhoto);
    });
  }, [category, query, photoOnly]);

  function pickTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedColorId(templateById(templateId).defaultColorId);
  }

  function confirm() {
    if (!selectedTemplateId) return;
    const activeId = cvId || createId();
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
            <p className="selection-step">Choose a design · {TEMPLATE_CATALOG.length} templates</p>
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
            <label className="photo-filter"><input type="checkbox" checked={photoOnly} onChange={(event)=>{setPhotoOnly(event.target.checked);setVisibleCount(24)}}/> Photo templates</label>
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
              <TemplatePreview id={template.id} color={template.id === selectedTemplateId ? selectedColorId : template.defaultColorId}/>
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
          <div className="card template-confirm" role="region" aria-label="Selected template">
            <div className="template-confirm__info">
              <p style={{ fontWeight: 700 }}>{templateById(selectedTemplateId).displayName}</p>
              <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>Choose an accent colour, then continue.</p>
            </div>
            <div className="template-confirm__colors">
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
            <button className="btn btn-primary template-confirm__action" onClick={confirm}>Use this template</button>
          </div>
        )}
      </main>
    </>
  );
}
