import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import AdSlot from "../components/AdSlot";
import { PROFESSION_LABELS, Profession } from "../types/cv";
import "./HomePage.css";

const SHORTCUT_PROFESSIONS: Profession[] = ["DOCTOR", "NURSE", "NURSING_STUDENT", "MEDICAL_STUDENT", "PHARMACIST", "HEALTHCARE_ASSISTANT"];

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <NavBar />
      <main className="home">
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy">
              <div className="hero__eyebrow"><span>✦</span> Built for healthcare careers</div>
              <h1>Build a medical CV that gets you noticed.</h1>
              <p className="hero__sub">Create an ATS-ready CV with guided sections, professional healthcare templates and private, offline AI writing help.</p>
              <div className="hero__ctas">
                <button className="btn btn-primary hero__primary" onClick={() => navigate("/new")}>Create my CV <span aria-hidden="true">→</span></button>
                <button className="btn btn-secondary" onClick={() => navigate("/saved")}>Open saved CV</button>
              </div>
              <div className="hero__proof"><span>✓ No sign-up</span><span>✓ Works offline</span><span>✓ Private on your device</span></div>
            </div>
            <div className="product-preview" aria-label="MedCV template preview">
              <div className="product-preview__toolbar"><i /><i /><i /><span>Live CV preview</span></div>
              <div className="product-preview__body">
                <div className="cv-mini">
                  <div className="cv-mini__header"><div className="cv-mini__avatar">AM</div><div><b>Alex Morgan, RN</b><small>Registered Nurse</small></div></div>
                  <div className="cv-mini__rule" />
                  <strong>PROFESSIONAL SUMMARY</strong><p /><p className="short" />
                  <strong>CLINICAL EXPERIENCE</strong><div className="cv-mini__row"><i /><div><p /><p className="short" /></div></div>
                  <strong>CORE SKILLS</strong><div className="cv-mini__chips"><span>Patient care</span><span>Critical care</span><span>EMR</span></div>
                </div>
                <div className="ai-float"><span>✦</span><div><b>CV Autopilot</b><small>Summary improved locally</small></div><em>✓</em></div>
              </div>
            </div>
          </div>
        </section>
        <section className="stats"><div className="container stats__grid"><div><b>126+</b><span>CV templates</span></div><div><b>100%</b><span>private & local</span></div><div><b>ATS</b><span>friendly layouts</span></div><div><b>PDF</b><span>instant export</span></div></div></section>
        <section className="section container">
          <div className="section__heading"><span className="section__kicker">Choose your path</span><h2>Made for every healthcare role</h2><p>Start with the right sections and wording for your profession.</p></div>
          <div className="profession-grid">
            {SHORTCUT_PROFESSIONS.map((profession, index) => <button key={profession} className="profession-card" onClick={() => navigate("/new", { state: { profession } })}><span className="profession-card__icon">{["✚","♡","N","M","Rx","H"][index]}</span><strong>{PROFESSION_LABELS[profession]}</strong><small>View tailored templates</small><i>→</i></button>)}
          </div>
        </section>
        <section className="how"><div className="container"><div className="section__heading"><span className="section__kicker">Simple and guided</span><h2>Your strongest CV in three steps</h2></div><div className="steps"><article><span>1</span><h3>Pick your profession</h3><p>Get the right sections and prompts for your healthcare role.</p></article><article><span>2</span><h3>Let AI strengthen it</h3><p>Improve summaries, achievements and skills without uploading your data.</p></article><article><span>3</span><h3>Download your PDF</h3><p>Choose from 126 templates and export a polished, ATS-ready CV.</p></article></div></div></section>
        <div className="container ad-wrap"><AdSlot placement="home" /></div>
        <section className="final-cta"><div className="container"><h2>Ready for your next healthcare role?</h2><p>Build a professional CV in minutes. Your information stays yours.</p><button className="btn btn-primary" onClick={() => navigate("/new")}>Start building for free →</button></div></section>
      </main>
    </>
  );
}
