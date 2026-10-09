import "./utils/compat";
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";
import "./styles/upgrade.css";
import "./styles/medico.css";
import "./data/templateRegistry";
try {
  const code = new URLSearchParams(location.hash.split("?")[1] || "").get(
    "ref",
  );
  if (code && /^[A-F0-9]{12}$/.test(code))
    localStorage.setItem("medico:referral", code);
} catch {}
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("medcv:theme") || "light";
} catch {
  /* appearance falls back to light */
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </React.StrictMode>,
);
