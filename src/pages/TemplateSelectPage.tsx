import { PREMIUM_CATALOG } from "../data/premiumCatalog";
import { registerPremiumTemplate } from "../data/templateRegistry";
import { accountAction } from "../account/client";
import { useAccount } from "../account/useAccount";
import { Link } from "react-router-dom";
import type { CvTemplate } from "../data/templateCatalog";
import { useMemo, useState } from "react";
import TemplatePreview from "../components/TemplatePreview";
import { createId } from "../utils/id";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { newCvDocument, Profession, PROFESSION_LABELS } from "../types/cv";
import {
  CATEGORY_INFO,
  AVAILABLE_COLORS,
  TEMPLATE_CATALOG,
  templateById,
} from "../data/templateCatalog";
import { COLOR_HEX } from "../data/colorPalette";

const CATEGORIES = [
  "ALL",
  ...new Set(TEMPLATE_CATALOG.map((template) => template.category)),
];

export default function TemplateSelectPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const { account, refresh } = useAccount();
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [unlocking, setUnlocking] = useState(false);
  const [profession, setProfession] = useState<Profession>("NURSE");
  const [error, setError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedColorId, setSelectedColorId] = useState("navy");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(64);

  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEMPLATE_CATALOG.filter((template) => {
      const categoryMatches =
        category === "ALL" || template.category === category;
      const searchMatches =
        !needle || template.displayName.toLowerCase().includes(needle);
      return (
        categoryMatches &&
        searchMatches &&
        (!photoOnly || template.supportsPhoto)
      );
    });
  }, [category, query, photoOnly]);

  function confirmUnlock(name: string) {
    return window.confirm(
      `Use one referral credit to unlock ${name} permanently?`,
    );
  }
  function pickTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setSelectedColorId(templateById(templateId).defaultColorId);
  }

  function confirm() {
    if (!selectedTemplateId) return;
    const activeId = cvId || createId();
    const doc =
      cvStorage.getById(activeId) || newCvDocument(activeId, profession);
    try {
      cvStorage.save(
        {
          ...doc,
          templateId: selectedTemplateId,
          colorId: selectedColorId,
          sectionOrder: cvId
            ? doc.sectionOrder
            : templateById(selectedTemplateId).recommendedOrder,
        },
        true,
      );
    } catch {
      setError(
        "Unable to save. Open Settings to back up or recover your data and check device storage.",
      );
      return;
    }
    navigate("/editor/" + activeId);
  }

  return (
    <>
      <NavBar />
      <main className="container selection-page template-page">
        <div className="template-header">
          <div>
            <p className="selection-step">
              Choose a design · {TEMPLATE_CATALOG.length} templates
            </p>
            <h1 className="selection-title">Choose a CV template</h1>
            <p className="selection-subtitle">
              Every design is editable, print-ready and built for healthcare
              applications.
            </p>
          </div>
          <div className="template-tools">
            <input
              aria-label="Search templates"
              placeholder="Search templates"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(64);
              }}
            />
            <select
              aria-label="Template category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setVisibleCount(64);
              }}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All categories"
                    : CATEGORY_INFO[item as keyof typeof CATEGORY_INFO].label}
                </option>
              ))}
            </select>
            <label className="photo-filter">
              <input
                type="checkbox"
                checked={photoOnly}
                onChange={(event) => {
                  setPhotoOnly(event.target.checked);
                  setVisibleCount(64);
                }}
              />{" "}
              Photo templates
            </label>
          </div>
        </div>

        {error && <p role="alert">{error}</p>}
        {!cvId && (
          <div className="field" style={{ maxWidth: 400 }}>
            <label htmlFor="new-profession">Your profession</label>
            <select
              id="new-profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value as Profession)}
            >
              {Object.entries(PROFESSION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="tier-selector">
          <button
            className={tier === "free" ? "active" : ""}
            onClick={() => setTier("free")}
          >
            Free · 64 designs
          </button>
          <button
            className={tier === "premium" ? "active" : ""}
            onClick={() => setTier("premium")}
          >
            Premium · 32 designs
          </button>
          <Link to="/design">Design a custom template →</Link>
          <Link to="/import">Import your own PDF / Word →</Link>
        </div>
        <div className="category-pills">
          {CATEGORIES.map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item === "ALL"
                ? "All designs"
                : CATEGORY_INFO[item as keyof typeof CATEGORY_INFO].label}{" "}
              <small>
                {tier === "free"
                  ? item === "ALL"
                    ? TEMPLATE_CATALOG.length
                    : TEMPLATE_CATALOG.filter((t) => t.category === item).length
                  : item === "ALL"
                    ? 32
                    : 4}
              </small>
            </button>
          ))}
        </div>
        {tier === "premium" && (
          <>
            <p>
              One verified referral credit unlocks one original premium design
              permanently.{" "}
              {account
                ? `${account.credits} credits available.`
                : "Sign in to unlock."}{" "}
              Original designs informed by professional resume conventions; no
              third-party paid templates are redistributed.
            </p>
            <div className="template-grid">
              {PREMIUM_CATALOG.filter(
                (t) =>
                  (category === "ALL" || t.category === category) &&
                  (!query ||
                    t.name.toLowerCase().includes(query.toLowerCase())) &&
                  !photoOnly,
              ).map((t) => (
                <button
                  className="card template-card premium-card"
                  disabled={unlocking}
                  key={t.id}
                  onClick={async () => {
                    if (!account) {
                      navigate("/account");
                      return;
                    }
                    if (
                      !account.unlocks.includes(t.id) &&
                      !confirmUnlock(t.name)
                    )
                      return;
                    setUnlocking(true);
                    setError("");
                    try {
                      const config = await accountAction<CvTemplate>("unlock", {
                        templateId: t.id,
                      });
                      registerPremiumTemplate(config);
                      localStorage.setItem(
                        "medico:premium:" + t.id,
                        JSON.stringify(config),
                      );
                      pickTemplate(t.id);
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setUnlocking(false);
                    }
                  }}
                >
                  <img
                    loading="lazy"
                    src={import.meta.env.BASE_URL + t.preview}
                    alt={t.name + " preview"}
                  />
                  <small>Premium · {CATEGORY_INFO[t.category].label}</small>
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                  <span className="premium-badge">
                    {account?.unlocks.includes(t.id)
                      ? "Unlocked · choose design"
                      : "Unlock · 1 referral credit"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {tier === "free" && (
          <div className="template-grid">
            {templates.slice(0, visibleCount).map((template) => (
              <button
                key={template.id}
                data-layout={template.layout}
                className={`card template-card ${template.id === selectedTemplateId ? "is-selected" : ""}`}
                onClick={() => pickTemplate(template.id)}
              >
                <TemplatePreview
                  id={template.id}
                  color={
                    template.id === selectedTemplateId
                      ? selectedColorId
                      : template.defaultColorId
                  }
                />
                <small className="template-category">
                  {CATEGORY_INFO[template.category].label}
                </small>
                <strong>{template.displayName}</strong>
                <span className="template-description">
                  {template.description}
                </span>
                <span className="mono-label">
                  {template.layout} · {template.density}
                </span>
                <span className="template-badges">
                  {template.isAtsFriendly && <span>ATS</span>}
                  {template.supportsPhoto && <span>Photo</span>}
                </span>
              </button>
            ))}
          </div>
        )}

        {tier === "free" && !templates.length && (
          <div className="card" style={{ padding: 28 }}>
            No template matches your search.
          </div>
        )}
        {tier === "free" && visibleCount < templates.length && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: 20 }}
            onClick={() => setVisibleCount((count) => count + 24)}
          >
            Show more templates
          </button>
        )}

        {selectedTemplateId && (
          <div
            className="card template-confirm"
            role="region"
            aria-label="Selected template"
          >
            <div className="template-confirm__info">
              <p style={{ fontWeight: 700 }}>
                {templateById(selectedTemplateId).displayName}
              </p>
              <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>
                Choose an accent colour, then continue.
              </p>
            </div>
            <div className="template-confirm__colors">
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
                    cursor: "pointer",
                    border:
                      colorId === selectedColorId
                        ? "3px solid var(--color-ink)"
                        : "1px solid var(--color-line-strong)",
                  }}
                />
              ))}
            </div>
            <button
              className="btn btn-primary template-confirm__action"
              onClick={confirm}
            >
              Use this template
            </button>
          </div>
        )}
      </main>
    </>
  );
}
