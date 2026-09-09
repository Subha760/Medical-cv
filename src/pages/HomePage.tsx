import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import AdSlot from "../components/AdSlot";
import "./HomePage.css";

const DESIGN_STYLES = ['Classic & clean', 'Modern colour', 'Academic detail', 'Compact layout', 'Photo CV', 'Timeline'];

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
                  <strong>PROFESSIONAL SUMMARY</strong><p className="cv-mini__text">Compassionate nurse delivering safe care and clear patient communication.</p>
                  <strong>CLINICAL EXPERIENCE</strong><p className="cv-mini__text">Staff Nurse · City General Hospital<br/>Coordinated care and accurate clinical handovers.</p>
                  <strong>CORE SKILLS</strong><div className="cv-mini__chips"><span>Patient care</span><span>Critical care</span><span>EMR</span></div>
                </div>
                <div className="ai-float"><span>✦</span><div><b>CV Autopilot</b><small>Summary improved locally</small></div><em>✓</em></div>
              </div>
            </div>
          </div>
        </section>
        <section className="stats"><div className="container stats__grid"><div><b>126+</b><span>CV templates</span></div><div><b>100%</b><span>private & local</span></div><div><b>ATS</b><span>friendly layouts</span></div><div><b>PDF</b><span>instant export</span></div></div></section>
        <section className="section container">
          <div className="section__heading"><span className="section__kicker">Make it your own</span><h2>A style for your next opportunity</h2><p>Choose a template, add your experience, and see the finished CV before downloading.</p></div>
          <div className="profession-grid">
            {DESIGN_STYLES.map((style,index) => <button key={style} className="profession-card" onClick={() => navigate('/new')}><span className="profession-card__icon">{String(index+1).padStart(2,'0')}</span><strong>{style}</strong><small>Explore templates</small><i>→</i></button>)}
          </div>
        </section>
        <section className="how"><div className="container"><div className="section__heading"><span className="section__kicker">Simple and guided</span><h2>Your strongest CV in three steps</h2></div><div className="steps"><article><span>1</span><h3>Choose your template</h3><p>See a complete sample CV and choose your accent colour.</p></article><article><span>2</span><h3>Make it yours</h3><p>Add your experience, photo and custom sections. Use the offline assistant to refine your writing.</p></article><article><span>3</span><h3>Preview and download</h3><p>Check every page, then save your finished PDF.</p></article></div></div></section>
        <div className="container ad-wrap"><AdSlot placement="home" /></div>
        <section className="final-cta"><div className="container"><h2>Ready for your next healthcare role?</h2><p>Build a professional CV in minutes. Your information stays yours.</p><button className="btn btn-primary" onClick={() => navigate("/new")}>Start building for free →</button></div></section>
      </main>
    </>
  );
}
