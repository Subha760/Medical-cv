import { Link } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  return (
    <header className="nav-bar">
      <div className="container nav-bar__inner">
        <Link to="/" className="nav-bar__brand">
          <span className="nav-bar__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect x="4" y="3" width="13" height="18" rx="1.5" fill="var(--color-paper-raised)" stroke="var(--color-teal)" strokeWidth="1.6" />
              <line x1="7" y1="8" x2="14" y2="8" stroke="var(--color-teal)" strokeWidth="1.6" />
              <line x1="7" y1="11.5" x2="14" y2="11.5" stroke="var(--color-teal)" strokeWidth="1.6" />
              <circle cx="18.5" cy="16.5" r="4" fill="var(--color-amber)" />
              <line x1="16.9" y1="16.5" x2="20.1" y2="16.5" stroke="#fff" strokeWidth="1.4" />
              <line x1="18.5" y1="14.9" x2="18.5" y2="18.1" stroke="#fff" strokeWidth="1.4" />
            </svg>
          </span>
          <span className="nav-bar__wordmark">MedCV Maker</span>
        </Link>
        <nav className="nav-bar__links">
          <Link to="/new">Templates</Link>
          <Link to="/saved">My Saved CVs</Link>
          <Link to="/cover-letter">Cover Letter</Link>
          <Link to="/new" className="nav-bar__cta">Build my CV</Link>
        </nav>
      </div>
    </header>
  );
}
