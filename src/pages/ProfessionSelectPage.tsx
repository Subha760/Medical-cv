import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { newCvDocument, PROFESSION_LABELS, Profession } from "../types/cv";

const ALL_PROFESSIONS = Object.keys(PROFESSION_LABELS) as Profession[];

export default function ProfessionSelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as { profession?: Profession } | null)?.profession;

  function choose(profession: Profession) {
    const id = crypto.randomUUID();
    const doc = newCvDocument(id, profession);
    cvStorage.save(doc, true);
    navigate(`/template/${id}`);
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "48px 24px" }}>
        <h1 style={{ font: "var(--text-display)", marginBottom: "8px" }}>
          What type of healthcare professional are you?
        </h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "32px" }}>
          This shapes which fields and templates we suggest — you can change it later.
        </p>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {ALL_PROFESSIONS.map((p) => (
            <button
              key={p}
              className="card"
              style={{
                padding: "20px",
                textAlign: "left",
                cursor: "pointer",
                border: p === preselected ? "1px solid var(--color-teal)" : undefined,
              }}
              onClick={() => choose(p)}
            >
              {PROFESSION_LABELS[p]}
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
