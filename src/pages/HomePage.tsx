import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import AdSlot from "../components/AdSlot";
import { PROFESSION_LABELS, Profession } from "../types/cv";
import "./HomePage.css";

const SHORTCUT_PROFESSIONS: Profession[] = [
  "DOCTOR",
  "NURSE",
  "NURSING_STUDENT",
  "MEDICAL_STUDENT",
  "PHARMACIST",
  "HEALTHCARE_ASSISTANT",
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <NavBar />
      <main>
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy">
              <p className="mono-label hero__eyebrow">No account · No upload · No server</p>
              <h1 className="hero__headline">
                Your CV,
                <br />
                charted.
              </h1>
              <p className="hero__sub">
                Build a professional Doctor or Nurse CV right in your browser. Every
                field, every entry, every export stays on this device — nothing is
                ever sent anywhere.
              </p>
              <div className="hero__ctas">
                <button className="btn btn-primary" onClick={() => navigate("/new")}>
                  Create New CV
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/saved")}>
                  My Saved CVs
                </button>
                <button className="btn btn-secondary" onClick={() => navigate("/cover-letter")}>
                  Cover Letter
                </button>
              </div>

              <div className="hero__shortcuts">
                {SHORTCUT_PROFESSIONS.map((p) => (
                  <button
                    key={p}
                    className="chip"
                    onClick={() => navigate("/new", { state: { profession: p } })}
                  >
                    {PROFESSION_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="hero__chart" aria-hidden="true">
              <div className="chart-card chart-card--back" />
              <div className="chart-card chart-card--front">
                <div className="chart-card__tab">FILE</div>
                <div className="chart-card__name">Dr. — Cardiology</div>
                <div className="chart-card__rule" />
                <div className="chart-card__line" style={{ width: "88%" }} />
                <div className="chart-card__line" style={{ width: "72%" }} />
                <div className="chart-card__line" style={{ width: "80%" }} />
                <div className="chart-card__rule" />
                <div className="chart-card__line" style={{ width: "60%" }} />
                <div className="chart-card__line" style={{ width: "94%" }} />
                <div className="chart-card__line" style={{ width: "68%" }} />
              </div>
            </div>
          </div>
        </section>

        <div className="container"><AdSlot placement="home" /></div>

        <section className="trust-strip">
          <div className="container trust-strip__grid">
            <div className="trust-item">
              <span className="mono-label">01</span>
              <p>Stored only on this device — in your browser, not a server.</p>
            </div>
            <div className="trust-item">
              <span className="mono-label">02</span>
              <p>No account, no login, no email required to start.</p>
            </div>
            <div className="trust-item">
              <span className="mono-label">03</span>
              <p>PDFs are generated locally and never pass through us.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
