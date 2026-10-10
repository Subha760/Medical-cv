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
import AppIcon from "../components/AppIcon";
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsDialog = useRef<HTMLDialogElement>(null);
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
  useEffect(() => {
    const panel = toolsDialog.current;
    if (toolsOpen && panel && !panel.open) panel.showModal();
    if (!toolsOpen && panel?.open) panel.close();
  }, [toolsOpen]);
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
      <NavBar compact onOpenTools={() => setToolsOpen(true)} />
      <main className="home home-refresh home-desk" style={appearance}>
        <section className="home-hero">
          <div className="container home-hero__grid">
            <div className="home-hero__copy">
              <span className="home-eyebrow">FOR YOUR NEXT CHAPTER</span>
              <h1>
                Your career.
                <br />
                <em>In good hands.</em>
              </h1>
              <p>
                A professional CV and a practical workspace for life in
                healthcare. Make time for what comes next.
              </p>
              <div className="home-hero__actions">
                <button
                  className="home-button home-button--primary"
                  onClick={() => openTemplates()}
                >
                  <AppIcon name="document" /> Create my CV{" "}
                  <AppIcon name="arrow" />
                </button>
              </div>
              <div className="home-proof">
                <span>10 free designs</span>
                <span>Private local drafts</span>
                <span>PDF export</span>
              </div>
            </div>
            <div
              className="home-studio desk-stack"
              onPointerMove={(event) => {
                if (
                  event.pointerType !== "mouse" ||
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches
                )
                  return;
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty(
                  "--tilt-x",
                  `${(0.5 - (event.clientY - rect.top) / rect.height) * 8}deg`,
                );
                event.currentTarget.style.setProperty(
                  "--tilt-y",
                  `${((event.clientX - rect.left) / rect.width - 0.5) * 8}deg`,
                );
              }}
              onPointerLeave={(event) => {
                event.currentTarget.style.setProperty("--tilt-x", "0deg");
                event.currentTarget.style.setProperty("--tilt-y", "0deg");
              }}
            >
              <div className="desk-stack__back" aria-hidden="true" />
              <div className="desk-stack__front">
                <PaperPreview variant={layout} />
              </div>
              <span className="desk-stack__caption">
                Sample CV · Your story goes here
              </span>
            </div>
          </div>
        </section>
        <section
          className="container home-categories"
          aria-labelledby="home-categories-title"
        >
          <div className="home-section-heading">
            <div>
              <span className="home-kicker">THE COLLECTION</span>
              <h2 id="home-categories-title">A place to start.</h2>
              <p>Ten free designs. More to unlock with verified referrals.</p>
            </div>
          </div>
          <div className="home-category-toolbar">
            <AppIcon name="search" />
            <label htmlFor="home-category-search" className="sr-only">
              Explore categories
            </label>
            <input
              id="home-category-search"
              type="search"
              placeholder="Find your category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span role="status">{categories.length} categories</span>
          </div>
          <div className="home-category-grid">
            {categories.map((key, index) => {
              const info = CATEGORY_INFO[key];
              const icons = [
                "document",
                "clinical",
                "grid",
                "book",
                "briefcase",
                "edit",
                "globe",
                "graduate",
              ] as const;
              return (
                <button
                  className="home-category"
                  key={key}
                  onClick={() => openTemplates(key)}
                  aria-label={`Explore ${info.label} templates`}
                >
                  <span className="desk-category-icon">
                    <AppIcon name={icons[index % icons.length]} size={24} />
                  </span>
                  <div className="home-category__copy">
                    <h3>{info.label}</h3>
                    <p>{info.description}</p>
                    <span className="home-category__count">
                      {
                        TEMPLATE_CATALOG.filter((t) => t.category === key)
                          .length
                      }{" "}
                      free · explore designs
                    </span>
                  </div>
                  <AppIcon name="arrow" />
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
        <div className="container ad-wrap">
          <AdSlot placement="home" />
        </div>
      </main>
      <dialog
        ref={toolsDialog}
        className="desk-tools"
        aria-labelledby="desk-tools-title"
        onKeyDown={keepDialogFocus}
        onCancel={() => setToolsOpen(false)}
        onClose={() => setToolsOpen(false)}
      >
        <header>
          <div>
            <span className="home-kicker">YOUR WORKSPACE</span>
            <h2 id="desk-tools-title">Tools & appearance</h2>
          </div>
          <button
            autoFocus
            aria-label="Close tools"
            onClick={() => setToolsOpen(false)}
          >
            <AppIcon name="close" />
          </button>
        </header>
        <div className="desk-tool-grid">
          {[
            {
              icon: "calendar",
              title: "Daily workspace",
              text: "Shifts, study and credentials",
              path: "/workspace",
            },
            {
              icon: "saved",
              title: "Saved CVs",
              text: "Return to your local drafts",
              path: "/saved",
            },
            {
              icon: "edit",
              title: "Customize a design",
              text: "Typography, sections and spacing",
              path: "/design",
            },
            {
              icon: "upload",
              title: "Import a document",
              text: "PDF and Word document studio",
              path: "/import",
            },
            {
              icon: "mail",
              title: "Cover letter",
              text: "Prepare your next application",
              path: "/cover-letter",
            },
            {
              icon: "user",
              title: "Account & credits",
              text: "Verified referrals and unlocks",
              path: "/account",
            },
            {
              icon: "settings",
              title: "Settings",
              text: "Privacy, backups and preferences",
              path: "/settings",
            },
          ].map((tool) => (
            <button key={tool.path} onClick={() => navigate(tool.path)}>
              <AppIcon
                name={tool.icon as Parameters<typeof AppIcon>[0]["name"]}
              />
              <span>
                <b>{tool.title}</b>
                <small>{tool.text}</small>
              </span>
              <AppIcon name="arrow" />
            </button>
          ))}
        </div>
        <details>
          <summary>Make it yours</summary>
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
          <p>Your colour is used when you start a CV.</p>
        </details>
      </dialog>
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
