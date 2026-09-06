import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { newCvDocument, PROFESSION_LABELS, Profession } from "../types/cv";

const ALL_PROFESSIONS = Object.keys(PROFESSION_LABELS) as Profession[];
const PROFESSION_ICONS = ["✚", "♡", "N", "M", "Rx", "H", "D", "C"];

function createId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `cv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ProfessionSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as { profession?: Profession } | null)?.profession;

  function choose(profession: Profession) {
    const id = createId();
    const doc = newCvDocument(id, profession);
    cvStorage.save(doc, true);
    navigate(`/template/${id}`);
  }

  return (
    <>
      <NavBar />
      <main className="container selection-page">
        <p className="selection-step">Step 1 of 3</p>
        <h1 className="selection-title">
          What type of healthcare professional are you?
        </h1>
        <p className="selection-subtitle">
          This shapes which fields and templates we suggest — you can change it later.
        </p>
        <div className="profession-select-grid">
          {ALL_PROFESSIONS.map((p, index) => (
            <button
              key={p}
              className={`card profession-select-card ${p === preselected ? "is-selected" : ""}`}
              onClick={() => choose(p)}
            >
              <span>{PROFESSION_ICONS[index] || "✚"}</span>
              <strong>{PROFESSION_LABELS[p]}</strong>
              <small>Tailored sections and templates</small>
              <i>→</i>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
