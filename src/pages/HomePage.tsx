import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import CvInterview from "../components/CvInterview";
import Robot from "../components/Robot";
import NavBar from "../components/NavBar";
import AdSlot from "../components/AdSlot";
import {
  CATEGORY_INFO,
  TEMPLATE_CATALOG,
  type TemplateCategory,
} from "../data/templateCatalog";
import { COLOR_HEX } from "../data/colorPalette";
import "./HomePage.css";

const ACCENTS = ["teal", "blue", "purple", "burgundy", "navy"];
const DARK_ACCENTS: Record<string, string> = {
  teal: "#7cd9cf",
  blue: "#96b3ff",
  purple: "#c2a0ec",
  burgundy: "#f0a4b1",
  navy: "#9ec9ed",
};
const LAYOUTS = ["Classic", "Sidebar", "Timeline"];
const CATEGORY_KEYS = Object.keys(CATEGORY_INFO) as TemplateCategory[];
function savedAccent() {
  try {
    const saved = localStorage.getItem("medcv:home-accent");
    if (saved && ACCENTS.includes(saved)) return saved;
  } catch {
    /* Preview works without storage. */
  }
  return "teal";
}
function PaperPreview({ variant = 0 }: { variant?: number }) {
  return (
    <div className={`home-paper home-paper--${variant % 3}`} aria-hidden="true">
      <div className="home-paper__side">
        <span>JN</span>
        <i />
        <i />
        <i />
      </div>
      <div className="home-paper__body">
        <div className="home-paper__name">Jamie Nurse</div>
        <div className="home-paper__role">REGISTERED NURSE</div>
        <div className="home-paper__rule" />
        {[
          "PROFILE",
          "CLINICAL EXPERIENCE",
          "EDUCATION",
          "SKILLS & REGISTRATION",
        ].map((title) => (
          <div className="home-paper__section" key={title}>
            <b>{title}</b>
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
    </div>
  );
}
export default function HomePage() {
  const navigate = useNavigate();
  const [miraOpen, setMiraOpen] = useState(false);
  const [accent, setAccent] = useState(savedAccent);
  const [layout, setLayout] = useState(0);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const panel = dialog.current;
    if (miraOpen && panel && !panel.open) panel.showModal();
    if (!miraOpen && panel?.open) panel.close();
  }, [miraOpen]);
  const categories = CATEGORY_KEYS.filter((key) =>
    `${CATEGORY_INFO[key].label} ${CATEGORY_INFO[key].description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ).filter((node) => node.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  function openTemplates(category?: TemplateCategory) {
    navigate(
      `/new?${new URLSearchParams({ color: accent, ...(category ? { category } : {}) })}`,
    );
  }
  function chooseAccent(value: string) {
    setAccent(value);
    try {
      localStorage.setItem("medcv:home-accent", value);
    } catch {
      /* Session preview remains available. */
    }
  }
  const appearance = {
    "--home-accent": COLOR_HEX[accent],
    "--home-accent-dark": DARK_ACCENTS[accent],
    "--home-paper-accent": COLOR_HEX[accent],
  } as CSSProperties;
  return (
    <>
      <NavBar />
      <main className="home home-refresh" style={appearance}>
        <section className="home-hero">
          <div className="container home-hero__grid">
            <div className="home-hero__copy">
              <span className="home-eyebrow">
                <span aria-hidden="true">✦</span> YOUR CAREER, BEAUTIFULLY
                ORGANIZED
              </span>
              <h1>
                Care for others.
                <br />
                Make room for <em>your future.</em>
              </h1>
              <p>
                A polished CV. A calmer shift. A little help along the way. Your
                personal workspace for nursing and healthcare careers.
              </p>
              <div className="home-hero__actions">
                <button
                  className="home-button home-button--primary"
                  onClick={() => openTemplates()}
                >
                  Create my CV <span aria-hidden="true">→</span>
                </button>
                <button
                  className="home-button home-button--secondary"
                  onClick={() => setMiraOpen(true)}
                >
                  Build with Mira <span aria-hidden="true">✦</span>
                </button>
              </div>
              <div className="home-proof">
                <span>✓ Free templates</span>
                <span>✓ Local drafts</span>
                <span>✓ Offline ready</span>
              </div>
              <button
                className="home-text-link"
                onClick={() => navigate("/workspace")}
              >
                Already on your next shift? Open daily workspace{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="home-studio">
              <div className="home-studio__bar">
                <span>
                  <i /> CV DESIGN STUDIO
                </span>
                <span>Sample preview</span>
              </div>
              <div className="home-studio__canvas">
                <PaperPreview variant={layout} />
                <span className="home-studio__badge">✦ Make it yours</span>
              </div>
              <div className="home-studio__controls">
                <div
                  className="home-layouts"
                  role="group"
                  aria-label="Preview layout"
                >
                  {LAYOUTS.map((name, index) => (
                    <button
                      key={name}
                      aria-pressed={layout === index}
                      onClick={() => setLayout(index)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div
                  className="home-swatches"
                  role="group"
                  aria-label="CV accent colour"
                >
                  {ACCENTS.map((name) => (
                    <button
                      key={name}
                      aria-label={`${name} accent`}
                      aria-pressed={accent === name}
                      style={{ background: COLOR_HEX[name] }}
                      onClick={() => chooseAccent(name)}
                    >
                      {accent === name ? "✓" : ""}
                    </button>
                  ))}
                </div>
                <button
                  className="home-text-link"
                  onClick={() =>
                    openTemplates(
                      (
                        [
                          "ATS_PROFESSIONAL",
                          "MODERN_MEDICAL",
                          "CLINICAL",
                        ] as TemplateCategory[]
                      )[layout],
                    )
                  }
                >
                  Find layouts like this <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="container home-metrics" aria-label="CV features">
          <div>
            <b>64</b>
            <span>free designs</span>
          </div>
          <div>
            <b>8</b>
            <span>career categories</span>
          </div>
          <div>
            <b>15</b>
            <span>offline assistants</span>
          </div>
          <div>
            <b>PDF</b>
            <span>ready to share</span>
          </div>
        </section>
        <section
          className="container home-categories"
          aria-labelledby="home-categories-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">A DESIGN FOR EVERY NEXT STEP</span>
              <h2 id="home-categories-title">Find your signature style.</h2>
              <p>
                Distinct layouts, organized around your career. Every category
                includes eight free templates.
              </p>
            </div>
            <button
              className="home-button home-button--secondary"
              onClick={() => openTemplates()}
            >
              Browse all templates <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="home-category-toolbar">
            <label htmlFor="home-category-search">Explore categories</label>
            <input
              id="home-category-search"
              type="search"
              placeholder="Search nursing, student, minimal…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span role="status">{categories.length} categories</span>
          </div>
          <div className="home-category-grid">
            {categories.map((key) => {
              const info = CATEGORY_INFO[key];
              const index = CATEGORY_KEYS.indexOf(key);
              return (
                <button
                  className={`home-category home-category--${index % 4}`}
                  key={key}
                  onClick={() => openTemplates(key)}
                  aria-label={`Explore ${info.label} templates`}
                >
                  <div className="home-category__preview">
                    <PaperPreview variant={index} />
                    <span className="home-category__icon" aria-hidden="true">
                      {info.icon}
                    </span>
                  </div>
                  <div className="home-category__copy">
                    <span className="home-category__count">
                      {
                        TEMPLATE_CATALOG.filter(
                          (template) => template.category === key,
                        ).length
                      }{" "}
                      FREE DESIGNS
                    </span>
                    <h3>{info.label}</h3>
                    <p>{info.description}</p>
                    <span className="home-category__link">
                      Explore collection <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {categories.length === 0 && (
            <div className="home-empty">
              <p>
                No categories match “{query}”. Try nursing, academic or student.
              </p>
              <button
                className="home-button home-button--secondary"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            </div>
          )}
        </section>
        <section
          className="container home-shortcuts"
          aria-labelledby="home-tools-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">MORE THAN A CV</span>
              <h2 id="home-tools-title">Your everyday toolkit.</h2>
              <p>Start something new, or pick up where you left off.</p>
            </div>
          </div>
          <div className="home-tools-grid">
            {[
              {
                icon: "◷",
                title: "Daily workspace",
                text: "Plan shifts, track credentials and study with offline assistants.",
                path: "/workspace",
              },
              {
                icon: "◇",
                title: "Customize a design",
                text: "Adjust fonts, spacing, sections and colours in your design studio.",
                path: "/design",
              },
              {
                icon: "↑",
                title: "Import a document",
                text: "Bring your PDF or Word document into Document Studio.",
                path: "/import",
              },
              {
                icon: "▤",
                title: "Saved CVs",
                text: "Revisit your local drafts and keep your next application moving.",
                path: "/saved",
              },
            ].map((tool) => (
              <button
                className="home-tool"
                key={tool.path}
                aria-label={tool.title}
                onClick={() => navigate(tool.path)}
              >
                <span className="home-tool__icon" aria-hidden="true">
                  {tool.icon}
                </span>
                <h3>{tool.title}</h3>
                <p>{tool.text}</p>
                <span className="home-tool__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
        <div className="container ad-wrap">
          <AdSlot placement="home" />
        </div>
        <section className="container home-final">
          <span className="home-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            One small step.
            <br />A stronger first impression.
          </h2>
          <p>
            Choose your design, tell your story, and export a professional CV.
          </p>
          <button
            className="home-button home-button--primary"
            onClick={() => openTemplates()}
          >
            Start building for free <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
      <div className="mira-dock">
        <span className="mira-dock__hint">Your CV guide</span>
        <button
          className="mira-launcher"
          aria-label="Open Mira CV guide"
          aria-haspopup="dialog"
          aria-expanded={miraOpen}
          aria-controls="mira-panel"
          onClick={() => setMiraOpen(true)}
        >
          <Robot />
          <span>
            Mira <span aria-hidden="true">✦</span>
          </span>
        </button>
      </div>
      <dialog
        ref={dialog}
        id="mira-panel"
        className="mira-panel"
        aria-labelledby="mira-panel-title"
        onKeyDown={keepDialogFocus}
        onCancel={() => setMiraOpen(false)}
        onClose={() => setMiraOpen(false)}
      >
        <header className="mira-panel__header">
          <div>
            <b id="mira-panel-title">Mira · Your CV guide</b>
            <small>Private, guided questions · works offline</small>
          </div>
          <button
            autoFocus
            aria-label="Close Mira"
            onClick={() => setMiraOpen(false)}
          >
            ×
          </button>
        </header>
        <CvInterview />
      </dialog>
    </>
  );
}
