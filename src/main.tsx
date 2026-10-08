import "./utils/compat";
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";
import "./styles/upgrade.css";
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
